"use client";

import type { Analysis } from "../engine";
import type { Portfolio } from "../types";
import { getSupabase } from "./client";

export interface SavedPortfolio {
  id: string;
  name: string;
  broker: string | null;
  holdings: Portfolio["holdings"];
  profile: Portfolio["profile"];
  assumptions: Portfolio["assumptions"];
  updated_at: string;
}

export interface Snapshot {
  portfolio_id: string;
  total_usd: number;
  score: number;
  expected_return: number | null;
  taken_at: string;
}

/** Guarda (o actualiza) la cartera y registra una foto de su estado para ver la evolución. */
export async function savePortfolio(p: Portfolio, a: Analysis): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase no está configurado");
  const row = {
    name: p.name,
    broker: p.profile.broker,
    holdings: p.holdings,
    profile: p.profile,
    assumptions: p.assumptions,
    updated_at: new Date().toISOString(),
  };
  let id = p.id;
  if (id) {
    const { error } = await sb.from("portfolios").update(row).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await sb.from("portfolios").insert(row).select("id").single();
    if (error) throw error;
    id = data.id as string;
  }
  const { error: snapErr } = await sb.from("snapshots").insert({
    portfolio_id: id,
    total_usd: Math.round(a.totalUsd * 100) / 100,
    score: a.score.total,
    expected_return: a.expReturn,
  });
  if (snapErr) throw snapErr;
  return id!;
}

export async function listPortfolios(): Promise<SavedPortfolio[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("portfolios").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data as SavedPortfolio[];
}

export async function listSnapshots(portfolioId: string): Promise<Snapshot[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("snapshots").select("*").eq("portfolio_id", portfolioId).order("taken_at");
  if (error) throw error;
  return data as Snapshot[];
}

export async function deletePortfolio(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("portfolios").delete().eq("id", id);
  if (error) throw error;
}
