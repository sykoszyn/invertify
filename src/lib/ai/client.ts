import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-opus-5";
/** Si el modelo declina un pedido, la API lo reintenta con el modelo alternativo recomendado. */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function aiEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
export function getAnthropic() {
  if (!client) client = new Anthropic();
  return client;
}
