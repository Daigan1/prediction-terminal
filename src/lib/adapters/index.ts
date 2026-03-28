import { Market, Exchange } from "@/types";
import { fetchKalshiMarkets } from "./kalshi";
import { fetchPolymarketMarkets } from "./polymarket";
import { fetchGeminiMarkets } from "./gemini";

// Filter out markets with garbled/non-prediction-market titles
function isValidMarketTitle(title: string): boolean {
  if (!title || title.length < 5) return false;
  // Filter titles that are mostly non-alpha (tickers, codes, garbled text)
  const alphaRatio = (title.match(/[a-zA-Z\s]/g) || []).length / title.length;
  if (alphaRatio < 0.35) return false;
  // Filter titles that are just comparisons like ">= 25" or "< 100"
  if (/^[<>=!]+\s*\d+\s*$/.test(title)) return false;
  return true;
}

const PER_EXCHANGE_LIMIT = 100;

export async function fetchAllMarkets(): Promise<Market[]> {
  const results = await Promise.allSettled([
    fetchKalshiMarkets(PER_EXCHANGE_LIMIT),
    fetchPolymarketMarkets(PER_EXCHANGE_LIMIT),
    fetchGeminiMarkets(PER_EXCHANGE_LIMIT),
  ]);

  const markets: Market[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      // Filter garbled titles and sort by volume within each exchange
      const cleaned = result.value
        .filter((m) => isValidMarketTitle(m.title))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, PER_EXCHANGE_LIMIT);
      markets.push(...cleaned);
    } else {
      errors.push(result.reason?.message || "Unknown error");
    }
  }

  if (errors.length > 0) {
    console.warn("Some exchange adapters failed:", errors);
  }

  // Sort by volume descending
  return markets.sort((a, b) => b.volume - a.volume);
}

export async function fetchMarketsByExchange(
  exchange: Exchange
): Promise<Market[]> {
  switch (exchange) {
    case "kalshi":
      return fetchKalshiMarkets();
    case "polymarket":
      return fetchPolymarketMarkets();
    case "gemini":
      return fetchGeminiMarkets();
  }
}

export { fetchKalshiMarkets, fetchPolymarketMarkets, fetchGeminiMarkets };
