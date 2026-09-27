import { findInstrument, normalizeTicker } from "../catalog";
import type { AssetClass, Currency } from "../types";

export interface OcrLine {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface ParsedHolding {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  currency: Currency;
  amount: number;
  returnPct?: number;
  ratePct?: number;
}

/** Líneas que tienen un monto pero no son una inversión (totales, variaciones, gráficos). */
const EXCLUDE = /total|rendimiento|cuotaparte|variaci[oó]n|ganancia|disponible|saldo|en\s?lo que va|desde inicio|[uú]lt\./i;

/** Palabras en mayúscula que no son tickers. */
const STOPWORDS = new Set(["CEDEAR", "CEDEARS", "IOL", "SA", "S.A", "INC", "US", "USD", "ARS", "FCI", "TEA", "TNA", "YTD", "MAX", "MÁX", "ETF", "SPDR", "SP", "CI", "D", "A", "Y"]);

/** Fondos que suelen aparecer sin ticker en las capturas. */
const FUND_NAMES: { re: RegExp; ticker: string }[] = [
  { re: /pesos\s*plus/i, ticker: "COCOSPPA" },
  { re: /cash\s*management/i, ticker: "IOLCAMA" },
  { re: /d[oó]lar\s*ahorro\s*plus/i, ticker: "IOLDOLD" },
];

// Monto "$1.234,56" (formato argentino). No toma "US$" (totales) ni "$-77" o "(+$" (variaciones).
const MONEY = /(^|[^A-Za-z+\-(])\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{0,2}))?/g;
const MONEY_ANY = /\$\s?-?\d/;
const PERCENT = /(-?)\s?(\d+(?:[.,]\d+)?)\s?%/g;

function parseMoney(text: string): { value: number; hasCents: boolean; index: number } | null {
  let last: { value: number; hasCents: boolean; index: number } | null = null;
  for (const m of text.matchAll(MONEY)) {
    const before = text.slice(0, m.index! + m[1].length);
    if (/U\$?S?\s?$|US\s?$/i.test(before) || /U$/.test(before)) continue;
    const intPart = Number(m[2].replace(/\./g, ""));
    const cents = m[3] ?? "";
    const value = intPart + (cents ? Number(cents.padEnd(2, "0")) / 100 : 0);
    last = { value, hasCents: cents.length === 2, index: m.index! };
  }
  return last;
}

function parsePercents(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(PERCENT)) {
    const raw = m[2];
    let n: number;
    if (/[.,]/.test(raw)) n = Number(raw.replace(",", "."));
    // Los brokers muestran 2 decimales: "232%" casi siempre es un "2,32%" al que el OCR le comió la coma.
    else if (raw.length >= 3) n = Number(raw) / 100;
    else n = Number(raw);
    if (!Number.isFinite(n)) continue;
    out.push(m[1] === "-" ? -n : n);
  }
  return out;
}

const center = (l: OcrLine) => (l.bbox.y0 + l.bbox.y1) / 2;
const height = (l: OcrLine) => Math.max(10, l.bbox.y1 - l.bbox.y0);

function tickerCandidates(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => t.replace(/[^A-Z0-9]/g, ""))
    .filter((t) => /^[A-Z][A-Z0-9]{1,9}$/.test(t) && !STOPWORDS.has(t) && !/^US\d/.test(t));
}

function cleanName(text: string): string {
  return text
    .replace(MONEY, " ")
    .replace(/-?\d+(?:[.,]\d+)?\s?%/g, " ")
    .replace(/[^\p{L}\d.,'&\- ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .join(" ")
    .replace(/^cedear\s+/i, "")
    .trim();
}

function guessClass(ticker: string, name: string): AssetClass {
  const inst = findInstrument(ticker);
  if (inst) return inst.assetClass;
  if (/cedear/i.test(name)) return "cedear_accion";
  if (/d[oó]lar|usd/i.test(name) && /fondo|fci|ahorro|renta/i.test(name)) return "renta_fija_usd";
  if (/fondo|fci|plus|money|cash|pesos|liquidez/i.test(name)) return "liquidez_ars";
  if (/bono|on |obligaci/i.test(name)) return "renta_fija_usd";
  return "otro";
}

function fallbackTicker(name: string): string {
  for (const f of FUND_NAMES) if (f.re.test(name)) return f.ticker;
  const t = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return t.slice(0, 10) || "SINTICKER";
}

/**
 * Convierte las líneas del OCR de una captura de broker (IOL, Cocos, Balanz, PPI…) en inversiones.
 * Cada fila de la tabla trae nombre, variaciones y un monto; el ticker suele estar en la línea de abajo.
 */
export function parseBrokerScreenshot(lines: OcrLine[]): ParsedHolding[] {
  const clean = lines.map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() })).filter((l) => l.text);
  const fullText = clean.map((l) => l.text).join("\n");
  const screenInUsd = /US\$|U\$S|\bUSD\b/.test(fullText);

  // Tasa (TEA/TNA) de un fondo en pesos, si la pantalla la muestra.
  let screenRate: number | undefined;
  clean.forEach((l, i) => {
    const next = clean[i + 1]?.text ?? "";
    if (/%/.test(l.text) && (/\b(TEA|TNA)\b|tasa/i.test(l.text) || /\b(TEA|TNA)\b|tasa efectiva|tasa nominal/i.test(next))) {
      const p = parsePercents(l.text);
      if (p.length && screenRate == null) screenRate = Math.abs(p[0]);
    }
  });

  // Filas con un monto válido
  const anchors = clean
    .map((l, idx) => ({ l, idx, money: parseMoney(l.text) }))
    .filter((a) => a.money && a.money.value > 0 && !EXCLUDE.test(a.l.text));
  if (anchors.length === 0) return [];

  const used = new Set<number>(anchors.map((a) => a.idx));

  // Centavos en superíndice (Cocos): una línea "69" dentro de la caja del monto.
  for (const a of anchors) {
    if (a.money!.hasCents) continue;
    const idx = clean.findIndex(
      (l, i) =>
        !used.has(i) &&
        /^\d{2}$/.test(l.text) &&
        l.bbox.y1 > a.l.bbox.y0 - 4 &&
        l.bbox.y0 < a.l.bbox.y1 &&
        l.bbox.x0 >= a.l.bbox.x0 &&
        l.bbox.x1 <= a.l.bbox.x1 + 40,
    );
    if (idx >= 0) {
      a.money!.value = Math.floor(a.money!.value) + Number(clean[idx].text) / 100;
      used.add(idx);
    }
  }

  // Cada línea restante se asigna a la fila más cercana (si está lo bastante cerca).
  const groups = new Map<number, OcrLine[]>(anchors.map((a) => [a.idx, []]));
  clean.forEach((l, i) => {
    if (used.has(i)) return;
    let best: (typeof anchors)[number] | null = null;
    let bestD = Infinity;
    for (const a of anchors) {
      const d = Math.abs(center(l) - center(a.l));
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    if (!best || bestD > height(best.l) * 1.9) return;
    // Un dato suelto con su propio monto ("+$10.627 último rendimiento") no pertenece a la fila.
    if (MONEY_ANY.test(l.text) && EXCLUDE.test(l.text)) return;
    groups.get(best.idx)!.push(l);
  });

  const out: ParsedHolding[] = [];
  for (const a of anchors) {
    const group = groups.get(a.idx)!;
    if (group.some((g) => EXCLUDE.test(g.text))) continue;
    const below = group.filter((g) => center(g) > center(a.l));
    const above = group.filter((g) => center(g) <= center(a.l));

    // Ticker: preferimos una línea que sea solo el ticker (así lo muestran IOL y otros).
    let ticker: string | undefined;
    for (const g of [...below, ...above]) {
      const words = g.text.split(/\s+/);
      const cands = tickerCandidates(g.text);
      if (words.length === 1 && cands.length === 1) {
        ticker = cands[0];
        break;
      }
    }
    if (!ticker) {
      for (const g of [...below, ...above, a.l]) {
        const known = tickerCandidates(g.text).find((c) => findInstrument(c));
        if (known) {
          ticker = known;
          break;
        }
      }
    }

    const moneyText = a.l.text.slice(0, a.money!.index);
    const nameParts = [...above.map((g) => g.text), moneyText].filter((t) => !ticker || t.trim() !== ticker);
    const name = cleanName(nameParts.join(" ")) || ticker || "Inversión";

    const pcts = parsePercents(a.l.text);
    // Sin ticker, sin porcentajes y sin nombre de fondo conocido, no es una fila de inversión
    // (totales, ejes de gráficos, etc.).
    const looksLikeFund = FUND_NAMES.some((f) => f.re.test(name)) || /fondo|fci|plus|money market|cash/i.test(name);
    if (!ticker && pcts.length === 0 && !looksLikeFund) continue;
    if (group.some((g) => /US\$/.test(g.text))) continue;
    if (!ticker) ticker = fallbackTicker(name);
    const base = normalizeTicker(ticker);
    const inst = findInstrument(ticker);
    const usdSpecies = base !== ticker && /[DC]$/.test(ticker) && !!findInstrument(base);
    const currency: Currency = usdSpecies || screenInUsd ? "USD" : (inst?.currency ?? "ARS");
    const assetClass = guessClass(ticker, name);
    const isArs = assetClass === "liquidez_ars" || assetClass === "renta_fija_ars";

    out.push({
      ticker,
      name: inst?.name && name.length < 3 ? inst.name : name,
      assetClass,
      currency,
      amount: Math.round(a.money!.value * 100) / 100,
      returnPct: pcts.length ? pcts[pcts.length - 1] : undefined,
      ratePct: isArs ? screenRate : undefined,
    });
  }
  return out;
}

/** Une resultados de varias capturas; si una inversión aparece dos veces, queda la última. */
export function mergeParsed(lists: ParsedHolding[][]): ParsedHolding[] {
  const map = new Map<string, ParsedHolding>();
  for (const list of lists) for (const h of list) map.set(h.ticker, h);
  return [...map.values()];
}
