import { BROKERS } from "./brokers";
import { BUCKET_FRIENDLY } from "./catalog";
import type { Analysis } from "./engine";
import { pct, usd, years } from "./format";
import { GOAL_BY_ID, MORTGAGE_DOWN_PAYMENT_PCT } from "./goals";
import type { Portfolio } from "./types";

export interface Faq {
  id: string;
  q: string;
  /** Párrafos; los que empiezan con "• " se muestran como lista. */
  a: string[];
}

const EQUITY = ["global", "individuales", "argentina", "cripto"] as const;

/**
 * Asesor sin IA: preguntas frecuentes respondidas con los números de la cartera de la persona.
 * Todo sale del análisis del motor, así que es instantáneo, gratis y consistente con el plan.
 */
export function buildFaq(a: Analysis, p: Portfolio): Faq[] {
  const { profile, assumptions } = p;
  const goal = GOAL_BY_ID[profile.goal];
  const broker = BROKERS[profile.broker];
  const out: Faq[] = [];
  const hasPositions = a.positions.length > 0;

  // 1. Por dónde empiezo
  if (a.moves.length) {
    const m = a.moves[0];
    out.push({
      id: "empezar",
      q: "¿Por dónde empiezo?",
      a: [
        `Empezá por el movimiento más grande: ${m.from ? `pasar ${usd(m.amountUsd)} de ${m.from.ticker} a ${m.to.ticker}` : `invertir ${usd(m.amountUsd)} en ${m.to.ticker}`} (${m.to.name}).`,
        m.reason,
        `En ${BROKERS[m.broker].name} se hace así:`,
        ...m.guide.flatMap((g) => [`${g.title}:`, ...g.steps.map((s) => `• ${s}`)]),
        a.moves.length > 1 ? `Después seguí con los otros ${a.moves.length - 1} movimientos del plan. No hace falta hacer todo el mismo día.` : "",
      ].filter(Boolean),
    });
  } else {
    out.push({
      id: "empezar",
      q: "¿Por dónde empiezo?",
      a: hasPositions
        ? ["Tu cartera ya está bien repartida para tu objetivo. Lo más importante ahora es aportar todos los meses y revisarla cada 3 a 6 meses."]
        : ["Cargá lo que tenés en el paso 1 (o empezá de cero) y te armamos el plan."],
    });
  }

  // 2. Por qué estos cambios
  const important = a.diagnostics.filter((d) => d.severity === "alta" || d.severity === "media");
  out.push({
    id: "porque",
    q: "¿Por qué me sugerís estos cambios?",
    a: important.length
      ? [
          `Tu objetivo es ${goal.label.toLowerCase()} (${usd(profile.goalAmountUsd)}) en ${profile.horizonYears} año${profile.horizonYears === 1 ? "" : "s"}, con perfil ${profile.risk}. Para eso, lo que más pesa hoy es:`,
          ...important.map((d) => `• ${d.title}. ${d.detail}`),
          `Con el plan, la ganancia estimada pasa de ${usd(a.totalUsd * a.expReturn)} a ${usd(a.totalUsd * a.targetExpReturn)} por año.`,
        ]
      : ["No vemos problemas importantes. Los cambios sugeridos son ajustes finos para que el reparto coincida con tu objetivo y tu plazo."],
  });

  // 3. Pesos
  const arsPositions = a.positions.filter((x) => x.economicCurrency === "ARS");
  if (arsPositions.length) {
    const arsUsd = arsPositions.reduce((s, x) => s + x.usd, 0);
    const rate = arsPositions[0].holding.ratePct ?? 25;
    const toUsd = a.moves.filter((m) => m.from && arsPositions.some((x) => x.holding.ticker === m.from!.ticker));
    out.push({
      id: "pesos",
      q: "¿Qué hago con mis pesos?",
      a: [
        `Tenés ${usd(arsUsd)} en pesos (${pct(a.arsWeight)} de tu cartera), rindiendo cerca de ${rate}% anual.`,
        `La cuenta es simple: si en el año el dólar sube menos de ${rate}%, ganás en dólares; si sube más, perdés. Nosotros estamos suponiendo una suba del dólar de ${assumptions.expectedDevaluationPct}% (lo podés cambiar en el paso 2).`,
        `Como tu meta (${goal.label.toLowerCase()}) se paga en dólares, conviene dejar en pesos solo lo que vas a gastar pronto y pasar el resto a dólares MEP de a poco.`,
        ...(toUsd.length ? ["El plan propone:", ...toUsd.map((m) => `• ${usd(m.amountUsd)} de ${m.from!.ticker} a ${m.to.ticker} (${m.to.name}).`)] : []),
        "Tip: pasar a dólares en 2 o 3 tandas (una por semana o por mes) evita hacerlo justo en un mal día.",
      ],
    });
  }

  // 4. Ganancias grandes
  const winner = [...a.positions].filter((x) => (x.holding.returnPct ?? 0) >= 50 && !x.instrument.diversified).sort((x, y) => (y.holding.returnPct ?? 0) - (x.holding.returnPct ?? 0))[0];
  if (winner) {
    const tk = winner.holding.ticker;
    out.push({
      id: "ganancia",
      q: `¿Conviene vender ${tk}?`,
      a: [
        `${winner.instrument.name} te rinde +${Math.round(winner.holding.returnPct!)}% y hoy vale ${usd(winner.usd)} (${pct(winner.weight, 1)} de tu cartera).`,
        "Nadie sabe si va a seguir subiendo. Lo que sí sabemos es que una sola empresa puede caer 30% o 50% en poco tiempo, y que ya ganaste mucho con ella.",
        "Tus opciones:",
        "• Quedártela entera: si confiás en la empresa y pesa poco en tu cartera, es razonable.",
        "• Vender una parte (por ejemplo un tercio) y pasarla a un ETF como SPY: asegurás ganancia y seguís participando si sube.",
        "• Venderla toda: tiene sentido si pesa mucho o si ya no la comprarías hoy.",
        winner.weight < 0.02
          ? `Como pesa poco (${pct(winner.weight, 1)}), no cambia mucho tu resultado: decidí lo que te deje más tranquilo.`
          : `Como pesa ${pct(winner.weight, 1)}, te recomendamos al menos vender una parte.`,
      ],
    });
  }

  // 5. Llegar más rápido
  const reachT = a.yearsToGoalTarget;
  const extra = Math.max(0, a.requiredMonthly - profile.monthlyContributionUsd);
  out.push({
    id: "rapido",
    q: "¿Cómo llego más rápido a mi meta?",
    a: [
      reachT == null
        ? `Con el ritmo actual tardarías más de 50 años en juntar ${usd(profile.goalAmountUsd)}.`
        : reachT === 0
          ? "¡Ya tenés lo que necesitás para tu meta!"
          : `Con el plan llegás en ${years(reachT)} aportando ${usd(profile.monthlyContributionUsd)} por mes.`,
      ...(reachT && reachT > 0
        ? [
            "Lo que más acelera, en orden:",
            extra > 0
              ? `• Aportar más: con ${usd(a.requiredMonthly)} por mes (${usd(extra)} más que hoy) llegarías en ${profile.horizonYears} años.`
              : `• Seguir aportando: con tu aporte actual ya llegás en tu plazo de ${profile.horizonYears} años.`,
            "• Seguir el plan: repartir bien la plata te da más ganancia sin tomar riesgos innecesarios.",
            profile.goal === "departamento" && !profile.usesMortgage
              ? `• Usar un crédito hipotecario: solo necesitarías juntar el anticipo (~${pct(MORTGAGE_DOWN_PAYMENT_PCT)} del precio) más los gastos. Activalo en el paso 2 para ver el nuevo número.`
              : "",
            "• Lo que NO recomendamos: tomar mucho más riesgo para llegar antes. Con plazos cortos, una mala racha del mercado te puede dejar más lejos.",
          ]
        : []),
    ].filter(Boolean),
  });

  // 6. Crisis
  const crisis = a.stress.find((s) => s.id === "crisis_global");
  const deval = a.stress.find((s) => s.id === "devaluacion");
  if (crisis && hasPositions) {
    out.push({
      id: "crisis",
      q: "¿Qué pasa si hay una crisis?",
      a: [
        `Si Wall Street cae 25%, tu cartera de hoy bajaría unos ${usd(Math.abs(crisis.currentPct * a.totalUsd))} (${pct(Math.abs(crisis.currentPct))}); con el plan, unos ${usd(Math.abs(crisis.targetPct * a.totalUsd))}.`,
        deval ? `Si el dólar salta 40%, hoy perderías unos ${usd(Math.abs(deval.currentPct * a.totalUsd))}; con el plan, unos ${usd(Math.abs(deval.targetPct * a.totalUsd))}.` : "",
        "Qué hacer si pasa:",
        "• No vender por miedo: las caídas fuertes en general se recuperan en 1 a 3 años. Vender en la baja convierte una pérdida temporal en definitiva.",
        "• Seguir aportando: comprás más barato.",
        "• Tener tu fondo de emergencia aparte, así no te ves obligado a vender en el peor momento.",
      ].filter(Boolean),
    });
  }

  // 7. Riesgo
  const equityNow = EQUITY.reduce((s, b) => s + a.bucketWeight[b], 0);
  out.push({
    id: "riesgo",
    q: "¿Cuánto riesgo estoy tomando?",
    a: [
      hasPositions
        ? `Hoy tenés ${pct(equityNow)} en acciones y cripto. En un año muy malo (pasa más o menos 1 de cada 20 años) tu cartera podría bajar unos ${usd(Math.abs(a.badYear * a.totalUsd))}.`
        : "Todavía no cargaste inversiones.",
      `Para tu plazo de ${profile.horizonYears} año${profile.horizonYears === 1 ? "" : "s"} recomendamos como máximo ${pct(a.equityCap)} en acciones. Cuanto más cerca estás de usar la plata, menos riesgo conviene.`,
      `Así queda el plan: ${(Object.keys(a.target) as (keyof typeof a.target)[])
        .filter((b) => a.target[b] > 0.004)
        .map((b) => `${BUCKET_FRIENDLY[b].name.toLowerCase()} ${pct(a.target[b])}`)
        .join(", ")}.`,
    ],
  });

  // 8. Cada cuánto revisar
  out.push({
    id: "revisar",
    q: "¿Cada cuánto tengo que revisar mi cartera?",
    a: [
      "Cada 3 a 6 meses alcanza. Mirar todos los días suele llevar a decisiones apuradas.",
      `Cuando revises: cargá los valores nuevos, mirá si algún tipo de inversión se alejó más de 5 puntos de lo sugerido y, si pasa, volvé a acomodar. Los aportes de cada mes usalos para lo que quedó por debajo, así casi no tenés que vender.`,
      `Si ${broker.name} te cobra comisión por operación, agrupá las compras en lugar de hacer muchas chiquitas.`,
    ],
  });

  return out;
}
