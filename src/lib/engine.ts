import { BROKERS, guideSteps, operationFor, type Operation } from "./brokers";
import {
  BUCKETS,
  BUCKET_LABEL,
  findInstrument,
  resolveInstrument,
  type Instrument,
} from "./catalog";
import type { Assumptions, Bucket, BrokerId, Holding, Profile, Risk } from "./types";

// ---------------------------------------------------------------------------
// Tipos de salida
// ---------------------------------------------------------------------------

export interface Position {
  holding: Holding;
  instrument: Instrument;
  usd: number;
  weight: number;
  /** Retorno esperado anual en USD. */
  expReturn: number;
  vol: number;
  bucket: Bucket;
  /** Exposición económica: si el valor depende del peso o del dólar. */
  economicCurrency: "ARS" | "USD";
}

export type Severity = "alta" | "media" | "baja" | "ok";

export interface Diagnostic {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  tickers?: string[];
}

export type MoveKind = "rotar" | "tomar_ganancia" | "consolidar" | "reducir_riesgo" | "aporte" | "invertir_liquidez";

export interface GuideBlock {
  title: string;
  operation: Operation;
  steps: string[];
}

export interface Move {
  id: string;
  /** Broker donde se ejecuta: el de la posición de origen, o el principal del usuario. */
  broker: BrokerId;
  kind: MoveKind;
  from?: { ticker: string; name: string; usd: number };
  to: { ticker: string; name: string; bucket: Bucket };
  alternatives: { ticker: string; name: string; note: string }[];
  amountUsd: number;
  reason: string;
  /** Cambio en el retorno esperado anual de toda la cartera, en puntos porcentuales. */
  returnDeltaPp: number;
  guide: GuideBlock[];
}

export interface ProjectionPoint {
  month: number;
  year: number;
  pesimista: number;
  base: number;
  optimista: number;
  objetivoBase: number;
  aportado: number;
}

export interface StressResult {
  id: string;
  label: string;
  description: string;
  currentPct: number;
  targetPct: number;
  currentUsd: number;
}

export interface ScorePart {
  label: string;
  value: number;
  max: number;
  note: string;
}

export interface Analysis {
  totalUsd: number;
  positions: Position[];
  bucketUsd: Record<Bucket, number>;
  bucketWeight: Record<Bucket, number>;
  target: Record<Bucket, number>;
  arsWeight: number;
  argentinaRiskWeight: number;
  expReturn: number;
  vol: number;
  targetExpReturn: number;
  targetVol: number;
  riskLevel: number;
  score: { total: number; parts: ScorePart[] };
  diagnostics: Diagnostic[];
  moves: Move[];
  projection: ProjectionPoint[];
  yearsToGoalCurrent: number | null;
  yearsToGoalTarget: number | null;
  requiredMonthly: number;
  stress: StressResult[];
  equityCap: number;
  equityWeight: number;
}

// ---------------------------------------------------------------------------
// Supuestos
// ---------------------------------------------------------------------------

/** Tasa nominal anual en pesos que asumimos si el usuario no la cargó. */
const DEFAULT_ARS_RATE: Record<string, number> = {
  PESOS: 0,
  liquidez_ars: 0.25,
  renta_fija_ars: 0.28,
};

const EQUITY_BUCKETS: Bucket[] = ["global", "individuales", "argentina", "cripto"];

const BASE_TARGETS: Record<Risk, Record<Bucket, number>> = {
  conservador: { liquidez: 0.15, rf_usd: 0.55, rf_ars: 0.1, global: 0.15, individuales: 0.05, argentina: 0, cripto: 0 },
  moderado: { liquidez: 0.1, rf_usd: 0.35, rf_ars: 0.05, global: 0.4, individuales: 0.05, argentina: 0.05, cripto: 0 },
  agresivo: { liquidez: 0.05, rf_usd: 0.15, rf_ars: 0, global: 0.45, individuales: 0.2, argentina: 0.1, cripto: 0.05 },
};

/** Máximo de renta variable según cuánto falta para usar la plata. */
export function equityCapFor(horizonYears: number): number {
  if (horizonYears <= 1) return 0.1;
  if (horizonYears <= 2) return 0.25;
  if (horizonYears <= 3) return 0.4;
  if (horizonYears <= 5) return 0.6;
  if (horizonYears <= 8) return 0.8;
  return 1;
}

export function targetAllocation(profile: Profile): Record<Bucket, number> {
  if (profile.goal === "emergencia") {
    return { liquidez: 0.6, rf_usd: 0.4, rf_ars: 0, global: 0, individuales: 0, argentina: 0, cripto: 0 };
  }
  const t = { ...BASE_TARGETS[profile.risk] };
  const cap = equityCapFor(profile.horizonYears);
  const equity = EQUITY_BUCKETS.reduce((s, b) => s + t[b], 0);
  if (equity > cap) {
    const scale = cap / equity;
    let freed = 0;
    for (const b of EQUITY_BUCKETS) {
      const nv = t[b] * scale;
      freed += t[b] - nv;
      t[b] = nv;
    }
    // Lo liberado va a renta fija en dólares; con horizonte muy corto, parte a liquidez.
    const toLiq = profile.horizonYears <= 1 ? freed * 0.4 : 0;
    t.liquidez += toLiq;
    t.rf_usd += freed - toLiq;
  }
  // Todos los objetivos se miden en dólares: la renta fija en pesos solo tiene
  // sentido como parte de la liquidez de muy corto plazo, así que la pasamos a USD.
  t.rf_usd += t.rf_ars;
  t.rf_ars = 0;
  if (!profile.hasEmergencyFund && t.liquidez < 0.12) {
    const add = 0.12 - t.liquidez;
    t.liquidez = 0.12;
    t.rf_usd = Math.max(0, t.rf_usd - add);
  }
  const sum = BUCKETS.reduce((s, b) => s + t[b], 0);
  for (const b of BUCKETS) t[b] = t[b] / sum;
  return t;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const emptyBuckets = (): Record<Bucket, number> =>
  Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;

export function toUsd(h: Holding, a: Assumptions): number {
  return h.currency === "USD" ? h.amount : h.amount / Math.max(1, a.mep);
}

function isArsInstrument(inst: Instrument): boolean {
  return inst.assetClass === "liquidez_ars" || inst.assetClass === "renta_fija_ars";
}

/** Retorno en USD de algo que rinde en pesos: (1 + tasa) / (1 + devaluación) − 1. */
function arsReturnInUsd(h: Holding, inst: Instrument, a: Assumptions): number {
  const nominal =
    h.ratePct != null ? h.ratePct / 100 : (DEFAULT_ARS_RATE[inst.ticker] ?? DEFAULT_ARS_RATE[inst.assetClass] ?? 0.25);
  return (1 + nominal) / (1 + a.expectedDevaluationPct / 100) - 1;
}

/** Correlación aproximada entre dos instrumentos, por tipo. */
function corr(a: Instrument, b: Instrument): number {
  if (a.ticker === b.ticker) return 1;
  const eq = (i: Instrument) => EQUITY_BUCKETS.includes(i.bucket);
  const ars = (i: Instrument) => isArsInstrument(i);
  if (eq(a) && eq(b)) {
    if (a.bucket === "cripto" || b.bucket === "cripto") return 0.35;
    if (a.bucket === "argentina" && b.bucket === "argentina") return 0.75;
    if (a.bucket === "argentina" || b.bucket === "argentina") return 0.35;
    const techA = a.tags?.includes("tech");
    const techB = b.tags?.includes("tech");
    return techA && techB ? 0.8 : 0.65;
  }
  if (ars(a) && ars(b)) return 0.9;
  if (a.bucket === "rf_usd" && b.bucket === "rf_usd") return 0.6;
  if ((a.bucket === "rf_usd" && b.bucket === "argentina") || (b.bucket === "rf_usd" && a.bucket === "argentina")) return 0.45;
  if (ars(a) || ars(b)) return 0.1;
  return 0.2;
}

function portfolioStats(items: { inst: Instrument; w: number; r: number; vol: number }[]) {
  const r = items.reduce((s, x) => s + x.w * x.r, 0);
  let v = 0;
  for (const x of items) for (const y of items) v += x.w * y.w * x.vol * y.vol * corr(x.inst, y.inst);
  return { r, vol: Math.sqrt(Math.max(0, v)) };
}

// ---------------------------------------------------------------------------
// Instrumentos recomendados por balde
// ---------------------------------------------------------------------------

interface Pick {
  ticker: string;
  alternatives: { ticker: string; note: string }[];
}

function brokerMoneyMarket(broker: BrokerId): string {
  if (broker === "cocos") return "COCOSPPA";
  if (broker === "iol") return "IOLCAMA";
  return "MONEYMARKET";
}

function brokerUsdFund(broker: BrokerId): string {
  return broker === "iol" ? "IOLDOLD" : "FCIUSD";
}

export function pickFor(bucket: Bucket, profile: Profile): Pick {
  const b = profile.broker;
  switch (bucket) {
    case "liquidez":
      return {
        ticker: "MMUSD",
        alternatives: [
          { ticker: "CAUCIONUSD", note: "Caución en dólares a pocos días" },
          { ticker: brokerMoneyMarket(b), note: "Si necesitás pesos a la vista" },
        ],
      };
    case "rf_usd":
      if (profile.risk === "conservador" || profile.horizonYears <= 2)
        return {
          ticker: brokerUsdFund(b),
          alternatives: [
            { ticker: "ON", note: "ONs de YPF, Pampa, Vista, TGS: cupón en USD" },
            { ticker: "GD30", note: "Soberano corto ley NY" },
          ],
        };
      if (profile.risk === "moderado")
        return {
          ticker: "ON",
          alternatives: [
            { ticker: brokerUsdFund(b), note: "Diversificado y sin elegir emisores" },
            { ticker: "GD35", note: "Más rendimiento, más riesgo país" },
          ],
        };
      return {
        ticker: "GD35",
        alternatives: [
          { ticker: "GD41", note: "Aún más largo: más sensible al riesgo país" },
          { ticker: "ON", note: "Menos volatilidad que los soberanos" },
        ],
      };
    case "rf_ars":
      return {
        ticker: "LECAP",
        alternatives: [
          { ticker: "TX26", note: "Cubre inflación (CER)" },
          { ticker: brokerMoneyMarket(b), note: "Liquidez inmediata" },
        ],
      };
    case "global":
      return {
        ticker: "SPY",
        alternatives:
          profile.risk === "agresivo"
            ? [
                { ticker: "QQQ", note: "Más tecnología, más volatilidad" },
                { ticker: "EEM", note: "Diversificar en emergentes" },
              ]
            : [
                { ticker: "VOO", note: "Igual al S&P 500, menor costo" },
                { ticker: "ACWI", note: "Todo el mundo en un ETF" },
              ],
      };
    case "individuales":
      return {
        ticker: "BRKB",
        alternatives: [
          { ticker: "MSFT", note: "Calidad y crecimiento" },
          { ticker: "GOOGL", note: "Tecnología a valuación razonable" },
          { ticker: "KO", note: "Defensiva con dividendos" },
        ],
      };
    case "argentina":
      return {
        ticker: "FCIACCIONES",
        alternatives: [
          { ticker: "YPFD", note: "Energía / Vaca Muerta" },
          { ticker: "PAMP", note: "Energía eléctrica" },
          { ticker: "GGAL", note: "Bancos: apalancado a la macro" },
        ],
      };
    case "cripto":
      return { ticker: "IBIT", alternatives: [{ ticker: "BTC", note: "Bitcoin directo en un exchange" }] };
  }
}

// ---------------------------------------------------------------------------
// Estrés
// ---------------------------------------------------------------------------

interface ScenarioDef {
  id: string;
  label: string;
  description: string;
  shock: (inst: Instrument) => number;
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: "devaluacion",
    label: "Salto del dólar (+40%)",
    description: "El dólar MEP sube 40% en poco tiempo.",
    shock: (i) => {
      if (isArsInstrument(i)) return 1 / 1.4 - 1;
      if (i.bucket === "argentina") return -0.15;
      if (i.tags?.includes("soberano")) return -0.08;
      if (i.bucket === "rf_usd") return -0.02;
      return 0;
    },
  },
  {
    id: "crisis_global",
    label: "Crisis global (S&P −25%)",
    description: "Caída fuerte de Wall Street, como 2008, 2020 o 2022.",
    shock: (i) => {
      if (i.tags?.includes("oro")) return 0.05;
      if (i.bucket === "cripto") return -0.45;
      if (i.bucket === "argentina") return -0.3;
      if (i.tags?.includes("defensivo")) return -0.12;
      if (i.tags?.includes("tematico")) return -0.45;
      if (i.assetClass === "cedear_accion") return i.tags?.includes("tech") ? -0.35 : -0.25;
      if (i.bucket === "global") return i.tags?.includes("tech") ? -0.32 : -0.25;
      if (i.tags?.includes("soberano")) return -0.12;
      if (i.bucket === "rf_usd") return -0.04;
      return 0;
    },
  },
  {
    id: "rally_tech",
    label: "Rally tecnológico",
    description: "La IA y las tecnológicas siguen liderando: Nasdaq +25%.",
    shock: (i) => {
      if (i.tags?.includes("tech")) return 0.25;
      if (i.bucket === "global") return 0.14;
      if (i.assetClass === "cedear_accion") return 0.08;
      if (i.bucket === "cripto") return 0.2;
      return 0;
    },
  },
  {
    id: "riesgo_pais",
    label: "Baja el riesgo país",
    description: "Argentina normaliza: el riesgo país cae a 400 puntos.",
    shock: (i) => {
      if (i.tags?.includes("soberano") && i.bucket === "rf_usd") return 0.12;
      if (i.bucket === "rf_usd" && i.tags?.includes("corporativo")) return 0.03;
      if (i.ticker === "ON") return 0.04;
      if (i.bucket === "argentina") return 0.3;
      if (isArsInstrument(i)) return 0.03;
      return 0;
    },
  },
  {
    id: "tasas_bajan",
    label: "La Fed baja tasas",
    description: "Baja la tasa en EE.UU.: suben bonos y acciones.",
    shock: (i) => {
      if (i.bucket === "rf_usd") return i.tags?.includes("soberano") ? 0.06 : 0.03;
      if (i.bucket === "cripto") return 0.15;
      if (EQUITY_BUCKETS.includes(i.bucket)) return 0.08;
      return 0;
    },
  },
];

// ---------------------------------------------------------------------------
// Proyección
// ---------------------------------------------------------------------------

function fv(pv: number, monthly: number, annualR: number, months: number): number {
  const m = Math.pow(1 + annualR, 1 / 12) - 1;
  if (Math.abs(m) < 1e-9) return pv + monthly * months;
  const g = Math.pow(1 + m, months);
  return pv * g + (monthly * (g - 1)) / m;
}

function yearsToReach(pv: number, monthly: number, r: number, goal: number): number | null {
  if (pv >= goal) return 0;
  for (let month = 1; month <= 50 * 12; month++) {
    if (fv(pv, monthly, r, month) >= goal) return month / 12;
  }
  return null;
}

function requiredMonthlyFor(pv: number, r: number, goal: number, years: number): number {
  const n = Math.max(1, Math.round(years * 12));
  const m = Math.pow(1 + r, 1 / 12) - 1;
  const g = Math.pow(1 + m, n);
  const gap = goal - pv * g;
  if (gap <= 0) return 0;
  return Math.abs(m) < 1e-9 ? gap / n : (gap * m) / (g - 1);
}

/** Retorno anualizado en un percentil dado, para un horizonte de t años. */
function scenarioReturn(r: number, vol: number, years: number, z: number) {
  const t = Math.max(1, years);
  return r + (z * vol) / Math.sqrt(t);
}

// ---------------------------------------------------------------------------
// Análisis principal
// ---------------------------------------------------------------------------

export function analyze(holdings: Holding[], profile: Profile, assumptions: Assumptions): Analysis {
  const valid = holdings.filter((h) => h.amount > 0);
  const raw = valid.map((h) => {
    const instrument = resolveInstrument(h.ticker, h.assetClass, h.name);
    const usd = toUsd(h, assumptions);
    const ars = isArsInstrument(instrument);
    const expReturn = ars ? arsReturnInUsd(h, instrument, assumptions) : instrument.expReturn;
    const vol = ars ? Math.max(instrument.vol, 0.12) : instrument.vol;
    return { holding: h, instrument, usd, expReturn, vol, bucket: instrument.bucket, economicCurrency: (ars ? "ARS" : "USD") as "ARS" | "USD" };
  });
  const totalUsd = raw.reduce((s, p) => s + p.usd, 0);
  const positions: Position[] = raw
    .map((p) => ({ ...p, weight: totalUsd > 0 ? p.usd / totalUsd : 0 }))
    .sort((a, b) => b.usd - a.usd);

  const bucketUsd = emptyBuckets();
  for (const p of positions) bucketUsd[p.bucket] += p.usd;
  const bucketWeight = emptyBuckets();
  for (const b of BUCKETS) bucketWeight[b] = totalUsd > 0 ? bucketUsd[b] / totalUsd : 0;

  const target = targetAllocation(profile);
  const arsWeight = positions.filter((p) => p.economicCurrency === "ARS").reduce((s, p) => s + p.weight, 0);
  const argentinaRiskWeight = positions
    .filter((p) => p.economicCurrency === "ARS" || p.bucket === "argentina" || p.instrument.tags?.includes("soberano") || p.instrument.ticker === "ON")
    .reduce((s, p) => s + p.weight, 0);

  const stats = portfolioStats(positions.map((p) => ({ inst: p.instrument, w: p.weight, r: p.expReturn, vol: p.vol })));

  const targetItems = BUCKETS.filter((b) => target[b] > 0).map((b) => {
    const inst = resolveInstrument(pickFor(b, profile).ticker, "otro");
    const fakeHolding: Holding = { id: "t", ticker: inst.ticker, name: inst.name, assetClass: inst.assetClass, currency: "USD", amount: 1 };
    const ars = isArsInstrument(inst);
    return {
      inst,
      w: target[b],
      r: ars ? arsReturnInUsd(fakeHolding, inst, assumptions) : inst.expReturn,
      vol: ars ? Math.max(inst.vol, 0.12) : inst.vol,
    };
  });
  const tStats = portfolioStats(targetItems);

  const equityWeight = EQUITY_BUCKETS.reduce((s, b) => s + bucketWeight[b], 0);
  const equityCap = profile.goal === "emergencia" ? 0 : equityCapFor(profile.horizonYears);
  const allowedArs = profile.horizonYears <= 1 ? 0.4 : 0.2;

  // ---------------- Diagnósticos ----------------
  const diagnostics: Diagnostic[] = [];
  const fmt = (x: number) => `${Math.round(x * 100)}%`;
  const usd = (x: number) => `US$${Math.round(x).toLocaleString("es-AR")}`;

  if (positions.length === 0) {
    diagnostics.push({ id: "vacia", severity: "media", title: "Todavía no cargaste inversiones", detail: "Agregá lo que tenés (o empezá de cero) y te armamos un plan." });
  }

  const concentrated = positions.filter((p) => !p.instrument.diversified && p.weight > 0.15);
  for (const p of concentrated) {
    diagnostics.push({
      id: `conc-${p.instrument.ticker}`,
      severity: p.weight > 0.25 ? "alta" : "media",
      title: `Mucha concentración en ${p.instrument.name}`,
      detail: `Es el ${fmt(p.weight)} de tu cartera. Si a esa empresa le va mal, arrastra todo tu objetivo. Como regla, ninguna empresa individual debería pasar el 10%.`,
      tickers: [p.instrument.ticker],
    });
  }

  const winners = positions.filter((p) => (p.holding.returnPct ?? 0) >= 100 && p.weight >= 0.005 && !p.instrument.diversified);
  for (const p of winners) {
    diagnostics.push({
      id: `win-${p.instrument.ticker}`,
      severity: "baja",
      title: `${p.instrument.name} rinde +${Math.round(p.holding.returnPct!)}%: evaluá tomar ganancias`,
      detail: `Ya multiplicaste tu inversión. No sabemos si va a seguir subiendo, pero vender una parte y pasarla a algo diversificado asegura parte de esa ganancia y baja el riesgo.`,
      tickers: [p.instrument.ticker],
    });
  }

  const losers = positions.filter((p) => (p.holding.returnPct ?? 0) <= -15 && p.instrument.risk >= 4);
  for (const p of losers) {
    diagnostics.push({
      id: `lose-${p.instrument.ticker}`,
      severity: "baja",
      title: `${p.instrument.name} pierde ${Math.round(p.holding.returnPct!)}%`,
      detail: "Preguntate si la volverías a comprar hoy. Si la respuesta es no, vender y rotar a algo alineado con tu objetivo suele ser mejor que esperar a 'recuperar'.",
      tickers: [p.instrument.ticker],
    });
  }

  const tiny = positions.filter((p) => p.weight < 0.01 && !p.instrument.diversified);
  if (tiny.length >= 2) {
    diagnostics.push({
      id: "atomizada",
      severity: "baja",
      title: `${tiny.length} posiciones muy chicas (menos del 1% cada una)`,
      detail: "No mueven la aguja en tu resultado y complican el seguimiento. Consolidarlas en un ETF simplifica la cartera.",
      tickers: tiny.map((p) => p.instrument.ticker),
    });
  }

  if (arsWeight > allowedArs && profile.goal !== "emergencia") {
    const arsPos = positions.filter((p) => p.economicCurrency === "ARS");
    const avgRate =
      arsPos.reduce((s, p) => s + p.weight * (p.holding.ratePct ?? (DEFAULT_ARS_RATE[p.instrument.ticker] ?? 0.25) * 100), 0) /
      Math.max(1e-9, arsWeight);
    diagnostics.push({
      id: "pesos",
      severity: arsWeight > 0.5 ? "alta" : "media",
      title: `El ${fmt(arsWeight)} está en pesos y tu objetivo está en dólares`,
      detail: `Tus pesos rinden cerca de ${Math.round(avgRate)}% anual. Ganás en dólares solo si el dólar sube menos que eso en el año; si hay un salto cambiario, perdés poder de compra para tu objetivo. Para plata que vas a usar en dólares conviene dolarizar gradualmente (MEP) e invertir en renta fija en USD.`,
      tickers: arsPos.map((p) => p.instrument.ticker),
    });
  }

  const liquidity = bucketWeight.liquidez;
  if (!profile.hasEmergencyFund && liquidity < 0.1 && profile.goal !== "emergencia") {
    diagnostics.push({
      id: "emergencia",
      severity: "alta",
      title: "No tenés fondo de emergencia",
      detail: "Antes de invertir para el objetivo, separá 3 a 6 meses de gastos en algo líquido (money market o caución). Así una urgencia no te obliga a vender en mal momento.",
    });
  }

  if (equityWeight > equityCap + 0.05) {
    diagnostics.push({
      id: "plazo",
      severity: equityWeight > equityCap + 0.2 ? "alta" : "media",
      title: `Demasiado riesgo para tu plazo de ${profile.horizonYears} año${profile.horizonYears === 1 ? "" : "s"}`,
      detail: `Tenés ${fmt(equityWeight)} en acciones y cripto; para usar la plata en ${profile.horizonYears} año${profile.horizonYears === 1 ? "" : "s"} recomendamos como máximo ${fmt(equityCap)}. Una caída del 25-30% justo antes de comprar te dejaría lejos del objetivo.`,
    });
  }

  const targetEquity = EQUITY_BUCKETS.reduce((s, b) => s + target[b], 0);
  if (profile.horizonYears >= 6 && equityWeight < targetEquity - 0.2) {
    diagnostics.push({
      id: "conservadora",
      severity: "media",
      title: "Tu cartera es más conservadora de lo que tu plazo permite",
      detail: `Con ${profile.horizonYears} años por delante, tener más en acciones diversificadas (ETF S&P 500) suele mejorar mucho el resultado final. Hoy tenés ${fmt(equityWeight)} vs ${fmt(targetEquity)} sugerido.`,
    });
  }

  if (argentinaRiskWeight > 0.5) {
    diagnostics.push({
      id: "riesgo_ar",
      severity: "media",
      title: `El ${fmt(argentinaRiskWeight)} depende de Argentina`,
      detail: "Pesos, bonos, ONs y acciones locales se mueven juntos en una crisis. Sumar activos globales (CEDEARs de ETFs) te protege.",
    });
  }

  const idle = positions.filter((p) => p.instrument.ticker === "PESOS" || p.instrument.ticker === "DOLARES");
  const idleW = idle.reduce((s, p) => s + p.weight, 0);
  if (idleW > 0.05) {
    diagnostics.push({
      id: "ociosa",
      severity: "media",
      title: `Tenés ${fmt(idleW)} sin invertir`,
      detail: "La plata quieta en la cuenta no rinde. Como mínimo movela a un money market o caución mientras decidís.",
      tickers: idle.map((p) => p.instrument.ticker),
    });
  }

  if (bucketWeight.cripto > 0.1) {
    diagnostics.push({
      id: "cripto",
      severity: "alta",
      title: `Cripto pesa ${fmt(bucketWeight.cripto)}`,
      detail: "Cripto puede caer 60-80%. Para un objetivo concreto, mantenela por debajo del 5%.",
    });
  }

  // ---------------- Proyección ----------------
  const goal = profile.goalAmountUsd;
  const monthly = profile.monthlyContributionUsd;
  const H = Math.max(1, profile.horizonYears);
  const showYears = Math.min(40, Math.max(H, 3));
  const projection: ProjectionPoint[] = [];
  const step = showYears <= 3 ? 1 : showYears <= 10 ? 3 : 6;
  for (let month = 0; month <= showYears * 12; month += step) {
    const y = month / 12;
    projection.push({
      month,
      year: Math.round(y * 100) / 100,
      pesimista: fv(totalUsd, monthly, scenarioReturn(stats.r, stats.vol, y, -1.28), month),
      base: fv(totalUsd, monthly, stats.r, month),
      optimista: fv(totalUsd, monthly, scenarioReturn(stats.r, stats.vol, y, 1.28), month),
      objetivoBase: fv(totalUsd, monthly, tStats.r, month),
      aportado: totalUsd + monthly * month,
    });
  }
  const yearsToGoalCurrent = yearsToReach(totalUsd, monthly, stats.r, goal);
  const yearsToGoalTarget = yearsToReach(totalUsd, monthly, tStats.r, goal);
  const requiredMonthly = requiredMonthlyFor(totalUsd, tStats.r, goal, H);

  if (goal > 0 && totalUsd > 0) {
    const reached = yearsToGoalTarget != null && yearsToGoalTarget <= H;
    diagnostics.push({
      id: "meta",
      severity: reached ? "ok" : "media",
      title: reached
        ? `Vas bien: con la cartera sugerida llegás en ~${yearsToGoalTarget!.toFixed(1)} años`
        : `Con el ritmo actual no llegás en ${H} años`,
      detail: reached
        ? `Aportando ${usd(monthly)}/mes y con un retorno esperado de ${(tStats.r * 100).toFixed(1)}% anual en dólares, alcanzás ${usd(goal)}.`
        : `Para llegar a ${usd(goal)} en ${H} años con la cartera sugerida necesitás aportar unos ${usd(requiredMonthly)}/mes${yearsToGoalTarget ? `, o esperar ~${yearsToGoalTarget.toFixed(1)} años` : ""}. Subir el riesgo para "llegar" no es buena idea con plazos cortos: mejor ajustar aporte o plazo.`,
    });
  }

  if (concentrated.length === 0 && positions.length >= 3 && totalUsd > 0) {
    diagnostics.push({ id: "divok", severity: "ok", title: "Sin concentraciones peligrosas", detail: "Ninguna empresa individual supera el 15% de tu cartera." });
  }

  // ---------------- Movimientos sugeridos ----------------
  const moves = buildMoves(positions, totalUsd, bucketUsd, target, profile, assumptions, stats.r);

  // ---------------- Estrés ----------------
  const stress: StressResult[] = SCENARIOS.map((s) => {
    const cur = positions.reduce((acc, p) => acc + p.weight * s.shock(p.instrument), 0);
    const tgt = targetItems.reduce((acc, x) => acc + x.w * s.shock(x.inst), 0);
    return { id: s.id, label: s.label, description: s.description, currentPct: cur, targetPct: tgt, currentUsd: cur * totalUsd };
  });

  // ---------------- Puntaje ----------------
  const concPenalty = positions.filter((p) => !p.instrument.diversified).reduce((s, p) => s + Math.max(0, p.weight - 0.1) * 2.5, 0);
  const distance = BUCKETS.reduce((s, b) => s + Math.abs(bucketWeight[b] - target[b]), 0) / 2;
  const parts: ScorePart[] = [
    { label: "Diversificación", value: 25 * clamp(1 - concPenalty), max: 25, note: "Que ninguna empresa pese demasiado." },
    { label: "Alineación con tu objetivo", value: 30 * clamp(1 - distance / 0.6), max: 30, note: `Hoy habría que mover ${fmt(distance)} de la cartera.` },
    { label: "Moneda correcta", value: 15 * clamp(1 - Math.max(0, arsWeight - allowedArs) / 0.5), max: 15, note: "Objetivo en dólares, ahorro en dólares." },
    { label: "Colchón de liquidez", value: profile.hasEmergencyFund ? 15 : 15 * clamp(liquidity / 0.1), max: 15, note: "Fondo de emergencia o liquidez ≥10%." },
    { label: "Riesgo acorde al plazo", value: 15 * clamp(1 - Math.max(0, equityWeight - equityCap) / 0.4), max: 15, note: `Máximo sugerido en acciones: ${fmt(equityCap)}.` },
  ];
  const scoreTotal = positions.length === 0 ? 0 : Math.round(parts.reduce((s, p) => s + p.value, 0));

  const severityOrder: Record<Severity, number> = { alta: 0, media: 1, baja: 2, ok: 3 };
  diagnostics.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    totalUsd,
    positions,
    bucketUsd,
    bucketWeight,
    target,
    arsWeight,
    argentinaRiskWeight,
    expReturn: stats.r,
    vol: stats.vol,
    targetExpReturn: tStats.r,
    targetVol: tStats.vol,
    riskLevel: Math.max(1, Math.min(10, Math.round(stats.vol * 30))),
    score: { total: scoreTotal, parts },
    diagnostics,
    moves,
    projection,
    yearsToGoalCurrent,
    yearsToGoalTarget,
    requiredMonthly,
    stress,
    equityCap,
    equityWeight,
  };
}

// ---------------------------------------------------------------------------
// Construcción de movimientos
// ---------------------------------------------------------------------------

interface Sell {
  position: Position;
  usd: number;
  kind: MoveKind;
  reason: string;
}

function buildMoves(
  positions: Position[],
  totalUsd: number,
  bucketUsd: Record<Bucket, number>,
  target: Record<Bucket, number>,
  profile: Profile,
  assumptions: Assumptions,
  currentR: number,
): Move[] {
  if (totalUsd <= 0) return [];
  const MIN_MOVE = Math.max(20, totalUsd * 0.01);
  const sells: Sell[] = [];
  const sold = new Map<string, number>();
  const addSell = (p: Position, amount: number, kind: MoveKind, reason: string) => {
    const already = sold.get(p.holding.id) ?? 0;
    const amt = Math.min(amount, p.usd - already);
    if (amt <= 0 || (kind !== "consolidar" && amt < MIN_MOVE * 0.5)) return;
    sold.set(p.holding.id, already + amt);
    sells.push({ position: p, usd: amt, kind, reason });
  };

  // Balance después de las ventas, por balde
  const remaining = { ...bucketUsd };

  // 1) Concentración: bajar a 10%
  for (const p of positions) {
    if (!p.instrument.diversified && p.weight > 0.15) {
      const amt = p.usd - totalUsd * 0.1;
      addSell(p, amt, "reducir_riesgo", `${p.instrument.name} pesa ${Math.round(p.weight * 100)}% de tu cartera: bajarlo a 10% reduce el riesgo de depender de una sola empresa.`);
    }
  }
  // 2) Ganancias grandes: vender un tercio
  for (const p of positions) {
    const ret = p.holding.returnPct ?? 0;
    if (ret >= 100 && !p.instrument.diversified && p.weight >= 0.02 && !sold.has(p.holding.id)) {
      addSell(p, p.usd / 3, "tomar_ganancia", `Rinde +${Math.round(ret)}%: vender un tercio asegura ganancia sin salir del todo.`);
    }
  }
  // 3) Posiciones muy chicas: consolidar
  const tiny = positions.filter((p) => p.weight < 0.01 && !p.instrument.diversified && !sold.has(p.holding.id));
  if (tiny.length >= 2) {
    for (const p of tiny) addSell(p, p.usd, "consolidar", `Posición muy chica (${(p.weight * 100).toFixed(1)}%): consolidarla simplifica tu cartera.`);
  }
  // 4) Plata ociosa
  for (const p of positions) {
    if ((p.instrument.ticker === "PESOS" || p.instrument.ticker === "DOLARES") && p.weight > 0.02) {
      addSell(p, p.usd, "invertir_liquidez", "Plata sin invertir: ponerla a trabajar.");
    }
  }
  for (const s of sells) remaining[s.position.bucket] -= s.usd;

  // 5) Baldes sobreponderados: vender el excedente, de la posición más grande a la más chica
  for (const b of BUCKETS) {
    const excess = remaining[b] - target[b] * totalUsd;
    if (excess <= Math.max(MIN_MOVE, totalUsd * 0.03)) continue;
    let left = excess;
    const inBucket = positions.filter((p) => p.bucket === b).sort((x, y) => {
      // Primero lo que más riesgo agrega para el objetivo: pesos si el objetivo es en USD, luego lo más grande
      const ax = x.economicCurrency === "ARS" ? 1 : 0;
      const ay = y.economicCurrency === "ARS" ? 1 : 0;
      return ay - ax || y.usd - x.usd;
    });
    for (const p of inBucket) {
      if (left <= MIN_MOVE * 0.5) break;
      const avail = p.usd - (sold.get(p.holding.id) ?? 0);
      const amt = Math.min(avail, left);
      const before = sells.length;
      addSell(
        p,
        amt,
        "rotar",
        `Tenés ${Math.round((bucketUsd[b] / totalUsd) * 100)}% en ${BUCKET_LABEL[b]} y para tu objetivo sugerimos ${Math.round(target[b] * 100)}%.`,
      );
      if (sells.length > before) {
        left -= sells[sells.length - 1].usd;
        remaining[b] -= sells[sells.length - 1].usd;
      }
    }
  }

  // Déficits por balde
  const deficits = BUCKETS.map((b) => ({ bucket: b, usd: target[b] * totalUsd - remaining[b] }))
    .filter((d) => d.usd > MIN_MOVE * 0.5)
    .sort((a, b) => b.usd - a.usd);

  const moves: Move[] = [];
  let seq = 0;

  const makeMove = (sell: Sell | null, bucket: Bucket, amount: number, extraReason?: string): Move => {
    const broker = sell?.position.holding.broker ?? profile.broker;
    const pick = pickFor(bucket, { ...profile, broker });
    const toInst = resolveInstrument(pick.ticker, "otro");
    const fromInst = sell?.position.instrument;
    const fromR = sell ? sell.position.expReturn : 0;
    const toR =
      toInst.assetClass === "liquidez_ars" || toInst.assetClass === "renta_fija_ars"
        ? (1 + (DEFAULT_ARS_RATE[toInst.assetClass] ?? 0.25)) / (1 + assumptions.expectedDevaluationPct / 100) - 1
        : toInst.expReturn;
    const guide: GuideBlock[] = [];
    if (sell && fromInst) {
      const op = operationFor(fromInst.assetClass, "sell", fromInst.ticker);
      if (op !== "mep") {
        guide.push({ title: `Salir de ${fromInst.name}`, operation: op, steps: guideSteps(broker, op, sell.position.holding.ticker) });
      }
      const needsUsd = sell.position.economicCurrency === "ARS" && !(toInst.assetClass === "liquidez_ars" || toInst.assetClass === "renta_fija_ars");
      if (needsUsd) {
        guide.push({ title: "Pasar los pesos a dólares (MEP)", operation: "mep", steps: guideSteps(broker, "mep") });
      }
    } else {
      guide.push({ title: "Ingresar el aporte", operation: "ingresar", steps: guideSteps(broker, "ingresar") });
    }
    const buyOp = operationFor(toInst.assetClass, "buy", toInst.ticker);
    guide.push({ title: `Entrar en ${toInst.name}`, operation: buyOp, steps: guideSteps(broker, buyOp, guideTicker(toInst)) });

    return {
      id: `m${++seq}`,
      broker,
      kind: sell ? sell.kind : "aporte",
      from: sell && fromInst ? { ticker: sell.position.holding.ticker, name: fromInst.name, usd: sell.position.usd } : undefined,
      to: { ticker: displayTicker(toInst), name: toInst.name, bucket },
      alternatives: pick.alternatives.map((a) => {
        const inst = findInstrument(a.ticker);
        return { ticker: inst ? displayTicker(inst) : a.ticker, name: inst?.name ?? a.ticker, note: a.note };
      }),
      amountUsd: amount,
      reason: [sell?.reason, extraReason].filter(Boolean).join(" "),
      returnDeltaPp: ((amount / totalUsd) * (toR - fromR)) * 100,
      guide,
    };
  };

  // Emparejar ventas con déficits
  const defs = deficits.map((d) => ({ ...d }));
  for (const s of sells) {
    let left = s.usd;
    for (const d of defs) {
      if (left <= 1) break;
      if (d.usd <= 1) continue;
      const amt = Math.min(left, d.usd);
      moves.push(makeMove({ ...s, usd: amt }, d.bucket, amt, `Destino: ${BUCKET_LABEL[d.bucket]} (hoy por debajo de lo sugerido).`));
      d.usd -= amt;
      left -= amt;
    }
    if (left > MIN_MOVE * 0.5) {
      // Nada falta: lo reubicamos en la alternativa diversificada de su propio tipo
      const fallback: Bucket =
        s.position.bucket === "individuales" || s.position.bucket === "argentina"
          ? target.global > 0
            ? "global"
            : "rf_usd"
          : s.position.bucket === "liquidez" && target.rf_usd > 0
            ? "rf_usd"
            : s.position.bucket;
      moves.push(makeMove({ ...s, usd: left }, fallback, left, "Pasamos a una versión diversificada del mismo tipo de activo."));
    }
  }

  // Si quedan déficits sin cubrir, se cubren con los aportes mensuales
  const uncovered = defs.filter((d) => d.usd > MIN_MOVE);
  if (profile.monthlyContributionUsd > 0) {
    for (const d of uncovered) {
      moves.push(
        makeMove(null, d.bucket, d.usd, `Te faltan ${`US$${Math.round(d.usd).toLocaleString("es-AR")}`} en ${BUCKET_LABEL[d.bucket]}: dirigí ahí tus próximos aportes (unos ${Math.max(1, Math.ceil(d.usd / profile.monthlyContributionUsd))} meses).`),
      );
    }
  }

  // Unificar movimientos con mismo origen y destino
  const merged = new Map<string, Move>();
  for (const m of moves) {
    const key = `${m.from?.ticker ?? "aporte"}→${m.to.ticker}`;
    const prev = merged.get(key);
    if (prev) {
      prev.amountUsd += m.amountUsd;
      prev.returnDeltaPp += m.returnDeltaPp;
    } else merged.set(key, m);
  }
  void currentR;

  // Todas las consolidaciones con el mismo destino se muestran como un solo movimiento
  const out: Move[] = [];
  const consolidated = new Map<string, Move>();
  for (const m of merged.values()) {
    if (m.kind !== "consolidar" || !m.from) {
      if (m.amountUsd >= MIN_MOVE * 0.5) out.push(m);
      continue;
    }
    const prev = consolidated.get(m.to.ticker);
    if (!prev) {
      consolidated.set(m.to.ticker, { ...m, from: { ...m.from }, reason: "Posiciones muy chicas (menos del 1% cada una): juntarlas en un ETF diversificado simplifica la cartera sin cambiar mucho el riesgo." });
    } else {
      prev.from = { ticker: `${prev.from!.ticker} · ${m.from.ticker}`, name: "Posiciones chicas", usd: prev.from!.usd + m.from.usd };
      prev.amountUsd += m.amountUsd;
      prev.returnDeltaPp += m.returnDeltaPp;
    }
  }
  for (const m of consolidated.values()) {
    if (m.from && m.from.ticker.includes("·")) {
      m.guide = m.guide.map((g) =>
        g.operation === "vender" ? { ...g, title: `Vender ${m.from!.ticker.split(" · ").length} posiciones chicas`, steps: guideSteps(m.broker, "vender", "cada una") } : g,
      );
    }
    out.push(m);
  }
  return out.sort((a, b) => b.amountUsd - a.amountUsd);
}

function guideTicker(inst: Instrument): string {
  if (inst.ticker === "ON") return "la ON en dólares que elijas (buscá por emisor: YPF, Pampa, Vista, TGS)";
  if (inst.ticker === "LECAP") return "una LECAP (letras que empiezan con S, ej. S30J7)";
  if (inst.ticker === "FCIUSD") return "un FCI de renta fija en dólares";
  if (inst.ticker === "MMUSD") return "un FCI money market en dólares";
  if (inst.ticker === "MONEYMARKET") return "el FCI money market en pesos";
  if (inst.ticker === "FCIACCIONES") return "un FCI de acciones argentinas";
  return displayTicker(inst);
}

/** Ticker para mostrar: CEDEARs y bonos en su especie en dólares (terminada en D). */
export function displayTicker(inst: Instrument): string {
  const usdTradable = ["cedear_etf", "cedear_accion"].includes(inst.assetClass) || (inst.tags?.includes("soberano") && inst.assetClass === "renta_fija_usd" && inst.ticker !== "BOPREAL");
  if (usdTradable && inst.ticker !== "IBIT") return `${inst.ticker}D`;
  if (inst.ticker === "IBIT") return "IBITD";
  return inst.ticker;
}

export { BROKERS };
