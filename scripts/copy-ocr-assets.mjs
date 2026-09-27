// Copia a public/ocr los archivos que Tesseract.js necesita en el navegador, para no depender
// de un CDN externo: el worker, el motor (WebAssembly) y los datos del idioma español.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const root = join(dirname(new URL(import.meta.url).pathname), "..");
const out = join(root, "public", "ocr");

const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));

try {
  mkdirSync(join(out, "core"), { recursive: true });
  mkdirSync(join(out, "lang"), { recursive: true });
  copyFileSync(join(pkgDir("tesseract.js"), "dist", "worker.min.js"), join(out, "worker.min.js"));
  const core = pkgDir("tesseract.js-core");
  for (const variant of ["", "-simd", "-relaxedsimd"]) {
    for (const kind of ["", "-lstm"]) {
      const f = `tesseract-core${variant}${kind}.wasm.js`;
      if (existsSync(join(core, f))) copyFileSync(join(core, f), join(out, "core", f));
    }
  }
  copyFileSync(join(pkgDir("@tesseract.js-data/spa"), "4.0.0_best_int", "spa.traineddata.gz"), join(out, "lang", "spa.traineddata.gz"));
  console.log("OCR: archivos copiados a public/ocr");
} catch (e) {
  console.warn("OCR: no se pudieron copiar los archivos:", e.message);
}
