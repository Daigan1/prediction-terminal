"use client";

import { useStore } from "@/lib/store";
import { Trade, Exchange } from "@/types";
import {
  formatUSD,
  exchangeColor,
  exchangeLabel,
  cn,
} from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type TimeRange = "1D" | "1W" | "1M" | "ALL";

export default function PnLChart({ simple = false }: { simple?: boolean }) {
  const { trades, tradingMode } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("ALL");
  const [showByExchange, setShowByExchange] = useState(false);

  const activeTrades = trades.filter((t) => t.type === tradingMode);

  const chartData = useMemo(() => {
    if (activeTrades.length === 0) return [];

    // Sort trades by timestamp
    const sorted = [...activeTrades]
      .filter((t) => t.status === "filled")
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Build cumulative P&L timeline
    let cumPnl = 0;
    const exchangePnl: Record<Exchange, number> = {
      kalshi: 0,
      polymarket: 0,
      gemini: 0,
    };

    const data = sorted.map((trade) => {
      const tradePnl = trade.pnl ?? 0;
      cumPnl += tradePnl;
      exchangePnl[trade.exchange] += tradePnl;

      return {
        date: new Date(trade.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        timestamp: new Date(trade.timestamp).getTime(),
        total: Math.round(cumPnl * 100) / 100,
        kalshi: Math.round(exchangePnl.kalshi * 100) / 100,
        polymarket: Math.round(exchangePnl.polymarket * 100) / 100,
        gemini: Math.round(exchangePnl.gemini * 100) / 100,
        tradeName: trade.marketTitle.slice(0, 40),
      };
    });

    // Filter by time range
    const now = Date.now();
    const ranges: Record<TimeRange, number> = {
      "1D": 86400000,
      "1W": 604800000,
      "1M": 2592000000,
      ALL: Infinity,
    };

    return data.filter(
      (d) => timeRange === "ALL" || now - d.timestamp <= ranges[timeRange]
    );
  }, [activeTrades, timeRange]);

  const totalPnl = chartData.length > 0 ? chartData[chartData.length - 1].total : 0;
  const isPositive = totalPnl >= 0;

  // Exchange breakdowns
  const exchangeBreakdown = useMemo(() => {
    if (chartData.length === 0)
      return { kalshi: 0, polymarket: 0, gemini: 0 };
    const last = chartData[chartData.length - 1];
    return {
      kalshi: last.kalshi,
      polymarket: last.polymarket,
      gemini: last.gemini,
    };
  }, [chartData]);

  return (
    <div className="h-full flex flex-col bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-terminal-border flex items-center justify-between bg-terminal-header">
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-terminal-green" />
          ) : (
            <TrendingDown className="w-4 h-4 text-terminal-red" />
          )}
          <span className="text-[10px] font-semibold text-terminal-muted uppercase tracking-wider">
            P&L — {tradingMode === "paper" ? "Paper" : tradingMode === "sandbox" ? "Sandbox" : "Live"}
          </span>
          <span
            className={cn(
              "text-sm font-bold",
              isPositive ? "text-terminal-green glow-green" : "text-terminal-red glow-red"
            )}
          >
            {isPositive ? "+" : ""}
            {formatUSD(totalPnl)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!simple && (
            <button
              onClick={() => setShowByExchange(!showByExchange)}
              className={cn(
                "text-[9px] px-2 py-0.5 rounded border transition-colors",
                showByExchange
                  ? "border-terminal-accent/40 bg-terminal-accent/10 text-terminal-accent"
                  : "border-terminal-border text-terminal-muted hover:text-terminal-text"
              )}
            >
              BY EXCHANGE
            </button>
          )}
          <div className="flex gap-0.5">
            {(["1D", "1W", "1M", "ALL"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded transition-colors",
                  timeRange === range
                    ? "bg-terminal-accent/20 text-terminal-accent"
                    : "text-terminal-muted hover:text-terminal-text"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exchange breakdown */}
      {!simple && (
        <div className="px-4 py-1.5 border-b border-terminal-border flex items-center gap-4 text-[10px]">
          {(["kalshi", "polymarket", "gemini"] as Exchange[]).map((ex) => (
            <span key={ex} className="flex items-center gap-1.5">
              <span className={cn("font-bold", exchangeColor(ex))}>
                {exchangeLabel(ex)}
              </span>
              <span
                className={cn(
                  "font-mono",
                  exchangeBreakdown[ex] >= 0
                    ? "text-terminal-green"
                    : "text-terminal-red"
                )}
              >
                {exchangeBreakdown[ex] >= 0 ? "+" : ""}
                ${exchangeBreakdown[ex].toFixed(2)}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 min-h-0 p-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-terminal-muted text-xs">
              {simple ? "No trades yet" : "Place trades to see P&L chart"}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="pnlGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pnlRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="kalshiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="polyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="geminiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                tick={{ fontSize: 9, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111118",
                  border: "1px solid #1e1e2e",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#e5e7eb",
                }}
                labelStyle={{ color: "#6b7280", fontSize: "10px" }}
              />
              {showByExchange ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="kalshi"
                    stroke="#3b82f6"
                    fill="url(#kalshiGrad)"
                    strokeWidth={1.5}
                    name="Kalshi"
                  />
                  <Area
                    type="monotone"
                    dataKey="polymarket"
                    stroke="#a855f7"
                    fill="url(#polyGrad)"
                    strokeWidth={1.5}
                    name="Polymarket"
                  />
                  <Area
                    type="monotone"
                    dataKey="gemini"
                    stroke="#06b6d4"
                    fill="url(#geminiGrad)"
                    strokeWidth={1.5}
                    name="Gemini"
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={isPositive ? "#22c55e" : "#ef4444"}
                  fill={isPositive ? "url(#pnlGreen)" : "url(#pnlRed)"}
                  strokeWidth={2}
                  name="Total P&L"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
