import test from "node:test";
import assert from "node:assert/strict";
import { analyze, targetAllocation } from "../src/lib/engine";
import { normalizeTicker } from "../src/lib/catalog";
import { SAMPLE_HOLDINGS, SAMPLE_PROFILE, DEFAULT_ASSUMPTIONS } from "../src/lib/sample";
import { BUCKETS } from "../src/lib/catalog";

test("normaliza tickers de brokers", () => {
  assert.equal(normalizeTicker("NVDAD"), "NVDA");
  assert.equal(normalizeTicker("kod"), "KO");
  assert.equal(normalizeTicker("GD30D"), "GD30");
  assert.equal(normalizeTicker("YPFD"), "YPFD");
  assert.equal(normalizeTicker("IOLDOLD"), "IOLDOLD");
});

test("la asignación objetivo suma 100% y respeta el plazo", () => {
  for (const risk of ["conservador", "moderado", "agresivo"] as const) {
    for (const h of [1, 2, 5, 20]) {
      const t = targetAllocation({ ...SAMPLE_PROFILE, risk, horizonYears: h });
      const sum = BUCKETS.reduce((s, b) => s + t[b], 0);
      assert.ok(Math.abs(sum - 1) < 1e-9);
      const eq = t.global + t.individuales + t.argentina + t.cripto;
      if (h <= 1) assert.ok(eq <= 0.1 + 1e-9);
    }
  }
});

test("analiza la cartera de ejemplo", () => {
  const a = analyze(SAMPLE_HOLDINGS, SAMPLE_PROFILE, DEFAULT_ASSUMPTIONS);
  assert.ok(a.totalUsd > 20000 && a.totalUsd < 21000, `total ${a.totalUsd}`);
  assert.ok(a.arsWeight > 0.35);
  assert.ok(a.diagnostics.some((d) => d.id === "pesos"));
  assert.ok(a.diagnostics.some((d) => d.id === "win-AMD"));
  assert.ok(a.moves.length > 0);
  // Los movimientos nunca venden más de lo que hay
  const byFrom = new Map<string, number>();
  for (const m of a.moves) if (m.from && !m.from.ticker.includes("·")) byFrom.set(m.from.ticker, (byFrom.get(m.from.ticker) ?? 0) + m.amountUsd);
  for (const [t, amt] of byFrom) {
    const pos = a.positions.find((p) => p.holding.ticker === t)!;
    assert.ok(amt <= pos.usd + 0.01, `${t}: ${amt} > ${pos.usd}`);
  }
  assert.ok(a.score.total >= 0 && a.score.total <= 100);
  console.log(JSON.stringify({ total: a.totalUsd, score: a.score.total, r: a.expReturn, tr: a.targetExpReturn, vol: a.vol, diags: a.diagnostics.map((d) => d.severity + " " + d.title), moves: a.moves.map((m) => `${m.kind} ${m.from?.ticker ?? "aporte"} -> ${m.to.ticker} ${Math.round(m.amountUsd)}`), stress: a.stress.map(s=>`${s.id} ${(s.currentPct*100).toFixed(1)} / ${(s.targetPct*100).toFixed(1)}`), yrs: [a.yearsToGoalCurrent, a.yearsToGoalTarget], req: a.requiredMonthly }, null, 1));
});

test("cartera vacía no rompe", () => {
  const a = analyze([], SAMPLE_PROFILE, DEFAULT_ASSUMPTIONS);
  assert.equal(a.totalUsd, 0);
  assert.equal(a.moves.length, 0);
});
