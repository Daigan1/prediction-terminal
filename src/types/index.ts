// ── Core Data Models ──

export type Exchange = "kalshi" | "polymarket" | "gemini";

export type Market = {
  id: string;
  exchange: Exchange;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  endDate: string;
  status: "active" | "closed" | "settled";
  url?: string;
};

export type MatchedGroup = {
  id: string;
  markets: Market[];
  confidence: number;
  explanation: string;
  normalizedTitle: string;
  differences: string[];
};

export type Opportunity = {
  id: string;
  matchGroupId: string;
  type: "arbitrage" | "spread";
  edge: number;
  edgeAfterFees: number;
  buyExchange: Exchange;
  sellExchange: Exchange;
  buyPrice: number;
  sellPrice: number;
  buyMarketId: string;
  sellMarketId: string;
  buyFee: number;
  sellFee: number;
  marketTitle: string;
  executable: boolean;
  timestamp: string;
};

export type Balance = {
  exchange: Exchange;
  cash: number;
  positions: Position[];
};

export type Position = {
  marketId: string;
  marketTitle: string;
  side: "yes" | "no";
  quantity: number;
  avgPrice: number;
  currentPrice: number;
};

export type Trade = {
  id: string;
  exchangeOrderId?: string; // Native order ID from the exchange
  marketId: string;
  marketTitle: string;
  exchange: Exchange;
  side: "yes" | "no";
  price: number;
  quantity: number;
  type: "live" | "paper" | "sandbox";
  action: "buy" | "sell";
  status: "pending" | "filled" | "cancelled" | "settled";
  pnl?: number;
  timestamp: string;
  settledAt?: string;
};

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  snippet: string;
  relatedMarkets?: { id: string; title: string; exchange: string }[];
};

export type ApiKeys = {
  kalshi: { apiKey: string; secret: string };
  polymarket: { apiKey: string };
  gemini: { apiKey: string; secret: string };
  geminiAI: { apiKey: string };
  supabase: { url: string; anonKey: string };
};

export type TradingMode = "live" | "paper" | "sandbox";

// ── Backtesting ──

export type BacktestEntry = {
  date: string;
  price: number;
};

export type BacktestResult = {
  marketId: string;
  marketTitle: string;
  exchange: Exchange;
  side: "yes" | "no";
  entryDate: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  priceHistory: BacktestEntry[];
};

// ── Order Execution ──

export type OrderRequest = {
  exchange: Exchange;
  symbol: string; // Exchange-specific symbol extracted from market ID
  side: "buy" | "sell";
  outcome: "yes" | "no";
  quantity: number;
  price: number; // Limit price 0-1
};

export type OrderResult = {
  success: boolean;
  orderId?: string;
  status?: string;
  filledQuantity?: number;
  remainingQuantity?: number;
  error?: string;
};

// ── Layout ──

export type PanelId =
  | "markets"
  | "balances"
  | "trades"
  | "pnl"
  | "news";

export type LayoutPreset = "default" | "trading" | "research" | "minimal";

// ── Exchange Adapter Interface ──

export interface ExchangeAdapter {
  exchange: Exchange;
  getMarkets(): Promise<Market[]>;
  getBalances(): Promise<Balance>;
}

// ── LLM Response Types ──

export type EquivalenceResult = {
  equivalent: boolean;
  confidence: number;
  explanation: string;
  differences: string[];
};

