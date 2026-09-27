"use client";

import { useRef, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import type { Analysis } from "@/lib/engine";
import { BUCKET_LABEL } from "@/lib/catalog";
import { BROKERS } from "@/lib/brokers";
import type { Portfolio } from "@/lib/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function buildContext(a: Analysis, p: Portfolio) {
  const r = (x: number) => Math.round(x * 1000) / 10;
  return {
    objetivo: p.profile,
    broker: BROKERS[p.profile.broker].name,
    supuestos: p.assumptions,
    totalUsd: Math.round(a.totalUsd),
    puntaje: a.score.total,
    retornoEsperadoPct: r(a.expReturn),
    retornoPlanSugeridoPct: r(a.targetExpReturn),
    volatilidadPct: r(a.vol),
    anosHastaMeta: { actual: a.yearsToGoalCurrent, planSugerido: a.yearsToGoalTarget },
    aporteMensualNecesario: Math.round(a.requiredMonthly),
    posiciones: a.positions.map((x) => ({
      ticker: x.holding.ticker,
      nombre: x.instrument.name,
      tipo: x.instrument.assetClass,
      usd: Math.round(x.usd),
      pesoPct: r(x.weight),
      rendimientoPct: x.holding.returnPct,
      tasaPct: x.holding.ratePct,
    })),
    distribucion: Object.fromEntries(Object.entries(a.bucketWeight).map(([b, w]) => [BUCKET_LABEL[b as keyof typeof BUCKET_LABEL], { hoyPct: r(w), sugeridoPct: r(a.target[b as keyof typeof a.target]) }])),
    diagnostico: a.diagnostics.map((d) => `[${d.severity}] ${d.title}`),
    planSugerido: a.moves.map((m) => `${m.from ? `${m.from.ticker} → ` : "Aporte → "}${m.to.ticker}: US$${Math.round(m.amountUsd)} (${m.kind})`),
    escenarios: a.stress.map((s) => `${s.label}: cartera ${r(s.currentPct)}%, plan ${r(s.targetPct)}%`),
  };
}

const SUGGESTIONS = [
  "¿Por qué me sugerís estos cambios?",
  "¿Qué hago con mis pesos?",
  "¿Cómo llego más rápido a mi objetivo?",
  "¿Qué pasa si hay una crisis el año que viene?",
];

export function AdvisorChat({ analysis, portfolio }: { analysis: Analysis; portfolio: Portfolio }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context: buildContext(analysis, portfolio) }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "No pudimos contactar al asesor.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
        endRef.current?.scrollIntoView({ block: "nearest" });
      }
    } catch (e) {
      setMessages(next);
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6 print:hidden">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Bot className="w-5 h-5 text-brand" /> Preguntale al asesor
      </h2>
      <p className="text-sm text-muted mb-4">Conoce tu cartera y el plan. Preguntale lo que quieras, en tus palabras.</p>

      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-[480px] overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-brand text-white" : "bg-surface-2"}`}>
                {m.content || <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip text-sm" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-bad mb-3">{error}</p>}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input className="input" placeholder="Ej: ¿conviene vender AMD y pasar a SPY?" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-primary !px-4" disabled={busy || !input.trim()} aria-label="Enviar">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </section>
  );
}
