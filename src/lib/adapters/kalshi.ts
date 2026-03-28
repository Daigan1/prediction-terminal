import { Market } from "@/types";

const BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";

interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  yes_sub_title: string;
  market_type: string;
  status: string;
  last_price_dollars: string;
  yes_bid_dollars: string;
  yes_ask_dollars: string;
  no_bid_dollars: string;
  no_ask_dollars: string;
  volume_fp: string;
  volume_24h_fp: string;
  open_interest_fp: string;
  close_time: string;
  expiration_time: string;
  result: string;
}

interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
  sub_title: string;
  markets: KalshiMarket[];
}

function mapStatus(status: string): "active" | "closed" | "settled" {
  if (status === "active" || status === "open") return "active";
  if (status === "settled") return "settled";
  return "closed";
}

function parsePrice(priceStr: string): number {
  const val = parseFloat(priceStr);
  return isNaN(val) ? 0 : val;
}

function toMarket(event: KalshiEvent, km: KalshiMarket): Market {
  const yesPrice = parsePrice(km.yes_bid_dollars) || parsePrice(km.last_price_dollars);
  const noPrice = parsePrice(km.no_bid_dollars) || (1 - yesPrice);

  // Use event title for single-market events, combine for multi-market
  // Clean up sub-titles to avoid garbled text like "25Mbps >?"
  const subTitle = km.title || km.yes_sub_title || "";
  const title =
    event.markets.length === 1
      ? event.title
      : subTitle && subTitle.length > 3
      ? `${event.title}: ${subTitle}`
      : event.title;

  return {
    id: `kalshi-${km.ticker}`,
    exchange: "kalshi",
    title,
    category: event.category || "General",
    yesPrice: Math.max(0.01, Math.min(0.99, yesPrice)),
    noPrice: Math.max(0.01, Math.min(0.99, noPrice)),
    volume: parseFloat(km.volume_fp) || 0,
    endDate: km.close_time || km.expiration_time,
    status: mapStatus(km.status),
    url: `https://kalshi.com/markets/${km.event_ticker}`,
  };
}

export async function fetchKalshiMarkets(limit = 100): Promise<Market[]> {
  const markets: Market[] = [];
  let cursor = "";
  const eventLimit = Math.min(limit, 200);

  // Use events endpoint with nested markets to avoid MVE composite markets
  while (markets.length < limit) {
    const url = `${BASE_URL}/events?limit=${eventLimit}&status=open&with_nested_markets=true${cursor ? `&cursor=${cursor}` : ""}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`Kalshi API error: ${res.status} ${res.statusText}`);
      break;
    }

    const data = await res.json();
    const events: KalshiEvent[] = data.events || [];
    cursor = data.cursor || "";

    for (const event of events) {
      const eventMarkets = (event.markets || []).filter(
        (km) => km.market_type === "binary"
      );

      if (eventMarkets.length <= 3) {
        // Small events: include all binary markets
        for (const km of eventMarkets) {
          const market = toMarket(event, km);
          if (market.yesPrice > 0.01 && market.yesPrice < 0.99) {
            markets.push(market);
          }
        }
      } else {
        // Large events (many sub-contracts): take only the highest-volume market
        // to avoid flooding with sub-contracts like "25Mbps >?"
        const sorted = [...eventMarkets].sort(
          (a, b) => (parseFloat(b.volume_fp) || 0) - (parseFloat(a.volume_fp) || 0)
        );
        const topMarket = sorted[0];
        if (topMarket) {
          const market = toMarket(event, topMarket);
          if (market.yesPrice > 0.01 && market.yesPrice < 0.99) {
            markets.push(market);
          }
        }
      }
    }

    if (!cursor || events.length === 0) break;
  }

  return markets.slice(0, limit);
}
