"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Responsive, Layout, Layouts } from "react-grid-layout";
import { useStore } from "@/lib/store";
import { PanelId, LayoutPreset } from "@/types";
import { PANELS, PRO_PANELS, LAYOUT_PRESETS, PRESET_LABELS } from "@/lib/layouts";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Maximize2,
  Minimize2,
  X,
  Layout as LayoutIcon,
  RotateCcw,
  BarChart3,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Newspaper,
} from "lucide-react";

// Panel content imports
import MarketTable from "./MarketTable";
import BalanceCards from "./BalanceCards";
import TradesPanel from "./TradesPanel";
import PnLChart from "./PnLChart";
import NewsPanel from "./NewsPanel";

// Manual measurement instead of WidthProvider to avoid infinite resize loops
function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 1200, height: 800 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0) setSize({ width: w, height: h });
      }
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setSize({
      width: Math.floor(rect.width) || 1200,
      height: Math.floor(rect.height) || 800,
    });
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// ── Simple mode tab config ──
const SIMPLE_TABS: { id: PanelId; label: string; icon: React.ElementType }[] = [
  { id: "markets", label: "Markets", icon: ShoppingCart },
  { id: "news", label: "News", icon: Newspaper },
  { id: "balances", label: "Portfolio", icon: DollarSign },
  { id: "trades", label: "Trades", icon: BarChart3 },
  { id: "pnl", label: "P&L", icon: TrendingUp },
];

export default function TerminalLayout() {
  const { simpleMode } = useStore();
  const [layouts, setLayouts] = useState<Layout[]>(LAYOUT_PRESETS.default);
  const [activePreset, setActivePreset] = useState<LayoutPreset>("default");
  const [hiddenPanels, setHiddenPanels] = useState<Set<PanelId>>(new Set());
  const [maximizedPanel, setMaximizedPanel] = useState<PanelId | null>(null);
  const [showLayoutBar, setShowLayoutBar] = useState(false);
  const [simpleActiveTab, setSimpleActiveTab] = useState<PanelId>("markets");
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const { width: gridWidth, height: gridHeight } = useContainerSize(gridContainerRef);

  // Apply minW/minH from PANELS config to all layout items
  const visibleLayouts = useMemo(
    () =>
      layouts
        .filter((l) => !hiddenPanels.has(l.i as PanelId))
        .map((l) => {
          const panel = PANELS[l.i as PanelId];
          if (!panel) return l;
          return { ...l, minW: panel.minW, minH: panel.minH };
        }),
    [layouts, hiddenPanels]
  );

  // Fixed row height based on container height divided by a standard 16-row grid
  const rowHeight = useMemo(() => {
    const padding = 8;
    const rows = 16;
    const available = gridHeight - padding - (rows - 1) * 4;
    return Math.max(20, Math.floor(available / rows));
  }, [gridHeight]);

  // Merge grid updates back while preserving hidden panel positions
  const onLayoutChange = useCallback(
    (currentLayout: Layout[]) => {
      setLayouts((prev) => {
        const updated = new Map(currentLayout.map((l) => [l.i, l]));
        return prev.map((l) => updated.get(l.i) ?? l);
      });
    },
    []
  );

  const applyPreset = (preset: LayoutPreset) => {
    setLayouts(LAYOUT_PRESETS[preset]);
    setActivePreset(preset);
    setHiddenPanels(new Set());
    setMaximizedPanel(null);
  };

  const togglePanel = (id: PanelId) => {
    setHiddenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleMaximize = (id: PanelId) => {
    setMaximizedPanel(maximizedPanel === id ? null : id);
  };

  const renderPanel = (panelId: PanelId, simple = false) => {
    switch (panelId) {
      case "markets":
        return <MarketTable simple={simple} />;
      case "balances":
        return <BalanceCards simple={simple} />;
      case "trades":
        return <TradesPanel simple={simple} />;
      case "pnl":
        return <PnLChart simple={simple} />;
      case "news":
        return <NewsPanel simple={simple} />;
    }
  };

  // ── Simple mode: tab-based layout, no grid/drag/drop ──
  if (simpleMode) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Panel content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {renderPanel(simpleActiveTab, true)}
        </div>

        {/* Bottom tab bar */}
        <div className="shrink-0 border-t border-terminal-border bg-terminal-header">
          <div className="flex items-center justify-around px-1 py-1">
            {SIMPLE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = simpleActiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSimpleActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors min-w-0",
                    isActive
                      ? "bg-terminal-accent/15 text-terminal-accent"
                      : "text-terminal-muted hover:text-terminal-text hover:bg-terminal-border/30"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] font-semibold tracking-wider uppercase">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Pro mode: maximized panel ──
  if (maximizedPanel) {
    return (
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={() => setMaximizedPanel(null)}
            className="p-1.5 rounded bg-terminal-header border border-terminal-border text-terminal-muted hover:text-terminal-text"
            title="Restore"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 p-1">{renderPanel(maximizedPanel)}</div>
      </div>
    );
  }

  // ── Pro mode: full grid layout ──
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Layout control bar */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-terminal-border bg-terminal-header">
        <button
          onClick={() => setShowLayoutBar(!showLayoutBar)}
          className={cn(
            "p-1 rounded transition-colors",
            showLayoutBar
              ? "text-terminal-accent bg-terminal-accent/10"
              : "text-terminal-muted hover:text-terminal-text"
          )}
          title="Layout options"
        >
          <LayoutIcon className="w-3.5 h-3.5" />
        </button>

        {showLayoutBar && (
          <>
            <div className="h-4 w-px bg-terminal-border" />

            {/* Presets */}
            <span className="text-[9px] text-terminal-muted uppercase">
              Presets:
            </span>
            {(Object.keys(PRESET_LABELS) as LayoutPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className={cn(
                  "text-[9px] px-2 py-0.5 rounded border transition-colors",
                  activePreset === preset
                    ? "border-terminal-accent/40 bg-terminal-accent/10 text-terminal-accent"
                    : "border-terminal-border text-terminal-muted hover:text-terminal-text"
                )}
              >
                {PRESET_LABELS[preset].toUpperCase()}
              </button>
            ))}

            <div className="h-4 w-px bg-terminal-border" />

            {/* Panel toggles */}
            <span className="text-[9px] text-terminal-muted uppercase">
              Panels:
            </span>
            {(Object.keys(PRO_PANELS) as PanelId[]).map((id) => (
              <button
                key={id}
                onClick={() => togglePanel(id)}
                className={cn(
                  "text-[9px] px-2 py-0.5 rounded border transition-colors",
                  hiddenPanels.has(id)
                    ? "border-terminal-border text-terminal-muted/50 line-through"
                    : "border-terminal-border text-terminal-text"
                )}
              >
                {PANELS[id].title.toUpperCase()}
              </button>
            ))}

            <div className="h-4 w-px bg-terminal-border" />

            <button
              onClick={() => applyPreset(activePreset)}
              className="text-[9px] px-2 py-0.5 rounded border border-terminal-border text-terminal-muted hover:text-terminal-text flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              RESET
            </button>
          </>
        )}
      </div>

      {/* Grid */}
      <div ref={gridContainerRef} className="flex-1 overflow-auto">
        <Responsive
          className="layout"
          width={gridWidth}
          layouts={{ lg: visibleLayouts }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={rowHeight}
          margin={[4, 4] as [number, number]}
          containerPadding={[4, 4] as [number, number]}
          isDraggable
          isResizable
          draggableHandle=".panel-drag-handle"
          onLayoutChange={onLayoutChange}
          useCSSTransforms
        >
          {visibleLayouts.map((layout) => {
            const panelId = layout.i as PanelId;
            const panel = PANELS[panelId];
            if (!panel) return null;

            return (
              <div
                key={panelId}
                className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden flex flex-col"
              >
                {/* Panel title bar */}
                <div className="panel-drag-handle flex items-center justify-between px-2 py-1 bg-terminal-header border-b border-terminal-border cursor-grab active:cursor-grabbing select-none">
                  <div className="flex items-center gap-1.5">
                    <GripVertical className="w-3 h-3 text-terminal-muted/50" />
                    <span className="text-[9px] font-semibold text-terminal-muted uppercase tracking-wider">
                      {panel.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => toggleMaximize(panelId)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="p-0.5 rounded hover:bg-terminal-border/50 text-terminal-muted hover:text-terminal-text"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => togglePanel(panelId)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="p-0.5 rounded hover:bg-terminal-red/20 text-terminal-muted hover:text-terminal-red"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Panel content */}
                <div className="flex-1 min-h-0 overflow-auto">
                  {renderPanel(panelId)}
                </div>
              </div>
            );
          })}
        </Responsive>
      </div>
    </div>
  );
}
