import type { AssetClass, BrokerId } from "./types";

export type Operation =
  | "comprar"
  | "vender"
  | "fci_suscribir"
  | "fci_rescatar"
  | "mep"
  | "caucion"
  | "ingresar"
  | "cripto";

export interface Broker {
  id: BrokerId;
  name: string;
  url: string;
  /** Cómo se llama la sección para operar / buscar instrumentos. */
  tradeMenu: string;
  /** Dónde ver la cartera. */
  portfolioMenu: string;
  /** Dónde está la sección de fondos. */
  fundsMenu: string;
  highlights: string[];
  tips: string[];
}

export const BROKERS: Record<BrokerId, Broker> = {
  cocos: {
    id: "cocos",
    name: "Cocos Capital",
    url: "https://cocos.capital",
    tradeMenu: "Mercado (buscá con la lupa)",
    portfolioMenu: "Cartera",
    fundsMenu: "la sección de fondos / Cocos Pesos Plus",
    highlights: ["App simple y rápida", "Cocos Pesos Plus para pesos a la vista", "Dólar MEP en pocos toques"],
    tips: [
      "Cocos Pesos Plus sirve como cuenta remunerada: los pesos que no uses dejalos ahí, no en la cuenta.",
      "Para comprar CEDEARs en dólares elegí la especie en USD (ticker terminado en D).",
    ],
  },
  iol: {
    id: "iol",
    name: "InvertirOnline (IOL)",
    url: "https://www.invertironline.com",
    tradeMenu: "Invertir",
    portfolioMenu: "Mis inversiones",
    fundsMenu: "Invertir → Fondos comunes",
    highlights: ["Uno de los brokers más grandes", "FCIs propios: IOL Cash Management, IOL Dólar Ahorro Plus", "Filtros por Acciones, CEDEARs y Fondos"],
    tips: [
      "En 'Mis inversiones' podés filtrar por Acciones, CEDEARs y Fondos comunes para ver cada parte.",
      "En la orden elegí el plazo: 'Contado inmediato' liquida hoy; '24 hs' suele tener mejor precio.",
    ],
  },
  balanz: {
    id: "balanz",
    name: "Balanz",
    url: "https://balanz.com",
    tradeMenu: "Operar",
    portfolioMenu: "Mi cartera / Tenencia",
    fundsMenu: "Operar → Fondos",
    highlights: ["Amplia oferta de FCIs propios", "Buena app para bonos y ONs", "Research y carteras modelo"],
    tips: [
      "Balanz tiene familias de fondos por perfil (money market, renta fija en dólares, renta variable).",
      "Para bonos y ONs revisá la TIR y la fecha de pago de cupón antes de comprar.",
    ],
  },
  ppi: {
    id: "ppi",
    name: "Portfolio Personal Inversiones (PPI)",
    url: "https://www.portfoliopersonal.com",
    tradeMenu: "Operar",
    portfolioMenu: "Cartera",
    fundsMenu: "Operar → Fondos",
    highlights: ["Plataforma muy completa", "Buen acceso a renta fija y ONs", "Informes de mercado"],
    tips: [
      "PPI permite operar cuenta en el exterior además de la local: verificá en qué cuenta estás.",
      "Usá órdenes con precio límite en bonos poco líquidos.",
    ],
  },
  bullmarket: {
    id: "bullmarket",
    name: "Bull Market Brokers",
    url: "https://www.bullmarketbrokers.com",
    tradeMenu: "Operar / Cotizaciones",
    portfolioMenu: "Mi cuenta → Tenencia",
    fundsMenu: "Fondos",
    highlights: ["Muy usado para CEDEARs", "Comisiones competitivas", "Cuenta en el exterior disponible"],
    tips: ["Desde 'Cotizaciones' podés ver el panel de CEDEARs y operar directo desde ahí."],
  },
  otro: {
    id: "otro",
    name: "Otro broker",
    url: "",
    tradeMenu: "la sección para operar",
    portfolioMenu: "tu cartera / tenencia",
    fundsMenu: "la sección de fondos (FCI)",
    highlights: [],
    tips: ["Todos los brokers ALyC argentinos operan en el mismo mercado (BYMA): los tickers son los mismos."],
  },
};

export const BROKER_LIST = Object.values(BROKERS);

export const OPERATION_LABEL: Record<Operation, string> = {
  comprar: "Comprar CEDEARs, acciones, bonos u ONs",
  vender: "Vender CEDEARs, acciones, bonos u ONs",
  fci_suscribir: "Invertir en un Fondo Común (FCI)",
  fci_rescatar: "Rescatar (retirar) un FCI",
  mep: "Comprar o vender dólar MEP",
  caucion: "Colocar plata en caución",
  ingresar: "Ingresar dinero al broker",
  cripto: "Exposición a cripto",
};

export function guideSteps(brokerId: BrokerId, op: Operation, ticker?: string): string[] {
  const b = BROKERS[brokerId];
  const tk = ticker ? `"${ticker}"` : "el ticker";
  switch (op) {
    case "ingresar":
      return [
        `Entrá a ${b.name} y buscá la opción 'Ingresar dinero' o 'Depositar'.`,
        "Copiá el CBU/CVU de tu cuenta comitente (en pesos o en dólares según la moneda).",
        "Transferí desde tu banco o billetera a nombre propio (tiene que ser una cuenta tuya).",
        "La plata se acredita en minutos o en el día. Si sobra, movela al money market para que rinda.",
      ];
    case "comprar":
      return [
        `Abrí ${b.tradeMenu} y buscá ${tk}.`,
        "Elegí la especie en la moneda que querés usar: en pesos (ticker normal) o en dólares MEP (ticker terminado en D, ej. SPYD).",
        "Tocá 'Comprar' y elegí plazo de liquidación: Contado inmediato (CI) o 24 hs.",
        "Ingresá el monto o la cantidad. Preferí una orden con precio límite cercano al último precio para no pagar de más.",
        "Revisá comisión y total, y confirmá. La posición aparece en " + b.portfolioMenu + ".",
      ];
    case "vender":
      return [
        `Andá a ${b.portfolioMenu} y tocá ${tk}.`,
        "Tocá 'Vender'. Si querés recibir dólares, vendé la especie en dólares (ticker con D); si no, recibís pesos.",
        "Elegí plazo (CI o 24 hs) y cantidad. Para ventas parciales indicá solo las unidades a vender.",
        "Poné precio límite o a mercado si es un activo líquido, y confirmá.",
        "El dinero queda disponible en tu cuenta: no lo dejes quieto, usalo en el paso siguiente.",
      ];
    case "fci_suscribir":
      return [
        `Entrá a ${b.fundsMenu}.`,
        `Buscá ${ticker ? tk : "el fondo"} y revisá: moneda, plazo de rescate (T+0, T+1...) y perfil de riesgo.`,
        "Tocá 'Suscribir' o 'Invertir' e ingresá el monto.",
        "Aceptá el reglamento de gestión y confirmá. Las cuotapartes se asignan al valor del día.",
      ];
    case "fci_rescatar":
      return [
        `Andá a ${b.portfolioMenu} → Fondos y tocá ${tk}.`,
        "Tocá 'Rescatar'. Podés rescatar un monto parcial o el total.",
        "Tené en cuenta el plazo: T+0 acredita en el día, T+1 al día hábil siguiente, T+2 a los dos días.",
        "Cuando se acredite, usá ese dinero para la compra que corresponda.",
      ];
    case "mep":
      return [
        `En ${b.name} buscá la opción 'Dólar MEP' (la mayoría de las apps la tienen como atajo).`,
        "Si no hay atajo: comprá el bono AL30 en pesos y, una vez acreditado, vendé AL30D (en dólares).",
        "Verificá si aplica algún plazo mínimo de tenencia entre la compra y la venta según la normativa vigente.",
        "Los dólares MEP quedan en tu cuenta comitente: podés invertirlos en CEDEARs en USD, ONs, bonos o fondos en dólares.",
      ];
    case "caucion":
      return [
        `Buscá 'Caución' en ${b.tradeMenu}.`,
        "Elegí 'Colocadora', la moneda (pesos o dólares) y el plazo en días (1 a 30).",
        "Mirá la tasa (TNA) y el monto: al vencimiento recibís capital + interés automáticamente.",
        "Confirmá. Es la alternativa al money market cuando la tasa de caución es mejor.",
      ];
    case "cripto":
      return [
        `Para tener Bitcoin sin salir de ${b.name}, podés comprar el CEDEAR IBIT (ETF de Bitcoin).`,
        "Se opera igual que cualquier CEDEAR: buscá IBIT, elegí moneda y comprá.",
        "Mantené cripto por debajo del 5% de tu cartera: puede caer 50% o más.",
      ];
  }
}

/** Qué operación usar para salir o entrar de un tipo de instrumento. */
export function operationFor(assetClass: AssetClass, side: "buy" | "sell", ticker?: string): Operation {
  const t = (ticker || "").toUpperCase();
  const isFund =
    t.startsWith("FCI") || ["COCOSPPA", "IOLCAMA", "IOLDOLD", "MONEYMARKET", "MMUSD", "FCIACCIONES"].includes(t);
  if (t === "CAUCION" || t === "CAUCIONUSD") return "caucion";
  if (t === "DOLARES" || t === "PESOS") return "mep";
  if (isFund) return side === "buy" ? "fci_suscribir" : "fci_rescatar";
  if (assetClass === "cripto" && t !== "IBIT") return side === "buy" ? "cripto" : "vender";
  return side === "buy" ? "comprar" : "vender";
}
