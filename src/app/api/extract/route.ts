import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AI_MODEL, FALLBACK_BETA, aiEnabled, getAnthropic } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const ASSET_CLASSES = [
  "liquidez_ars",
  "liquidez_usd",
  "renta_fija_ars",
  "renta_fija_usd",
  "accion_ar",
  "cedear_etf",
  "cedear_accion",
  "cripto",
  "otro",
] as const;

const HoldingSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  assetClass: z.enum(ASSET_CLASSES),
  currency: z.enum(["ARS", "USD"]),
  amount: z.number(),
  returnPct: z.number().nullable(),
  ratePct: z.number().nullable(),
});
const ResultSchema = z.object({ holdings: z.array(HoldingSchema) });

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["holdings"],
  properties: {
    holdings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ticker", "name", "assetClass", "currency", "amount", "returnPct", "ratePct"],
        properties: {
          ticker: { type: "string" },
          name: { type: "string" },
          assetClass: { type: "string", enum: [...ASSET_CLASSES] },
          currency: { type: "string", enum: ["ARS", "USD"] },
          amount: { type: "number" },
          returnPct: { type: ["number", "null"] },
          ratePct: { type: ["number", "null"] },
        },
      },
    },
  },
};

const PROMPT = `Estas son capturas de pantalla de la app de un broker argentino (Cocos, IOL, Balanz, PPI, Bull Market u otro).
Extraé cada inversión que aparezca con su valor actual.

Reglas:
- ticker: el símbolo tal como aparece (ej. SPYD, NVDAD, GGALD, IOLDOLD). Si es un FCI sin símbolo visible, usá un código corto en mayúsculas basado en el nombre (ej. "Cocos Pesos Plus" → COCOSPPA).
- amount: el valor valorizado actual, como número (los brokers usan punto para miles y coma para decimales: "$7.872,96" = 7872.96).
- currency: "USD" si el valor se muestra en dólares (US$, o una vista de la cartera en dólares, o tickers que terminan en D), "ARS" si está en pesos.
- returnPct: el rendimiento acumulado de la posición en % si aparece (−14,35% → -14.35), si no null.
- ratePct: para fondos o instrumentos en pesos, la TEA o TNA si aparece (ej. 26), si no null.
- assetClass: liquidez_ars (money market en pesos), liquidez_usd, renta_fija_ars, renta_fija_usd (bonos, ONs, FCI de renta fija en dólares), accion_ar (acciones argentinas), cedear_etf (CEDEARs de ETFs como SPY, QQQ, ARKK), cedear_accion (CEDEARs de empresas), cripto, otro.
- No inventes posiciones ni incluyas totales, subtotales o gráficos como si fueran inversiones. Si la misma posición aparece en dos capturas, incluila una sola vez.`;

export async function POST(req: Request) {
  if (!aiEnabled()) {
    return NextResponse.json({ error: "La lectura de capturas no está configurada (falta ANTHROPIC_API_KEY). Cargá tus inversiones a mano." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as { images?: unknown } | null;
  const images = Array.isArray(body?.images) ? (body!.images as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 5) : [];
  if (images.length === 0) return NextResponse.json({ error: "No recibimos imágenes." }, { status: 400 });

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const img of images) {
    const m = img.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
    if (!m) return NextResponse.json({ error: "Formato de imagen no soportado." }, { status: 400 });
    if (m[2].length > 7_000_000) return NextResponse.json({ error: "La imagen es demasiado grande." }, { status: 413 });
    content.push({ type: "image", source: { type: "base64", media_type: m[1] as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: m[2] } });
  }
  content.push({ type: "text", text: PROMPT });

  try {
    const response = await getAnthropic().beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: JSON_SCHEMA } },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "No pudimos procesar esa imagen. Probá con otra captura." }, { status: 422 });
    }
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = ResultSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return NextResponse.json({ error: "No pudimos interpretar la captura." }, { status: 422 });
    const holdings = parsed.data.holdings
      .filter((h) => h.amount > 0)
      .map((h) => ({
        ticker: h.ticker.toUpperCase(),
        name: h.name,
        assetClass: h.assetClass,
        currency: h.currency,
        amount: h.amount,
        returnPct: h.returnPct ?? undefined,
        ratePct: h.ratePct ?? undefined,
      }));
    return NextResponse.json({ holdings });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Hay mucha demanda, probá en un minuto." }, { status: 429 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: "El servicio de lectura falló. Probá de nuevo." }, { status: 502 });
    if (e instanceof SyntaxError) return NextResponse.json({ error: "No pudimos interpretar la captura." }, { status: 422 });
    throw e;
  }
}
