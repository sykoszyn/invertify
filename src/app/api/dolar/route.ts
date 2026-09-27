import { NextResponse } from "next/server";

export const revalidate = 600;

interface DolarApiRate {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

/** Cotizaciones del dólar (MEP, CCL, oficial, blue) desde dolarapi.com, cacheadas 10 minutos. */
export async function GET() {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", { next: { revalidate: 600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as DolarApiRate[];
    const pick = (casa: string) => data.find((d) => d.casa === casa);
    const mep = pick("bolsa");
    return NextResponse.json({
      mep: mep ? (mep.compra + mep.venta) / 2 : null,
      ccl: pick("contadoconliqui")?.venta ?? null,
      oficial: pick("oficial")?.venta ?? null,
      blue: pick("blue")?.venta ?? null,
      updatedAt: mep?.fechaActualizacion ?? null,
    });
  } catch {
    return NextResponse.json({ mep: null, ccl: null, oficial: null, blue: null, updatedAt: null }, { status: 200 });
  }
}
