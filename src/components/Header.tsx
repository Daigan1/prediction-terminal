"use client";

import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { RefreshCw, Settings, Activity, Eye, EyeOff, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  const {
    tradingMode,
    setTradingMode,
    settingsOpen,
    setSettingsOpen,
    fetchMarkets,
    isLoading,
    lastRefresh,
    simpleMode,
    setSimpleMode,
  } = useStore();
  const { user } = useAuth();

  return (
    <header className="border-b border-terminal-border bg-terminal-header px-4 py-2 flex items-center justify-between">
      {/* Left: App Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-terminal-accent" />
          <h1
            className={cn(
              "font-bold text-terminal-accent text-red tracking-tight",
              simpleMode ? "text-xl" : "text-lg"
            )}
          >
            PREDICTION TERMINAL
          </h1>
        </div>
        {!simpleMode && (
          <span className="text-[10px] text-terminal-muted border border-terminal-border px-1.5 py-0.5 rounded">
          </span>
        )}
      </div>

      {/* Center: Mode Toggles */}
      <div className="flex items-center gap-3">
        {/* Simple Mode Toggle */}
        <button
          onClick={() => setSimpleMode(!simpleMode)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-all",
            simpleMode
              ? "bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30"
              : "text-terminal-muted border-terminal-border hover:text-terminal-text"
          )}
          title={simpleMode ? "Switch to Pro mode" : "Switch to Simple mode"}
        >
          {simpleMode ? (
            <Eye className="w-3.5 h-3.5" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" />
          )}
          {simpleMode ? "SIMPLE" : "PRO"}
        </button>

        {/* Trading Mode Toggle */}
        <div className="flex items-center gap-1 bg-terminal-bg rounded-md p-0.5 border border-terminal-border">
          <button
            onClick={() => setTradingMode("paper")}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-all",
              tradingMode === "paper"
                ? "bg-terminal-accent/20 text-terminal-accent border border-terminal-accent/30"
                : "text-terminal-muted hover:text-terminal-text"
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  tradingMode === "paper"
                    ? "bg-terminal-accent pulse-dot"
                    : "bg-terminal-muted"
                )}
              />
              PAPER
            </span>
          </button>
          <button
            onClick={() => setTradingMode("sandbox")}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-all",
              tradingMode === "sandbox"
                ? "bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/30"
                : "text-terminal-muted hover:text-terminal-text"
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  tradingMode === "sandbox"
                    ? "bg-terminal-cyan pulse-dot"
                    : "bg-terminal-muted"
                )}
              />
              SANDBOX
            </span>
          </button>
          <button
            onClick={() => setTradingMode("live")}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-all",
              tradingMode === "live"
                ? "bg-terminal-red/20 text-terminal-red border border-terminal-red/30"
                : "text-terminal-muted hover:text-terminal-text"
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  tradingMode === "live"
                    ? "bg-terminal-red pulse-dot"
                    : "bg-terminal-muted"
                )}
              />
              LIVE
            </span>
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {lastRefresh && (
          <span className="text-[10px] text-terminal-muted">
            {new Date(lastRefresh).toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={fetchMarkets}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-terminal-border/50 text-terminal-muted hover:text-terminal-text transition-colors"
          title="Refresh data"
        >
          <RefreshCw
            className={cn("w-4 h-4", isLoading && "animate-spin")}
          />
        </button>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={cn(
            "flex items-center gap-1.5 p-1.5 rounded hover:bg-terminal-border/50 transition-colors",
            settingsOpen
              ? "text-terminal-accent"
              : "text-terminal-muted hover:text-terminal-text"
          )}
          title="Settings"
        >
          {user ? (
            <User className="w-4 h-4 text-terminal-green" />
          ) : (
            <Settings className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
