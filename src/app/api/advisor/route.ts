import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, FALLBACK_BETA, aiEnabled, getAnthropic } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `Sos el asesor de Invertify, una app argentina que ayuda a personas comunes a ordenar sus inversiones para cumplir objetivos concretos (comprar un departamento, retirarse, un fondo de emergencia).

Cómo respondés:
- En español rioplatense, claro y directo, como un buen asesor que le explica a un amigo. Nada de jerga sin explicar.
- Basate en el análisis de la cartera que viene en el contexto (valores en dólares MEP, diagnóstico y plan sugerido). Si la persona pregunta algo que el plan ya resuelve, explicá el porqué.
- Ofrecé opciones con sus pros y contras en vez de una única orden. Cuando hables de si algo "va a subir o bajar", explicá escenarios y riesgos; nunca prometas rendimientos ni afirmes qué va a hacer el mercado.
- Si te piden el paso a paso, dalo para el broker que usa la persona.
- Respuestas breves (hasta ~250 palabras) salvo que pidan detalle. Usá listas cortas cuando ayuden.
- Esto es orientación educativa, no asesoramiento financiero personalizado: si la decisión es grande o involucra impuestos (Bienes Personales, Ganancias), sugerí confirmarla con un asesor registrado en la CNV o un contador. Mencionalo solo cuando sea relevante, no en cada respuesta.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  if (!aiEnabled()) {
    return Response.json({ error: "El asesor con IA no está configurado (falta ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as { messages?: ChatMessage[]; context?: unknown } | null;
  const history = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Falta la pregunta." }, { status: 400 });
  }
  const context = JSON.stringify(body?.context ?? {}).slice(0, 30000);

  // El contexto de la cartera va primero, antes de la conversación.
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: `Contexto de mi cartera y análisis (JSON):\n${context}` },
    { role: "assistant", content: "Perfecto, ya tengo tu cartera y el análisis. ¿Qué querés saber?" },
    ...history,
  ];

  const stream = getAnthropic().beta.messages.stream({
    model: AI_MODEL,
    max_tokens: 8000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\nNo puedo ayudarte con esa consulta. Probá reformularla."));
        }
      } catch (e) {
        const msg = e instanceof Anthropic.RateLimitError ? "Hay mucha demanda, probá en un minuto." : "Hubo un error con el asesor. Probá de nuevo.";
        controller.enqueue(encoder.encode(`\n\n${msg}`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
