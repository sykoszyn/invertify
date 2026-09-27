"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, LogOut, Trash2 } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { BROKERS } from "@/lib/brokers";
import { compactUsd, usd } from "@/lib/format";
import { GOAL_BY_ID } from "@/lib/goals";
import { writeLocalPortfolio } from "@/lib/store";
import { getSupabase, supabaseEnabled } from "@/lib/supabase/client";
import { deletePortfolio, listPortfolios, listSnapshots, type SavedPortfolio, type Snapshot } from "@/lib/supabase/portfolios";
import { useUser } from "@/lib/useUser";

export default function Page() {
  const { user, ready } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<SavedPortfolio[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listPortfolios().then(setItems).catch((e) => setErr(e.message));
  }, [user]);

  if (!supabaseEnabled) {
    return (
      <Shell>
        <p className="text-ink-2">
          Esta instalación no tiene cuentas habilitadas: tu cartera se guarda automáticamente en este navegador.{" "}
          <Link className="text-brand font-medium" href="/analizar">
            Abrir mi cartera
          </Link>
        </p>
      </Shell>
    );
  }
  if (!ready) return <Shell>Cargando…</Shell>;
  if (!user) {
    return (
      <Shell>
        <p className="text-ink-2 mb-4">Entrá con tu email y contraseña para guardar tus carteras y ver cómo evolucionan.</p>
        <Link href="/login?modo=entrar" className="btn btn-primary">
          Entrar
        </Link>
      </Shell>
    );
  }

  const open = (p: SavedPortfolio) => {
    writeLocalPortfolio({ id: p.id, name: p.name, holdings: p.holdings, profile: p.profile, assumptions: p.assumptions });
    router.push("/analizar?paso=3");
  };

  return (
    <Shell
      action={
        <button className="btn btn-ghost text-sm" onClick={async () => { await getSupabase()!.auth.signOut(); router.push("/"); }}>
          <LogOut className="w-4 h-4" /> Salir
        </button>
      }
    >
      <p className="text-sm text-muted mb-4">{user.email}</p>
      {err && <p className="text-bad text-sm">{err}</p>}
      {items && items.length === 0 && (
        <p className="text-ink-2">
          Todavía no guardaste ninguna cartera.{" "}
          <Link href="/analizar" className="text-brand font-medium">
            Analizá la tuya
          </Link>{" "}
          y tocá &ldquo;Guardar en mi cuenta&rdquo;.
        </p>
      )}
      <div className="space-y-4">
        {items?.map((p) => (
          <PortfolioCard
            key={p.id}
            p={p}
            onOpen={() => open(p)}
            onDelete={async () => {
              if (!confirm(`¿Borrar "${p.name}"?`)) return;
              await deletePortfolio(p.id);
              setItems((xs) => xs?.filter((x) => x.id !== p.id) ?? null);
            }}
          />
        ))}
      </div>
    </Shell>
  );
}

function PortfolioCard({ p, onOpen, onDelete }: { p: SavedPortfolio; onOpen: () => void; onDelete: () => void }) {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  useEffect(() => {
    listSnapshots(p.id).then(setSnaps).catch(() => {});
  }, [p.id]);
  const last = snaps[snaps.length - 1];
  const goal = GOAL_BY_ID[p.profile.goal];
  const data = snaps.map((s) => ({ fecha: new Date(s.taken_at).toLocaleDateString("es-AR"), total: Number(s.total_usd), score: s.score }));
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold text-lg">{p.name}</div>
          <div className="text-sm text-muted">
            {goal?.emoji} {goal?.label} · {BROKERS[p.profile.broker]?.name} · actualizada {new Date(p.updated_at).toLocaleDateString("es-AR")}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary text-sm !py-2" onClick={onOpen}>
            <FolderOpen className="w-4 h-4" /> Abrir
          </button>
          <button className="btn btn-ghost text-sm !py-2" onClick={onDelete} aria-label="Borrar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {last && (
        <div className="flex gap-6 mt-3 text-sm">
          <div>
            <span className="text-muted">Último valor:</span> <strong className="tabular">{usd(Number(last.total_usd))}</strong>
          </div>
          <div>
            <span className="text-muted">Puntaje:</span> <strong className="tabular">{last.score}/100</strong>
          </div>
        </div>
      )}
      {data.length >= 2 && (
        <div className="h-40 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => compactUsd(v)} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip formatter={(v) => usd(Number(v))} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }} />
              <Line dataKey="total" name="Valor de la cartera" stroke="var(--s1)" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Shell({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Mis carteras</h1>
        {action}
      </div>
      {children}
    </div>
  );
}
