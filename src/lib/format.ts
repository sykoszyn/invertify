export const usd = (x: number, decimals = 0) =>
  `US$${x.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const ars = (x: number) => `$${Math.round(x).toLocaleString("es-AR")}`;

export const pct = (x: number, decimals = 0) =>
  `${(x * 100).toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;

export const signedPct = (x: number, decimals = 1) => `${x >= 0 ? "+" : ""}${pct(x, decimals)}`;

export const compactUsd = (x: number) => {
  if (Math.abs(x) >= 1_000_000) return `US$${(x / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(x) >= 1000) return `US$${(x / 1000).toLocaleString("es-AR", { maximumFractionDigits: 0 })}k`;
  return usd(x);
};

export const years = (y: number) => {
  if (y < 1) return `${Math.max(1, Math.round(y * 12))} meses`;
  const whole = Math.floor(y);
  const months = Math.round((y - whole) * 12);
  return months ? `${whole} año${whole === 1 ? "" : "s"} y ${months} mes${months === 1 ? "" : "es"}` : `${whole} año${whole === 1 ? "" : "s"}`;
};

export const uid = () => Math.random().toString(36).slice(2, 10);
