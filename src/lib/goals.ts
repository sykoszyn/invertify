import type { GoalType } from "./types";

export interface GoalInfo {
  id: GoalType;
  label: string;
  emoji: string;
  defaultAmountUsd: number;
  defaultHorizon: number;
  hint: string;
}

export const GOALS: GoalInfo[] = [
  { id: "departamento", label: "Comprar un departamento", emoji: "🏠", defaultAmountUsd: 110000, defaultHorizon: 5, hint: "Calculamos el valor según zona y metros, más gastos de escritura." },
  { id: "retiro", label: "Retiro / jubilación", emoji: "🌴", defaultAmountUsd: 300000, defaultHorizon: 25, hint: "Largo plazo: el tiempo juega a tu favor." },
  { id: "emergencia", label: "Fondo de emergencia", emoji: "🛟", defaultAmountUsd: 6000, defaultHorizon: 1, hint: "3 a 6 meses de gastos, siempre disponibles." },
  { id: "auto", label: "Comprar un auto", emoji: "🚗", defaultAmountUsd: 22000, defaultHorizon: 2, hint: "Corto plazo: priorizamos no perder." },
  { id: "viaje", label: "Un viaje", emoji: "✈️", defaultAmountUsd: 5000, defaultHorizon: 1, hint: "Plata que vas a usar pronto: poco riesgo." },
  { id: "estudios", label: "Estudios / hijos", emoji: "🎓", defaultAmountUsd: 40000, defaultHorizon: 10, hint: "Horizonte medio con fecha fija." },
  { id: "crecer", label: "Hacer crecer mi plata", emoji: "📈", defaultAmountUsd: 50000, defaultHorizon: 7, hint: "Sin fecha fija: maximizar retorno según tu riesgo." },
];

export const GOAL_BY_ID = Object.fromEntries(GOALS.map((g) => [g.id, g])) as Record<GoalType, GoalInfo>;

export interface Zone {
  id: string;
  label: string;
  /** Precio de referencia en USD por m² (departamentos usados). */
  usdPerM2: number;
}

/**
 * Referencias aproximadas de precio de publicación para departamentos usados.
 * Son valores orientativos: conviene verificar en Zonaprop / Argenprop / reportes del mercado.
 */
export const ZONES: Zone[] = [
  { id: "caba_premium", label: "CABA · Palermo, Belgrano, Núñez, Recoleta", usdPerM2: 3000 },
  { id: "caba_media", label: "CABA · Caballito, Villa Urquiza, Almagro", usdPerM2: 2300 },
  { id: "caba_sur", label: "CABA · zona sur / oeste", usdPerM2: 1700 },
  { id: "gba_norte", label: "GBA Norte (Vicente López, San Isidro)", usdPerM2: 2400 },
  { id: "gba_oeste_sur", label: "GBA Oeste / Sur", usdPerM2: 1400 },
  { id: "cordoba", label: "Córdoba capital", usdPerM2: 1300 },
  { id: "rosario", label: "Rosario", usdPerM2: 1300 },
  { id: "mendoza", label: "Mendoza", usdPerM2: 1200 },
  { id: "la_plata", label: "La Plata", usdPerM2: 1400 },
  { id: "mdp", label: "Mar del Plata", usdPerM2: 1500 },
];

/** Gastos de compra aproximados: escribano, sellos, comisión inmobiliaria. */
export const PURCHASE_COSTS_PCT = 0.08;
/** Anticipo típico que piden los bancos en un crédito hipotecario UVA. */
export const MORTGAGE_DOWN_PAYMENT_PCT = 0.25;

export function apartmentTarget(zoneId: string, m2: number, usesMortgage: boolean) {
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[1];
  const price = Math.round(zone.usdPerM2 * m2);
  const costs = Math.round(price * PURCHASE_COSTS_PCT);
  const downPayment = usesMortgage ? Math.round(price * MORTGAGE_DOWN_PAYMENT_PCT) : price;
  const loan = usesMortgage ? price - downPayment : 0;
  return { zone, price, costs, downPayment, loan, needed: downPayment + costs };
}
