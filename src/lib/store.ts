"use client";

import { useCallback, useEffect, useState } from "react";
import type { Portfolio } from "./types";
import { DEFAULT_ASSUMPTIONS } from "./sample";

const KEY = "invertify:portfolio:v1";

export const EMPTY_PORTFOLIO: Portfolio = {
  name: "Mi cartera",
  holdings: [],
  profile: {
    goal: "departamento",
    goalAmountUsd: 110000,
    horizonYears: 5,
    monthlyContributionUsd: 500,
    risk: "moderado",
    hasEmergencyFund: false,
    broker: "iol",
    usesMortgage: false,
  },
  assumptions: DEFAULT_ASSUMPTIONS,
};

export function writeLocalPortfolio(p: Portfolio) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* almacenamiento no disponible */
  }
}

function read(): Portfolio | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Portfolio) : null;
  } catch {
    return null;
  }
}

/** Estado de la cartera persistido en el navegador (funciona sin cuenta). */
export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio>(EMPTY_PORTFOLIO);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = read();
    if (saved) setPortfolio({ ...EMPTY_PORTFOLIO, ...saved, profile: { ...EMPTY_PORTFOLIO.profile, ...saved.profile } });
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(portfolio));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [portfolio, loaded]);

  const update = useCallback((patch: Partial<Portfolio> | ((p: Portfolio) => Portfolio)) => {
    setPortfolio((p) => (typeof patch === "function" ? patch(p) : { ...p, ...patch }));
  }, []);

  return { portfolio, update, loaded };
}
