import type { Assumptions, Holding, Profile } from "./types";

/** Cartera de ejemplo (IOL + Cocos) para probar la app sin cargar nada. */
export const SAMPLE_HOLDINGS: Holding[] = [
  { id: "s1", ticker: "IOLDOLD", name: "IOL Dólar Ahorro Plus", assetClass: "renta_fija_usd", currency: "USD", amount: 7872.96, returnPct: 2.32, broker: "iol" },
  { id: "s2", ticker: "IOLCAMA", name: "IOL Cash Management", assetClass: "liquidez_ars", currency: "USD", amount: 14.05, returnPct: 1.13, broker: "iol" },
  { id: "s3", ticker: "SPYD", name: "SPDR S&P 500", assetClass: "cedear_etf", currency: "USD", amount: 3187.65, returnPct: 44.46, broker: "iol" },
  { id: "s4", ticker: "PFED", name: "Pfizer", assetClass: "cedear_accion", currency: "USD", amount: 215.47, returnPct: 9.93, broker: "iol" },
  { id: "s5", ticker: "AMDD", name: "Advanced Micro Devices", assetClass: "cedear_accion", currency: "USD", amount: 197.1, returnPct: 442.83, broker: "iol" },
  { id: "s6", ticker: "NVDAD", name: "Nvidia", assetClass: "cedear_accion", currency: "USD", amount: 88.29, returnPct: 71.89, broker: "iol" },
  { id: "s7", ticker: "KOD", name: "Coca-Cola", assetClass: "cedear_accion", currency: "USD", amount: 36.7, returnPct: 44.44, broker: "iol" },
  { id: "s8", ticker: "MCDD", name: "McDonald's", assetClass: "cedear_accion", currency: "USD", amount: 20.76, returnPct: -13.33, broker: "iol" },
  { id: "s9", ticker: "ARKKD", name: "ARK Innovation", assetClass: "cedear_etf", currency: "USD", amount: 9.57, returnPct: 108.24, broker: "iol" },
  { id: "s10", ticker: "PYPLD", name: "PayPal", assetClass: "cedear_accion", currency: "USD", amount: 7.2, returnPct: 40.63, broker: "iol" },
  { id: "s11", ticker: "GGALD", name: "Grupo Financiero Galicia", assetClass: "accion_ar", currency: "USD", amount: 462.84, returnPct: -14.35, broker: "iol" },
  { id: "s12", ticker: "COCOSPPA", name: "Cocos Pesos Plus", assetClass: "liquidez_ars", currency: "ARS", amount: 12404346.69, ratePct: 26, broker: "cocos" },
];

export const SAMPLE_PROFILE: Profile = {
  goal: "departamento",
  goalAmountUsd: 124200,
  horizonYears: 5,
  monthlyContributionUsd: 800,
  risk: "moderado",
  hasEmergencyFund: false,
  broker: "iol",
  usesMortgage: false,
  aptZone: "caba_media",
  aptM2: 50,
};

export const DEFAULT_ASSUMPTIONS: Assumptions = { mep: 1450, expectedDevaluationPct: 20 };
