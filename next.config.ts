import type { NextConfig } from "next";

// Acepta los nombres de variables del panel/integración de Supabase (SUPABASE_URL,
// SUPABASE_PUBLISHABLE_KEY) además de los NEXT_PUBLIC_*. Solo se exponen al navegador
// la URL y la clave publicable; la clave secreta queda en el servidor.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabasePublicKey,
  },
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};

export default nextConfig;
