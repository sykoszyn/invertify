import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Lightbulb } from "lucide-react";
import { BROKERS, OPERATION_LABEL, guideSteps, type Operation } from "@/lib/brokers";
import type { BrokerId } from "@/lib/types";

const OPS: Operation[] = ["ingresar", "mep", "comprar", "vender", "fci_suscribir", "fci_rescatar", "caucion", "cripto"];

export function generateStaticParams() {
  return Object.keys(BROKERS).map((broker) => ({ broker }));
}

export async function generateMetadata({ params }: { params: Promise<{ broker: string }> }): Promise<Metadata> {
  const { broker } = await params;
  const b = BROKERS[broker as BrokerId];
  return { title: b ? `Guía ${b.name} · Invertify` : "Guía · Invertify" };
}

export default async function Page({ params }: { params: Promise<{ broker: string }> }) {
  const { broker } = await params;
  const b = BROKERS[broker as BrokerId];
  if (!b) notFound();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/guias" className="text-sm text-muted inline-flex items-center gap-1 hover:text-ink">
        <ArrowLeft className="w-4 h-4" /> Todas las guías
      </Link>
      <h1 className="text-3xl font-bold mt-3">{b.name}: paso a paso</h1>
      {b.url && (
        <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand inline-flex items-center gap-1 mt-1">
          {b.url.replace("https://", "")} <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}

      {b.tips.length > 0 && (
        <div className="card p-4 mt-6 flex gap-3 bg-brand-soft">
          <Lightbulb className="w-5 h-5 text-brand shrink-0 mt-0.5" />
          <ul className="text-sm space-y-1">
            {b.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <nav className="flex flex-wrap gap-2 mt-6">
        {OPS.map((op) => (
          <a key={op} href={`#${op}`} className="chip text-sm">
            {OPERATION_LABEL[op]}
          </a>
        ))}
      </nav>

      <div className="space-y-4 mt-6">
        {OPS.map((op) => (
          <section key={op} id={op} className="card p-5 scroll-mt-24">
            <h2 className="font-semibold text-lg">{OPERATION_LABEL[op]}</h2>
            <ol className="list-decimal pl-5 mt-3 space-y-2 text-ink-2">
              {guideSteps(b.id, op).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p className="text-xs text-muted mt-6">
        Los nombres de menús pueden cambiar con las actualizaciones de cada app. Ante la duda, usá el buscador de la app o el chat de soporte
        del broker. Revisá siempre las comisiones en el tarifario oficial antes de operar.
      </p>

      <div className="card p-5 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-semibold">¿No sabés qué comprar o vender?</div>
          <div className="text-sm text-ink-2">Analizá tu cartera y te armamos un plan con estos pasos ya aplicados.</div>
        </div>
        <Link href="/analizar" className="btn btn-primary shrink-0">
          Analizar mi cartera
        </Link>
      </div>
    </div>
  );
}
