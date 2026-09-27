"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { getSupabase, supabaseEnabled } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/mis-carteras";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setErr(null);
    const { error } = await getSupabase()!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setErr(error.message);
      setState("error");
    } else setState("sent");
  };

  if (state === "sent") {
    return (
      <div className="text-center">
        <Mail className="w-10 h-10 text-brand mx-auto" />
        <p className="mt-3 font-semibold">Revisá tu correo</p>
        <p className="text-sm text-ink-2">Te mandamos un link a {email} para entrar. No hace falta contraseña.</p>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <label className="block text-sm">
        <span className="text-muted">Tu email</span>
        <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@email.com" />
      </label>
      <button className="btn btn-primary w-full" disabled={state === "sending"}>
        {state === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
        Enviarme el link para entrar
      </button>
      {err && <p className="text-sm text-bad">{err}</p>}
    </form>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Entrá a Invertify</h1>
        <p className="text-sm text-ink-2 mt-1 mb-5">Guardá tus carteras y seguí su evolución mes a mes.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
