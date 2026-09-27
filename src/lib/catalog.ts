import type { AssetClass, Bucket, Currency } from "./types";

export type Tag = "tech" | "soberano" | "corporativo" | "defensivo" | "tematico" | "banco" | "energia" | "oro";

export interface Instrument {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  bucket: Bucket;
  /** Retorno anual esperado en dólares (supuesto de largo plazo, no promesa). */
  expReturn: number;
  /** Volatilidad anual estimada. */
  vol: number;
  /** 1 (muy bajo) a 5 (muy alto). */
  risk: 1 | 2 | 3 | 4 | 5;
  tags?: Tag[];
  currency?: Currency;
  /** Si es un instrumento diversificado (ETF / FCI), no cuenta como concentración. */
  diversified?: boolean;
  description: string;
}

const I = (x: Instrument) => x;

/**
 * Catálogo de instrumentos habituales en brokers argentinos. Los retornos y
 * volatilidades son supuestos de largo plazo razonables, pensados para
 * simular escenarios — no son predicciones.
 */
export const CATALOG: Instrument[] = [
  // ---------- Liquidez ----------
  I({ ticker: "PESOS", name: "Pesos en cuenta", assetClass: "liquidez_ars", bucket: "liquidez", expReturn: 0, vol: 0.1, risk: 1, currency: "ARS", diversified: true, description: "Pesos sin invertir. Pierden contra la inflación: conviene moverlos a un money market o caución." }),
  I({ ticker: "DOLARES", name: "Dólares en cuenta", assetClass: "liquidez_usd", bucket: "liquidez", expReturn: 0, vol: 0, risk: 1, currency: "USD", diversified: true, description: "Dólares MEP sin invertir. Seguros pero no rinden nada." }),
  I({ ticker: "COCOSPPA", name: "Cocos Pesos Plus (FCI)", assetClass: "liquidez_ars", bucket: "liquidez", expReturn: 0.03, vol: 0.1, risk: 1, currency: "ARS", diversified: true, description: "FCI money market en pesos con rescate inmediato. Rinde una tasa en pesos (TEA) y el riesgo es que el dólar suba más que esa tasa." }),
  I({ ticker: "IOLCAMA", name: "IOL Cash Management (FCI)", assetClass: "liquidez_ars", bucket: "liquidez", expReturn: 0.03, vol: 0.1, risk: 1, currency: "ARS", diversified: true, description: "FCI money market en pesos de IOL. Ideal para tener pesos a la vista." }),
  I({ ticker: "MONEYMARKET", name: "FCI Money Market en pesos", assetClass: "liquidez_ars", bucket: "liquidez", expReturn: 0.03, vol: 0.1, risk: 1, currency: "ARS", diversified: true, description: "Fondo de liquidez inmediata en pesos. Todos los brokers tienen uno." }),
  I({ ticker: "MMUSD", name: "FCI Money Market en dólares", assetClass: "liquidez_usd", bucket: "liquidez", expReturn: 0.025, vol: 0.01, risk: 1, currency: "USD", diversified: true, description: "Fondo de liquidez en dólares: rinde poco pero es el lugar natural para el fondo de emergencia en USD." }),
  I({ ticker: "CAUCION", name: "Caución colocadora (pesos)", assetClass: "liquidez_ars", bucket: "liquidez", expReturn: 0.035, vol: 0.1, risk: 1, currency: "ARS", diversified: true, description: "Préstamo garantizado a 1-30 días en el mercado. Tasa en pesos, muy bajo riesgo de crédito." }),
  I({ ticker: "CAUCIONUSD", name: "Caución colocadora (dólares)", assetClass: "liquidez_usd", bucket: "liquidez", expReturn: 0.03, vol: 0.01, risk: 1, currency: "USD", diversified: true, description: "Caución en dólares MEP. Rinde algo más que tenerlos quietos." }),

  // ---------- Renta fija en pesos ----------
  I({ ticker: "PLAZOFIJO", name: "Plazo fijo", assetClass: "renta_fija_ars", bucket: "rf_ars", expReturn: 0.03, vol: 0.12, risk: 1, currency: "ARS", diversified: true, description: "Tasa fija en pesos a 30 días o más." }),
  I({ ticker: "LECAP", name: "LECAP (letra a tasa fija)", assetClass: "renta_fija_ars", bucket: "rf_ars", expReturn: 0.045, vol: 0.14, risk: 2, currency: "ARS", tags: ["soberano"], description: "Letra del Tesoro a tasa fija en pesos. Suele pagar algo más que un money market si mantenés hasta el vencimiento." }),
  I({ ticker: "TX26", name: "Bono CER TX26", assetClass: "renta_fija_ars", bucket: "rf_ars", expReturn: 0.04, vol: 0.15, risk: 2, currency: "ARS", tags: ["soberano"], description: "Bono que ajusta por inflación (CER). Cobertura contra inflación en pesos." }),
  I({ ticker: "FCIT1", name: "FCI Renta Fija T+1 en pesos", assetClass: "renta_fija_ars", bucket: "rf_ars", expReturn: 0.04, vol: 0.13, risk: 2, currency: "ARS", diversified: true, description: "Fondo de letras y bonos en pesos, rescate en 24 hs." }),

  // ---------- Renta fija en dólares ----------
  I({ ticker: "IOLDOLD", name: "IOL Dólar Ahorro Plus (FCI)", assetClass: "renta_fija_usd", bucket: "rf_usd", expReturn: 0.055, vol: 0.04, risk: 2, currency: "USD", diversified: true, tags: ["corporativo"], description: "FCI de renta fija en dólares (mayormente ONs y bonos cortos). Buen núcleo para ahorro en USD." }),
  I({ ticker: "FCIUSD", name: "FCI Renta Fija en dólares", assetClass: "renta_fija_usd", bucket: "rf_usd", expReturn: 0.055, vol: 0.04, risk: 2, currency: "USD", diversified: true, tags: ["corporativo"], description: "Fondo diversificado de ONs y bonos en dólares. Cada broker tiene el suyo (Cocos, Balanz, PPI, Bull Market)." }),
  I({ ticker: "ON", name: "Obligaciones Negociables (USD)", assetClass: "renta_fija_usd", bucket: "rf_usd", expReturn: 0.065, vol: 0.05, risk: 2, currency: "USD", tags: ["corporativo"], description: "Deuda de empresas argentinas (YPF, Pampa, Vista, TGS, Telecom...). Pagan cupones en dólares, típicamente 6-9% anual." }),
  I({ ticker: "AL30", name: "Bono Bonar 2030", assetClass: "renta_fija_usd", bucket: "rf_usd", expReturn: 0.085, vol: 0.12, risk: 3, currency: "USD", tags: ["soberano"], description: "Bono soberano en dólares, ley argentina. Paga cupón y amortiza." }),
  I({ ticker: "GD30", name: "Bono Global 2030", assetClass: "renta_fija_usd", bucket: "rf_usd", expReturn: 0.08, vol: 0.11, risk: 3, currency: "USD", tags: ["soberano"], description: "Bono soberano en dólares, ley Nueva York. Corto, cupón y amortización." }),
  I({ ticker: "GD35", name: "Bono Global 2035", assetClass: "renta_fija_usd", bucket: "rf_usd", expReturn: 0.1, vol: 0.16, risk: 3, currency: "USD", tags: ["soberano"], description: "Soberano largo en dólares: más rendimiento y más sensibilidad al riesgo país." }),
  I({ ticker: "GD38", name: "Bono Global 2038", assetClass: "renta_fija_usd", bucket: "rf_usd", expReturn: 0.1, vol: 0.15, risk: 3, currency: "USD", tags: ["soberano"], description: "Soberano en dólares ley NY con buen cupón." }),
  I({ ticker: "GD41", name: "Bono Global 2041", assetClass: "renta_fija_usd", bucket: "rf_usd", expReturn: 0.105, vol: 0.17, risk: 3, currency: "USD", tags: ["soberano"], description: "Soberano largo: apuesta a que baje el riesgo país." }),
  I({ ticker: "BOPREAL", name: "BOPREAL (Banco Central)", assetClass: "renta_fija_usd", bucket: "rf_usd", expReturn: 0.07, vol: 0.07, risk: 2, currency: "USD", tags: ["soberano"], description: "Bono del BCRA en dólares." }),

  // ---------- CEDEARs de ETFs ----------
  I({ ticker: "SPY", name: "SPDR S&P 500 (CEDEAR)", assetClass: "cedear_etf", bucket: "global", expReturn: 0.08, vol: 0.16, risk: 3, diversified: true, description: "Las 500 empresas más grandes de EE.UU. El núcleo recomendado de la parte de acciones." }),
  I({ ticker: "VOO", name: "Vanguard S&P 500 (CEDEAR)", assetClass: "cedear_etf", bucket: "global", expReturn: 0.08, vol: 0.16, risk: 3, diversified: true, description: "Igual que SPY, con menor comisión de administración." }),
  I({ ticker: "QQQ", name: "Invesco Nasdaq 100 (CEDEAR)", assetClass: "cedear_etf", bucket: "global", expReturn: 0.095, vol: 0.22, risk: 4, diversified: true, tags: ["tech"], description: "Las 100 mayores tecnológicas del Nasdaq. Más crecimiento y más volatilidad que el S&P 500." }),
  I({ ticker: "DIA", name: "SPDR Dow Jones (CEDEAR)", assetClass: "cedear_etf", bucket: "global", expReturn: 0.075, vol: 0.15, risk: 3, diversified: true, description: "30 grandes empresas de EE.UU." }),
  I({ ticker: "IWM", name: "iShares Russell 2000 (CEDEAR)", assetClass: "cedear_etf", bucket: "global", expReturn: 0.08, vol: 0.22, risk: 4, diversified: true, description: "Empresas chicas de EE.UU." }),
  I({ ticker: "EEM", name: "iShares Emergentes (CEDEAR)", assetClass: "cedear_etf", bucket: "global", expReturn: 0.075, vol: 0.2, risk: 4, diversified: true, description: "Mercados emergentes: China, India, Taiwán, Brasil..." }),
  I({ ticker: "EWZ", name: "iShares Brasil (CEDEAR)", assetClass: "cedear_etf", bucket: "global", expReturn: 0.08, vol: 0.3, risk: 4, diversified: true, description: "Acciones brasileñas." }),
  I({ ticker: "ACWI", name: "iShares MSCI World (CEDEAR)", assetClass: "cedear_etf", bucket: "global", expReturn: 0.075, vol: 0.15, risk: 3, diversified: true, description: "Acciones de todo el mundo en un solo instrumento." }),
  I({ ticker: "XLE", name: "Energy Select (CEDEAR)", assetClass: "cedear_etf", bucket: "individuales", expReturn: 0.07, vol: 0.25, risk: 4, diversified: true, tags: ["energia"], description: "Sector energético de EE.UU." }),
  I({ ticker: "GLD", name: "SPDR Gold (CEDEAR)", assetClass: "cedear_etf", bucket: "rf_usd", expReturn: 0.04, vol: 0.15, risk: 3, diversified: true, tags: ["oro"], description: "Oro. Diversificador y cobertura en crisis." }),
  I({ ticker: "ARKK", name: "ARK Innovation (CEDEAR)", assetClass: "cedear_etf", bucket: "individuales", expReturn: 0.09, vol: 0.45, risk: 5, tags: ["tech", "tematico"], description: "ETF temático de innovación, muy volátil. Tratalo como una apuesta, no como núcleo." }),
  I({ ticker: "IBIT", name: "iShares Bitcoin Trust (CEDEAR)", assetClass: "cripto", bucket: "cripto", expReturn: 0.12, vol: 0.6, risk: 5, description: "Bitcoin a través de un ETF, operable como CEDEAR." }),

  // ---------- CEDEARs de empresas ----------
  I({ ticker: "AAPL", name: "Apple", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.085, vol: 0.28, risk: 4, tags: ["tech"], description: "Tecnología de consumo." }),
  I({ ticker: "MSFT", name: "Microsoft", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.09, vol: 0.26, risk: 4, tags: ["tech"], description: "Software y nube." }),
  I({ ticker: "GOOGL", name: "Alphabet (Google)", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.09, vol: 0.3, risk: 4, tags: ["tech"], description: "Buscador, publicidad, nube e IA." }),
  I({ ticker: "AMZN", name: "Amazon", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.09, vol: 0.32, risk: 4, tags: ["tech"], description: "E-commerce y nube (AWS)." }),
  I({ ticker: "META", name: "Meta Platforms", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.09, vol: 0.38, risk: 4, tags: ["tech"], description: "Facebook, Instagram, WhatsApp." }),
  I({ ticker: "NVDA", name: "Nvidia", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.1, vol: 0.5, risk: 5, tags: ["tech"], description: "Chips para IA. Mucho crecimiento, mucha volatilidad." }),
  I({ ticker: "AMD", name: "Advanced Micro Devices", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.095, vol: 0.5, risk: 5, tags: ["tech"], description: "Semiconductores. Muy volátil." }),
  I({ ticker: "TSLA", name: "Tesla", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.08, vol: 0.6, risk: 5, tags: ["tech"], description: "Autos eléctricos y energía. Extremadamente volátil." }),
  I({ ticker: "MELI", name: "MercadoLibre", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.1, vol: 0.4, risk: 5, tags: ["tech"], description: "E-commerce y fintech en Latinoamérica." }),
  I({ ticker: "PYPL", name: "PayPal", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.07, vol: 0.38, risk: 4, tags: ["tech"], description: "Pagos digitales." }),
  I({ ticker: "KO", name: "Coca-Cola", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.065, vol: 0.16, risk: 2, tags: ["defensivo"], description: "Consumo defensivo, paga dividendos." }),
  I({ ticker: "MCD", name: "McDonald's", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.065, vol: 0.18, risk: 2, tags: ["defensivo"], description: "Consumo defensivo." }),
  I({ ticker: "PFE", name: "Pfizer", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.06, vol: 0.24, risk: 3, tags: ["defensivo"], description: "Farmacéutica." }),
  I({ ticker: "JNJ", name: "Johnson & Johnson", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.06, vol: 0.16, risk: 2, tags: ["defensivo"], description: "Salud, defensiva." }),
  I({ ticker: "WMT", name: "Walmart", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.065, vol: 0.18, risk: 2, tags: ["defensivo"], description: "Consumo masivo." }),
  I({ ticker: "BRKB", name: "Berkshire Hathaway", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.075, vol: 0.18, risk: 3, diversified: true, description: "El holding de Warren Buffett: diversificado por dentro." }),
  I({ ticker: "JPM", name: "JPMorgan", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.075, vol: 0.25, risk: 3, tags: ["banco"], description: "Banco más grande de EE.UU." }),
  I({ ticker: "V", name: "Visa", assetClass: "cedear_accion", bucket: "individuales", expReturn: 0.08, vol: 0.2, risk: 3, description: "Pagos." }),
  I({ ticker: "VIST", name: "Vista Energy", assetClass: "cedear_accion", bucket: "argentina", expReturn: 0.1, vol: 0.45, risk: 5, tags: ["energia"], description: "Petrolera argentina (Vaca Muerta), cotiza en Nueva York." }),

  // ---------- Acciones argentinas ----------
  I({ ticker: "GGAL", name: "Grupo Financiero Galicia", assetClass: "accion_ar", bucket: "argentina", expReturn: 0.1, vol: 0.5, risk: 5, tags: ["banco"], description: "Banco argentino. Muy sensible a la macro local." }),
  I({ ticker: "BMA", name: "Banco Macro", assetClass: "accion_ar", bucket: "argentina", expReturn: 0.1, vol: 0.5, risk: 5, tags: ["banco"], description: "Banco argentino." }),
  I({ ticker: "YPFD", name: "YPF", assetClass: "accion_ar", bucket: "argentina", expReturn: 0.1, vol: 0.5, risk: 5, tags: ["energia"], description: "Petrolera estatal, Vaca Muerta." }),
  I({ ticker: "PAMP", name: "Pampa Energía", assetClass: "accion_ar", bucket: "argentina", expReturn: 0.1, vol: 0.45, risk: 5, tags: ["energia"], description: "Energía y generación eléctrica." }),
  I({ ticker: "TGSU2", name: "Transportadora Gas del Sur", assetClass: "accion_ar", bucket: "argentina", expReturn: 0.1, vol: 0.45, risk: 5, tags: ["energia"], description: "Transporte de gas." }),
  I({ ticker: "CEPU", name: "Central Puerto", assetClass: "accion_ar", bucket: "argentina", expReturn: 0.09, vol: 0.45, risk: 5, tags: ["energia"], description: "Generación eléctrica." }),
  I({ ticker: "TXAR", name: "Ternium Argentina", assetClass: "accion_ar", bucket: "argentina", expReturn: 0.08, vol: 0.4, risk: 5, description: "Acero." }),
  I({ ticker: "ALUA", name: "Aluar", assetClass: "accion_ar", bucket: "argentina", expReturn: 0.08, vol: 0.4, risk: 5, description: "Aluminio." }),
  I({ ticker: "FCIACCIONES", name: "FCI de acciones argentinas", assetClass: "accion_ar", bucket: "argentina", expReturn: 0.1, vol: 0.42, risk: 5, diversified: true, description: "Fondo diversificado del panel líder argentino." }),

  // ---------- Cripto ----------
  I({ ticker: "BTC", name: "Bitcoin", assetClass: "cripto", bucket: "cripto", expReturn: 0.12, vol: 0.6, risk: 5, description: "La cripto más grande. Máximo 5% de la cartera para perfiles agresivos." }),
  I({ ticker: "ETH", name: "Ethereum", assetClass: "cripto", bucket: "cripto", expReturn: 0.12, vol: 0.75, risk: 5, description: "Segunda cripto por tamaño." }),
  I({ ticker: "USDT", name: "Tether (dólar cripto)", assetClass: "liquidez_usd", bucket: "liquidez", expReturn: 0, vol: 0.01, risk: 2, currency: "USD", diversified: true, description: "Stablecoin atada al dólar." }),
];

const BY_TICKER = new Map(CATALOG.map((i) => [i.ticker, i]));

/** Valores por defecto para instrumentos que no están en el catálogo. */
export const CLASS_DEFAULTS: Record<AssetClass, Omit<Instrument, "ticker" | "name" | "assetClass" | "description">> = {
  liquidez_ars: { bucket: "liquidez", expReturn: 0.03, vol: 0.1, risk: 1, diversified: true, currency: "ARS" },
  liquidez_usd: { bucket: "liquidez", expReturn: 0.02, vol: 0.01, risk: 1, diversified: true, currency: "USD" },
  renta_fija_ars: { bucket: "rf_ars", expReturn: 0.04, vol: 0.14, risk: 2, currency: "ARS" },
  renta_fija_usd: { bucket: "rf_usd", expReturn: 0.07, vol: 0.08, risk: 2, currency: "USD" },
  accion_ar: { bucket: "argentina", expReturn: 0.1, vol: 0.45, risk: 5 },
  cedear_etf: { bucket: "global", expReturn: 0.08, vol: 0.18, risk: 3, diversified: true },
  cedear_accion: { bucket: "individuales", expReturn: 0.08, vol: 0.32, risk: 4 },
  cripto: { bucket: "cripto", expReturn: 0.12, vol: 0.65, risk: 5 },
  otro: { bucket: "individuales", expReturn: 0.05, vol: 0.2, risk: 3 },
};

/**
 * Normaliza tickers como los muestran los brokers: "NVDAD" (CEDEAR en dólares
 * MEP), "KOC" (en dólares cable), "GD30D", etc. → ticker base del catálogo.
 */
export function normalizeTicker(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/[\s.]/g, "");
  if (BY_TICKER.has(t)) return t;
  if (t.length > 2 && (t.endsWith("D") || t.endsWith("C"))) {
    const base = t.slice(0, -1);
    if (BY_TICKER.has(base)) return base;
  }
  // YPF en BYMA figura como YPFD; "YPF" también se usa.
  if (t === "YPF") return "YPFD";
  return t;
}

export function findInstrument(ticker: string): Instrument | undefined {
  return BY_TICKER.get(normalizeTicker(ticker));
}

export function resolveInstrument(ticker: string, assetClass: AssetClass, name?: string): Instrument {
  const found = findInstrument(ticker);
  if (found) return found;
  return {
    ticker: normalizeTicker(ticker),
    name: name || ticker,
    assetClass,
    description: "Instrumento fuera del catálogo: usamos supuestos genéricos para su tipo.",
    ...CLASS_DEFAULTS[assetClass],
  };
}

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  liquidez_ars: "Liquidez en pesos",
  liquidez_usd: "Liquidez en dólares",
  renta_fija_ars: "Renta fija en pesos",
  renta_fija_usd: "Renta fija en dólares",
  accion_ar: "Acción argentina",
  cedear_etf: "CEDEAR de ETF",
  cedear_accion: "CEDEAR de empresa",
  cripto: "Cripto",
  otro: "Otro",
};

export const BUCKET_LABEL: Record<Bucket, string> = {
  liquidez: "Liquidez",
  rf_usd: "Renta fija USD",
  rf_ars: "Renta fija pesos",
  global: "Acciones globales (ETF)",
  individuales: "Acciones individuales",
  argentina: "Argentina (acciones)",
  cripto: "Cripto",
};

export const BUCKET_DESC: Record<Bucket, string> = {
  liquidez: "Plata disponible ya: money market, caución, dólares en cuenta.",
  rf_usd: "Bonos, ONs y fondos en dólares: ingresos previsibles en USD.",
  rf_ars: "LECAPs, bonos CER, plazo fijo: tasa en pesos.",
  global: "ETFs diversificados como el S&P 500: el motor de crecimiento.",
  individuales: "Empresas puntuales (Apple, Nvidia...) y ETFs temáticos.",
  argentina: "Acciones locales: mucho potencial y mucho riesgo país.",
  cripto: "Bitcoin y otras: alto riesgo, porción chica.",
};

/** Nombres en lenguaje cotidiano, para gente que recién empieza. */
export const BUCKET_FRIENDLY: Record<Bucket, { emoji: string; name: string; plain: string }> = {
  liquidez: { emoji: "💵", name: "Plata disponible", plain: "La podés sacar cuando quieras. Rinde poco." },
  rf_usd: { emoji: "🛡️", name: "Ahorro en dólares que paga interés", plain: "Bonos y fondos en USD: se mueven poco y pagan un interés." },
  rf_ars: { emoji: "📄", name: "Tasa en pesos", plain: "Plazo fijo, letras: rinden en pesos." },
  global: { emoji: "🌎", name: "Acciones de todo el mundo", plain: "Cientos de empresas juntas (como el S&P 500). Crecen en el largo plazo." },
  individuales: { emoji: "🏢", name: "Empresas puntuales", plain: "Apple, Nvidia, Coca-Cola… Más riesgo que un fondo de muchas." },
  argentina: { emoji: "🇦🇷", name: "Acciones argentinas", plain: "Pueden subir mucho o caer mucho según la economía del país." },
  cripto: { emoji: "🪙", name: "Cripto", plain: "Bitcoin y similares. Muy volátil: solo una porción chica." },
};

export const BUCKETS: Bucket[] = ["liquidez", "rf_usd", "rf_ars", "global", "individuales", "argentina", "cripto"];
