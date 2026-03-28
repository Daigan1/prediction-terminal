import { Market } from "@/types";

const BASE_URL = "https://gamma-api.polymarket.com";

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string; // JSON string: '["Yes", "No"]'
  outcomePrices: string; // JSON string: '["0.55", "0.45"]'
  volume: string;
  volumeNum: number;
  volume24hr: number;
  liquidity: string;
  liquidityNum: number;
  active: boolean;
  closed: boolean;
  endDate: string;
  endDateIso: string;
  lastTradePrice: number;
  bestBid: number;
  bestAsk: number;
  conditionId: string;
  clobTokenIds: string;
  events: { slug: string }[];
}

function toMarket(pm: PolymarketMarket): Market | null {
  let yesPrice = 0;
  let noPrice = 0;

  try {
    const outcomes: string[] = JSON.parse(pm.outcomes || "[]");
    const prices: string[] = JSON.parse(pm.outcomePrices || "[]");

    if (outcomes.length >= 2 && prices.length >= 2) {
      const yesIdx = outcomes.findIndex(
        (o) => o.toLowerCase() === "yes"
      );
      const noIdx = outcomes.findIndex(
        (o) => o.toLowerCase() === "no"
      );

      if (yesIdx !== -1 && noIdx !== -1) {
        yesPrice = parseFloat(prices[yesIdx]) || 0;
        noPrice = parseFloat(prices[noIdx]) || 0;
      } else {
        // For non-yes/no markets, use first as "yes"
        yesPrice = parseFloat(prices[0]) || 0;
        noPrice = parseFloat(prices[1]) || 0;
      }
    }
  } catch {
    // Fallback to lastTradePrice
    yesPrice = pm.lastTradePrice || pm.bestBid || 0;
    noPrice = 1 - yesPrice;
  }

  if (yesPrice <= 0.01 || yesPrice >= 0.99) return null;

  const eventSlug = pm.events?.[0]?.slug || pm.slug;

  return {
    id: `poly-${pm.id}`,
    exchange: "polymarket",
    title: pm.question,
    category: "General",
    yesPrice,
    noPrice,
    volume: pm.volumeNum || parseFloat(pm.volume) || 0,
    endDate: pm.endDate || pm.endDateIso,
    status: pm.closed ? "closed" : pm.active ? "active" : "closed",
    url: `https://polymarket.com/event/${eventSlug}`,
  };
}

export async function fetchPolymarketMarkets(limit = 100): Promise<Market[]> {
  const url = `${BASE_URL}/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=${limit}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`Polymarket API error: ${res.status} ${res.statusText}`);
    return [];
  }

  const data: PolymarketMarket[] = await res.json();
  const markets: Market[] = [];

  for (const m of data) {
    const market = toMarket(m);
    if (market) markets.push(market);
  }

  return markets;
}
