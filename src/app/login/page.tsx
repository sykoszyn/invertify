"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { getSupabase, supabaseEnabled } from "@/lib/supabase/client";

type Mode = "signup" | "login";

function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Email o contraseña incorrectos.";
  if (/email not confirmed/i.test(msg)) return "Esta cuenta todavía no está confirmada.";
  if (/already registered|already exists/i.test(msg)) return "Ya existe una cuenta con ese email. Entrá con tu contraseña.";
  if (/password/i.test(msg) && /characters|short/i.test(msg)) return "La contraseña tiene que tener al menos 8 caracteres.";
  if (/rate limit|too many/i.test(msg)) return "Demasiados intentos. Esperá un minuto y probá de nuevo.";
  return msg;
}

function AuthForm() {
  const params = useSearchParams();
  const router = useRouter();
  const next = (() => {
    const n = params.get("next") ?? "/mis-carteras";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/mis-carteras";
  })();
  const [mode, setMode] = useState<Mode>(params.get("modo") === "entrar" ? "login" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!supabaseEnabled) {
    return (
      <p className="text-ink-2">
        Las cuentas no están habilitadas en esta instalación. Tu cartera igual se guarda en este navegador.{" "}
        <Link href="/analizar" className="text-brand font-medium">
          Ir al analizador
        </Link>
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const sb = getSupabase()!;
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("La contraseña tiene que tener al menos 8 caracteres.");
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (res.status === 501) {
          // Sin service role key: registro estándar. Entra directo si "Confirm email" está desactivado en Supabase.
          const { data, error } = await sb.auth.signUp({ email, password });
          if (error) throw error;
          if (!data.session) throw new Error("Tu cuenta se creó, pero Supabase pide confirmar el email. Desactivá “Confirm email” en Authentication → Providers → Email.");
          router.push(next);
          router.refresh();
          return;
        }
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || "No pudimos crear la cuenta.");
      }
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr(translate(e instanceof Error ? e.message : "Error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-surface-2 mb-5" role="tablist">
        {(["signup", "login"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setErr(null);
            }}
            className={`rounded-full py-2 text-sm font-semibold transition ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {m === "signup" ? "Crear cuenta" : "Entrar"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-muted">Email</span>
          <input className="input mt-1" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@email.com" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Contraseña{mode === "signup" && " (mínimo 8 caracteres)"}</span>
          <div className="relative mt-1">
            <input
              className="input !pr-11"
              type={show ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-ink"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "signup" ? "Crear cuenta y entrar" : "Entrar"}
        </button>
        {err && <p className="text-sm text-bad">{err}</p>}
      </form>
      <p className="text-xs text-muted mt-4 text-center">
        {mode === "signup" ? "¿Ya tenés cuenta? " : "¿No tenés cuenta? "}
        <button className="text-brand font-medium" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
          {mode === "signup" ? "Entrá" : "Creá una en 10 segundos"}
        </button>
      </p>
    </>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Tu cuenta en Invertify</h1>
        <p className="text-sm text-ink-2 mt-1 mb-5">Guardá tus carteras y seguí su evolución mes a mes. Sin mails de confirmación.</p>
        <Suspense>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
