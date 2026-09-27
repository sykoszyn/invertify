"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BUCKETS, BUCKET_LABEL } from "@/lib/catalog";
import type { ProjectionPoint, StressResult } from "@/lib/engine";
import { compactUsd, pct, signedPct, usd } from "@/lib/format";
import type { Bucket } from "@/lib/types";

export const BUCKET_COLOR: Record<Bucket, string> = {
  liquidez: "var(--s1)",
  rf_usd: "var(--s2)",
  rf_ars: "var(--s3)",
  global: "var(--s4)",
  individuales: "var(--s5)",
  argentina: "var(--s6)",
  cripto: "var(--s7)",
};

const SERIES_A = "var(--s1)";
const SERIES_B = "var(--s2)";

function TooltipBox({ children }: { children: React.ReactNode }) {
  return <div className="card !rounded-xl px-3 py-2 text-sm shadow-lg">{children}</div>;
}

// ---------------------------------------------------------------------------

export function AllocationDonut({
  weights,
  total,
  title,
}: {
  weights: Record<Bucket, number>;
  total?: number;
  title: string;
}) {
  const data = BUCKETS.filter((b) => weights[b] > 0.0005).map((b) => ({ bucket: b, name: BUCKET_LABEL[b], value: weights[b] }));
  return (
    <div className="relative w-full aspect-square max-w-[200px] sm:max-w-[260px] mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="98%"
            startAngle={90}
            endAngle={-270}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.bucket} fill={BUCKET_COLOR[d.bucket]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox>
                  <div className="font-medium">{payload[0].name}</div>
                  <div className="tabular text-ink-2">
                    {pct(Number(payload[0].value), 1)}
                    {total ? ` · ${usd(Number(payload[0].value) * total)}` : ""}
                  </div>
                </TooltipBox>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-sm text-muted">{title}</span>
        {total != null && <span className="text-xl font-bold tabular">{compactUsd(total)}</span>}
      </div>
    </div>
  );
}

export function AllocationLegend({ current, target }: { current: Record<Bucket, number>; target: Record<Bucket, number> }) {
  const rows = BUCKETS.filter((b) => current[b] > 0.0005 || target[b] > 0.0005);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted text-left">
          <th className="font-medium py-1">Tipo de activo</th>
          <th className="font-medium py-1 pl-2 text-right">Hoy</th>
          <th className="font-medium py-1 pl-2 text-right">Sugerido</th>
          <th className="font-medium py-1 pl-2 text-right">Diferencia</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => {
          const diff = target[b] - current[b];
          return (
            <tr key={b} className="border-t border-line">
              <td className="py-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: BUCKET_COLOR[b] }} />
                {BUCKET_LABEL[b]}
              </td>
              <td className="py-2 text-right tabular">{pct(current[b])}</td>
              <td className="py-2 text-right tabular">{pct(target[b])}</td>
              <td className={`py-2 text-right tabular font-medium ${Math.abs(diff) < 0.03 ? "text-muted" : diff > 0 ? "text-good" : "text-bad"}`}>
                {Math.abs(diff) < 0.03 ? "OK" : `${diff > 0 ? "▲ sumar" : "▼ bajar"} ${pct(Math.abs(diff))}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------

export function ProjectionChart({ data, goal }: { data: ProjectionPoint[]; goal: number }) {
  const rows = data.map((d) => ({ ...d, rango: [d.pesimista, d.optimista] as [number, number] }));
  const maxY = Math.max(goal * 1.1, ...data.map((d) => Math.max(d.optimista, d.objetivoBase)));
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, "dataMax"]}
            tickFormatter={(y) => `${Math.round(y)}a`}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            tickFormatter={(v) => compactUsd(v)}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={62}
            domain={[0, maxY]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ProjectionPoint;
              return (
                <TooltipBox>
                  <div className="font-medium mb-1">Año {d.year.toLocaleString("es-AR", { maximumFractionDigits: 1 })}</div>
                  <div className="tabular space-y-0.5">
                    <div style={{ color: SERIES_B }}>● Con el plan sugerido: {usd(d.objetivoBase)}</div>
                    <div style={{ color: SERIES_A }}>● Cartera actual: {usd(d.base)}</div>
                    <div className="text-muted">Rango actual (80%): {compactUsd(d.pesimista)} – {compactUsd(d.optimista)}</div>
                    <div className="text-muted">Total aportado: {usd(d.aportado)}</div>
                  </div>
                </TooltipBox>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-2)" }} />
          <Area dataKey="rango" name="Rango probable (actual)" fill={SERIES_A} fillOpacity={0.12} stroke="none" isAnimationActive={false} />
          <Line dataKey="aportado" name="Lo que aportás" stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line dataKey="base" name="Cartera actual" stroke={SERIES_A} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="objetivoBase" name="Plan sugerido" stroke={SERIES_B} strokeWidth={2} dot={false} isAnimationActive={false} />
          {goal > 0 && (
            <ReferenceLine
              y={goal}
              stroke="var(--good)"
              strokeDasharray="6 4"
              label={{ value: `Meta ${compactUsd(goal)}`, position: "insideTopLeft", fill: "var(--good)", fontSize: 12 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function StressChart({ data }: { data: StressResult[] }) {
  const rows = data.map((d) => ({ name: d.label, actual: d.currentPct, sugerida: d.targetPct, description: d.description }));
  return (
    <div className="h-[330px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 4 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => pct(v)} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fill: "var(--ink-2)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <ReferenceLine x={0} stroke="var(--line)" />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox>
                  <div className="font-medium">{payload[0].payload.name}</div>
                  <div className="text-muted mb-1 max-w-[240px]">{payload[0].payload.description}</div>
                  <div className="tabular" style={{ color: SERIES_A }}>● Cartera actual: {signedPct(payload[0].payload.actual)}</div>
                  <div className="tabular" style={{ color: SERIES_B }}>● Plan sugerido: {signedPct(payload[0].payload.sugerida)}</div>
                </TooltipBox>
              ) : null
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="actual" name="Cartera actual" fill={SERIES_A} radius={4} maxBarSize={14} isAnimationActive={false} />
          <Bar dataKey="sugerida" name="Plan sugerido" fill={SERIES_B} radius={4} maxBarSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ScoreGauge({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "var(--good)" : score >= 50 ? "var(--warn)" : "var(--bad)";
  const label = score >= 75 ? "Saludable" : score >= 50 ? "Mejorable" : "Necesita cambios";
  return (
    <div className="relative w-36 h-36 shrink-0" role="img" aria-label={`Puntaje de salud ${score} de 100: ${label}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} stroke="var(--surface-2)" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular">{score}</span>
        <span className="text-xs text-muted">{label}</span>
      </div>
    </div>
  );
}
