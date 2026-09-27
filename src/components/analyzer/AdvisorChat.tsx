"use client";

import { useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import type { Analysis } from "@/lib/engine";
import { BUCKET_LABEL } from "@/lib/catalog";
import { BROKERS } from "@/lib/brokers";
import type { Portfolio } from "@/lib/types";
import { buildFaq } from "@/lib/faq";
import { useAiStatus } from "@/lib/useAiStatus";

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

export function AdvisorChat({ analysis, portfolio }: { analysis: Analysis; portfolio: Portfolio }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const ai = useAiStatus();
  const faq = useMemo(() => buildFaq(analysis, portfolio), [analysis, portfolio]);
  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.content));

  const askLocal = (id: string) => {
    const f = faq.find((x) => x.id === id);
    if (!f) return;
    setMessages((ms) => [...ms, { role: "user", content: f.q }, { role: "assistant", content: f.a.join("\n") }]);
    setTimeout(() => endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
  };

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
      <p className="text-sm text-muted mb-4">
        {ai ? "Conoce tu cartera y el plan. Preguntale lo que quieras, en tus palabras." : "Tocá una pregunta: te respondemos con los números de tu cartera."}
      </p>

      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-[480px] overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-brand text-white" : "bg-surface-2"}`}>
                {m.content ? <Bubble text={m.content} /> : <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {faq
          .filter((f) => !asked.has(f.q))
          .map((f) => (
            <button key={f.id} className="chip text-sm" disabled={busy} onClick={() => (ai ? send(f.q) : askLocal(f.id))}>
              {f.q}
            </button>
          ))}
      </div>
      {error && <p className="text-sm text-bad mb-3">{error}</p>}

      {ai && (
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
      )}
    </section>
  );
}

/** Muestra párrafos y convierte las líneas que empiezan con "• " en una lista. */
function Bubble({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length} className="list-disc pl-5 space-y-1">
          {list.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const line of text.split("\n")) {
    if (/^\s*[•\-*]\s+/.test(line)) list.push(line.replace(/^\s*[•\-*]\s+/, ""));
    else {
      flush();
      if (line.trim()) blocks.push(<p key={blocks.length}>{line}</p>);
    }
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}
