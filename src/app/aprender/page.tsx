import type { Metadata } from "next";
import { Calculators } from "@/components/Calculators";

export const metadata: Metadata = { title: "Aprender a invertir · Invertify" };

const PRINCIPLES = [
  ["Primero el fondo de emergencia", "3 a 6 meses de gastos en algo líquido (money market, caución o dólares en un FCI de liquidez). Así nunca tenés que vender en mal momento."],
  ["El plazo manda", "Plata que usás en menos de 2 años: casi sin acciones. Más de 7 años: las acciones diversificadas son tu mejor aliado."],
  ["Medí todo en dólares", "Si tu objetivo cuesta dólares (un depto, un viaje), ahorrá y medí tu rendimiento en dólares, no en pesos."],
  ["Diversificá", "Ninguna empresa individual por encima del 10% de tu cartera. Un ETF como SPY te da 500 empresas en un solo CEDEAR."],
  ["Aportá todos los meses", "La constancia le gana a adivinar el mercado. Invertir un monto fijo cada mes promedia el precio de compra."],
  ["Rebalanceá 1-2 veces por año", "Cuando algo sube mucho, pesa más de lo planeado: vender una parte y reponer lo que quedó atrás mantiene tu riesgo bajo control."],
];

const GLOSSARY = [
  ["CEDEAR", "Certificado que representa acciones o ETFs del exterior (Apple, SPY) y se compra en pesos o dólares desde un broker argentino. Sigue el precio en dólares del activo."],
  ["Ticker terminado en D", "Es la misma especie pero operada en dólares MEP (ej. SPYD). Terminada en C es en dólar cable (CCL)."],
  ["ETF", "Fondo que cotiza en bolsa y replica un índice. SPY = 500 empresas de EE.UU.; QQQ = Nasdaq 100."],
  ["FCI", "Fondo Común de Inversión: juntás tu plata con la de otros y un administrador la invierte. Rescate en T+0 (mismo día), T+1 o T+2."],
  ["Money market", "FCI de muy bajo riesgo que invierte en plazos fijos y cauciones. Ideal para plata que puede necesitarse ya."],
  ["Dólar MEP", "Dólar que se obtiene comprando un bono en pesos y vendiéndolo en dólares (ej. AL30 → AL30D). Es legal y queda en tu cuenta del broker."],
  ["Caución", "Préstamo de muy corto plazo garantizado por el mercado. Como colocador, prestás tu plata a una tasa fija de 1 a 30 días."],
  ["Obligación Negociable (ON)", "Bono emitido por una empresa (YPF, Pampa, Vista). Paga intereses (cupones) en dólares cada 6 meses, en general."],
  ["Bono soberano (AL30, GD35…)", "Deuda del Estado argentino en dólares. GD = ley Nueva York, AL = ley argentina. Más rendimiento, más riesgo país."],
  ["LECAP", "Letra del Tesoro a tasa fija en pesos. Sabés cuánto vas a cobrar al vencimiento."],
  ["Bono CER", "Bono que ajusta por inflación. Protege contra la inflación en pesos."],
  ["TNA vs TEA", "TNA es la tasa nominal anual; TEA incluye la capitalización de intereses. Para comparar, usá siempre la TEA."],
  ["TIR", "Tasa interna de retorno: lo que te rinde un bono por año si lo mantenés hasta el vencimiento."],
  ["Riesgo país", "Cuánto más tasa que EE.UU. le piden a Argentina. Si baja, suben los bonos y acciones argentinas."],
  ["Volatilidad", "Cuánto se mueve un activo para arriba y para abajo. Más volatilidad = más riesgo en el corto plazo."],
  ["Rebalanceo", "Volver a llevar la cartera a los porcentajes objetivo vendiendo lo que subió de más y comprando lo que quedó atrás."],
];

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-12">
      <header>
        <h1 className="text-3xl font-bold">Aprender a invertir</h1>
        <p className="text-ink-2 mt-2 max-w-2xl">Lo esencial para entender tu plan, sin vueltas.</p>
      </header>

      <section>
        <h2 className="text-xl font-bold mb-4">6 reglas que usan los profesionales</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRINCIPLES.map(([t, d], i) => (
            <div key={t} className="card p-5">
              <div className="text-brand font-bold tabular">0{i + 1}</div>
              <h3 className="font-semibold mt-1">{t}</h3>
              <p className="text-sm text-ink-2 mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Calculadoras</h2>
        <Calculators />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Glosario</h2>
        <dl className="card divide-y divide-[var(--line)]">
          {GLOSSARY.map(([t, d]) => (
            <div key={t} className="p-4 sm:grid sm:grid-cols-[220px_1fr] gap-4">
              <dt className="font-semibold">{t}</dt>
              <dd className="text-sm text-ink-2 mt-1 sm:mt-0">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Impuestos: lo básico</h2>
        <p className="text-sm text-ink-2 mt-2">
          Las inversiones pueden estar alcanzadas por Bienes Personales y, en algunos casos, por Ganancias (por ejemplo, dividendos o
          resultados de ciertos instrumentos). Las reglas cambian seguido: antes de decisiones grandes, consultá con un contador.
        </p>
      </section>
    </div>
  );
}
