import Link from "next/link";
import { ArrowRight, BookOpen, Camera, LineChart, ListChecks, ShieldCheck, Target, Zap } from "lucide-react";
import { BROKER_LIST } from "@/lib/brokers";
import { GOALS } from "@/lib/goals";

const FEATURES = [
  { icon: Target, title: "Plan según tu objetivo", text: "Departamento, retiro, auto o fondo de emergencia: el plazo define cuánto riesgo tiene sentido." },
  { icon: ListChecks, title: "Qué mover y a dónde", text: "\"Pasá US$3.000 de tus pesos a SPY\": movimientos concretos, con el porqué y otras opciones." },
  { icon: BookOpen, title: "Paso a paso en tu broker", text: "Instrucciones para Cocos, IOL, Balanz, PPI y Bull Market: comprar, vender, MEP, FCIs." },
  { icon: LineChart, title: "¿Llegás a la meta?", text: "Proyección con tus aportes, en escenario bueno, normal y malo. Y cuánto te falta por mes." },
  { icon: Zap, title: "¿Y si sube o baja…?", text: "Probamos tu cartera ante un salto del dólar, una crisis global o un rally tech." },
  { icon: Camera, title: "Cargá con una captura", text: "Subí screenshots de tu broker y la IA completa tu cartera por vos." },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:pt-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium">
            <ShieldCheck className="w-4 h-4 text-brand" /> Gratis · sin registrarte · tus datos quedan en tu navegador
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-5 leading-[1.1]">
            &ldquo;Tengo esto y quiero comprarme un depto.
            <span className="text-brand"> ¿Qué hago?</span>&rdquo;
          </h1>
          <p className="text-lg text-ink-2 mt-5 max-w-xl">
            Invertify analiza lo que tenés en tu broker, lo compara con tu objetivo y te dice exactamente qué cambiar, con el paso a paso para
            hacerlo desde tu app.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/analizar" className="btn btn-primary text-base !px-6 !py-3">
              Analizar mi cartera <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/analizar?paso=2" className="btn btn-ghost text-base !px-6 !py-3">
              Arranco de cero
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 mt-8 text-sm text-muted items-center">
            Funciona con:
            {BROKER_LIST.filter((b) => b.id !== "otro").map((b) => (
              <span key={b.id} className="rounded-full border border-line px-3 py-1 text-ink-2">
                {b.name}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-6 shadow-xl shadow-[color-mix(in_srgb,var(--brand)_10%,transparent)]">
          <div className="text-sm text-muted">Ejemplo de plan</div>
          <div className="text-xl font-bold mt-1">🏠 Departamento de US$124.200 en 5 años</div>
          <div className="mt-5 space-y-3">
            {[
              { from: "Pesos en money market", to: "SPYD", amt: "US$4.720", why: "41% en pesos y tu meta está en dólares" },
              { from: "Pesos en money market", to: "BRKBD", amt: "US$818", why: "Sumar acciones de calidad, diversificadas" },
              { from: "6 posiciones chicas", to: "SPYD", amt: "US$360", why: "Simplificar: menos del 1% cada una" },
            ].map((m, i) => (
              <div key={i} className="rounded-2xl bg-surface-2 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold flex-wrap">
                  <span className="rounded-lg bg-bad-soft text-bad px-2 py-0.5">{m.from}</span>
                  <ArrowRight className="w-4 h-4 text-muted" />
                  <span className="rounded-lg bg-good-soft text-good px-2 py-0.5">{m.to}</span>
                  <span className="ml-auto tabular">{m.amt}</span>
                </div>
                <div className="text-xs text-muted mt-1">{m.why}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-brand-soft p-4">
            <div>
              <div className="text-xs text-muted">Llegás a tu meta en</div>
              <div className="text-2xl font-bold">7 años y 5 meses</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Para llegar en 5 años</div>
              <div className="font-bold tabular">US$1.345/mes</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">¿Para qué estás ahorrando?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-8">
          {GOALS.map((g) => (
            <Link key={g.id} href="/analizar" className="card p-4 text-center hover:border-brand transition">
              <div className="text-3xl">{g.emoji}</div>
              <div className="text-sm font-semibold mt-2">{g.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Como tener un asesor, pero claro y sin letra chica</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <f.icon className="w-6 h-6 text-brand" />
              <h3 className="font-semibold mt-3">{f.title}</h3>
              <p className="text-sm text-ink-2 mt-1">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["1", "Cargá lo que tenés", "A mano, con capturas de pantalla o con un ejemplo. En pesos o dólares."],
            ["2", "Contanos tu objetivo", "Qué querés lograr, en cuánto tiempo y cuánto podés aportar por mes."],
            ["3", "Seguí el plan", "Diagnóstico, cartera ideal, movimientos concretos y el paso a paso en tu broker."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand text-white font-bold flex items-center justify-center shrink-0">{n}</div>
              <div>
                <h3 className="font-semibold">{t}</h3>
                <p className="text-sm text-ink-2">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/analizar" className="btn btn-primary text-base !px-8 !py-3">
            Empezar ahora <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
