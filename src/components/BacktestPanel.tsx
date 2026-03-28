"use client";

import { useStore } from "@/lib/store";
import { Market, BacktestResult, BacktestEntry } from "@/types";
import {
  formatPrice,
  formatUSD,
  exchangeColor,
  exchangeLabel,
  cn,
} from "@/lib/utils";
import { FlaskConical, Play, RotateCcw } from "lucide-react";
import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from "recharts";

// Generate simulated historical price data for a market
function generatePriceHistory(
  currentPrice: number,
  daysBack: number
): BacktestEntry[] {
  const entries: BacktestEntry[] = [];
  let price = currentPrice * (0.7 + Math.random() * 0.6); // Start at a random point

  for (let i = daysBack; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Random walk toward current price
    const drift = (currentPrice - price) * 0.02;
    const noise = (Math.random() - 0.5) * 0.06;
    price = Math.max(0.02, Math.min(0.98, price + drift + noise));

    entries.push({
      date: date.toISOString().split("T")[0],
      price: Math.round(price * 1000) / 1000,
    });
  }

  // Ensure last entry matches current price
  if (entries.length > 0) {
    entries[entries.length - 1].price = currentPrice;
  }

  return entries;
}

export default function BacktestPanel({ simple = false }: { simple?: boolean }) {
  const { markets, setTradeModal } = useStore();
  const [selectedMarketId, setSelectedMarketId] = useState<string>("");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [quantity, setQuantity] = useState(100);
  const [entryDaysAgo, setEntryDaysAgo] = useState(30);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const selectedMarket = markets.find((m) => m.id === selectedMarketId);

  const priceHistory = useMemo(() => {
    if (!selectedMarket) return [];
    return generatePriceHistory(
      side === "yes" ? selectedMarket.yesPrice : selectedMarket.noPrice,
      90
    );
  }, [selectedMarket, side]);

  const runBacktest = () => {
    if (!selectedMarket || priceHistory.length === 0) return;

    const entryIdx = Math.max(0, priceHistory.length - 1 - entryDaysAgo);
    const entryPrice = priceHistory[entryIdx].price;
    const currentPrice =
      side === "yes" ? selectedMarket.yesPrice : selectedMarket.noPrice;

    const cost = entryPrice * quantity;
    const value = currentPrice * quantity;
    const pnl = value - cost;
    const pnlPercent = cost > 0 ? ((value - cost) / cost) * 100 : 0;

    setResult({
      marketId: selectedMarket.id,
      marketTitle: selectedMarket.title,
      exchange: selectedMarket.exchange,
      side,
      entryDate: priceHistory[entryIdx].date,
      entryPrice,
      currentPrice,
      quantity,
      pnl: Math.round(pnl * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 10) / 10,
      priceHistory: priceHistory.slice(entryIdx),
    });
  };

  const entryIdx = Math.max(0, priceHistory.length - 1 - entryDaysAgo);
  const entryPoint =
    priceHistory.length > 0 ? priceHistory[entryIdx] : null;

  return (
    <div className="h-full flex flex-col bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-terminal-border flex items-center gap-2 bg-terminal-header">
        <FlaskConical className="w-4 h-4 text-terminal-cyan" />
        <span className="text-[10px] font-semibold text-terminal-muted uppercase tracking-wider">
          Backtester
        </span>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-terminal-border space-y-3">
        {/* Market selector */}
        <div>
          <label className="text-[9px] text-terminal-muted uppercase tracking-wider block mb-1">
            Market
          </label>
          <select
            value={selectedMarketId}
            onChange={(e) => {
              setSelectedMarketId(e.target.value);
              setResult(null);
            }}
            className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-terminal-accent"
          >
            <option value="">Select a market...</option>
            {markets.slice(0, 50).map((m) => (
              <option key={m.id} value={m.id}>
                [{exchangeLabel(m.exchange)}] {m.title.slice(0, 60)}
              </option>
            ))}
          </select>
          {markets.length === 0 && (
            <p className="text-[10px] text-terminal-muted mt-1">
              No relevant markets found
            </p>
          )}
          {selectedMarket && (
            <button
              onClick={() => setTradeModal(true, selectedMarket)}
              className="text-[10px] text-terminal-cyan hover:text-terminal-accent mt-1 text-left truncate w-full transition-colors"
            >
              {selectedMarket.title}
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {/* Side */}
          <div className="flex-1">
            <label className="text-[9px] text-terminal-muted uppercase tracking-wider block mb-1">
              Side
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setSide("yes");
                  setResult(null);
                }}
                className={cn(
                  "flex-1 py-1 rounded text-[10px] font-bold border transition-colors",
                  side === "yes"
                    ? "bg-terminal-green/20 border-terminal-green/40 text-terminal-green"
                    : "border-terminal-border text-terminal-muted"
                )}
              >
                YES
              </button>
              <button
                onClick={() => {
                  setSide("no");
                  setResult(null);
                }}
                className={cn(
                  "flex-1 py-1 rounded text-[10px] font-bold border transition-colors",
                  side === "no"
                    ? "bg-terminal-red/20 border-terminal-red/40 text-terminal-red"
                    : "border-terminal-border text-terminal-muted"
                )}
              >
                NO
              </button>
            </div>
          </div>

          {/* Quantity */}
          {!simple && (
            <div className="w-24">
              <label className="text-[9px] text-terminal-muted uppercase tracking-wider block mb-1">
                Qty
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs text-terminal-text focus:outline-none focus:border-terminal-accent"
              />
            </div>
          )}

          {/* Entry time */}
          <div className="w-28">
            <label className="text-[9px] text-terminal-muted uppercase tracking-wider block mb-1">
              Entry (days ago)
            </label>
            <input
              type="range"
              min={1}
              max={89}
              value={entryDaysAgo}
              onChange={(e) => {
                setEntryDaysAgo(parseInt(e.target.value));
                setResult(null);
              }}
              className="w-full accent-terminal-accent"
            />
            <div className="text-[9px] text-terminal-accent text-center">
              {entryDaysAgo}d
            </div>
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={runBacktest}
          disabled={!selectedMarket}
          className={cn(
            "w-full py-1.5 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1.5",
            selectedMarket
              ? "bg-terminal-cyan/20 border-terminal-cyan/40 text-terminal-cyan hover:bg-terminal-cyan/30"
              : "border-terminal-border text-terminal-muted cursor-not-allowed"
          )}
        >
          <Play className="w-3 h-3" />
          RUN BACKTEST
        </button>
      </div>

      {/* Result + Chart */}
      <div className="flex-1 min-h-0 flex flex-col">
        {result ? (
          <>
            {/* Result summary */}
            <div className="px-4 py-2 border-b border-terminal-border bg-terminal-bg/50">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-terminal-muted">
                  <button
                    onClick={() => {
                      const m = markets.find((m) => m.id === result.marketId);
                      if (m) setTradeModal(true, m);
                    }}
                    className="hover:text-terminal-cyan transition-colors"
                  >
                    <span className={cn("font-bold", exchangeColor(result.exchange))}>
                      {exchangeLabel(result.exchange)}
                    </span>
                    {" • "}
                    {result.side.toUpperCase()} {result.quantity} @ {formatPrice(result.entryPrice)}
                    {" → "}
                    {formatPrice(result.currentPrice)}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-sm font-bold",
                      result.pnl >= 0
                        ? "text-terminal-green"
                        : "text-terminal-red"
                    )}
                  >
                    {result.pnl >= 0 ? "+" : ""}
                    {formatUSD(result.pnl)}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      result.pnlPercent >= 0
                        ? "bg-terminal-green/10 text-terminal-green"
                        : "bg-terminal-red/10 text-terminal-red"
                    )}
                  >
                    {result.pnlPercent >= 0 ? "+" : ""}
                    {result.pnlPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.priceHistory}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e1e2e"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#6b7280" }}
                    axisLine={{ stroke: "#1e1e2e" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={["dataMin - 0.05", "dataMax + 0.05"]}
                    tick={{ fontSize: 9, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}¢`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111118",
                      border: "1px solid #1e1e2e",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "#e5e7eb",
                    }}
                    formatter={(value: number) => [
                      `${(value * 100).toFixed(1)}¢`,
                      "Price",
                    ]}
                  />
                  <ReferenceLine
                    y={result.entryPrice}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                  />
                  <ReferenceDot
                    x={result.entryDate}
                    y={result.entryPrice}
                    r={4}
                    fill="#f59e0b"
                    stroke="#f59e0b"
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={result.pnl >= 0 ? "#22c55e" : "#ef4444"}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FlaskConical className="w-8 h-8 text-terminal-border mx-auto mb-2" />
              <p className="text-terminal-muted text-xs">
                {selectedMarket
                  ? "Configure parameters and run backtest"
                  : "Select a market to begin backtesting"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
