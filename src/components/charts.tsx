"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BUCKETS, BUCKET_FRIENDLY } from "@/lib/catalog";
import type { ProjectionPoint, StressResult } from "@/lib/engine";
import { compactUsd, pct, usd } from "@/lib/format";
import type { Bucket } from "@/lib/types";

/**
 * Convención de color en toda la app, para que se aprenda una sola vez:
 * azul = tu cartera como está hoy, naranja = con el plan sugerido.
 */
export const HOY = "var(--s1)";
export const PLAN = "var(--s2)";

export const BUCKET_COLOR: Record<Bucket, string> = {
  liquidez: "var(--s1)",
  rf_usd: "var(--s2)",
  rf_ars: "var(--s3)",
  global: "var(--s4)",
  individuales: "var(--s5)",
  argentina: "var(--s6)",
  cripto: "var(--s7)",
};

export function SeriesLegend({ hoy = "Tu cartera hoy", plan = "Con el plan" }: { hoy?: string; plan?: string }) {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <span className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm" style={{ background: HOY }} /> {hoy}
      </span>
      <span className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm" style={{ background: PLAN }} /> {plan}
      </span>
    </div>
  );
}

export function HowToRead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-ink-2 bg-surface-2 rounded-xl px-3 py-2 mt-4">
      <strong>👀 Cómo leerlo:</strong> {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// ¿Dónde está tu plata? — barras pareadas hoy vs. plan
// ---------------------------------------------------------------------------

export function AllocationBars({
  current,
  target,
  total,
}: {
  current: Record<Bucket, number>;
  target: Record<Bucket, number>;
  total: number;
}) {
  const rows = BUCKETS.filter((b) => current[b] > 0.004 || target[b] > 0.004);
  const max = Math.max(...rows.map((b) => Math.max(current[b], target[b])), 0.01);
  return (
    <div>
      <SeriesLegend />
      <ul className="mt-4 divide-y divide-[var(--line)]">
        {rows.map((b) => {
          const f = BUCKET_FRIENDLY[b];
          const diff = target[b] - current[b];
          const verdict =
            Math.abs(diff) < 0.03
              ? { text: "✓ Está bien", cls: "bg-good-soft text-good" }
              : diff > 0
                ? { text: `▲ Sumar ${usd(diff * total)}`, cls: "bg-brand-soft text-brand" }
                : { text: `▼ Sacar ${usd(-diff * total)}`, cls: "bg-warn-soft text-warn" };
          return (
            <li key={b} className="py-4 grid sm:grid-cols-[240px_1fr] gap-x-6 gap-y-2">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <span aria-hidden>{f.emoji}</span> {f.name}
                </div>
                <div className="text-xs text-muted mt-0.5">{f.plain}</div>
                <span className={`inline-block mt-2 rounded-full px-2 py-0.5 text-xs font-semibold ${total > 0 ? verdict.cls : "hidden"}`}>{verdict.text}</span>
              </div>
              <div className="space-y-1.5 self-center">
                <Bar label="Hoy" value={current[b]} max={max} color={HOY} amount={current[b] * total} />
                <Bar label="Plan" value={target[b]} max={max} color={PLAN} amount={target[b] * total} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Bar({ label, value, max, color, amount }: { label: string; value: number; max: number; color: string; amount: number }) {
  return (
    <div className="flex items-center gap-2 text-sm" title={`${label}: ${pct(value, 1)} (${usd(amount)})`}>
      <span className="w-9 text-xs text-muted shrink-0">{label}</span>
      <div className="flex-1 h-5 rounded-md bg-surface-2 overflow-hidden">
        <div className="h-full rounded-md" style={{ width: `${Math.max(value > 0 ? 1.5 : 0, (value / max) * 100)}%`, background: color }} />
      </div>
      <span className="w-[108px] text-right tabular shrink-0">
        <strong>{pct(value)}</strong> <span className="text-muted text-xs">{compactUsd(amount)}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avance hacia la meta
// ---------------------------------------------------------------------------

export function GoalProgress({ current, goal, emoji }: { current: number; goal: number; emoji: string }) {
  const p = goal > 0 ? Math.min(1, current / goal) : 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-3 text-sm">
        <div>
          <div className="text-muted">Ya juntaste</div>
          <div className="text-2xl font-bold tabular">{usd(current)}</div>
        </div>
        <div className="text-right">
          <div className="text-muted">Tu meta {emoji}</div>
          <div className="text-2xl font-bold tabular">{usd(goal)}</div>
        </div>
      </div>
      <div className="relative h-4 rounded-full bg-surface-2 mt-3 overflow-hidden" role="img" aria-label={`Avance: ${pct(p)} de la meta`}>
        <div className="h-full rounded-full bg-good" style={{ width: `${p * 100}%` }} />
      </div>
      <div className="text-sm mt-2">
        <strong>{pct(p)}</strong> del camino hecho · te faltan <strong className="tabular">{usd(Math.max(0, goal - current))}</strong>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proyección hacia la meta
// ---------------------------------------------------------------------------

export function ProjectionChart({
  data,
  goal,
  reachPlan,
  reachCurrent,
}: {
  data: ProjectionPoint[];
  goal: number;
  reachPlan: number | null;
  reachCurrent: number | null;
}) {
  const [showRange, setShowRange] = useState(false);
  const start = new Date().getFullYear() + new Date().getMonth() / 12;
  const rows = data.map((d) => ({ ...d, cal: start + d.year, rango: [d.pesimista, d.optimista] as [number, number] }));
  const lastCal = rows[rows.length - 1]?.cal ?? start;
  const maxY = Math.max(goal * 1.12, ...data.map((d) => Math.max(showRange ? d.optimista : d.base, d.objetivoBase)));
  const yearTicks: number[] = [];
  const span = Math.ceil(lastCal) - Math.ceil(start);
  const every = span <= 6 ? 1 : span <= 12 ? 2 : 5;
  for (let y = Math.ceil(start); y <= lastCal; y += every) yearTicks.push(y);
  const planDot = reachPlan != null && reachPlan > 0 && start + reachPlan <= lastCal + 0.01 ? start + reachPlan : null;
  const curDot = reachCurrent != null && reachCurrent > 0 && start + reachCurrent <= lastCal + 0.01 ? start + reachCurrent : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-4 h-0.5" style={{ background: PLAN, height: 3 }} /> Con el plan
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4" style={{ background: HOY, height: 3 }} /> Si seguís como hoy
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: "color-mix(in srgb, var(--muted) 30%, transparent)" }} /> Lo que ponés vos
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={showRange} onChange={(e) => setShowRange(e.target.checked)} className="w-4 h-4 accent-[var(--brand)]" />
          Mostrar años buenos y malos
        </label>
      </div>
      <div className="h-[300px] sm:h-[340px] w-full mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 24, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="cal"
              type="number"
              domain={[start, lastCal]}
              ticks={yearTicks}
              tickFormatter={(y) => String(y)}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => compactUsd(v)}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
              domain={[0, maxY]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ProjectionPoint & { cal: number };
                const gain = d.objetivoBase - d.aportado;
                return (
                  <div className="card !rounded-xl px-3 py-2 text-sm shadow-lg max-w-[260px]">
                    <div className="font-semibold mb-1">{monthYear(d.cal)}</div>
                    <div className="tabular">
                      Con el plan tendrías <strong style={{ color: PLAN }}>{usd(d.objetivoBase)}</strong>
                    </div>
                    <div className="text-muted text-xs">
                      {usd(d.aportado)} los pusiste vos y {usd(Math.max(0, gain))} los ganó la inversión.
                    </div>
                    <div className="tabular mt-1">
                      Si seguís como hoy: <strong style={{ color: HOY }}>{usd(d.base)}</strong>
                    </div>
                    {showRange && (
                      <div className="text-muted text-xs mt-1">
                        En un escenario malo {compactUsd(d.pesimista)}, en uno bueno {compactUsd(d.optimista)}.
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area dataKey="aportado" name="Lo que ponés vos" fill="var(--muted)" fillOpacity={0.16} stroke="var(--muted)" strokeOpacity={0.5} isAnimationActive={false} />
            {showRange && <Area dataKey="rango" name="Años buenos y malos" fill={HOY} fillOpacity={0.12} stroke="none" isAnimationActive={false} />}
            <Line dataKey="base" name="Si seguís como hoy" stroke={HOY} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="objetivoBase" name="Con el plan" stroke={PLAN} strokeWidth={3} dot={false} isAnimationActive={false} />
            {goal > 0 && (
              <ReferenceLine
                y={goal}
                stroke="var(--good)"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{ value: `Tu meta: ${compactUsd(goal)}`, position: "insideTopLeft", fill: "var(--good)", fontSize: 13, fontWeight: 600 }}
              />
            )}
            {curDot && <ReferenceDot x={curDot} y={goal} r={6} fill={HOY} stroke="var(--surface)" strokeWidth={2} />}
            {planDot && (
              <ReferenceDot
                x={planDot}
                y={goal}
                r={8}
                fill={PLAN}
                stroke="var(--surface)"
                strokeWidth={2}
                label={{ value: `¡Llegás en ${monthYear(planDot)}!`, position: "top", fill: "var(--ink)", fontSize: 13, fontWeight: 700 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function monthYear(cal: number) {
  const y = Math.floor(cal);
  const m = Math.min(11, Math.round((cal - y) * 12));
  return `${MONTHS[m]} ${y}`;
}

// ---------------------------------------------------------------------------
// ¿Qué pasa si…? — tarjetas con barras que salen del cero
// ---------------------------------------------------------------------------

const SCENARIO_EMOJI: Record<string, string> = {
  devaluacion: "💸",
  crisis_global: "📉",
  rally_tech: "🚀",
  riesgo_pais: "🇦🇷",
  tasas_bajan: "🏦",
};

export function ScenarioCards({ data, total }: { data: StressResult[]; total: number }) {
  const max = Math.max(0.05, ...data.flatMap((d) => [Math.abs(d.currentPct), Math.abs(d.targetPct)]));
  return (
    <div>
      <SeriesLegend />
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {data.map((s) => (
          <div key={s.id} className="rounded-2xl border border-line p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden>
                {SCENARIO_EMOJI[s.id] ?? "❓"}
              </span>
              <div>
                <div className="font-semibold">Si {lowerFirst(s.label)}</div>
                <div className="text-xs text-muted">{s.description}</div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <ChangeBar label="Hoy" value={s.currentPct} usdValue={s.currentPct * total} max={max} color={HOY} />
              <ChangeBar label="Plan" value={s.targetPct} usdValue={s.targetPct * total} max={max} color={PLAN} />
            </div>
            <p className="text-sm text-ink-2 mt-3">{scenarioVerdict(s, total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangeBar({ label, value, usdValue, max, color }: { label: string; value: number; usdValue: number; max: number; color: string }) {
  const w = (Math.abs(value) / max) * 50;
  const up = value >= 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-8 text-xs text-muted shrink-0">{label}</span>
      <div className="relative flex-1 min-w-[90px] h-4" aria-hidden>
        <div className="absolute left-1/2 top-[-2px] bottom-[-2px] w-px bg-[var(--muted)]" />
        <div
          className="absolute top-0 h-full rounded-sm"
          style={{ background: color, width: `${Math.max(w, 0.8)}%`, left: up ? "50%" : `${50 - w}%` }}
        />
      </div>
      <span className={`w-[104px] text-right tabular shrink-0 font-semibold leading-tight ${up ? "text-good" : "text-bad"}`}>
        <span className="whitespace-nowrap">
          {up ? "▲ +" : "▼ −"}
          {usd(Math.abs(usdValue))}
        </span>
        <span className="block text-[11px] font-normal text-muted">
          {up ? "gana" : "pierde"} {Math.round(Math.abs(value) * 100)}%
        </span>
      </span>
    </div>
  );
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function scenarioVerdict(s: StressResult, total: number): string {
  const diff = (s.targetPct - s.currentPct) * total;
  if (Math.abs(diff) < Math.max(50, total * 0.005)) return "Con o sin el plan te iría parecido.";
  if (s.currentPct < 0 || s.targetPct < 0) {
    return diff > 0
      ? `Con el plan perderías ${usd(diff)} menos.`
      : `Con el plan perderías ${usd(-diff)} más: es el costo de tener más acciones, que a largo plazo rinden más.`;
  }
  return diff > 0 ? `Con el plan ganarías ${usd(diff)} más.` : `Con el plan ganarías ${usd(-diff)} menos, a cambio de más estabilidad.`;
}

// ---------------------------------------------------------------------------
// Puntaje
// ---------------------------------------------------------------------------

export function ScoreGauge({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "var(--good)" : score >= 50 ? "var(--warn)" : "var(--bad)";
  const label = score >= 75 ? "😊 Saludable" : score >= 50 ? "😐 Mejorable" : "😟 Necesita cambios";
  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative w-36 h-36" role="img" aria-label={`Nota de tu cartera: ${score} de 100, ${label}`}>
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} stroke="var(--surface-2)" strokeWidth="10" fill="none" />
          <circle cx="60" cy="60" r={r} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular">{score}</span>
          <span className="text-xs text-muted">de 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold mt-1">{label}</span>
    </div>
  );
}

/** Barra de un componente del puntaje, con semáforo. */
export function ScoreBar({ value, max }: { value: number; max: number }) {
  const p = max > 0 ? value / max : 0;
  const color = p >= 0.75 ? "var(--good)" : p >= 0.5 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="h-2 bg-surface-2 rounded-full mt-1.5 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: color }} />
    </div>
  );
}
