import { OrderRequest, OrderResult, Trade, Exchange, TradingMode } from "@/types";
import crypto from "crypto";

// ── Helpers ──

/** Extract exchange-native symbol from our prefixed market ID (e.g. "gemini-GEMI-X" → "GEMI-X") */
export function extractSymbol(marketId: string): string {
  const idx = marketId.indexOf("-");
  return idx >= 0 ? marketId.slice(idx + 1) : marketId;
}

// ── Base URLs ──

const BASE_URLS = {
  gemini: {
    live: "https://api.gemini.com",
    sandbox: "https://api.sandbox.gemini.com",
  },
  kalshi: {
    live: "https://api.elections.kalshi.com",
    sandbox: "https://demo-api.kalshi.co",
  },
  polymarket: {
    live: "https://clob.polymarket.com",
    sandbox: "https://clob.polymarket.com", // Polymarket has no public sandbox; uses same endpoint
  },
} as const;

function getBaseUrl(exchange: Exchange, mode: TradingMode): string {
  const useSandbox = mode === "sandbox";
  return BASE_URLS[exchange][useSandbox ? "sandbox" : "live"];
}

// ── Gemini ──
// Docs: https://docs.gemini.com/prediction-markets/trading#place-order

function geminiHeaders(
  apiKey: string,
  secret: string,
  payload: object
): Record<string, string> {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64"
  );
  const signature = crypto
    .createHmac("sha384", secret)
    .update(encodedPayload)
    .digest("hex");

  return {
    "Content-Type": "text/plain",
    "X-GEMINI-APIKEY": apiKey,
    "X-GEMINI-PAYLOAD": encodedPayload,
    "X-GEMINI-SIGNATURE": signature,
    "Cache-Control": "no-cache",
  };
}

async function placeGeminiOrder(
  order: OrderRequest,
  apiKey: string,
  secret: string,
  mode: TradingMode = "live"
): Promise<OrderResult> {
  const baseUrl = getBaseUrl("gemini", mode);
  const nonce = Date.now().toString();
  const payload = {
    request: "/v1/prediction-markets/order",
    nonce,
    symbol: order.symbol,
    orderType: "limit",
    side: order.side,
    quantity: order.quantity.toString(),
    price: order.price.toString(),
    outcome: order.outcome,
    timeInForce: "immediate-or-cancel",
  };

  const res = await fetch(
    `${baseUrl}/v1/prediction-markets/order`,
    {
      method: "POST",
      headers: geminiHeaders(apiKey, secret, payload),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      error: data.message || data.reason || `Gemini error ${res.status}`,
    };
  }

  return {
    success: true,
    orderId: data.orderId || data.order_id,
    status: data.status,
    filledQuantity: parseFloat(data.filledQuantity || data.filled_quantity || "0"),
    remainingQuantity: parseFloat(
      data.remainingQuantity || data.remaining_quantity || "0"
    ),
  };
}

// ── Kalshi ──
// Docs: https://trading-api.readme.io/reference/createorder

async function placeKalshiOrder(
  order: OrderRequest,
  apiKey: string,
  secret: string,
  mode: TradingMode = "live"
): Promise<OrderResult> {
  const baseUrl = getBaseUrl("kalshi", mode);
  // Kalshi uses HMAC-SHA256 signed requests
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = "POST";
  const path = "/trade-api/v2/portfolio/orders";
  const body = JSON.stringify({
    ticker: order.symbol,
    action: order.side,
    side: order.outcome,
    type: "limit",
    count: order.quantity,
    yes_price: Math.round(order.price * 100), // Kalshi uses cents
    no_price: Math.round((1 - order.price) * 100),
    expiration_ts: undefined, // GTC
  });

  const message = timestamp + method + path + body;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("base64");

  const res = await fetch(
    `${baseUrl}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "KALSHI-ACCESS-KEY": apiKey,
        "KALSHI-ACCESS-SIGNATURE": signature,
        "KALSHI-ACCESS-TIMESTAMP": timestamp,
      },
      body,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      error: data.message || data.error || `Kalshi error ${res.status}`,
    };
  }

  const o = data.order || data;
  return {
    success: true,
    orderId: o.order_id,
    status: o.status,
    filledQuantity: o.filled_count ?? o.filled_quantity,
    remainingQuantity: o.remaining_count ?? o.remaining_quantity,
  };
}

// ── Polymarket ──
// Polymarket uses the CLOB API with API key auth
// Docs: https://docs.polymarket.com/#create-order

async function placePolymarketOrder(
  order: OrderRequest,
  apiKey: string,
  mode: TradingMode = "live"
): Promise<OrderResult> {
  const baseUrl = getBaseUrl("polymarket", mode);
  // Polymarket CLOB uses a simple API-key header for managed accounts
  const body = JSON.stringify({
    tokenID: order.symbol, // The CLOB token ID
    price: order.price,
    size: order.quantity,
    side: order.side === "buy" ? "BUY" : "SELL",
    type: "GTC",
  });

  const res = await fetch(
    `${baseUrl}/order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Polymarket CLOB may require additional signing depending on account type
      },
      body,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      error: data.message || data.error || `Polymarket error ${res.status}`,
    };
  }

  return {
    success: true,
    orderId: data.orderID || data.id,
    status: data.status || "submitted",
    filledQuantity: data.filledSize ?? 0,
    remainingQuantity: data.remainingSize ?? order.quantity,
  };
}

// ── Dispatcher ──

interface ApiCredentials {
  kalshi?: { apiKey: string; secret: string };
  polymarket?: { apiKey: string };
  gemini?: { apiKey: string; secret: string };
}

// ── Order History ──

async function fetchGeminiOrderHistory(
  apiKey: string,
  secret: string,
  mode: TradingMode = "live"
): Promise<Trade[]> {
  const baseUrl = getBaseUrl("gemini", mode);
  const nonce = Date.now().toString();
  const payload = {
    request: "/v1/orders/history",
    nonce,
    limit: 200,
  };

  const res = await fetch(`${baseUrl}/v1/orders/history`, {
    method: "POST",
    headers: geminiHeaders(apiKey, secret, payload),
  });

  if (!res.ok) return [];
  const data = await res.json();
  const orders: unknown[] = Array.isArray(data) ? data : data.orders || [];

  return orders.map((o: any) => ({
    id: `gemini-order-${o.order_id || o.orderId}`,
    exchangeOrderId: String(o.order_id || o.orderId),
    marketId: `gemini-${o.symbol}`,
    marketTitle: o.symbol || "Unknown",
    exchange: "gemini" as Exchange,
    side: (o.outcome || "yes") as "yes" | "no",
    price: parseFloat(o.price || "0"),
    quantity: parseFloat(o.original_amount || o.executed_amount || "0"),
    type: "live" as const,
    action: (o.side === "sell" ? "sell" : "buy") as "buy" | "sell",
    status: mapGeminiStatus(o.is_cancelled, o.is_live, o.executed_amount),
    pnl: undefined,
    timestamp: o.timestampms
      ? new Date(o.timestampms).toISOString()
      : new Date().toISOString(),
  }));
}

function mapGeminiStatus(
  cancelled: boolean,
  live: boolean,
  executedAmt: string
): "pending" | "filled" | "cancelled" | "settled" {
  if (cancelled) return "cancelled";
  if (live) return "pending";
  if (parseFloat(executedAmt || "0") > 0) return "filled";
  return "cancelled";
}

async function fetchKalshiOrderHistory(
  apiKey: string,
  secret: string,
  mode: TradingMode = "live"
): Promise<Trade[]> {
  const baseUrl = getBaseUrl("kalshi", mode);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = "GET";
  const path = "/trade-api/v2/portfolio/orders";

  const message = timestamp + method + path;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("base64");

  const res = await fetch(
    `${baseUrl}${path}?limit=200`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "KALSHI-ACCESS-KEY": apiKey,
        "KALSHI-ACCESS-SIGNATURE": signature,
        "KALSHI-ACCESS-TIMESTAMP": timestamp,
      },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  const orders: unknown[] = data.orders || [];

  return orders.map((o: any) => ({
    id: `kalshi-order-${o.order_id}`,
    exchangeOrderId: o.order_id,
    marketId: `kalshi-${o.ticker}`,
    marketTitle: o.ticker || "Unknown",
    exchange: "kalshi" as Exchange,
    side: (o.side || "yes") as "yes" | "no",
    price: (o.yes_price || o.no_price || 0) / 100, // Kalshi uses cents
    quantity: o.filled_count || o.count || 0,
    type: "live" as const,
    action: (o.action === "sell" ? "sell" : "buy") as "buy" | "sell",
    status: mapKalshiStatus(o.status),
    pnl: undefined,
    timestamp: o.created_time || new Date().toISOString(),
  }));
}

function mapKalshiStatus(
  status: string
): "pending" | "filled" | "cancelled" | "settled" {
  if (status === "resting") return "pending";
  if (status === "executed") return "filled";
  if (status === "canceled" || status === "cancelled") return "cancelled";
  return "filled";
}

async function fetchPolymarketOrderHistory(
  apiKey: string,
  mode: TradingMode = "live"
): Promise<Trade[]> {
  const baseUrl = getBaseUrl("polymarket", mode);
  const res = await fetch(`${baseUrl}/orders`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) return [];
  const data = await res.json();
  const orders: unknown[] = data.data || [];

  return orders.map((o: any) => ({
    id: `poly-order-${o.id}`,
    exchangeOrderId: o.id,
    marketId: `poly-${o.market || o.asset_id}`,
    marketTitle: o.market || "Unknown",
    exchange: "polymarket" as Exchange,
    side: (o.outcome || "yes").toLowerCase() as "yes" | "no",
    price: parseFloat(o.price || "0"),
    quantity: parseFloat(o.original_size || o.size_matched || "0"),
    type: "live" as const,
    action: (o.side === "SELL" || o.side === "sell" ? "sell" : "buy") as "buy" | "sell",
    status: mapPolymarketStatus(o.status),
    pnl: undefined,
    timestamp: o.created_at || new Date().toISOString(),
  }));
}

function mapPolymarketStatus(
  status: string
): "pending" | "filled" | "cancelled" | "settled" {
  if (status === "live" || status === "open") return "pending";
  if (status === "matched" || status === "filled") return "filled";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  return "filled";
}

export async function fetchOrderHistory(
  credentials: ApiCredentials,
  mode: TradingMode = "live"
): Promise<Trade[]> {
  const results = await Promise.allSettled([
    credentials.gemini?.apiKey && credentials.gemini?.secret
      ? fetchGeminiOrderHistory(credentials.gemini.apiKey, credentials.gemini.secret, mode)
      : Promise.resolve([]),
    credentials.kalshi?.apiKey && credentials.kalshi?.secret
      ? fetchKalshiOrderHistory(credentials.kalshi.apiKey, credentials.kalshi.secret, mode)
      : Promise.resolve([]),
    credentials.polymarket?.apiKey
      ? fetchPolymarketOrderHistory(credentials.polymarket.apiKey, mode)
      : Promise.resolve([]),
  ]);

  const trades: Trade[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      trades.push(...result.value);
    }
  }

  // Sort by timestamp descending (most recent first)
  return trades.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function placeOrder(
  order: OrderRequest,
  credentials: ApiCredentials,
  mode: TradingMode = "live"
): Promise<OrderResult> {
  switch (order.exchange) {
    case "gemini": {
      const creds = credentials.gemini;
      if (!creds?.apiKey || !creds?.secret) {
        return { success: false, error: "Gemini API key and secret required" };
      }
      return placeGeminiOrder(order, creds.apiKey, creds.secret, mode);
    }
    case "kalshi": {
      const creds = credentials.kalshi;
      if (!creds?.apiKey || !creds?.secret) {
        return { success: false, error: "Kalshi API key and secret required" };
      }
      return placeKalshiOrder(order, creds.apiKey, creds.secret, mode);
    }
    case "polymarket": {
      const creds = credentials.polymarket;
      if (!creds?.apiKey) {
        return { success: false, error: "Polymarket API key required" };
      }
      return placePolymarketOrder(order, creds.apiKey, mode);
    }
    default:
      return { success: false, error: `Unknown exchange: ${order.exchange}` };
  }
}
