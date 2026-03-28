import type { Layout } from "react-grid-layout";
import { PanelId, LayoutPreset } from "@/types";

export type PanelConfig = {
  id: PanelId;
  title: string;
  minW: number;
  minH: number;
};

export const PANELS: Record<PanelId, PanelConfig> = {
  markets: { id: "markets", title: "Markets", minW: 4, minH: 4 },
  balances: { id: "balances", title: "Portfolio", minW: 3, minH: 2 },
  trades: { id: "trades", title: "Trades", minW: 3, minH: 3 },
  pnl: { id: "pnl", title: "P&L Chart", minW: 3, minH: 3 },
  news: { id: "news", title: "News", minW: 3, minH: 3 },
};

// Pro mode panels
export const PRO_PANELS: Record<string, PanelConfig> = {
  markets: PANELS.markets,
  balances: PANELS.balances,
  trades: PANELS.trades,
  pnl: PANELS.pnl,
  news: PANELS.news,
};

// 12-column grid layouts
export const LAYOUT_PRESETS: Record<LayoutPreset, Layout[]> = {
  default: [
    { i: "balances", x: 0, y: 0, w: 12, h: 3 },
    { i: "markets", x: 0, y: 3, w: 8, h: 10 },
    { i: "pnl", x: 8, y: 3, w: 4, h: 5 },
    { i: "news", x: 8, y: 8, w: 4, h: 5 },
    { i: "trades", x: 0, y: 13, w: 8, h: 5 },
  ],
  trading: [
    { i: "balances", x: 0, y: 0, w: 12, h: 3 },
    { i: "markets", x: 0, y: 3, w: 6, h: 10 },
    { i: "pnl", x: 6, y: 3, w: 6, h: 5 },
    { i: "news", x: 6, y: 8, w: 6, h: 5 },
    { i: "trades", x: 0, y: 13, w: 6, h: 5 },
  ],
  research: [
    { i: "markets", x: 0, y: 0, w: 6, h: 10 },
    { i: "news", x: 6, y: 0, w: 6, h: 5 },
    { i: "pnl", x: 6, y: 5, w: 6, h: 5 },
    { i: "balances", x: 0, y: 10, w: 4, h: 3 },
    { i: "trades", x: 4, y: 10, w: 8, h: 5 },
  ],
  minimal: [
    { i: "balances", x: 0, y: 0, w: 12, h: 3 },
    { i: "markets", x: 0, y: 3, w: 12, h: 10 },
    { i: "news", x: 0, y: 13, w: 12, h: 5 },
    { i: "trades", x: 0, y: 18, w: 12, h: 5 },
    { i: "pnl", x: 0, y: 23, w: 12, h: 5 },
  ],
};

export const PRESET_LABELS: Record<LayoutPreset, string> = {
  default: "Default",
  trading: "Trading",
  research: "Research",
  minimal: "Minimal",
};
