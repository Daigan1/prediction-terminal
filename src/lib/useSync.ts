"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./auth";
import { useStore } from "./store";
import {
  fetchPaperTrades,
  fetchPaperBalances,
  insertPaperTrade,
  updatePaperTradeStatus,
  upsertPaperBalance,
} from "./db";
import type { Trade, Balance } from "@/types";

const DEFAULT_PAPER_BALANCES: Balance[] = [
  { exchange: "kalshi", cash: 100000, positions: [] },
  { exchange: "polymarket", cash: 100000, positions: [] },
  { exchange: "gemini", cash: 100000, positions: [] },
];

/**
 * Syncs paper trades and balances with Supabase when a user is logged in.
 * Call this once at the app root.
 */
export function useSync() {
  const { user } = useAuth();
  const loaded = useRef(false);

  // Load from Supabase on login
  useEffect(() => {
    if (!user) {
      loaded.current = false;
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [trades, balances] = await Promise.all([
          fetchPaperTrades(),
          fetchPaperBalances(),
        ]);

        if (cancelled) return;

        const store = useStore.getState();

        // Merge remote trades (paper only) with any local ones
        if (trades.length > 0) {
          const localIds = new Set(store.trades.map((t) => t.id));
          const merged = [
            ...store.trades,
            ...trades.filter((t) => !localIds.has(t.id)),
          ].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          useStore.setState({ trades: merged });
        }

        // Restore balances
        if (balances.length > 0) {
          useStore.setState({ paperBalances: balances });
        }

        loaded.current = true;
      } catch {
        // Supabase tables may not exist yet — silently ignore
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Persist new paper trades as they're placed
  useEffect(() => {
    if (!user) return;

    const unsub = useStore.subscribe((state, prev) => {
      if (!loaded.current) return;

      // New trade added
      if (state.trades.length > prev.trades.length) {
        const newTrades = state.trades.filter(
          (t) => !prev.trades.some((p) => p.id === t.id)
        );
        for (const t of newTrades) {
          if (t.type === "paper") {
            insertPaperTrade(t).catch(() => {});
          }
        }
      }

      // Trade status changed (e.g. settled after sell)
      for (const t of state.trades) {
        if (t.type !== "paper") continue;
        const prevT = prev.trades.find((p) => p.id === t.id);
        if (prevT && prevT.status !== t.status) {
          updatePaperTradeStatus(
            t.id,
            t.status,
            t.pnl ?? null,
            t.settledAt ?? null
          ).catch(() => {});
        }
      }

      // Paper balances changed
      if (state.paperBalances !== prev.paperBalances) {
        for (const b of state.paperBalances) {
          const prevB = prev.paperBalances.find(
            (p) => p.exchange === b.exchange
          );
          if (!prevB || prevB.cash !== b.cash || prevB.positions !== b.positions) {
            upsertPaperBalance(b).catch(() => {});
          }
        }
      }
    });

    return unsub;
  }, [user]);
}
