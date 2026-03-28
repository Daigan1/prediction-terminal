import { supabase } from "./supabase";
import type { Exchange, Trade, Balance } from "@/types";

// ── API Keys ──

export type StoredApiKey = {
  exchange: Exchange;
  api_key: string;
  api_secret: string;
};

export async function fetchApiKeys(): Promise<StoredApiKey[]> {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("exchange, api_key, api_secret");
  if (error) throw error;
  return (data ?? []) as StoredApiKey[];
}

export async function upsertApiKey(
  exchange: Exchange,
  apiKey: string,
  apiSecret: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("user_api_keys").upsert(
    {
      user_id: user.id,
      exchange,
      api_key: apiKey,
      api_secret: apiSecret,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,exchange" }
  );
  if (error) throw error;
}

// ── Paper Trades ──

export async function fetchPaperTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("paper_trades")
    .select("*")
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    marketId: r.market_id as string,
    marketTitle: r.market_title as string,
    exchange: r.exchange as Exchange,
    side: r.side as "yes" | "no",
    price: Number(r.price),
    quantity: Number(r.quantity),
    type: "paper" as const,
    action: (r.action as "buy" | "sell") ?? "buy",
    status: r.status as Trade["status"],
    pnl: r.pnl != null ? Number(r.pnl) : undefined,
    timestamp: r.timestamp as string,
    settledAt: (r.settled_at as string) ?? undefined,
  }));
}

export async function insertPaperTrade(trade: Trade) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("paper_trades").insert({
    id: trade.id,
    user_id: user.id,
    market_id: trade.marketId,
    market_title: trade.marketTitle,
    exchange: trade.exchange,
    side: trade.side,
    price: trade.price,
    quantity: trade.quantity,
    action: trade.action ?? "buy",
    status: trade.status,
    pnl: trade.pnl ?? null,
    timestamp: trade.timestamp,
    settled_at: trade.settledAt ?? null,
  });
  if (error) throw error;
}

export async function updatePaperTradeStatus(
  tradeId: string,
  status: Trade["status"],
  pnl: number | null,
  settledAt: string | null
) {
  const { error } = await supabase
    .from("paper_trades")
    .update({
      status,
      pnl,
      settled_at: settledAt,
    })
    .eq("id", tradeId);
  if (error) throw error;
}

// ── Paper Balances ──

export async function fetchPaperBalances(): Promise<Balance[]> {
  const { data, error } = await supabase
    .from("paper_balances")
    .select("exchange, cash, positions");
  if (error) throw error;
  if (!data || data.length === 0) return [];
  return (data as { exchange: Exchange; cash: number; positions: unknown }[]).map((r) => ({
    exchange: r.exchange,
    cash: Number(r.cash),
    positions: (r.positions as Balance["positions"]) ?? [],
  }));
}

export async function upsertPaperBalance(balance: Balance) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("paper_balances").upsert(
    {
      user_id: user.id,
      exchange: balance.exchange,
      cash: balance.cash,
      positions: balance.positions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,exchange" }
  );
  if (error) throw error;
}
