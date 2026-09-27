"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CloudUpload, Loader2 } from "lucide-react";
import type { Analysis } from "@/lib/engine";
import { supabaseEnabled } from "@/lib/supabase/client";
import { savePortfolio } from "@/lib/supabase/portfolios";
import type { Portfolio } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export function SaveBar({ portfolio, analysis, onSaved }: { portfolio: Portfolio; analysis: Analysis; onSaved?: (id: string) => void }) {
  const { user } = useUser();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (!supabaseEnabled) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted px-2">
        <Check className="w-4 h-4 text-good" /> Guardado automáticamente en este navegador
      </span>
    );
  }
  if (!user) {
    return (
      <Link href="/login?next=/analizar" className="btn btn-primary">
        <CloudUpload className="w-4 h-4" /> Crear cuenta para guardar y seguir tu evolución
      </Link>
    );
  }
  const save = async () => {
    setState("saving");
    setErr(null);
    try {
      const id = await savePortfolio(portfolio, analysis);
      onSaved?.(id);
      setState("saved");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al guardar");
      setState("error");
    }
  };
  return (
    <div className="flex items-center gap-3">
      <button className="btn btn-primary" onClick={save} disabled={state === "saving"}>
        {state === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : state === "saved" ? <Check className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
        {state === "saved" ? "Guardado" : "Guardar en mi cuenta"}
      </button>
      {err && <span className="text-sm text-bad">{err}</span>}
    </div>
  );
}
