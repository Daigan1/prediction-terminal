"use client";

import { useStore } from "@/lib/store";
import type { Market, MatchedGroup, Opportunity } from "@/types";
import {
  formatPrice,
  formatVolume,
  formatDate,
  exchangeColor,
  exchangeLabel,
  edgeColor,
  cn,
} from "@/lib/utils";
import { ShoppingCart, Loader2, Search, X, Copy, Zap, ArrowRightLeft, Newspaper } from "lucide-react";
import { useEffect, useState } from "react";
import NewsPanel from "./NewsPanel";

type ViewMode = "markets" | "duplicates" | "arbitrage" | "news";

export default function MarketTable({ simple = false }: { simple?: boolean }) {
  const { activeTab, setActiveTab, markets, matchedGroups, opportunities, news, isLoading, fetchMarkets, fetchOrderHistory, tradingMode, fetchError } =
    useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("markets");

  // Fetch on mount
  useEffect(() => {
    fetchMarkets();
    fetchOrderHistory();
  }, [fetchMarkets, fetchOrderHistory]);

  // Re-fetch order history when switching to live or sandbox mode
  useEffect(() => {
    if (tradingMode === "live" || tradingMode === "sandbox") fetchOrderHistory();
  }, [tradingMode, fetchOrderHistory]);

  const filteredMarkets = markets.filter((m) => {
    const matchesTab = activeTab === "all" || m.exchange === activeTab;
    const matchesSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const exchangeCounts = {
    all: markets.length,
    kalshi: markets.filter((m) => m.exchange === "kalshi").length,
    polymarket: markets.filter((m) => m.exchange === "polymarket").length,
    gemini: markets.filter((m) => m.exchange === "gemini").length,
  };

  const exchangeTabs = [
    { key: "all" as const, label: "ALL", color: "text-terminal-accent" },
    { key: "kalshi" as const, label: "KALSHI", color: "text-blue-400" },
    { key: "polymarket" as const, label: "POLY", color: "text-purple-400" },
    { key: "gemini" as const, label: "GEMINI", color: "text-cyan-400" },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* View mode tabs */}
      <div className="flex items-center border-b border-terminal-border bg-terminal-header px-3 shrink-0 gap-0.5">
        <button
          onClick={() => setViewMode("markets")}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold tracking-wider transition-colors rounded-t",
            viewMode === "markets"
              ? "text-terminal-accent bg-terminal-panel border-x border-t border-terminal-border -mb-px"
              : "text-terminal-muted hover:text-terminal-text"
          )}
        >
          <ShoppingCart className="w-3 h-3" />
          MARKETS
        </button>
        <button
          onClick={() => setViewMode("duplicates")}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold tracking-wider transition-colors rounded-t",
            viewMode === "duplicates"
              ? "text-terminal-cyan bg-terminal-panel border-x border-t border-terminal-border -mb-px"
              : "text-terminal-muted hover:text-terminal-text"
          )}
        >
          <Copy className="w-3 h-3" />
          DUPLICATES
          {matchedGroups.length > 0 && (
            <span className="ml-1 px-1 py-0.5 rounded text-[8px] bg-terminal-cyan/20 text-terminal-cyan">
              {matchedGroups.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode("arbitrage")}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold tracking-wider transition-colors rounded-t",
            viewMode === "arbitrage"
              ? "text-terminal-green bg-terminal-panel border-x border-t border-terminal-border -mb-px"
              : "text-terminal-muted hover:text-terminal-text"
          )}
        >
          <Zap className="w-3 h-3" />
          ARBITRAGE
          {opportunities.length > 0 && (
            <span className="ml-1 px-1 py-0.5 rounded text-[8px] bg-terminal-green/20 text-terminal-green">
              {opportunities.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode("news")}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold tracking-wider transition-colors rounded-t",
            viewMode === "news"
              ? "text-terminal-accent bg-terminal-panel border-x border-t border-terminal-border -mb-px"
              : "text-terminal-muted hover:text-terminal-text"
          )}
        >
          <Newspaper className="w-3 h-3" />
          NEWS
          {news.length > 0 && (
            <span className="ml-1 px-1 py-0.5 rounded text-[8px] bg-terminal-accent/20 text-terminal-accent">
              {news.length}
            </span>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 text-terminal-accent animate-spin" />
          )}
          {fetchError && (
            <span className="text-[10px] text-terminal-red">{fetchError}</span>
          )}
        </div>
      </div>

      {/* Exchange filter tabs (only for markets view) */}
      {viewMode === "markets" && (
        <div className="flex items-center border-b border-terminal-border bg-terminal-panel px-3 shrink-0">
          {exchangeTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-3 py-2 font-semibold tracking-wider transition-colors",
                simple ? "text-xs" : "text-[11px]",
                activeTab === tab.key ? "tab-active" : "tab-inactive"
              )}
            >
              <span className={activeTab === tab.key ? tab.color : undefined}>
                {tab.label}
              </span>
              <span
                className={cn(
                  "ml-1.5 px-1.5 py-0.5 rounded text-[9px]",
                  activeTab === tab.key
                    ? "bg-terminal-accent/20 text-terminal-accent"
                    : "bg-terminal-border text-terminal-muted"
                )}
              >
                {exchangeCounts[tab.key]}
              </span>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-terminal-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search markets..."
                className="w-36 pl-6 pr-6 py-1 text-[11px] bg-terminal-bg border border-terminal-border rounded text-terminal-text placeholder:text-terminal-muted/50 focus:outline-none focus:border-terminal-accent/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-terminal-border/50 text-terminal-muted hover:text-terminal-text"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading && markets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-terminal-accent animate-spin mx-auto mb-3" />
              <p className="text-terminal-muted text-xs">
                Fetching markets from exchanges...
              </p>
            </div>
          </div>
        ) : viewMode === "news" ? (
          <NewsPanel simple={simple} />
        ) : viewMode === "duplicates" ? (
          <DuplicatesView groups={matchedGroups} simple={simple} />
        ) : viewMode === "arbitrage" ? (
          <ArbitrageView opportunities={opportunities} simple={simple} />
        ) : filteredMarkets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-terminal-muted text-xs">
              No markets found. Check your connection or try refreshing.
            </p>
          </div>
        ) : (
          <AllMarketsView markets={filteredMarkets} simple={simple} />
        )}
      </div>
    </div>
  );
}

function AllMarketsView({
  markets,
  simple,
}: {
  markets: Market[];
  simple: boolean;
}) {
  const { setTradeModal } = useStore();
  const [sortBy, setSortBy] = useState<"volume" | "price" | "exchange">(
    "volume"
  );

  const sorted = [...markets].sort((a, b) => {
    if (sortBy === "volume") return b.volume - a.volume;
    if (sortBy === "price") return b.yesPrice - a.yesPrice;
    return a.exchange.localeCompare(b.exchange);
  });

  if (simple) {
    return (
      <div className="divide-y divide-terminal-border">
        {sorted.map((market) => (
          <button
            key={market.id}
            onClick={() => setTradeModal(true, market)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-terminal-border/20 transition-colors text-left"
          >
            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    exchangeColor(market.exchange)
                  )}
                >
                  {exchangeLabel(market.exchange)}
                </span>
                <span className="text-[10px] text-terminal-muted">
                  {market.category}
                </span>
              </div>
              <p className="text-sm text-terminal-text font-medium truncate">
                {market.title}
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="text-lg font-bold text-terminal-green">
                  {formatPrice(market.yesPrice)}
                </div>
                <div className="text-[10px] text-terminal-muted">YES</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-terminal-red">
                  {formatPrice(market.noPrice)}
                </div>
                <div className="text-[10px] text-terminal-muted">NO</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <table className="w-full terminal-table">
      <thead>
        <tr>
          <th
            className="cursor-pointer hover:text-terminal-text"
            onClick={() => setSortBy("exchange")}
          >
            Exchange
          </th>
          <th>Market</th>
          <th>Category</th>
          <th
            className="cursor-pointer hover:text-terminal-text text-right"
            onClick={() => setSortBy("price")}
          >
            YES
          </th>
          <th className="text-right">NO</th>
          <th
            className="cursor-pointer hover:text-terminal-text text-right"
            onClick={() => setSortBy("volume")}
          >
            Volume
          </th>
          <th>Expires</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((market) => (
          <tr
            key={market.id}
            className="group cursor-pointer hover:bg-terminal-border/20"
            onClick={() => setTradeModal(true, market)}
          >
            <td>
              <span
                className={cn(
                  "text-[10px] font-bold tracking-wider",
                  exchangeColor(market.exchange)
                )}
              >
                {exchangeLabel(market.exchange)}
              </span>
            </td>
            <td className="max-w-[300px]">
              <span className="text-terminal-text truncate block">
                {market.title}
              </span>
            </td>
            <td>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-border/50 text-terminal-muted">
                {market.category}
              </span>
            </td>
            <td className="text-right font-bold text-terminal-green">
              {formatPrice(market.yesPrice)}
            </td>
            <td className="text-right font-bold text-terminal-red">
              {formatPrice(market.noPrice)}
            </td>
            <td className="text-right text-terminal-muted">
              {formatVolume(market.volume)}
            </td>
            <td className="text-terminal-muted text-[11px]">
              {market.endDate ? formatDate(market.endDate) : "—"}
            </td>
            <td>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded",
                  market.status === "active"
                    ? "bg-terminal-green/10 text-terminal-green"
                    : "bg-terminal-red/10 text-terminal-red"
                )}
              >
                {market.status.toUpperCase()}
              </span>
            </td>
            <td>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setTradeModal(true, market)}
                  className="p-1 rounded hover:bg-terminal-accent/20 text-terminal-accent"
                  title="Trade"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Duplicates View ──

function DuplicatesView({
  groups,
  simple,
}: {
  groups: MatchedGroup[];
  simple: boolean;
}) {
  const { setTradeModal } = useStore();

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Copy className="w-8 h-8 text-terminal-border mx-auto mb-2" />
          <p className="text-terminal-muted text-xs">
            No duplicate markets detected across exchanges.
          </p>
          <p className="text-terminal-muted/50 text-[10px] mt-1">
            Duplicates are found by matching similar market titles across Kalshi, Polymarket, and Gemini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-terminal-border">
      {groups.map((group) => (
        <div key={group.id} className="p-3">
          {/* Group header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-terminal-text">
                {group.normalizedTitle}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-terminal-muted">
                  {group.markets.length} exchanges
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-cyan/10 text-terminal-cyan">
                  {(group.confidence * 100).toFixed(0)}% match
                </span>
                {group.differences.map((d, i) => (
                  <span
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-border/50 text-terminal-muted"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Markets in this group */}
          {simple ? (
            <div className="space-y-1.5">
              {group.markets.map((market) => (
                <button
                  key={market.id}
                  onClick={() => setTradeModal(true, market)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded bg-terminal-bg/50 border border-terminal-border/50 hover:border-terminal-accent/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold w-12",
                        exchangeColor(market.exchange)
                      )}
                    >
                      {exchangeLabel(market.exchange)}
                    </span>
                    <span className="text-[11px] text-terminal-text truncate max-w-[200px]">
                      {market.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-terminal-green">
                      {formatPrice(market.yesPrice)}
                    </span>
                    <span className="text-xs font-bold text-terminal-red">
                      {formatPrice(market.noPrice)}
                    </span>
                    <span className="text-[10px] text-terminal-muted">
                      {formatVolume(market.volume)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <tbody>
                {group.markets.map((market) => (
                  <tr
                    key={market.id}
                    className="group/row hover:bg-terminal-bg/30 cursor-pointer"
                    onClick={() => setTradeModal(true, market)}
                  >
                    <td className="py-1.5 px-2">
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          exchangeColor(market.exchange)
                        )}
                      >
                        {exchangeLabel(market.exchange)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 max-w-[250px]">
                      <span className="text-[11px] text-terminal-text truncate block">
                        {market.title}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <span className="text-[11px] font-bold text-terminal-green">
                        {formatPrice(market.yesPrice)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <span className="text-[11px] font-bold text-terminal-red">
                        {formatPrice(market.noPrice)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <span className="text-[10px] text-terminal-muted">
                        {formatVolume(market.volume)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Arbitrage View ──

function ArbitrageView({
  opportunities,
  simple,
}: {
  opportunities: Opportunity[];
  simple: boolean;
}) {
  const { setTradeModal, markets } = useStore();

  const openMarketTrade = (marketId: string) => {
    const market = markets.find((m) => m.id === marketId);
    if (market) setTradeModal(true, market);
  };

  if (opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Zap className="w-8 h-8 text-terminal-border mx-auto mb-2" />
          <p className="text-terminal-muted text-xs">
            No arbitrage opportunities detected.
          </p>
          <p className="text-terminal-muted/50 text-[10px] mt-1">
            Opportunities appear when the same market has different prices across exchanges.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-terminal-border">
      {opportunities.map((opp) => (
        <div
          key={opp.id}
          className="p-3 hover:bg-terminal-bg/30 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    opp.type === "arbitrage"
                      ? "bg-terminal-green/15 text-terminal-green"
                      : "bg-terminal-accent/15 text-terminal-accent"
                  )}
                >
                  {opp.type.toUpperCase()}
                </span>
                <span
                  className={cn(
                    "text-sm font-bold",
                    edgeColor(opp.edge)
                  )}
                >
                  +{opp.edge.toFixed(1)}%
                </span>
                <span className="text-[10px] text-terminal-muted">
                  ({opp.edgeAfterFees >= 0 ? "+" : ""}{opp.edgeAfterFees.toFixed(1)}% after fees)
                </span>
              </div>
              <p className="text-xs text-terminal-text font-medium">
                {opp.marketTitle}
              </p>
            </div>
          </div>

          {/* Trade flow - each side clickable */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => openMarketTrade(opp.buyMarketId)}
              className="flex-1 text-center px-2 py-2 rounded bg-terminal-bg/50 border border-terminal-border/50 hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-colors cursor-pointer"
            >
              <div className="text-[9px] text-terminal-muted uppercase">
                Buy on
              </div>
              <div
                className={cn(
                  "text-[11px] font-bold",
                  exchangeColor(opp.buyExchange)
                )}
              >
                {exchangeLabel(opp.buyExchange)}
              </div>
              <div className="text-xs font-bold text-terminal-green">
                {formatPrice(opp.buyPrice)}
              </div>
              <div className="text-[8px] text-terminal-muted mt-0.5">
                {(opp.buyFee * 100).toFixed(1)}% fee
              </div>
            </button>

            <ArrowRightLeft className="w-4 h-4 text-terminal-muted shrink-0" />

            <button
              onClick={() => openMarketTrade(opp.sellMarketId)}
              className="flex-1 text-center px-2 py-2 rounded bg-terminal-bg/50 border border-terminal-border/50 hover:border-terminal-red/40 hover:bg-terminal-red/5 transition-colors cursor-pointer"
            >
              <div className="text-[9px] text-terminal-muted uppercase">
                Sell on
              </div>
              <div
                className={cn(
                  "text-[11px] font-bold",
                  exchangeColor(opp.sellExchange)
                )}
              >
                {exchangeLabel(opp.sellExchange)}
              </div>
              <div className="text-xs font-bold text-terminal-red">
                {formatPrice(opp.sellPrice)}
              </div>
              <div className="text-[8px] text-terminal-muted mt-0.5">
                {(opp.sellFee * 100).toFixed(1)}% fee
              </div>
            </button>
          </div>

          {!simple && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded",
                  opp.executable
                    ? "bg-terminal-green/10 text-terminal-green"
                    : "bg-terminal-border text-terminal-muted"
                )}
              >
                {opp.executable ? "EXECUTABLE" : "MONITOR"}
              </span>
              {opp.edgeAfterFees < 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-red/10 text-terminal-red">
                  NEGATIVE AFTER FEES
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
