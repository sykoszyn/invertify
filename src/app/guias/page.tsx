import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { BROKER_LIST } from "@/lib/brokers";

export const metadata: Metadata = { title: "Guías por broker · Invertify" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Guías paso a paso por broker</h1>
      <p className="text-ink-2 mt-2 max-w-2xl">
        Cómo comprar CEDEARs, invertir en fondos, pasar a dólar MEP o colocar una caución desde la app que ya usás.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {BROKER_LIST.map((b) => (
          <Link key={b.id} href={`/guias/${b.id}`} className="card p-5 hover:border-brand transition group">
            <div className="font-bold text-lg">{b.name}</div>
            <ul className="text-sm text-ink-2 mt-2 space-y-1">
              {(b.highlights.length ? b.highlights : ["Pasos generales que sirven para cualquier ALyC"]).map((h) => (
                <li key={h}>· {h}</li>
              ))}
            </ul>
            <div className="text-brand text-sm font-semibold mt-4 flex items-center gap-1">
              Ver guía <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
