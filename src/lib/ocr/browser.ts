"use client";

import { mergeParsed, parseBrokerScreenshot, type OcrLine, type ParsedHolding } from "./parse";

/**
 * Lee capturas de pantalla del broker con OCR dentro del navegador (Tesseract.js).
 * Gratis, sin claves, y las imágenes nunca salen del dispositivo.
 */
export async function readScreenshots(files: File[], onProgress?: (fraction: number, label: string) => void): Promise<{ holdings: ParsedHolding[]; emptyFiles: number }> {
  const { createWorker, OEM } = await import("tesseract.js");
  let current = 0;
  const total = files.length;
  onProgress?.(0, "Preparando el lector…");
  const worker = await createWorker("spa", OEM.LSTM_ONLY, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/core",
    langPath: "/ocr/lang",
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.((current + m.progress) / total, `Leyendo captura ${current + 1} de ${total}…`);
      else if (current === 0) onProgress?.(0, "Preparando el lector…");
    },
  });
  try {
    const results: ParsedHolding[][] = [];
    let emptyFiles = 0;
    for (const file of files) {
      const image = await prepareImage(file);
      const { data } = await worker.recognize(image, {}, { blocks: true });
      const lines: OcrLine[] = [];
      for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) lines.push({ text: l.text, bbox: l.bbox });
      const parsed = parseBrokerScreenshot(lines);
      if (parsed.length === 0) emptyFiles++;
      results.push(parsed);
      current++;
    }
    onProgress?.(1, "Listo");
    return { holdings: mergeParsed(results), emptyFiles };
  } finally {
    await worker.terminate();
  }
}

/** Las capturas chicas se agrandan: Tesseract lee mejor el texto con letras de ~30px. */
async function prepareImage(file: File): Promise<HTMLCanvasElement | File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = bitmap.width < 900 ? 2 : bitmap.width > 2400 ? 2400 / bitmap.width : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}
