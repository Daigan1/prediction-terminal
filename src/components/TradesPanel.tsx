"use client";

import { useStore } from "@/lib/store";
import { Trade } from "@/types";
import {
  formatPrice,
  formatTimestamp,
  exchangeColor,
  exchangeLabel,
  cn,
} from "@/lib/utils";
import { BarChart3, X } from "lucide-react";

export default function TradesPanel({ simple = false }: { simple?: boolean }) {
  const { tradingMode, trades, sellTrade } = useStore();

  const activeTrades = trades.filter((t) => t.type === tradingMode);

  const modeColor =
    tradingMode === "live"
      ? "text-terminal-red"
      : tradingMode === "sandbox"
      ? "text-terminal-cyan"
      : "text-terminal-accent";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center border-b border-terminal-border shrink-0">
        <div className="px-3 py-2 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-terminal-muted" />
          <span className="text-[10px] font-semibold text-terminal-muted uppercase tracking-wider">
            Trades
          </span>
          <span className={cn("text-[10px] font-bold uppercase", modeColor)}>
            {tradingMode}
          </span>
          <span className="text-[10px] text-terminal-muted">
            ({activeTrades.length})
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTrades.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-terminal-muted text-xs">
              No {tradingMode} trades yet
            </p>
          </div>
        ) : simple ? (
          <div className="divide-y divide-terminal-border">
            {activeTrades.map((trade) => (
              <SimpleTradeRow key={trade.id} trade={trade} onSell={sellTrade} />
            ))}
          </div>
        ) : (
          <table className="w-full terminal-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Exchange</th>
                <th>Market</th>
                <th>Action</th>
                <th>Side</th>
                <th className="text-right">Price</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Cost</th>
                <th>Status</th>
                <th className="text-right">P&L</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activeTrades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} onSell={sellTrade} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SimpleTradeRow({ trade, onSell }: { trade: Trade; onSell: (id: string) => void }) {
  const isSellable = trade.status === "filled" && trade.action !== "sell";

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={cn(
              "text-[10px] font-bold",
              exchangeColor(trade.exchange)
            )}
          >
            {exchangeLabel(trade.exchange)}
          </span>
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              trade.action === "sell"
                ? "bg-terminal-accent/10 text-terminal-accent"
                : trade.side === "yes"
                ? "bg-terminal-green/10 text-terminal-green"
                : "bg-terminal-red/10 text-terminal-red"
            )}
          >
            {(trade.action ?? "buy").toUpperCase()} {trade.side.toUpperCase()}
          </span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              trade.status === "filled"
                ? "bg-terminal-green/10 text-terminal-green"
                : trade.status === "pending"
                ? "bg-terminal-accent/10 text-terminal-accent"
                : trade.status === "settled"
                ? "bg-terminal-muted/10 text-terminal-muted"
                : "bg-terminal-muted/10 text-terminal-muted"
            )}
          >
            {trade.status.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-terminal-text truncate">
          {trade.marketTitle}
        </p>
        <p className="text-[10px] text-terminal-muted mt-0.5">
          {trade.quantity} @ {formatPrice(trade.price)} • {formatTimestamp(trade.timestamp)}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-3">
        {trade.pnl !== undefined && (
          <span
            className={cn(
              "text-lg font-bold",
              trade.pnl >= 0 ? "text-terminal-green" : "text-terminal-red"
            )}
          >
            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
          </span>
        )}
        {isSellable && (
          <button
            onClick={() => onSell(trade.id)}
            className="px-2 py-1 text-[10px] font-bold bg-terminal-red/10 text-terminal-red rounded hover:bg-terminal-red/20 transition-colors"
          >
            SELL
          </button>
        )}
      </div>
    </div>
  );
}

function TradeRow({ trade, onSell }: { trade: Trade; onSell: (id: string) => void }) {
  const isSellable = trade.status === "filled" && trade.action !== "sell";

  return (
    <tr>
      <td className="text-terminal-muted text-[11px] whitespace-nowrap">
        {formatTimestamp(trade.timestamp)}
      </td>
      <td>
        <span
          className={cn(
            "text-[10px] font-bold",
            exchangeColor(trade.exchange)
          )}
        >
          {exchangeLabel(trade.exchange)}
        </span>
      </td>
      <td className="max-w-[200px]">
        <span className="text-terminal-text truncate block text-[11px]">
          {trade.marketTitle}
        </span>
      </td>
      <td>
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded",
            trade.action === "sell"
              ? "bg-terminal-accent/10 text-terminal-accent"
              : "bg-terminal-green/10 text-terminal-green"
          )}
        >
          {(trade.action ?? "BUY").toUpperCase()}
        </span>
      </td>
      <td>
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded",
            trade.side === "yes"
              ? "bg-terminal-green/10 text-terminal-green"
              : "bg-terminal-red/10 text-terminal-red"
          )}
        >
          {trade.side.toUpperCase()}
        </span>
      </td>
      <td className="text-right font-mono text-xs">
        {formatPrice(trade.price)}
      </td>
      <td className="text-right text-terminal-muted text-xs">
        {trade.quantity}
      </td>
      <td className="text-right text-terminal-muted text-xs">
        ${(trade.price * trade.quantity).toFixed(2)}
      </td>
      <td>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded",
            trade.status === "filled"
              ? "bg-terminal-green/10 text-terminal-green"
              : trade.status === "pending"
              ? "bg-terminal-accent/10 text-terminal-accent"
              : trade.status === "settled"
              ? "bg-terminal-muted/10 text-terminal-muted"
              : "bg-terminal-muted/10 text-terminal-muted"
          )}
        >
          {trade.status.toUpperCase()}
        </span>
      </td>
      <td className="text-right">
        {trade.pnl !== undefined ? (
          <span
            className={cn(
              "text-xs font-bold",
              trade.pnl >= 0 ? "text-terminal-green" : "text-terminal-red"
            )}
          >
            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
          </span>
        ) : (
          <span className="text-terminal-muted text-xs">—</span>
        )}
      </td>
      <td className="text-right">
        {isSellable && (
          <button
            onClick={() => onSell(trade.id)}
            className="px-2 py-1 text-[10px] font-bold bg-terminal-red/10 text-terminal-red rounded hover:bg-terminal-red/20 transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            SELL
          </button>
        )}
      </td>
    </tr>
  );
}
