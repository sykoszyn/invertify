import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Crea la cuenta ya confirmada (sin mail de confirmación) usando la service role key.
 * Si la key no está configurada responde 501 y el cliente usa el registro normal de Supabase.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "La contraseña tiene que tener al menos 8 caracteres." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const exists = error.status === 422 || /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      { error: exists ? "Ya existe una cuenta con ese email. Entrá con tu contraseña." : "No pudimos crear la cuenta. Probá de nuevo." },
      { status: exists ? 409 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
