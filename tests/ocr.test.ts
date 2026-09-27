import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeParsed, parseBrokerScreenshot, type OcrLine } from "../src/lib/ocr/parse";

// Salida real de Tesseract (spa) sobre capturas de IOL y Cocos.
const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/ocr-${name}.json`, import.meta.url), "utf8")) as OcrLine[];

test("IOL: CEDEARs en dólares", () => {
  const h = parseBrokerScreenshot(load("iol-cedears"));
  const by = Object.fromEntries(h.map((x) => [x.ticker, x]));
  assert.deepEqual(Object.keys(by).sort(), ["AMDD", "ARKKD", "KOD", "MCDD", "NVDAD", "PFED", "PYPLD", "SPYD"]);
  assert.equal(by.AMDD.amount, 197.1);
  assert.equal(by.AMDD.returnPct, 442.83);
  assert.equal(by.SPYD.amount, 3187.65);
  assert.equal(by.MCDD.returnPct, -13.33);
  assert.equal(by.PFED.returnPct, 9.93); // "993%" sin coma
  assert.ok(h.every((x) => x.currency === "USD"));
  assert.equal(by.SPYD.assetClass, "cedear_etf");
  assert.equal(by.KOD.assetClass, "cedear_accion");
});

test("IOL: fondos comunes", () => {
  const h = parseBrokerScreenshot(load("iol-fondos"));
  const by = Object.fromEntries(h.map((x) => [x.ticker, x]));
  assert.deepEqual(Object.keys(by).sort(), ["IOLCAMA", "IOLDOLD"]);
  assert.equal(by.IOLCAMA.amount, 14.05);
  assert.equal(by.IOLCAMA.currency, "USD");
  assert.equal(by.IOLDOLD.returnPct, 2.32);
  assert.equal(by.IOLDOLD.assetClass, "renta_fija_usd");
  assert.ok(by.IOLDOLD.amount > 7800 && by.IOLDOLD.amount < 7900);
});

test("IOL: acciones", () => {
  const h = parseBrokerScreenshot(load("iol-acciones"));
  assert.equal(h.length, 1);
  assert.equal(h[0].ticker, "GGALD");
  assert.equal(h[0].amount, 462.84);
  assert.equal(h[0].returnPct, -14.35);
  assert.equal(h[0].assetClass, "accion_ar");
});

test("Cocos: FCI en pesos con centavos en superíndice y TEA", () => {
  const h = parseBrokerScreenshot(load("cocos-fci"));
  assert.equal(h.length, 1);
  assert.equal(h[0].ticker, "COCOSPPA");
  assert.equal(h[0].amount, 12404346.69);
  assert.equal(h[0].currency, "ARS");
  assert.equal(h[0].ratePct, 26);
  assert.equal(h[0].assetClass, "liquidez_ars");
});

test("pantalla sin inversiones devuelve vacío", () => {
  assert.deepEqual(parseBrokerScreenshot(load("cocos-composicion")), []);
});

test("unir varias capturas no duplica", () => {
  const a = parseBrokerScreenshot(load("iol-cedears"));
  const m = mergeParsed([a, a, parseBrokerScreenshot(load("iol-acciones"))]);
  assert.equal(m.length, 9);
});

test("los nombres no arrastran las flechas del broker", () => {
  const names = [...parseBrokerScreenshot(load("iol-cedears")), ...parseBrokerScreenshot(load("iol-fondos"))].map((h) => h.name);
  assert.ok(names.includes("IOL Dólar Ahorro Plus"), names.join(" | "));
  assert.ok(names.includes("Nvidia Corporation"), names.join(" | "));
  assert.ok(names.includes("Spdr SP 500"), names.join(" | "));
});
