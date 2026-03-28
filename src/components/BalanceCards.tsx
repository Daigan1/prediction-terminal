"use client";

import { useStore } from "@/lib/store";
import {
  formatUSD,
  exchangeColor,
  exchangeLabel,
  cn,
} from "@/lib/utils";
import { DollarSign, TrendingUp, Plus } from "lucide-react";
import { Balance } from "@/types";

export default function BalanceCards({ simple = false }: { simple?: boolean }) {
  const { tradingMode, balances, paperBalances, sandboxBalances, addPaperCash } = useStore();

  const activeBalances =
    tradingMode === "live"
      ? balances
      : tradingMode === "sandbox"
      ? sandboxBalances
      : paperBalances;

  const totalCash = activeBalances.reduce((sum, b) => sum + b.cash, 0);
  const totalPositionValue = activeBalances.reduce(
    (sum, b) =>
      sum +
      b.positions.reduce(
        (pSum, p) => pSum + p.quantity * p.currentPrice,
        0
      ),
    0
  );

  if (simple) {
    return (
      <div className="h-full bg-terminal-panel p-4">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-terminal-accent" />
          <span className="text-sm font-bold text-terminal-text">
            {tradingMode === "paper" ? "Paper" : tradingMode === "sandbox" ? "Sandbox" : "Live"} Portfolio
          </span>
        </div>
        <div className="text-3xl font-bold text-terminal-bright mb-4">
          {formatUSD(totalCash + totalPositionValue)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {activeBalances.map((balance) => (
            <div
              key={balance.exchange}
              className="rounded-lg border border-terminal-border p-3"
            >
              <span
                className={cn(
                  "text-xs font-bold",
                  exchangeColor(balance.exchange)
                )}
              >
                {exchangeLabel(balance.exchange)}
              </span>
              <div className="text-lg font-bold text-terminal-bright mt-1">
                {formatUSD(balance.cash)}
              </div>
              {tradingMode === "paper" && (
                <button
                  onClick={() => addPaperCash(balance.exchange, 10000)}
                  className="mt-2 text-[10px] text-terminal-accent hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add $10K
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-terminal-panel">
      <div className="px-4 py-2 flex items-center gap-2 border-b border-terminal-border">
        <DollarSign className="w-3.5 h-3.5 text-terminal-accent" />
        <span className="text-[10px] font-semibold text-terminal-muted uppercase tracking-wider">
          Portfolio — {tradingMode === "paper" ? "Paper Trading" : tradingMode === "sandbox" ? "Sandbox" : "Live"}
        </span>
        <span className="ml-auto text-xs text-terminal-text">
          Total: {formatUSD(totalCash + totalPositionValue)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-0 divide-x divide-terminal-border">
        {activeBalances.map((balance) => (
          <BalanceCard
            key={balance.exchange}
            balance={balance}
            isPaper={tradingMode === "paper" || tradingMode === "sandbox"}
            onAddCash={() => addPaperCash(balance.exchange, 10000)}
          />
        ))}
      </div>
    </div>
  );
}

function BalanceCard({
  balance,
  isPaper,
  onAddCash,
}: {
  balance: Balance;
  isPaper: boolean;
  onAddCash: () => void;
}) {
  const positionValue = balance.positions.reduce(
    (sum, p) => sum + p.quantity * p.currentPrice,
    0
  );
  const unrealizedPnl = balance.positions.reduce(
    (sum, p) => sum + p.quantity * (p.currentPrice - p.avgPrice),
    0
  );

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-[10px] font-bold tracking-wider",
            exchangeColor(balance.exchange)
          )}
        >
          {exchangeLabel(balance.exchange)}
        </span>
        <div className="flex items-center gap-1">
          {balance.positions.length > 0 && (
            <span className="text-[10px] text-terminal-muted">
              {balance.positions.length} pos
            </span>
          )}
          {isPaper && (
            <button
              onClick={onAddCash}
              className="text-terminal-muted hover:text-terminal-accent transition-colors"
              title="Add $10K paper cash"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="text-lg font-bold text-terminal-bright mb-1">
        {formatUSD(balance.cash)}
      </div>

      {balance.positions.length > 0 && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-terminal-muted">
            Positions: {formatUSD(positionValue)}
          </span>
          <span
            className={cn(
              unrealizedPnl >= 0 ? "text-terminal-green" : "text-terminal-red"
            )}
          >
            <TrendingUp className="w-3 h-3 inline mr-0.5" />
            {unrealizedPnl >= 0 ? "+" : ""}
            {formatUSD(unrealizedPnl)}
          </span>
        </div>
      )}
    </div>
  );
}
