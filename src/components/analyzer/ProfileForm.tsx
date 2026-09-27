"use client";

import { useEffect, useState } from "react";
import { GOALS, GOAL_BY_ID, ZONES, apartmentTarget } from "@/lib/goals";
import { usd } from "@/lib/format";
import type { Assumptions, Profile, Risk } from "@/lib/types";

const RISKS: { id: Risk; label: string; desc: string }[] = [
  { id: "conservador", label: "Conservador", desc: "No quiero ver caídas. Prefiero ganar menos pero seguro." },
  { id: "moderado", label: "Moderado", desc: "Acepto caídas moderadas si en el tiempo gano más." },
  { id: "agresivo", label: "Agresivo", desc: "Busco el máximo retorno y me banco caídas fuertes." },
];

const QUIZ = [
  {
    q: "Si tu cartera cae 20% en un mes, ¿qué hacés?",
    a: ["Vendo todo para no perder más", "Espero a que se recupere", "Aprovecho y compro más"],
  },
  {
    q: "¿Cuánto sabés de inversiones?",
    a: ["Recién empiezo", "Algo: sé qué es un CEDEAR y un FCI", "Bastante: opero seguido"],
  },
  {
    q: "¿Tus ingresos son estables?",
    a: ["No, varían mucho", "Bastante estables", "Muy estables y me sobra"],
  },
];

interface Props {
  profile: Profile;
  assumptions: Assumptions;
  onChange: (p: Profile) => void;
  onAssumptions: (a: Assumptions) => void;
  mepSource: string | null;
}

export function ProfileForm({ profile, assumptions, onChange, onAssumptions, mepSource }: Props) {
  const zone = profile.aptZone ?? "caba_media";
  const m2 = profile.aptM2 ?? 50;
  const setZone = (aptZone: string) => onChange({ ...profile, aptZone });
  const setM2 = (aptM2: number) => onChange({ ...profile, aptM2 });
  const [quiz, setQuiz] = useState<number[]>([]);
  const set = (p: Partial<Profile>) => onChange({ ...profile, ...p });

  const apt = apartmentTarget(zone, m2, !!profile.usesMortgage);
  useEffect(() => {
    if (profile.goal === "departamento" && profile.goalAmountUsd !== apt.needed) {
      onChange({ ...profile, goalAmountUsd: apt.needed });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.goal, apt.needed]);

  const answer = (qi: number, ai: number) => {
    const next = [...quiz];
    next[qi] = ai;
    setQuiz(next);
    if (next.filter((x) => x != null).length === QUIZ.length) {
      const score = next.reduce((s, x) => s + x, 0);
      set({ risk: score <= 2 ? "conservador" : score <= 4 ? "moderado" : "agresivo" });
    }
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">¿Para qué estás invirtiendo?</h2>
        <p className="text-sm text-muted mb-4">Tu objetivo define cuánto riesgo tiene sentido tomar.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              className="chip !rounded-2xl !p-3 flex-col !items-start text-left"
              data-active={profile.goal === g.id}
              onClick={() => set({ goal: g.id, goalAmountUsd: g.defaultAmountUsd, horizonYears: g.defaultHorizon })}
            >
              <span className="text-2xl" aria-hidden>
                {g.emoji}
              </span>
              <span className="text-sm font-semibold">{g.label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted mt-3">{GOAL_BY_ID[profile.goal].hint}</p>

        {profile.goal === "departamento" ? (
          <div className="mt-5 grid sm:grid-cols-3 gap-4">
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">Zona</span>
              <select className="input mt-1" value={zone} onChange={(e) => setZone(e.target.value)}>
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label} · ~{usd(z.usdPerM2)}/m²
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted">Metros cuadrados: {m2} m²</span>
              <input type="range" min={25} max={150} step={5} value={m2} onChange={(e) => setM2(Number(e.target.value))} className="w-full mt-3 accent-[var(--brand)]" />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-3">
              <input type="checkbox" checked={!!profile.usesMortgage} onChange={(e) => set({ usesMortgage: e.target.checked })} className="w-4 h-4 accent-[var(--brand)]" />
              Voy a pedir un crédito hipotecario (solo necesito el anticipo, ~25%)
            </label>
            <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Stat label="Precio estimado" value={usd(apt.price)} />
              <Stat label="Gastos (escritura, sellos, comisión ~8%)" value={usd(apt.costs)} />
              {profile.usesMortgage && <Stat label="Crédito del banco" value={usd(apt.loan)} />}
              <Stat label="Lo que necesitás juntar" value={usd(apt.needed)} strong />
            </div>
            <p className="sm:col-span-3 text-xs text-muted">
              Precios de referencia aproximados para usados. Verificá en Zonaprop o Argenprop para tu barrio exacto.
            </p>
          </div>
        ) : (
          <label className="block mt-5 text-sm max-w-xs">
            <span className="text-muted">¿Cuánto necesitás? (US$)</span>
            <input className="input mt-1 tabular" inputMode="numeric" value={profile.goalAmountUsd || ""} onChange={(e) => set({ goalAmountUsd: Number(e.target.value.replace(/\D/g, "")) })} />
          </label>
        )}
      </section>

      <section className="card p-5 sm:p-6 grid sm:grid-cols-2 gap-6">
        <label className="text-sm">
          <span className="font-semibold text-base">¿En cuánto tiempo?</span>
          <div className="text-3xl font-bold mt-2 tabular">
            {profile.horizonYears} año{profile.horizonYears === 1 ? "" : "s"}
          </div>
          <input type="range" min={1} max={30} value={profile.horizonYears} onChange={(e) => set({ horizonYears: Number(e.target.value) })} className="w-full mt-2 accent-[var(--brand)]" />
        </label>
        <label className="text-sm">
          <span className="font-semibold text-base">¿Cuánto podés sumar por mes?</span>
          <div className="text-3xl font-bold mt-2 tabular">{usd(profile.monthlyContributionUsd)}</div>
          <input type="range" min={0} max={5000} step={50} value={profile.monthlyContributionUsd} onChange={(e) => set({ monthlyContributionUsd: Number(e.target.value) })} className="w-full mt-2 accent-[var(--brand)]" />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={profile.hasEmergencyFund} onChange={(e) => set({ hasEmergencyFund: e.target.checked })} className="w-4 h-4 accent-[var(--brand)]" />
          Ya tengo un fondo de emergencia aparte (3 a 6 meses de gastos)
        </label>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Tu perfil de riesgo</h2>
        <p className="text-sm text-muted mb-4">Elegilo directo o respondé 3 preguntas rápidas.</p>
        <div className="grid sm:grid-cols-3 gap-2">
          {RISKS.map((r) => (
            <button key={r.id} className="chip !rounded-2xl !p-4 flex-col !items-start text-left" data-active={profile.risk === r.id} onClick={() => set({ risk: r.id })}>
              <span className="font-semibold">{r.label}</span>
              <span className="text-xs text-ink-2">{r.desc}</span>
            </button>
          ))}
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-brand">No sé cuál soy: hacer el test</summary>
          <div className="mt-3 space-y-4">
            {QUIZ.map((item, qi) => (
              <div key={qi}>
                <p className="text-sm font-medium mb-2">{item.q}</p>
                <div className="flex flex-wrap gap-2">
                  {item.a.map((a, ai) => (
                    <button key={ai} className="chip text-sm" data-active={quiz[qi] === ai} onClick={() => answer(qi, ai)}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Supuestos de mercado</h2>
        <p className="text-sm text-muted mb-4">Podés ajustarlos. Afectan cómo convertimos tus pesos y cuánto rinden en dólares.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="text-muted">Dólar MEP {mepSource && <em className="not-italic text-good">· {mepSource}</em>}</span>
            <input className="input mt-1 tabular" inputMode="decimal" value={assumptions.mep} onChange={(e) => onAssumptions({ ...assumptions, mep: Number(e.target.value.replace(/[^\d.]/g, "")) || 1 })} />
          </label>
          <label className="text-sm">
            <span className="text-muted">Suba esperada del dólar en 12 meses: {assumptions.expectedDevaluationPct}%</span>
            <input type="range" min={0} max={80} value={assumptions.expectedDevaluationPct} onChange={(e) => onAssumptions({ ...assumptions, expectedDevaluationPct: Number(e.target.value) })} className="w-full mt-3 accent-[var(--brand)]" />
          </label>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${strong ? "bg-brand-soft" : "bg-surface-2"}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`tabular ${strong ? "font-bold text-lg" : "font-semibold"}`}>{value}</div>
    </div>
  );
}
