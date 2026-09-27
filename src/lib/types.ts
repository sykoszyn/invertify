export type Currency = "ARS" | "USD";

/** Tipo de instrumento, tal como lo muestran los brokers argentinos. */
export type AssetClass =
  | "liquidez_ars" // FCI money market / T+0 en pesos, caución, pesos en cuenta
  | "liquidez_usd" // dólares en cuenta, FCI money market USD, caución USD
  | "renta_fija_ars" // LECAP, bonos CER, plazo fijo, FCI T+1 en pesos
  | "renta_fija_usd" // bonos soberanos, ONs, FCI renta fija en dólares
  | "accion_ar" // acciones argentinas (panel líder / general)
  | "cedear_etf" // CEDEARs de ETFs diversificados (SPY, QQQ, EEM...)
  | "cedear_accion" // CEDEARs de empresas individuales
  | "cripto"
  | "otro";

/** Grandes "baldes" en los que organizamos la cartera para comparar contra el objetivo. */
export type Bucket =
  | "liquidez"
  | "rf_usd"
  | "rf_ars"
  | "global"
  | "individuales"
  | "argentina"
  | "cripto";

export type BrokerId = "cocos" | "iol" | "balanz" | "ppi" | "bullmarket" | "otro";

export type GoalType =
  | "departamento"
  | "retiro"
  | "emergencia"
  | "auto"
  | "viaje"
  | "estudios"
  | "crecer";

export type Risk = "conservador" | "moderado" | "agresivo";

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  /** Moneda en la que el usuario cargó el monto. */
  currency: Currency;
  /** Monto valorizado en la moneda indicada. */
  amount: number;
  /** Rendimiento acumulado de la posición en % (opcional, como lo muestra el broker). */
  returnPct?: number;
  /** TNA/TEA para instrumentos en pesos (FCI money market, plazo fijo...). */
  ratePct?: number;
  broker?: BrokerId;
}

export interface Profile {
  goal: GoalType;
  goalLabel?: string;
  goalAmountUsd: number;
  horizonYears: number;
  monthlyContributionUsd: number;
  risk: Risk;
  hasEmergencyFund: boolean;
  broker: BrokerId;
  age?: number;
  /** Solo para objetivo departamento. */
  usesMortgage?: boolean;
  aptZone?: string;
  aptM2?: number;
}

export interface Assumptions {
  /** Dólar MEP usado para convertir pesos a dólares. */
  mep: number;
  /** Devaluación esperada del peso contra el dólar MEP, anual (%). */
  expectedDevaluationPct: number;
}

export interface Portfolio {
  id?: string;
  name: string;
  holdings: Holding[];
  profile: Profile;
  assumptions: Assumptions;
  updatedAt?: string;
}
