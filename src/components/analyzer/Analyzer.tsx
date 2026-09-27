"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { analyze } from "@/lib/engine";
import { usd } from "@/lib/format";
import { DEFAULT_ASSUMPTIONS, SAMPLE_HOLDINGS, SAMPLE_PROFILE } from "@/lib/sample";
import { EMPTY_PORTFOLIO, usePortfolio } from "@/lib/store";
import { HoldingsEditor } from "./HoldingsEditor";
import { ProfileForm } from "./ProfileForm";
import { Results } from "./Results";

const STEPS = ["Tu cartera", "Tu objetivo", "Tu plan"];

export function Analyzer() {
  const params = useSearchParams();
  const { portfolio, update, loaded } = usePortfolio();
  const [step, setStep] = useState(() => Math.min(2, Math.max(0, Number(params.get("paso") ?? 1) - 1)));
  const [mepSource, setMepSource] = useState<string | null>(null);

  // Dólar MEP del día (si el servicio responde)
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    fetch("/api/dolar")
      .then((r) => r.json())
      .then((d: { mep: number | null; updatedAt: string | null }) => {
        if (cancelled || !d.mep) return;
        const mep = Math.round(d.mep * 100) / 100;
        update((p) => ({ ...p, assumptions: { ...p.assumptions, mep } }));
        setMepSource(`actualizado ${d.updatedAt ? new Date(d.updatedAt).toLocaleDateString("es-AR") : "hoy"}`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loaded, update]);

  const analysis = useMemo(() => analyze(portfolio.holdings, portfolio.profile, portfolio.assumptions), [portfolio]);

  const go = (s: number) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!loaded) return <div className="mx-auto max-w-5xl px-4 py-16 text-muted">Cargando…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <ol className="flex items-center gap-1 sm:gap-2 text-sm overflow-x-auto">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => go(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition ${
                  i === step ? "bg-brand text-white" : i < step ? "bg-brand-soft" : "bg-surface-2 text-muted"
                }`}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="tabular">{i + 1}</span>
                <span className={i === step ? "" : "hidden sm:inline"}>{s}</span>
              </button>
              {i < STEPS.length - 1 && <span className="text-line">—</span>}
            </li>
          ))}
        </ol>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted">Total</div>
          <div className="font-bold tabular">{usd(analysis.totalUsd)}</div>
        </div>
      </div>

      {step === 0 && (
        <HoldingsEditor
          holdings={portfolio.holdings}
          broker={portfolio.profile.broker}
          assumptions={portfolio.assumptions}
          onChange={(holdings) => update({ holdings })}
          onBroker={(broker) => update((p) => ({ ...p, profile: { ...p.profile, broker } }))}
          onLoadSample={() => update((p) => ({ ...p, holdings: SAMPLE_HOLDINGS, profile: { ...SAMPLE_PROFILE }, assumptions: { ...DEFAULT_ASSUMPTIONS, mep: p.assumptions.mep } }))}
        />
      )}
      {step === 1 && (
        <ProfileForm
          profile={portfolio.profile}
          assumptions={portfolio.assumptions}
          onChange={(profile) => update({ profile })}
          onAssumptions={(assumptions) => update({ assumptions })}
          mepSource={mepSource}
        />
      )}
      {step === 2 && <Results analysis={analysis} portfolio={portfolio} onSaved={(id) => update({ id })} />}

      <div className="flex justify-between items-center mt-8 print:hidden">
        {step > 0 ? (
          <button className="btn btn-ghost" onClick={() => go(step - 1)}>
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        ) : (
          <button
            className="btn btn-ghost text-sm"
            onClick={() => {
              if (confirm("¿Borrar todo lo cargado y empezar de cero?")) update({ ...EMPTY_PORTFOLIO, assumptions: portfolio.assumptions });
            }}
          >
            <RotateCcw className="w-4 h-4" /> Empezar de cero
          </button>
        )}
        {step < 2 && (
          <button className="btn btn-primary" onClick={() => go(step + 1)}>
            {step === 0 ? (portfolio.holdings.length ? "Siguiente: tu objetivo" : "No tengo nada aún, seguir") : "Ver mi plan"}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
