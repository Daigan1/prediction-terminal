import { Market } from "@/types";

const BASE_URL = "https://api.gemini.com/v1/prediction-markets";

interface GeminiContract {
  id: string;
  label: string;
  ticker: string;
  instrumentSymbol: string;
  status: string;
  marketState: string;
  prices: {
    buy?: { yes?: string; no?: string };
    sell?: { yes?: string; no?: string };
    bestBid?: string;
    bestAsk?: string;
    lastTradePrice?: string;
  };
  resolutionSide?: string;
}

interface GeminiEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: string; // "binary" | "categorical"
  category: string;
  ticker: string;
  status: string;
  volume: string | number;
  liquidity: string | number | null;
  effectiveDate: string;
  expiryDate: string;
  contracts: GeminiContract[];
}

function toMarket(event: GeminiEvent, contract: GeminiContract): Market | null {
  const p = contract.prices;

  // Prices are flat strings on the contract: lastTradePrice, bestBid, bestAsk
  // buy.yes / sell.yes are also available as strings
  const yesPrice = parseFloat(
    p?.lastTradePrice ?? p?.bestBid ?? p?.bestAsk ?? p?.buy?.yes ?? "0"
  );
  const noRaw = parseFloat(
    p?.buy?.no ?? p?.sell?.no ?? "0"
  );
  const volume = typeof event.volume === "string" ? parseInt(event.volume, 10) || 0 : event.volume || 0;
  const noPrice = noRaw > 0 ? noRaw : 1 - yesPrice;

  if (isNaN(yesPrice) || yesPrice <= 0.01 || yesPrice >= 0.99) return null;

  return {
    id: `gemini-${contract.instrumentSymbol || contract.id}`,
    exchange: "gemini",
    title: event.type === "binary" ? event.title : `${event.title}: ${contract.label}`,
    category: event.category || "General",
    yesPrice,
    noPrice: Math.max(0.01, Math.min(0.99, noPrice)),
    volume,
    endDate: event.expiryDate,
    status:
      event.status === "active"
        ? "active"
        : event.status === "settled"
        ? "settled"
        : "closed",
    url: `https://www.gemini.com/predictions/${event.slug}`,
  };
}

export async function fetchGeminiMarkets(limit = 100): Promise<Market[]> {
  const url = `${BASE_URL}/events?status=active&limit=${limit}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`Gemini API error: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  const events: GeminiEvent[] = Array.isArray(data)
    ? data
    : data.data || data.events || [];

  const markets: Market[] = [];

  for (const event of events) {
    if (!event.contracts?.length) continue;
    for (const contract of event.contracts) {
      const market = toMarket(event, contract);
      if (market) markets.push(market);
    }
  }

  return markets;
}
