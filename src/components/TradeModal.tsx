"use client";

import { useStore } from "@/lib/store";
import { useState, useMemo } from "react";
import {
  formatPrice,
  exchangeColor,
  exchangeLabel,
  cn,
} from "@/lib/utils";
import { EXCHANGE_FEES } from "@/lib/matching";
import { X, AlertTriangle, ShoppingCart, KeyRound, FlaskConical, Play, Newspaper, ExternalLink, ShieldAlert } from "lucide-react";
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
import { BacktestEntry, BacktestResult, NewsItem } from "@/types";
import { timeAgo } from "@/lib/utils";

type ModalTab = "trade" | "backtest" | "news";

export default function TradeModal() {
  const {
    tradeModalOpen,
    tradeModalMarket,
    setTradeModal,
    tradingMode,
    placeTrade,
    apiKeys,
    setSettingsOpen,
    news,
  } = useStore();

  const [tab, setTab] = useState<ModalTab>("trade");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [quantity, setQuantity] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(false);
  const [showLiveConfirmation, setShowLiveConfirmation] = useState(false);
  const [btEntryDaysAgo, setBtEntryDaysAgo] = useState(30);
  const [btResult, setBtResult] = useState<BacktestResult | null>(null);

  const market = tradeModalMarket;

  // Generate simulated historical price data for backtest
  const btPriceHistory = useMemo(() => {
    if (!market) return [];
    const currentPrice = side === "yes" ? market.yesPrice : market.noPrice;
    const entries: BacktestEntry[] = [];
    let price = currentPrice * (0.7 + Math.random() * 0.6);
    for (let i = 90; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const drift = (currentPrice - price) * 0.02;
      const noise = (Math.random() - 0.5) * 0.06;
      price = Math.max(0.02, Math.min(0.98, price + drift + noise));
      entries.push({ date: date.toISOString().split("T")[0], price: Math.round(price * 1000) / 1000 });
    }
    if (entries.length > 0) entries[entries.length - 1].price = currentPrice;
    return entries;
  }, [market, side]);

  const marketNews = useMemo(() => {
    if (!market) return [];
    return news.filter((item: NewsItem) =>
      item.relatedMarkets?.some((rm) => rm.id === market.id)
    );
  }, [market, news]);

  const runBacktest = () => {
    if (!market || btPriceHistory.length === 0) return;
    const entryIdx = Math.max(0, btPriceHistory.length - 1 - btEntryDaysAgo);
    const entryPrice = btPriceHistory[entryIdx].price;
    const currentPrice = side === "yes" ? market.yesPrice : market.noPrice;
    const cost = entryPrice * quantity;
    const value = currentPrice * quantity;
    const pnl = value - cost;
    const pnlPercent = cost > 0 ? ((value - cost) / cost) * 100 : 0;
    setBtResult({
      marketId: market.id,
      marketTitle: market.title,
      exchange: market.exchange,
      side,
      entryDate: btPriceHistory[entryIdx].date,
      entryPrice,
      currentPrice,
      quantity,
      pnl: Math.round(pnl * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 10) / 10,
      priceHistory: btPriceHistory.slice(entryIdx),
    });
  };

  if (!tradeModalOpen || !market) return null;

  const price = side === "yes" ? market.yesPrice : market.noPrice;
  const fee = EXCHANGE_FEES[market.exchange];
  const cost = price * quantity;
  const feeAmount = cost * fee;
  const totalCost = cost + feeAmount;

  const hasApiKey = (() => {
    switch (market.exchange) {
      case "kalshi":
        return !!(apiKeys.kalshi.apiKey && apiKeys.kalshi.secret);
      case "polymarket":
        return !!apiKeys.polymarket.apiKey;
      case "gemini":
        return !!(apiKeys.gemini.apiKey && apiKeys.gemini.secret);
    }
  })();

  const handleTrade = async () => {
    // For live/sandbox trading, check API keys first
    if ((tradingMode === "live" || tradingMode === "sandbox") && !hasApiKey) {
      setShowApiKeyPopup(true);
      return;
    }

    // For live mode, show final confirmation before submitting
    if (tradingMode === "live" && !showLiveConfirmation) {
      setShowLiveConfirmation(true);
      return;
    }

    setShowLiveConfirmation(false);
    setIsSubmitting(true);
    setOrderError(null);

    const result = await placeTrade({
      marketId: market.id,
      marketTitle: market.title,
      exchange: market.exchange,
      side,
      price,
      quantity,
      type: tradingMode,
    });

    setIsSubmitting(false);

    if (result.success) {
      setTradeModal(false);
    } else {
      setOrderError(result.error || "Order failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => {
          setTradeModal(false);
          setShowApiKeyPopup(false);
        }}
      />

      {/* API Key Missing Popup */}
      {showApiKeyPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowApiKeyPopup(false)}
          />
          <div className="relative w-full max-w-sm border border-terminal-red/30 rounded-lg bg-terminal-panel shadow-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-5 h-5 text-terminal-red" />
              <h3 className="text-sm font-bold text-terminal-red">
                API Keys Required
              </h3>
            </div>
            <p className="text-xs text-terminal-muted leading-relaxed mb-4">
              You need to set your{" "}
              <span className={cn("font-bold", exchangeColor(market.exchange))}>
                {exchangeLabel(market.exchange)}
              </span>{" "}
              API keys to place live trades. Go to Settings to configure them.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowApiKeyPopup(false)}
                className="flex-1 py-2 rounded text-xs font-bold border border-terminal-border text-terminal-muted hover:text-terminal-text transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowApiKeyPopup(false);
                  setTradeModal(false);
                  setSettingsOpen(true);
                }}
                className="flex-1 py-2 rounded text-xs font-bold bg-terminal-accent/20 border border-terminal-accent/40 text-terminal-accent hover:bg-terminal-accent/30 transition-colors"
              >
                OPEN SETTINGS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Trading Final Confirmation Popup */}
      {showLiveConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowLiveConfirmation(false)}
          />
          <div className="relative w-full max-w-sm border border-terminal-red/50 rounded-lg bg-terminal-panel shadow-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-terminal-red" />
              <h3 className="text-sm font-bold text-terminal-red">
                LIVE TRADE CONFIRMATION
              </h3>
            </div>
            <div className="bg-terminal-red/10 border border-terminal-red/30 rounded p-3 mb-3">
              <p className="text-xs text-terminal-red font-bold mb-2">
                WARNING: You are about to place a REAL order with REAL money.
              </p>
              <p className="text-[10px] text-terminal-red/80 leading-relaxed">
                This order will be submitted to{" "}
                <span className={cn("font-bold", exchangeColor(market.exchange))}>
                  {exchangeLabel(market.exchange)}
                </span>{" "}
                and will execute against live markets. This action cannot be undone once filled.
              </p>
            </div>
            <div className="bg-terminal-bg rounded border border-terminal-border p-3 mb-4 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-terminal-muted">Side</span>
                <span className={cn("font-bold", side === "yes" ? "text-terminal-green" : "text-terminal-red")}>
                  {side.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-terminal-muted">Quantity</span>
                <span className="text-terminal-text">{quantity} contracts</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-terminal-muted">Total Cost</span>
                <span className="text-terminal-accent font-bold">${totalCost.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLiveConfirmation(false)}
                className="flex-1 py-2 rounded text-xs font-bold border border-terminal-border text-terminal-muted hover:text-terminal-text transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleTrade}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 py-2 rounded text-xs font-bold bg-terminal-red/20 border border-terminal-red/40 text-terminal-red hover:bg-terminal-red/30 transition-colors",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmitting ? "SUBMITTING..." : "CONFIRM LIVE ORDER"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <div className="relative w-full max-w-lg border border-terminal-border rounded-lg bg-terminal-panel shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header with tabs */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab("trade")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all",
                tab === "trade"
                  ? "bg-terminal-accent/15 text-terminal-accent"
                  : "text-terminal-muted hover:text-terminal-text"
              )}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {tradingMode === "paper" ? "PAPER" : tradingMode === "sandbox" ? "SANDBOX" : "LIVE"} ORDER
              {tradingMode === "live" && tab === "trade" && (
                <AlertTriangle className="w-3 h-3 text-terminal-red" />
              )}
            </button>
            <button
              onClick={() => setTab("backtest")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all",
                tab === "backtest"
                  ? "bg-terminal-cyan/15 text-terminal-cyan"
                  : "text-terminal-muted hover:text-terminal-text"
              )}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              BACKTEST
            </button>
            <button
              onClick={() => marketNews.length > 0 && setTab("news")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all",
                tab === "news"
                  ? "bg-terminal-accent/15 text-terminal-accent"
                  : marketNews.length === 0
                  ? "text-terminal-muted/40 cursor-not-allowed"
                  : "text-terminal-muted hover:text-terminal-text"
              )}
            >
              <Newspaper className="w-3.5 h-3.5" />
              NEWS
              {marketNews.length > 0 && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent">
                  {marketNews.length}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => setTradeModal(false)}
            className="text-terminal-muted hover:text-terminal-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Market info (shared) */}
        <div className="px-4 pt-3 pb-2 border-b border-terminal-border/50 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-[10px] font-bold",
                exchangeColor(market.exchange)
              )}
            >
              {exchangeLabel(market.exchange)}
            </span>
            <span className="text-[9px] text-terminal-muted">
              {(fee * 100).toFixed(1)}% fee
            </span>
          </div>
          <p className="text-sm text-terminal-text">{market.title}</p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-auto">
          {tab === "news" ? (
            /* ── News tab ── */
            <div className="p-4 space-y-2">
              {marketNews.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Newspaper className="w-8 h-8 text-terminal-border mx-auto mb-2" />
                    <p className="text-terminal-muted text-xs">No related news found</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-terminal-border">
                  {marketNews.map((item: NewsItem) => (
                    <div key={item.id} className="py-2.5">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-terminal-text font-medium hover:text-terminal-accent transition-colors leading-snug block"
                      >
                        {item.title}
                        <ExternalLink className="inline-block w-2.5 h-2.5 ml-1 text-terminal-muted opacity-50" />
                      </a>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-terminal-accent font-medium">
                          {item.source}
                        </span>
                        <span className="text-[10px] text-terminal-muted">
                          {timeAgo(item.publishedAt)}
                        </span>
                      </div>
                      {item.snippet && (
                        <p className="text-[10px] text-terminal-muted/70 mt-1 leading-relaxed line-clamp-2">
                          {item.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : tab === "trade" ? (
            /* ── Trade tab ── */
            <div className="p-4 space-y-4">
              {/* Side Selection */}
              <div>
                <label className="text-[10px] text-terminal-muted uppercase tracking-wider block mb-2">
                  Side
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSide("yes")}
                    className={cn(
                      "py-2 rounded border text-sm font-bold transition-all",
                      side === "yes"
                        ? "bg-terminal-green/20 border-terminal-green/40 text-terminal-green"
                        : "border-terminal-border text-terminal-muted hover:border-terminal-green/30"
                    )}
                  >
                    YES — {formatPrice(market.yesPrice)}
                  </button>
                  <button
                    onClick={() => setSide("no")}
                    className={cn(
                      "py-2 rounded border text-sm font-bold transition-all",
                      side === "no"
                        ? "bg-terminal-red/20 border-terminal-red/40 text-terminal-red"
                        : "border-terminal-border text-terminal-muted hover:border-terminal-red/30"
                    )}
                  >
                    NO — {formatPrice(market.noPrice)}
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-[10px] text-terminal-muted uppercase tracking-wider block mb-2">
                  Quantity (contracts)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-terminal-text focus:outline-none focus:border-terminal-accent"
                />
                <div className="flex gap-2 mt-2">
                  {[10, 50, 100, 500, 1000].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuantity(q)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] border transition-colors",
                        quantity === q
                          ? "border-terminal-accent/40 bg-terminal-accent/10 text-terminal-accent"
                          : "border-terminal-border text-terminal-muted hover:text-terminal-text"
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Summary */}
              <div className="bg-terminal-bg rounded border border-terminal-border p-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-terminal-muted">
                    Price per contract
                  </span>
                  <span className="text-terminal-text">
                    {formatPrice(price)}
                  </span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-terminal-muted">Quantity</span>
                  <span className="text-terminal-text">{quantity}</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-terminal-muted">Subtotal</span>
                  <span className="text-terminal-text">
                    ${cost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-terminal-muted">
                    Fee ({(fee * 100).toFixed(1)}%)
                  </span>
                  <span className="text-terminal-accent">
                    ${feeAmount.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-terminal-border my-2" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-terminal-muted">Total Cost</span>
                  <span className="text-terminal-accent">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-terminal-muted">Max Payout</span>
                  <span className="text-terminal-green">
                    ${quantity.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Live/Sandbox mode: API key status */}
              {(tradingMode === "live" || tradingMode === "sandbox") && !hasApiKey && (
                <div className="flex items-center gap-2 px-3 py-2 rounded border border-terminal-red/20 bg-terminal-red/5">
                  <KeyRound className="w-3.5 h-3.5 text-terminal-red shrink-0" />
                  <span className="text-[10px] text-terminal-red">
                    {exchangeLabel(market.exchange)} API keys not configured
                  </span>
                </div>
              )}

              {/* Live mode: prominent warning banner */}
              {tradingMode === "live" && hasApiKey && (
                <div className="flex items-center gap-2 px-3 py-2 rounded border border-terminal-red/30 bg-terminal-red/10">
                  <AlertTriangle className="w-4 h-4 text-terminal-red shrink-0" />
                  <div>
                    <p className="text-[10px] text-terminal-red font-bold">
                      LIVE TRADING MODE — REAL MONEY AT RISK
                    </p>
                    <p className="text-[9px] text-terminal-red/70">
                      This order will be submitted to {exchangeLabel(market.exchange)} with real funds.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleTrade}
                disabled={isSubmitting}
                className={cn(
                  "w-full py-3 rounded font-bold text-sm transition-all",
                  tradingMode === "paper"
                    ? "bg-terminal-accent/20 border border-terminal-accent/40 text-terminal-accent hover:bg-terminal-accent/30"
                    : tradingMode === "sandbox"
                    ? "bg-terminal-cyan/20 border border-terminal-cyan/40 text-terminal-cyan hover:bg-terminal-cyan/30"
                    : "bg-terminal-red/20 border border-terminal-red/40 text-terminal-red hover:bg-terminal-red/30",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmitting
                  ? tradingMode === "live"
                    ? "SUBMITTING TO EXCHANGE..."
                    : tradingMode === "sandbox"
                    ? "SUBMITTING TO SANDBOX..."
                    : "PLACING ORDER..."
                  : tradingMode === "paper"
                  ? `PLACE PAPER ${side.toUpperCase()} ORDER`
                  : tradingMode === "sandbox"
                  ? `PLACE SANDBOX ${side.toUpperCase()} ORDER`
                  : `PLACE LIVE ${side.toUpperCase()} ORDER`}
              </button>

              {orderError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded border border-terminal-red/30 bg-terminal-red/10">
                  <AlertTriangle className="w-3.5 h-3.5 text-terminal-red shrink-0" />
                  <span className="text-[10px] text-terminal-red">{orderError}</span>
                </div>
              )}

              {tradingMode === "sandbox" && hasApiKey && !orderError && (
                <p className="text-[10px] text-terminal-cyan text-center">
                  This will submit to the {exchangeLabel(market.exchange)} sandbox environment (no real funds)
                </p>
              )}
            </div>
          ) : (
            /* ── Backtest Tab ── */
            <div className="p-4 space-y-3">
              <div className="flex gap-3">
                {/* Side */}
                <div className="flex-1">
                  <label className="text-[9px] text-terminal-muted uppercase tracking-wider block mb-1">Side</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setSide("yes"); setBtResult(null); }}
                      className={cn(
                        "flex-1 py-1 rounded text-[10px] font-bold border transition-colors",
                        side === "yes"
                          ? "bg-terminal-green/20 border-terminal-green/40 text-terminal-green"
                          : "border-terminal-border text-terminal-muted"
                      )}
                    >YES</button>
                    <button
                      onClick={() => { setSide("no"); setBtResult(null); }}
                      className={cn(
                        "flex-1 py-1 rounded text-[10px] font-bold border transition-colors",
                        side === "no"
                          ? "bg-terminal-red/20 border-terminal-red/40 text-terminal-red"
                          : "border-terminal-border text-terminal-muted"
                      )}
                    >NO</button>
                  </div>
                </div>
                {/* Quantity */}
                <div className="w-24">
                  <label className="text-[9px] text-terminal-muted uppercase tracking-wider block mb-1">Qty</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs text-terminal-text focus:outline-none focus:border-terminal-accent"
                  />
                </div>
                {/* Entry time */}
                <div className="w-28">
                  <label className="text-[9px] text-terminal-muted uppercase tracking-wider block mb-1">Entry (days ago)</label>
                  <input
                    type="range"
                    min={1}
                    max={89}
                    value={btEntryDaysAgo}
                    onChange={(e) => { setBtEntryDaysAgo(parseInt(e.target.value)); setBtResult(null); }}
                    className="w-full accent-terminal-accent"
                  />
                  <div className="text-[9px] text-terminal-accent text-center">{btEntryDaysAgo}d</div>
                </div>
              </div>

              <button
                onClick={runBacktest}
                className="w-full py-1.5 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 bg-terminal-cyan/20 border-terminal-cyan/40 text-terminal-cyan hover:bg-terminal-cyan/30"
              >
                <Play className="w-3 h-3" />
                RUN BACKTEST
              </button>

              {btResult ? (
                <>
                  <div className="bg-terminal-bg/50 rounded border border-terminal-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-terminal-muted">
                        <span className={cn("font-bold", exchangeColor(btResult.exchange))}>{exchangeLabel(btResult.exchange)}</span>
                        {" • "}{btResult.side.toUpperCase()} {btResult.quantity} @ {formatPrice(btResult.entryPrice)}{" → "}{formatPrice(btResult.currentPrice)}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-sm font-bold", btResult.pnl >= 0 ? "text-terminal-green" : "text-terminal-red")}>
                          {btResult.pnl >= 0 ? "+" : ""}${Math.abs(btResult.pnl).toFixed(2)}
                        </span>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", btResult.pnlPercent >= 0 ? "bg-terminal-green/10 text-terminal-green" : "bg-terminal-red/10 text-terminal-red")}>
                          {btResult.pnlPercent >= 0 ? "+" : ""}{btResult.pnlPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={btResult.priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={{ stroke: "#1e1e2e" }} tickLine={false} />
                        <YAxis domain={["dataMin - 0.05", "dataMax + 0.05"]} tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}¢`} />
                        <Tooltip contentStyle={{ backgroundColor: "#111118", border: "1px solid #1e1e2e", borderRadius: "6px", fontSize: "11px", color: "#e5e7eb" }} formatter={(value: number) => [`${(value * 100).toFixed(1)}¢`, "Price"]} />
                        <ReferenceLine y={btResult.entryPrice} stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={1} />
                        <ReferenceDot x={btResult.entryDate} y={btResult.entryPrice} r={4} fill="#f59e0b" stroke="#f59e0b" />
                        <Line type="monotone" dataKey="price" stroke={btResult.pnl >= 0 ? "#22c55e" : "#ef4444"} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <FlaskConical className="w-8 h-8 text-terminal-border mx-auto mb-2" />
                    <p className="text-terminal-muted text-xs">Configure parameters and run backtest</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
