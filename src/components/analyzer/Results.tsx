"use client";

import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Info,
  Printer,
  Target,
  TrendingUp,
} from "lucide-react";
import { AllocationBars, GoalProgress, HOY, HowToRead, PLAN, ProjectionChart, ScenarioCards, ScoreBar, ScoreGauge, monthYear } from "@/components/charts";
import { BROKERS } from "@/lib/brokers";
import { ASSET_CLASS_LABEL } from "@/lib/catalog";
import type { Analysis, Diagnostic, Move } from "@/lib/engine";
import { pct, usd, years } from "@/lib/format";
import { GOAL_BY_ID } from "@/lib/goals";
import type { Portfolio } from "@/lib/types";
import { AdvisorChat } from "./AdvisorChat";
import { SaveBar } from "./SaveBar";

const SEVERITY = {
  alta: { icon: AlertOctagon, label: "Prioridad alta", cls: "bg-bad-soft text-bad" },
  media: { icon: AlertTriangle, label: "Importante", cls: "bg-warn-soft text-warn" },
  baja: { icon: Info, label: "Para revisar", cls: "bg-brand-soft text-brand" },
  ok: { icon: CheckCircle2, label: "Bien", cls: "bg-good-soft text-good" },
} as const;

const KIND_LABEL: Record<Move["kind"], string> = {
  rotar: "Rebalancear",
  tomar_ganancia: "Tomar ganancias",
  consolidar: "Simplificar",
  reducir_riesgo: "Bajar riesgo",
  aporte: "Con tus aportes",
  invertir_liquidez: "Poner a trabajar",
};

export function Results({ analysis: a, portfolio, onSaved }: { analysis: Analysis; portfolio: Portfolio; onSaved?: (id: string) => void }) {
  const { profile } = portfolio;
  const goal = GOAL_BY_ID[profile.goal];
  const broker = BROKERS[profile.broker];

  return (
    <div className="space-y-6">
      {/* ------------ Resumen ------------ */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <ScoreGauge score={a.score.total} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted">
              {goal.emoji} {goal.label} · {usd(profile.goalAmountUsd)} en {profile.horizonYears} año{profile.horizonYears === 1 ? "" : "s"} · perfil {profile.risk}
            </p>
            <h2 className="text-2xl font-bold mt-1">{headline(a)}</h2>
            <p className="text-sm text-ink-2 mt-1">La nota es como en el colegio: de 75 para arriba, tu cartera está bien armada para tu objetivo.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <Kpi label="Tu plata invertida hoy" value={usd(a.totalUsd)} />
              <Kpi
                label="Ganancia estimada por año"
                value={`+${usd(a.totalUsd * Math.max(0, a.expReturn))}`}
                valueCls="text-good"
                sub={`Con el plan: +${usd(a.totalUsd * Math.max(0, a.targetExpReturn))}`}
              />
              <Kpi
                label="En un año muy malo podría bajar"
                value={a.badYear < 0 ? `−${usd(-a.badYear * a.totalUsd)}` : "Casi nada"}
                valueCls="text-bad"
                sub={`Con el plan: ${a.targetBadYear < 0 ? `−${usd(-a.targetBadYear * a.totalUsd)}` : "casi nada"}`}
                hint="Pasa aproximadamente 1 de cada 20 años. Si no vendés, en general se recupera."
              />
              <Kpi label="Con el plan llegás a tu meta" value={reachDate(a.yearsToGoalTarget)} sub={a.yearsToGoalTarget ? `en ${years(a.yearsToGoalTarget)}` : undefined} />
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-5 gap-4 mt-6">
          {a.score.parts.map((p) => (
            <div key={p.label} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{p.label}</span>
                <span className="tabular text-muted shrink-0">
                  {Math.round(p.value)}/{p.max}
                </span>
              </div>
              <ScoreBar value={p.value} max={p.max} />
              <p className="text-xs text-muted mt-1">{p.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------ Proyección ------------ */}
      <section>
        <SectionTitle icon={<TrendingUp className="w-5 h-5" />} title="¿Llegás a tu meta?" subtitle="Cuánta plata tendrías cada año, sumando lo que aportás por mes." />
        <div className="card p-5 sm:p-6">
          <GoalProgress current={a.totalUsd} goal={profile.goalAmountUsd} emoji={goal.emoji} />
          <div className="border-t border-line my-5" />
          <ProjectionChart data={a.projection} goal={profile.goalAmountUsd} reachPlan={a.yearsToGoalTarget} reachCurrent={a.yearsToGoalCurrent} />
          <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
            <Kpi label="Si seguís como hoy, llegás en" value={reachDate(a.yearsToGoalCurrent)} dot={HOY} />
            <Kpi label="Con el plan, llegás en" value={reachDate(a.yearsToGoalTarget)} dot={PLAN} />
            <Kpi
              label={`Para llegar en ${profile.horizonYears} año${profile.horizonYears === 1 ? "" : "s"} tendrías que aportar`}
              value={`${usd(a.requiredMonthly)} por mes`}
              sub={`Hoy aportás ${usd(profile.monthlyContributionUsd)} por mes`}
            />
          </div>
          <HowToRead>
            la línea <span style={{ color: PLAN }} className="font-semibold">naranja</span> es cuánto tendrías con el plan y la{" "}
            <span style={{ color: HOY }} className="font-semibold">azul</span>, si no cambiás nada. La zona gris es la plata que ponés vos: todo
            lo que queda por encima es lo que gana tu inversión. Cuando la línea toca la meta verde, llegaste. Pasá el dedo o el mouse por el
            gráfico para ver cada año.
          </HowToRead>
        </div>
      </section>

      {/* ------------ Hoy vs sugerido ------------ */}
      <section>
        <SectionTitle icon={<Target className="w-5 h-5" />} title="¿Dónde está tu plata?" subtitle="Cómo está repartida hoy y cómo te conviene repartirla para tu objetivo." />
        <div className="card p-5 sm:p-6">
          <AllocationBars current={a.bucketWeight} target={a.target} total={a.totalUsd} />
          <HowToRead>
            cada fila es un tipo de inversión. La barra <span style={{ color: HOY }} className="font-semibold">azul</span> es lo que tenés hoy y la{" "}
            <span style={{ color: PLAN }} className="font-semibold">naranja</span> lo que te recomendamos. Si la azul es más larga, tenés de más; si
            es más corta, te falta. La etiqueta te dice cuánta plata mover.
          </HowToRead>
        </div>
      </section>

      {/* ------------ Diagnóstico ------------ */}
      <section>
        <SectionTitle icon={<AlertTriangle className="w-5 h-5" />} title="Diagnóstico" subtitle="Lo que vemos en tu cartera, ordenado por importancia." />
        <div className="grid md:grid-cols-2 gap-3">
          {a.diagnostics.map((d) => (
            <DiagnosticCard key={d.id} d={d} />
          ))}
        </div>
      </section>

      {/* ------------ Plan de acción ------------ */}
      <section>
        <SectionTitle
          icon={<ArrowRight className="w-5 h-5" />}
          title="Plan de acción"
          subtitle={`Qué mover, a dónde y cómo hacerlo en ${broker.name}. Podés hacerlo de a poco.`}
        />
        {a.moves.length === 0 ? (
          <div className="card p-6 text-center text-ink-2">
            <CheckCircle2 className="w-8 h-8 text-good mx-auto mb-2" />
            Tu cartera ya está alineada con tu objetivo. Seguí aportando todos los meses y revisala cada 3-6 meses.
          </div>
        ) : (
          <ol className="space-y-3">
            {a.moves.map((m, i) => (
              <MoveCard key={m.id} move={m} index={i + 1} brokerName={BROKERS[m.broker].name} total={a.totalUsd} />
            ))}
          </ol>
        )}
      </section>

      {/* ------------ Escenarios ------------ */}
      <section>
        <SectionTitle
          icon={<AlertOctagon className="w-5 h-5" />}
          title="¿Qué pasa si…?"
          subtitle="Nadie sabe qué va a pasar. Por eso probamos cuánto ganarías o perderías en cada situación."
        />
        <div className="card p-5 sm:p-6">
          <ScenarioCards data={a.stress} total={a.totalUsd} />
          <HowToRead>
            la línea del medio es &ldquo;ni gano ni pierdo&rdquo;. Las barras hacia la derecha (▲ verde) son ganancia y hacia la izquierda (▼ rojo)
            son pérdida. Compará tu cartera de hoy con la del plan: una buena cartera no pierde demasiado en ningún escenario.
          </HowToRead>
        </div>
      </section>

      {/* ------------ Posiciones ------------ */}
      {a.positions.length > 0 && (
        <section>
          <SectionTitle icon={<Info className="w-5 h-5" />} title="Tus inversiones, una por una" subtitle="Cuánto pesa cada una en tu cartera y qué tan arriesgada es." />
          <div className="card p-2 sm:p-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="font-medium p-2">Activo</th>
                  <th className="font-medium p-2">Tipo</th>
                  <th className="font-medium p-2 text-right">Valor hoy</th>
                  <th className="font-medium p-2">Cuánto pesa</th>
                  <th className="font-medium p-2 text-right">Ganancia estimada/año</th>
                  <th className="font-medium p-2 text-right">Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {a.positions.map((p) => (
                  <tr key={p.holding.id} className="border-t border-line align-top">
                    <td className="p-2">
                      <div className="font-semibold">{p.holding.ticker}</div>
                      <div className="text-xs text-muted max-w-[260px]">{p.instrument.description}</div>
                    </td>
                    <td className="p-2 text-ink-2">{ASSET_CLASS_LABEL[p.instrument.assetClass]}</td>
                    <td className="p-2 text-right tabular">{usd(p.usd)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-2.5 rounded-full bg-surface-2 overflow-hidden">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(1, p.weight * 100)}%` }} />
                        </div>
                        <span className="tabular w-11 text-right">{pct(p.weight, p.weight < 0.1 ? 1 : 0)}</span>
                      </div>
                    </td>
                    <td className="p-2 text-right tabular">{p.expReturn >= 0 ? "+" : "−"}{usd(Math.abs(p.expReturn * p.usd))} <span className="text-xs text-muted">({pct(p.expReturn, 1)})</span></td>
                    <td className="p-2 text-right" aria-label={`Riesgo ${p.instrument.risk} de 5`}>
                      <span className="tabular">{"●".repeat(p.instrument.risk)}</span>
                      <span className="text-line">{"●".repeat(5 - p.instrument.risk)}</span>
                      <div className="text-xs text-muted">{["", "Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"][p.instrument.risk]}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AdvisorChat analysis={a} portfolio={portfolio} />

      <div className="flex flex-wrap gap-3 print:hidden">
        <SaveBar portfolio={portfolio} analysis={a} onSaved={onSaved} />
        <button className="btn btn-ghost" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>
    </div>
  );
}

function headline(a: Analysis): string {
  if (a.positions.length === 0) return "Arranquemos de cero: esta es tu cartera ideal";
  if (a.score.total >= 80) return "Tu cartera está en buena forma";
  if (a.score.total >= 60) return "Buena base, con algunos ajustes importantes";
  return "Tu cartera necesita cambios para llegar a tu objetivo";
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 mt-2">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <span className="text-brand">{icon}</span>
        {title}
      </h2>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

function Kpi({ label, value, sub, valueCls, hint, dot }: { label: string; value: string; sub?: string; valueCls?: string; hint?: string; dot?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3" title={hint}>
      <div className="text-xs text-muted flex items-center gap-1.5">
        {dot && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />}
        {label}
      </div>
      <div className={`text-lg font-bold tabular ${valueCls ?? ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
      {hint && <div className="text-[11px] text-muted mt-1 leading-snug">{hint}</div>}
    </div>
  );
}

function reachDate(y: number | null): string {
  if (y == null) return "más de 50 años";
  if (y === 0) return "¡Ya llegaste!";
  const now = new Date();
  return monthYear(now.getFullYear() + now.getMonth() / 12 + y);
}

function DiagnosticCard({ d }: { d: Diagnostic }) {
  const s = SEVERITY[d.severity];
  const Icon = s.icon;
  return (
    <div className="card p-4 flex gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${s.cls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className={`text-xs font-semibold uppercase tracking-wide ${s.cls.split(" ")[1]}`}>{s.label}</div>
        <div className="font-semibold">{d.title}</div>
        <p className="text-sm text-ink-2 mt-1">{d.detail}</p>
      </div>
    </div>
  );
}

function MoveCard({ move: m, index, brokerName, total }: { move: Move; index: number; brokerName: string; total: number }) {
  const yearly = (m.returnDeltaPp / 100) * total;
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <li className={`card p-4 sm:p-5 transition ${done ? "opacity-60" : ""}`}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold shrink-0">{index}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold">{KIND_LABEL[m.kind]}</span>
            <span className="text-muted">
              {Math.abs(yearly) < 5 ? (
                "Casi no cambia lo que ganás: simplifica tu cartera"
              ) : yearly > 0 ? (
                <>
                  Podrías ganar <strong className="text-good">+{usd(yearly)} más por año</strong> (estimado)
                </>
              ) : (
                <>
                  Ganarías <strong className="text-warn">{usd(-yearly)} menos por año</strong>, a cambio de menos riesgo
                </>
              )}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-base">
            {m.from ? (
              <>
                <span className="font-semibold">Mover {usd(m.amountUsd)}</span>
                <span className="text-ink-2">de</span>
                <span className="rounded-lg bg-bad-soft text-bad px-2 py-0.5 font-semibold">{m.from.ticker}</span>
                <ArrowRight className="w-4 h-4 text-muted" />
              </>
            ) : (
              <span className="font-semibold">Aportar {usd(m.amountUsd)} a</span>
            )}
            <span className="rounded-lg bg-good-soft text-good px-2 py-0.5 font-semibold">{m.to.ticker}</span>
            <span className="text-sm text-muted">({m.to.name})</span>
          </div>
          <p className="text-sm text-ink-2 mt-2">{m.reason}</p>
          {m.alternatives.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className="text-muted py-1">Otras opciones:</span>
              {m.alternatives.map((alt) => (
                <span key={alt.ticker} className="rounded-full border border-line px-2 py-1" title={alt.note}>
                  <strong>{alt.ticker}</strong> · {alt.note}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-ghost !py-1.5 text-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              Paso a paso en {brokerName}
              <ChevronDown className={`w-4 h-4 transition ${open ? "rotate-180" : ""}`} />
            </button>
            <label className="flex items-center gap-2 text-sm px-2">
              <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className="w-4 h-4 accent-[var(--brand)]" />
              Ya lo hice
            </label>
          </div>
          {open && (
            <div className="mt-4 space-y-4">
              {m.guide.map((g, gi) => (
                <div key={gi}>
                  <div className="font-semibold text-sm mb-1.5">
                    {String.fromCharCode(65 + gi)}. {g.title}
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-sm text-ink-2">
                    {g.steps.map((s, si) => (
                      <li key={si}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
