"use client";

import { useEffect, useState } from "react";

let cached: Promise<boolean> | null = null;

/** true si el servidor tiene una clave de IA configurada; null mientras se consulta. */
export function useAiStatus(): boolean | null {
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/status")
      .then((r) => r.json())
      .then((j: { ai?: boolean }) => !!j.ai)
      .catch(() => false);
    cached.then(setAi);
  }, []);
  return ai;
}
