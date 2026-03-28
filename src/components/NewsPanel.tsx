"use client";

import { useStore } from "@/lib/store";
import type { NewsItem, Exchange } from "@/types";
import { timeAgo, exchangeColor, exchangeLabel, cn } from "@/lib/utils";
import { Newspaper, ExternalLink, Loader2, RefreshCw } from "lucide-react";

export default function NewsPanel({ simple = false }: { simple?: boolean }) {
  const { news, isLoading, setTradeModal, markets } = useStore();

  const openRelatedMarket = (marketId: string) => {
    const market = markets.find((m) => m.id === marketId);
    if (market) setTradeModal(true, market);
  };

  if (isLoading && news.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-terminal-accent animate-spin mx-auto mb-3" />
          <p className="text-terminal-muted text-xs">Fetching news...</p>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Newspaper className="w-8 h-8 text-terminal-border mx-auto mb-2" />
          <p className="text-terminal-muted text-xs">
            No news yet. News loads after markets are fetched.
          </p>
          <p className="text-terminal-muted/50 text-[10px] mt-1">
            Searches Google News for topics related to active prediction markets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border bg-terminal-header shrink-0">
        <div className="flex items-center gap-1.5">
          <Newspaper className="w-3 h-3 text-terminal-accent" />
          <span className="text-[10px] font-semibold text-terminal-muted uppercase tracking-wider">
            Recent News
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent">
            {news.length}
          </span>
        </div>
        {isLoading && (
          <RefreshCw className="w-3 h-3 text-terminal-accent animate-spin" />
        )}
      </div>

      {/* News list */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-terminal-border">
          {news.map((item: NewsItem) => (
            <div
              key={item.id}
              className="px-3 py-2.5 hover:bg-terminal-border/10 transition-colors"
            >
              {/* Title + link */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-terminal-text font-medium hover:text-terminal-accent transition-colors leading-snug block"
                  >
                    {item.title}
                    <ExternalLink className="inline-block w-2.5 h-2.5 ml-1 text-terminal-muted opacity-50" />
                  </a>
                </div>
              </div>

              {/* Source + time */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-terminal-accent font-medium">
                  {item.source}
                </span>
                <span className="text-[10px] text-terminal-muted">
                  {timeAgo(item.publishedAt)}
                </span>
              </div>

              {/* Snippet */}
              {item.snippet && !simple && (
                <p className="text-[10px] text-terminal-muted/70 mt-1 leading-relaxed line-clamp-2">
                  {item.snippet}
                </p>
              )}

              {/* Related markets */}
              {item.relatedMarkets && item.relatedMarkets.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.relatedMarkets.map((rm) => (
                    <button
                      key={rm.id}
                      onClick={() => openRelatedMarket(rm.id)}
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded border border-terminal-border/50 hover:border-terminal-accent/40 transition-colors truncate max-w-[200px]",
                        exchangeColor(rm.exchange as Exchange)
                      )}
                      title={rm.title}
                    >
                      <span className="font-bold mr-1">
                        {exchangeLabel(rm.exchange as Exchange)}
                      </span>
                      <span className="text-terminal-muted">
                        {rm.title.length > 40
                          ? rm.title.slice(0, 40) + "..."
                          : rm.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
