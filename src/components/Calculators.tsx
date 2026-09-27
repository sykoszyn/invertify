"use client";

import { useState } from "react";
import { usd } from "@/lib/format";

/** Calculadora de "¿me conviene quedarme en pesos?" y de interés compuesto. */
export function Calculators() {
  const [tea, setTea] = useState(26);
  const [deval, setDeval] = useState(20);
  const [pv, setPv] = useState(5000);
  const [monthly, setMonthly] = useState(300);
  const [rate, setRate] = useState(7);
  const [yrs, setYrs] = useState(10);

  const usdReturn = ((1 + tea / 100) / (1 + deval / 100) - 1) * 100;
  const m = Math.pow(1 + rate / 100, 1 / 12) - 1;
  const n = yrs * 12;
  const g = Math.pow(1 + m, n);
  const fv = pv * g + (m ? (monthly * (g - 1)) / m : monthly * n);
  const contributed = pv + monthly * n;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card p-5">
        <h3 className="font-semibold text-lg">¿Pesos o dólares?</h3>
        <p className="text-sm text-muted">Cuánto ganás (o perdés) en dólares dejando la plata a tasa en pesos.</p>
        <Slider label={`Tasa en pesos (TEA): ${tea}%`} value={tea} min={0} max={100} onChange={setTea} />
        <Slider label={`Suba del dólar en el año: ${deval}%`} value={deval} min={0} max={100} onChange={setDeval} />
        <div className={`rounded-xl p-4 mt-4 ${usdReturn >= 0 ? "bg-good-soft" : "bg-bad-soft"}`}>
          <div className="text-sm">Tu rendimiento medido en dólares</div>
          <div className={`text-3xl font-bold tabular ${usdReturn >= 0 ? "text-good" : "text-bad"}`}>
            {usdReturn >= 0 ? "+" : ""}
            {usdReturn.toFixed(1)}%
          </div>
          <div className="text-xs text-ink-2 mt-1">
            Punto de equilibrio: si el dólar sube más de {tea}% en el año, te hubiera convenido dolarizarte.
          </div>
        </div>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold text-lg">Interés compuesto</h3>
        <p className="text-sm text-muted">Cuánto podés juntar aportando todos los meses.</p>
        <Slider label={`Capital inicial: ${usd(pv)}`} value={pv} min={0} max={100000} step={500} onChange={setPv} />
        <Slider label={`Aporte mensual: ${usd(monthly)}`} value={monthly} min={0} max={5000} step={50} onChange={setMonthly} />
        <Slider label={`Retorno anual en USD: ${rate}%`} value={rate} min={0} max={15} step={0.5} onChange={setRate} />
        <Slider label={`Años: ${yrs}`} value={yrs} min={1} max={40} onChange={setYrs} />
        <div className="rounded-xl p-4 mt-4 bg-brand-soft">
          <div className="text-sm">Vas a tener</div>
          <div className="text-3xl font-bold tabular">{usd(fv)}</div>
          <div className="text-xs text-ink-2 mt-1">
            Aportaste {usd(contributed)} · el interés compuesto sumó {usd(fv - contributed)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  return (
    <label className="block text-sm mt-4">
      <span className="text-ink-2">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-1 accent-[var(--brand)]" />
    </label>
  );
}
