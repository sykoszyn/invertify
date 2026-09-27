"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { ASSET_CLASS_LABEL, CATALOG, findInstrument } from "@/lib/catalog";
import { BROKER_LIST } from "@/lib/brokers";
import { toUsd } from "@/lib/engine";
import { usd, uid } from "@/lib/format";
import { useAiStatus } from "@/lib/useAiStatus";
import type { AssetClass, Assumptions, BrokerId, Currency, Holding } from "@/lib/types";

const CLASSES = Object.keys(ASSET_CLASS_LABEL) as AssetClass[];

const QUICK: { label: string; ticker: string; currency: Currency }[] = [
  { label: "Pesos en money market", ticker: "MONEYMARKET", currency: "ARS" },
  { label: "Dólares en cuenta", ticker: "DOLARES", currency: "USD" },
  { label: "Plazo fijo", ticker: "PLAZOFIJO", currency: "ARS" },
  { label: "CEDEAR S&P 500", ticker: "SPY", currency: "USD" },
  { label: "FCI en dólares", ticker: "FCIUSD", currency: "USD" },
  { label: "Bitcoin", ticker: "BTC", currency: "USD" },
];

interface Props {
  holdings: Holding[];
  broker: BrokerId;
  assumptions: Assumptions;
  onChange: (h: Holding[]) => void;
  onBroker: (b: BrokerId) => void;
  onLoadSample: () => void;
}

export function HoldingsEditor({ holdings, broker, assumptions, onChange, onBroker, onLoadSample }: Props) {
  const [draft, setDraft] = useState({ ticker: "", name: "", assetClass: "cedear_etf" as AssetClass, currency: "USD" as Currency, amount: "", returnPct: "", ratePct: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ fraction: number; label: string } | null>(null);
  const ai = useAiStatus();
  const fileRef = useRef<HTMLInputElement>(null);

  const setTicker = (value: string) => {
    const inst = findInstrument(value);
    setDraft((d) => ({
      ...d,
      ticker: value.toUpperCase(),
      ...(inst ? { name: inst.name, assetClass: inst.assetClass, currency: inst.currency ?? d.currency } : {}),
    }));
  };

  const add = () => {
    const amount = parseNum(draft.amount);
    if (!draft.ticker || !amount) return;
    const inst = findInstrument(draft.ticker);
    onChange([
      ...holdings,
      {
        id: uid(),
        ticker: draft.ticker.trim().toUpperCase(),
        name: draft.name || inst?.name || draft.ticker,
        assetClass: draft.assetClass,
        currency: draft.currency,
        amount,
        returnPct: draft.returnPct ? parseNum(draft.returnPct) : undefined,
        ratePct: draft.ratePct ? parseNum(draft.ratePct) : undefined,
        broker,
      },
    ]);
    setDraft({ ticker: "", name: "", assetClass: draft.assetClass, currency: draft.currency, amount: "", returnPct: "", ratePct: "" });
  };

  const quickAdd = (q: (typeof QUICK)[number]) => {
    setTicker(q.ticker);
    setDraft((d) => ({ ...d, currency: q.currency }));
  };

  const patch = (id: string, p: Partial<Holding>) => onChange(holdings.map((h) => (h.id === id ? { ...h, ...p } : h)));
  const remove = (id: string) => onChange(holdings.filter((h) => h.id !== id));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, 8);
    setUploading(true);
    setUploadMsg(null);
    setProgress({ fraction: 0, label: "Preparando…" });
    try {
      let found: Omit<Holding, "id">[] | null = null;
      let empty = 0;
      if (ai) {
        // Con clave de IA configurada, la lectura es más precisa; si falla, usamos el OCR local.
        try {
          setProgress({ fraction: 0.3, label: "Leyendo con IA…" });
          const images = await Promise.all(list.slice(0, 5).map(fileToDataUrl));
          const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images, broker }) });
          if (res.ok) found = (await res.json()).holdings;
        } catch {
          found = null;
        }
      }
      if (!found) {
        const { readScreenshots } = await import("@/lib/ocr/browser");
        const r = await readScreenshots(list, (fraction, label) => setProgress({ fraction, label }));
        found = r.holdings;
        empty = r.emptyFiles;
      }
      if (found.length === 0) {
        setUploadMsg("No encontramos inversiones en esas capturas. Usá la pantalla de tu cartera donde se ve cada activo con su valor (por ejemplo \"Mis inversiones\" en IOL o el detalle del fondo en Cocos), o cargalas a mano.");
        return;
      }
      // Si una inversión ya estaba cargada, la reemplazamos en lugar de duplicarla.
      const tickers = new Set(found.map((h) => h.ticker.toUpperCase()));
      const kept = holdings.filter((h) => !tickers.has(h.ticker.toUpperCase()));
      onChange([...kept, ...found.map((h) => ({ ...h, id: uid(), broker }))]);
      const replaced = holdings.length - kept.length;
      setUploadMsg(
        `Encontramos ${found.length} ${found.length === 1 ? "inversión" : "inversiones"}${replaced ? ` (${replaced} ya estaba${replaced === 1 ? "" : "n"} y se actualizó)` : ""}. ` +
          `Revisá los montos abajo y corregí lo que haga falta.${empty ? ` En ${empty} captura${empty === 1 ? "" : "s"} no encontramos nada.` : ""}`,
      );
    } catch (e) {
      setUploadMsg(e instanceof Error ? `No pudimos leer las capturas: ${e.message}` : "Error leyendo las capturas");
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const total = holdings.reduce((s, h) => s + toUsd(h, assumptions), 0);
  const isArs = draft.assetClass === "liquidez_ars" || draft.assetClass === "renta_fija_ars";

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">¿Con qué broker operás?</h2>
        <p className="text-sm text-muted mb-4">Lo usamos para darte el paso a paso exacto en tu app.</p>
        <div className="flex flex-wrap gap-2">
          {BROKER_LIST.map((b) => (
            <button key={b.id} className="chip" data-active={broker === b.id} onClick={() => onBroker(b.id)}>
              {b.name}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">¿Qué tenés hoy?</h2>
            <p className="text-sm text-muted">Cargá cada inversión con su valor actual (como figura en tu broker).</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost text-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Subir capturas
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
            <button className="btn btn-ghost text-sm" onClick={onLoadSample}>
              <Sparkles className="w-4 h-4" /> Ver ejemplo
            </button>
          </div>
        </div>
        {progress && (
          <div className="mb-4 rounded-xl bg-brand-soft px-3 py-2 text-sm" role="status">
            <div className="flex justify-between">
              <span>{progress.label}</span>
              <span className="tabular">{Math.round(progress.fraction * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface mt-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(4, progress.fraction * 100)}%` }} />
            </div>
          </div>
        )}
        {uploadMsg && <p className="mb-4 text-sm rounded-xl bg-brand-soft px-3 py-2">{uploadMsg}</p>}
        {!uploadMsg && !progress && holdings.length === 0 && (
          <p className="mb-4 text-xs text-muted">
            📸 Tip: sacá capturas de la pantalla donde se ve cada inversión con su valor y subilas todas juntas.{" "}
            {ai ? "Se leen con IA." : "Se leen en tu celular o computadora: las imágenes no se envían a ningún lado."}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK.map((q) => (
            <button key={q.ticker} className="chip text-sm" onClick={() => quickAdd(q)}>
              <Plus className="w-3.5 h-3.5" /> {q.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end rounded-2xl bg-surface-2 p-3">
          <label className="col-span-2 sm:col-span-3 text-sm">
            <span className="text-muted">Ticker o nombre</span>
            <input className="input mt-1" list="catalog" placeholder="SPYD, AL30, COCOSPPA…" value={draft.ticker} onChange={(e) => setTicker(e.target.value)} />
            <datalist id="catalog">
              {CATALOG.map((i) => (
                <option key={i.ticker} value={i.ticker}>
                  {i.name}
                </option>
              ))}
            </datalist>
          </label>
          <label className="col-span-2 sm:col-span-3 text-sm">
            <span className="text-muted">Tipo</span>
            <select className="input mt-1" value={draft.assetClass} onChange={(e) => setDraft({ ...draft, assetClass: e.target.value as AssetClass })}>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {ASSET_CLASS_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 sm:col-span-3 text-sm">
            <span className="text-muted">Valor actual</span>
            <div className="flex mt-1 gap-1">
              <select className="input !w-[78px] !px-2" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value as Currency })}>
                <option value="USD">US$</option>
                <option value="ARS">$</option>
              </select>
              <input className="input tabular" inputMode="decimal" placeholder="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} />
            </div>
          </label>
          <label className="col-span-1 sm:col-span-2 text-sm">
            <span className="text-muted">{isArs ? "Tasa anual %" : "Rendim. %"}</span>
            <input
              className="input mt-1 tabular"
              inputMode="decimal"
              placeholder={isArs ? "26" : "opcional"}
              value={isArs ? draft.ratePct : draft.returnPct}
              onChange={(e) => setDraft(isArs ? { ...draft, ratePct: e.target.value } : { ...draft, returnPct: e.target.value })}
            />
          </label>
          <button className="btn btn-primary col-span-1 sm:col-span-1 !px-3 h-[42px]" onClick={add} aria-label="Agregar inversión">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {holdings.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="font-medium py-2">Inversión</th>
                  <th className="font-medium py-2">Tipo</th>
                  <th className="font-medium py-2 text-right">Valor</th>
                  <th className="font-medium py-2 text-right">Rend. / tasa</th>
                  <th className="font-medium py-2 text-right">En US$</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const ars = h.assetClass === "liquidez_ars" || h.assetClass === "renta_fija_ars";
                  const known = !!findInstrument(h.ticker);
                  return (
                    <tr key={h.id} className="border-t border-line">
                      <td className="py-2 pr-2">
                        <div className="font-semibold">{h.ticker}</div>
                        <div className="text-muted text-xs">
                          {h.name}
                          {!known && " · fuera del catálogo"}
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <select className="input !py-1 !px-2 text-xs" value={h.assetClass} onChange={(e) => patch(h.id, { assetClass: e.target.value as AssetClass })}>
                          {CLASSES.map((c) => (
                            <option key={c} value={c}>
                              {ASSET_CLASS_LABEL[c]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted text-xs">{h.currency === "USD" ? "US$" : "$"}</span>
                          <NumberCell value={h.amount} onCommit={(amount) => patch(h.id, { amount })} />
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-right tabular">
                        {ars ? (h.ratePct != null ? `${h.ratePct}% TEA` : "—") : h.returnPct != null ? (
                          <span className={h.returnPct >= 0 ? "text-good" : "text-bad"}>
                            {h.returnPct >= 0 ? "▲" : "▼"} {Math.abs(h.returnPct).toLocaleString("es-AR")}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right tabular font-medium">{usd(toUsd(h, assumptions))}</td>
                      <td className="py-2 text-right">
                        <button className="p-2 text-muted hover:text-bad" onClick={() => remove(h.id)} aria-label={`Quitar ${h.ticker}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line">
                  <td colSpan={4} className="py-3 font-semibold">
                    Total
                  </td>
                  <td className="py-3 text-right font-bold tabular">{usd(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted text-center py-6 border border-dashed border-line rounded-2xl">
            Todavía no cargaste nada. ¿Arrancás de cero? Está perfecto: pasá al siguiente paso y te armamos la cartera ideal.
          </p>
        )}
      </section>
    </div>
  );
}

function NumberCell({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      className="input !py-1 !px-2 !w-32 text-right tabular"
      inputMode="decimal"
      value={text ?? value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
      onFocus={() => setText(value.toLocaleString("es-AR", { maximumFractionDigits: 2 }))}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text != null) onCommit(parseNum(text));
        setText(null);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

export function parseNum(s: string): number {
  // Acepta "12.404.346,69" (formato argentino) y "12404346.69"
  const t = s.trim();
  if (!t) return 0;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t;
  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Reducimos la imagen para no mandar archivos enormes
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}
