"use client";

import { create, StoreApi, UseBoundStore } from "zustand";
import {
  Market,
  Balance,
  Trade,
  NewsItem,
  TradingMode,
  Exchange,
  MatchedGroup,
  Opportunity,
} from "@/types";
import { findMatchedGroups, findOpportunities } from "./matching";

interface ApiKeys {
  kalshi: { apiKey: string; secret: string };
  polymarket: { apiKey: string };
  gemini: { apiKey: string; secret: string };
}

interface AppState {
  // Data
  markets: Market[];
  matchedGroups: MatchedGroup[];
  opportunities: Opportunity[];
  balances: Balance[];
  paperBalances: Balance[];
  sandboxBalances: Balance[];
  trades: Trade[];
  news: NewsItem[];

  // UI State
  tradingMode: TradingMode;
  activeTab: "all" | "kalshi" | "polymarket" | "gemini";
  activeTradeTab: "live" | "paper" | "sandbox";
  settingsOpen: boolean;
  tradeModalOpen: boolean;
  tradeModalMarket: Market | null;
  newsDrawerOpen: boolean;
  newsDrawerMarket: Market | null;
  isLoading: boolean;
  lastRefresh: string;
  fetchError: string | null;
  simpleMode: boolean;

  // Exchange fetch status
  exchangeStatus: Record<Exchange, "idle" | "loading" | "ok" | "error">;

  // API Keys
  apiKeys: ApiKeys;

  // Actions
  setTradingMode: (mode: TradingMode) => void;
  setActiveTab: (tab: "all" | "kalshi" | "polymarket" | "gemini") => void;
  setActiveTradeTab: (tab: "live" | "paper" | "sandbox") => void;
  setSettingsOpen: (open: boolean) => void;
  setTradeModal: (open: boolean, market?: Market | null) => void;
  setNewsDrawer: (open: boolean, market?: Market | null) => void;
  setSimpleMode: (simple: boolean) => void;
  setApiKeys: (keys: Partial<ApiKeys>) => void;
  fetchMarkets: () => Promise<void>;
  fetchOrderHistory: () => Promise<void>;
  placeTrade: (trade: Omit<Trade, "id" | "timestamp" | "status" | "action">) => Promise<{ success: boolean; error?: string }>;
  sellTrade: (tradeId: string) => Promise<{ success: boolean; error?: string }>;
  addPaperCash: (exchange: Exchange, amount: number) => void;
}

export const useStore: UseBoundStore<StoreApi<AppState>> = create<AppState>((set) => ({
  // Data
  markets: [],
  matchedGroups: [],
  opportunities: [],
  balances: [
    { exchange: "kalshi", cash: 0, positions: [] },
    { exchange: "polymarket", cash: 0, positions: [] },
    { exchange: "gemini", cash: 0, positions: [] },
  ],
  paperBalances: [
    { exchange: "kalshi", cash: 100000, positions: [] },
    { exchange: "polymarket", cash: 100000, positions: [] },
    { exchange: "gemini", cash: 100000, positions: [] },
  ],
  sandboxBalances: [
    { exchange: "kalshi", cash: 0, positions: [] },
    { exchange: "polymarket", cash: 0, positions: [] },
    { exchange: "gemini", cash: 0, positions: [] },
  ],
  trades: [],
  news: [],

  // UI State
  tradingMode: "paper",
  activeTab: "all",
  activeTradeTab: "paper",
  settingsOpen: false,
  tradeModalOpen: false,
  tradeModalMarket: null,
  newsDrawerOpen: false,
  newsDrawerMarket: null,
  isLoading: false,
  lastRefresh: "",
  fetchError: null,
  simpleMode: false,

  exchangeStatus: {
    kalshi: "idle",
    polymarket: "idle",
    gemini: "idle",
  },

  // API Keys
  apiKeys: {
    kalshi: { apiKey: "", secret: "" },
    polymarket: { apiKey: "" },
    gemini: { apiKey: "", secret: "" },
  },

  // Actions
  setTradingMode: (mode) => set({ tradingMode: mode, activeTradeTab: mode }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveTradeTab: (tab) => set({ activeTradeTab: tab }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setTradeModal: (open, market = null) =>
    set({ tradeModalOpen: open, tradeModalMarket: market }),
  setNewsDrawer: (open, market = null) =>
    set({ newsDrawerOpen: open, newsDrawerMarket: market }),
  setSimpleMode: (simple) => set({ simpleMode: simple }),

  setApiKeys: (keys) =>
    set((state) => ({
      apiKeys: { ...state.apiKeys, ...keys },
    })),

  fetchMarkets: async () => {
    set({
      isLoading: true,
      fetchError: null,
      exchangeStatus: { kalshi: "loading", polymarket: "loading", gemini: "loading" },
    });

    try {
      const res = await fetch("/api/markets");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const exchangeStatus: Record<Exchange, "ok" | "error"> = {
        kalshi: (data.exchanges?.kalshi ?? 0) > 0 ? "ok" : "error",
        polymarket: (data.exchanges?.polymarket ?? 0) > 0 ? "ok" : "error",
        gemini: (data.exchanges?.gemini ?? 0) > 0 ? "ok" : "error",
      };

      const allMarkets: Market[] = data.markets || [];
      const matchedGroups = findMatchedGroups(allMarkets);
      const opportunities = findOpportunities(matchedGroups);

      set({
        markets: allMarkets,
        matchedGroups,
        opportunities,
        isLoading: false,
        lastRefresh: new Date().toISOString(),
        fetchError: null,
        exchangeStatus,
      });

      // Fetch AI-powered news in background
      try {
        const marketsSummary = allMarkets.slice(0, 20).map((m) => ({
          id: m.id,
          title: m.title,
          exchange: m.exchange,
          yesPrice: m.yesPrice,
        }));
        const newsRes = await fetch("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markets: marketsSummary }),
        });
        const newsData = await newsRes.json();
        console.log("[news]", newsRes.status, "items:", newsData.news?.length ?? 0, newsData.reason || newsData.error || "");
        if (newsRes.ok && newsData.news && newsData.news.length > 0) {
          set({ news: newsData.news });
        }
      } catch (e) {
        console.error("[news] fetch failed:", e);
      }
    } catch (err) {
      set({
        isLoading: false,
        fetchError: err instanceof Error ? err.message : "Failed to fetch",
        exchangeStatus: { kalshi: "error", polymarket: "error", gemini: "error" },
      });
    }
  },

  fetchOrderHistory: async () => {
    const { apiKeys, trades: existingTrades, tradingMode } = useStore.getState();

    // Only fetch if at least one exchange has API keys configured
    const hasAnyKey =
      !!(apiKeys.gemini.apiKey && apiKeys.gemini.secret) ||
      !!(apiKeys.kalshi.apiKey && apiKeys.kalshi.secret) ||
      !!apiKeys.polymarket.apiKey;

    if (!hasAnyKey) return;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingMode,
          apiKeys: {
            kalshi: apiKeys.kalshi,
            polymarket: apiKeys.polymarket,
            gemini: apiKeys.gemini,
          },
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      const exchangeTrades: Trade[] = data.trades || [];

      if (exchangeTrades.length === 0) return;

      // Merge: keep existing paper trades, dedupe live trades by exchangeOrderId
      const existingExchangeIds = new Set(
        existingTrades
          .filter((t) => t.exchangeOrderId)
          .map((t) => t.exchangeOrderId)
      );

      const newTrades = exchangeTrades.filter(
        (t) => !existingExchangeIds.has(t.exchangeOrderId)
      );

      if (newTrades.length > 0) {
        set((state) => ({
          trades: [...newTrades, ...state.trades].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ),
        }));
      }
    } catch (err) {
      console.error("[orders] fetch failed:", err);
    }
  },

  placeTrade: async (trade) => {
    const id = `trade-${Date.now()}`;

    // ── Paper mode: instant fill, no API call ──
    if (trade.type === "paper") {
      const newTrade: Trade = {
        ...trade,
        id,
        action: "buy",
        status: "filled",
        timestamp: new Date().toISOString(),
      };
      const cost = trade.price * trade.quantity;

      set((state) => ({
        trades: [newTrade, ...state.trades],
        paperBalances: state.paperBalances.map((b) =>
          b.exchange === trade.exchange
            ? {
                ...b,
                cash: b.cash - cost,
                positions: [
                  ...b.positions,
                  {
                    marketId: trade.marketId,
                    marketTitle: trade.marketTitle,
                    side: trade.side,
                    quantity: trade.quantity,
                    avgPrice: trade.price,
                    currentPrice: trade.price,
                  },
                ],
              }
            : b
        ),
      }));
      return { success: true };
    }

    // ── Live / Sandbox mode: submit to exchange via server API ──
    const pendingTrade: Trade = {
      ...trade,
      id,
      action: "buy",
      status: "pending",
      timestamp: new Date().toISOString(),
    };

    // Add pending trade immediately so user sees it
    set((state) => ({ trades: [pendingTrade, ...state.trades] }));

    try {
      const { apiKeys, tradingMode } = useStore.getState();
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: trade.marketId,
          exchange: trade.exchange,
          side: "buy",
          outcome: trade.side, // yes/no
          quantity: trade.quantity,
          price: trade.price,
          tradingMode,
          apiKeys: {
            kalshi: apiKeys.kalshi,
            polymarket: apiKeys.polymarket,
            gemini: apiKeys.gemini,
          },
        }),
      });

      const result = await res.json();

      if (result.success) {
        const isSandbox = trade.type === "sandbox";
        const balanceKey = isSandbox ? "sandboxBalances" : "balances";
        // Update trade to filled
        set((state) => ({
          trades: state.trades.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: "filled" as const,
                }
              : t
          ),
          // Update balances with the position
          [balanceKey]: (state[balanceKey] as Balance[]).map((b) =>
            b.exchange === trade.exchange
              ? {
                  ...b,
                  cash: b.cash - trade.price * (result.filledQuantity ?? trade.quantity),
                  positions: [
                    ...b.positions,
                    {
                      marketId: trade.marketId,
                      marketTitle: trade.marketTitle,
                      side: trade.side,
                      quantity: result.filledQuantity ?? trade.quantity,
                      avgPrice: trade.price,
                      currentPrice: trade.price,
                    },
                  ],
                }
              : b
          ),
        }));
        return { success: true };
      } else {
        // Mark trade as cancelled on failure
        set((state) => ({
          trades: state.trades.map((t) =>
            t.id === id ? { ...t, status: "cancelled" as const } : t
          ),
        }));
        return { success: false, error: result.error };
      }
    } catch (err) {
      // Mark trade as cancelled on network error
      set((state) => ({
        trades: state.trades.map((t) =>
          t.id === id ? { ...t, status: "cancelled" as const } : t
        ),
      }));
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  },

  sellTrade: async (tradeId) => {
    const state = useStore.getState();
    const originalTrade = state.trades.find((t) => t.id === tradeId);
    if (!originalTrade || originalTrade.status !== "filled")
      return { success: false, error: "Trade not found or not filled" };

    const market = state.markets.find((m) => m.id === originalTrade.marketId);
    const sellPrice = market
      ? originalTrade.side === "yes"
        ? market.yesPrice
        : market.noPrice
      : originalTrade.price;

    const pnl = (sellPrice - originalTrade.price) * originalTrade.quantity;
    const proceeds = sellPrice * originalTrade.quantity;
    const sellId = `trade-${Date.now()}`;

    // ── Paper mode: instant fill ──
    if (originalTrade.type === "paper") {
      const sellTrade: Trade = {
        id: sellId,
        marketId: originalTrade.marketId,
        marketTitle: originalTrade.marketTitle,
        exchange: originalTrade.exchange,
        side: originalTrade.side,
        price: sellPrice,
        quantity: originalTrade.quantity,
        type: "paper",
        action: "sell",
        status: "filled",
        pnl,
        timestamp: new Date().toISOString(),
      };

      set((s) => {
        const updatedTrades = s.trades.map((t) =>
          t.id === tradeId
            ? { ...t, status: "settled" as const, pnl, settledAt: new Date().toISOString() }
            : t
        );

        const updatedPaperBalances = s.paperBalances.map((b) => {
          if (b.exchange === originalTrade.exchange) {
            let removed = false;
            const filteredPositions = b.positions.filter((p) => {
              if (
                !removed &&
                p.marketId === originalTrade.marketId &&
                p.side === originalTrade.side &&
                p.quantity === originalTrade.quantity
              ) {
                removed = true;
                return false;
              }
              return true;
            });
            return { ...b, cash: b.cash + proceeds, positions: filteredPositions };
          }
          return b;
        });

        return {
          trades: [sellTrade, ...updatedTrades],
          paperBalances: updatedPaperBalances,
        };
      });
      return { success: true };
    }

    // ── Live / Sandbox mode: submit sell order to exchange ──
    try {
      const { apiKeys, tradingMode } = useStore.getState();
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: originalTrade.marketId,
          exchange: originalTrade.exchange,
          side: "sell",
          outcome: originalTrade.side,
          quantity: originalTrade.quantity,
          price: sellPrice,
          tradingMode,
          apiKeys: {
            kalshi: apiKeys.kalshi,
            polymarket: apiKeys.polymarket,
            gemini: apiKeys.gemini,
          },
        }),
      });

      const result = await res.json();

      if (result.success) {
        const isSandbox = originalTrade.type === "sandbox";
        const balanceKey = isSandbox ? "sandboxBalances" : "balances";
        const sellTrade: Trade = {
          id: sellId,
          exchangeOrderId: result.orderId,
          marketId: originalTrade.marketId,
          marketTitle: originalTrade.marketTitle,
          exchange: originalTrade.exchange,
          side: originalTrade.side,
          price: sellPrice,
          quantity: result.filledQuantity ?? originalTrade.quantity,
          type: originalTrade.type,
          action: "sell",
          status: "filled",
          pnl,
          timestamp: new Date().toISOString(),
        };

        set((s) => {
          const updatedTrades = s.trades.map((t) =>
            t.id === tradeId
              ? { ...t, status: "settled" as const, pnl, settledAt: new Date().toISOString() }
              : t
          );

          const updatedBalances = (s[balanceKey] as Balance[]).map((b) => {
            if (b.exchange === originalTrade.exchange) {
              let removed = false;
              const filteredPositions = b.positions.filter((p) => {
                if (
                  !removed &&
                  p.marketId === originalTrade.marketId &&
                  p.side === originalTrade.side
                ) {
                  removed = true;
                  return false;
                }
                return true;
              });
              return { ...b, cash: b.cash + proceeds, positions: filteredPositions };
            }
            return b;
          });

          return {
            trades: [sellTrade, ...updatedTrades],
            [balanceKey]: updatedBalances,
          };
        });
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  },

  addPaperCash: (exchange, amount) =>
    set((state) => ({
      paperBalances: state.paperBalances.map((b) =>
        b.exchange === exchange ? { ...b, cash: b.cash + amount } : b
      ),
    })),
}));
