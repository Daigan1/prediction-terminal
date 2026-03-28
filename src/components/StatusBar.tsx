"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function StatusBar() {
  const { tradingMode, markets, trades, isLoading, exchangeStatus } =
    useStore();

  const liveTrades = trades.filter((t) => t.type === "live");
  const paperTrades = trades.filter((t) => t.type === "paper");
  const sandboxTrades = trades.filter((t) => t.type === "sandbox");

  return (
    <div className="border-t border-terminal-border bg-terminal-header px-4 py-1 flex items-center justify-between text-[10px]">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isLoading ? "bg-terminal-accent pulse-dot" : "bg-terminal-green"
            )}
          />
          <span className="text-terminal-muted">
            {isLoading ? "FETCHING" : "CONNECTED"}
          </span>
        </span>

        <span className="text-terminal-border">|</span>

        <span className="text-terminal-muted">
          Markets: <span className="text-terminal-text">{markets.length}</span>
        </span>

        {/* Exchange status indicators */}
        {(["kalshi", "polymarket", "gemini"] as const).map((ex) => (
          <span key={ex} className="flex items-center gap-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                exchangeStatus[ex] === "ok"
                  ? "bg-terminal-green"
                  : exchangeStatus[ex] === "loading"
                  ? "bg-terminal-accent pulse-dot"
                  : exchangeStatus[ex] === "error"
                  ? "bg-terminal-red"
                  : "bg-terminal-muted"
              )}
            />
            <span className="text-terminal-muted uppercase">{ex === "polymarket" ? "POLY" : ex.toUpperCase()}</span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-terminal-muted">
          Live: <span className="text-terminal-text">{liveTrades.length}</span>
        </span>
        <span className="text-terminal-muted">
          Sandbox: <span className="text-terminal-text">{sandboxTrades.length}</span>
        </span>
        <span className="text-terminal-muted">
          Paper: <span className="text-terminal-text">{paperTrades.length}</span>
        </span>

        <span className="text-terminal-border">|</span>

        <span
          className={cn(
            "font-bold",
            tradingMode === "paper"
              ? "text-terminal-accent"
              : tradingMode === "sandbox"
              ? "text-terminal-cyan"
              : "text-terminal-red"
          )}
        >
          MODE: {tradingMode.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
