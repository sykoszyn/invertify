import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

/** Qué funciones opcionales están activas en esta instalación. */
export function GET() {
  return NextResponse.json({ ai: aiEnabled() });
}
