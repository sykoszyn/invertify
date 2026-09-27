# Invertify

Asesor de inversiones para Argentina: cargás lo que tenés en tu broker (Cocos, IOL, Balanz, PPI, Bull Market…), contás tu objetivo
("quiero comprarme un departamento en 5 años") y la app te devuelve:

- **Diagnóstico** de la cartera: concentración, exposición al peso, riesgo vs. plazo, fondo de emergencia, posiciones chicas, ganancias para tomar.
- **Cartera sugerida** según objetivo, plazo y perfil de riesgo (conservador / moderado / agresivo), comparada con la actual.
- **Plan de acción** concreto: "mové US$4.720 de COCOSPPA a SPYD", con el porqué, el impacto en el retorno esperado y otras opciones.
- **Paso a paso por broker** para ejecutar cada movimiento (rescatar un FCI, pasar a dólar MEP, comprar un CEDEAR…), usando el broker donde está cada posición.
- **Proyección a la meta** con aportes mensuales, rango pesimista/optimista y aporte necesario para llegar a tiempo.
- **Escenarios "¿qué pasa si…?"**: salto del dólar, crisis global, rally tech, baja del riesgo país, baja de tasas en EE.UU.
- **Objetivo departamento**: precio estimado por zona y m², gastos de escritura y opción de crédito hipotecario (solo anticipo).
- **Carga por captura de pantalla**: subís screenshots del broker y se completa la cartera. Por defecto usa OCR
  (Tesseract.js) dentro del navegador: gratis, sin claves, y las imágenes no salen del dispositivo. Probado con
  capturas reales de IOL y Cocos (`tests/ocr.test.ts`). Con `ANTHROPIC_API_KEY` usa Claude, que es más preciso.
- **Asesor**: preguntas frecuentes respondidas con los números de la cartera de cada persona (sin IA).
  Con `ANTHROPIC_API_KEY` se habilita además un chat libre.
- **Cuentas y seguimiento** (opcional, Supabase): guardar carteras y ver la evolución de valor y puntaje en el tiempo.
- Guías por broker, glosario, calculadoras (pesos vs. dólares, interés compuesto) y dólar MEP del día.

Sin Supabase ni API key la app funciona completa: la cartera se guarda en el navegador, las capturas se leen con OCR local y el asesor responde las preguntas frecuentes; solo se ocultan las cuentas y el chat libre.

> Invertify es una herramienta educativa. Las sugerencias salen de reglas de diversificación y supuestos de mercado
> (`src/lib/catalog.ts`, `src/lib/engine.ts`), no de predicciones, y no constituyen asesoramiento financiero personalizado.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Recharts · Supabase (auth con email y contraseña + Postgres con RLS) · Claude API (`@anthropic-ai/sdk`).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # opcional
npm run dev                  # http://localhost:3000
npm test                     # tests del motor de análisis
npm run lint                 # typecheck
```

## Deploy en Vercel + Supabase

1. **Supabase**: creá un proyecto y ejecutá `supabase/migrations/20260927000000_init.sql` en el SQL Editor
   (o `supabase db push` con la CLI). En *Authentication → URL Configuration* poné tu dominio de Vercel
   (ej. `https://invertifyapp.vercel.app`) como *Site URL*.
   El registro es con email y contraseña y se entra directo, **sin mail de confirmación**: la cuenta se crea desde
   `/api/signup` con la clave secreta, ya confirmada. Si preferís no usar esa key, desactivá
   *Authentication → Providers → Email → Confirm email* y la app usa el registro estándar de Supabase.
2. **Vercel**: importá el repo (framework Next.js, sin cambios de build) y cargá las variables:

   | Variable | Para qué |
   |---|---|
   | `SUPABASE_URL` | URL del proyecto Supabase |
   | `SUPABASE_PUBLISHABLE_KEY` | clave publicable (`sb_publishable_…`) |
   | `SUPABASE_SECRET_KEY` | clave secreta (`sb_secret_…`), solo servidor: crear cuentas sin mail de confirmación |
   | `ANTHROPIC_API_KEY` | asesor IA y lectura de capturas |

3. Deploy. Todas las variables son opcionales. También se aceptan los nombres viejos
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Si cambiás una variable
   en Vercel, hacé *Redeploy*: la URL y la clave publicable se incorporan al compilar.

La IA usa `claude-opus-5` con *server-side fallbacks* activados (`fallbacks: "default"`), así que si el modelo declina un pedido la API
lo reintenta con el modelo alternativo recomendado. Antes de abrir la app al público conviene agregar rate limiting a
`/api/advisor`, `/api/extract` y `/api/signup` (por ejemplo con Vercel Firewall o Upstash) para controlar el costo.

## Estructura

```
src/lib/catalog.ts    instrumentos (CEDEARs, bonos, ONs, FCIs…) con retorno/volatilidad supuestos
src/lib/engine.ts     motor: asignación objetivo, diagnóstico, movimientos, proyección, escenarios, puntaje
src/lib/brokers.ts    brokers y guías paso a paso por operación
src/lib/goals.ts      objetivos y calculadora de departamento
src/lib/ocr/          lectura de capturas (OCR en el navegador + parser de pantallas de brokers)
src/lib/faq.ts        asesor sin IA: respuestas armadas con el análisis
scripts/              copia a public/ocr los archivos del OCR (corre en postinstall/prebuild)
src/components/       UI (analizador, gráficos, calculadoras)
src/app/api/          dólar del día, asesor IA, lectura de capturas
supabase/migrations/  esquema y políticas RLS
```

Para ajustar supuestos (retornos esperados, precios por m², carteras modelo) editá `catalog.ts`, `goals.ts` y `BASE_TARGETS` en `engine.ts`.
