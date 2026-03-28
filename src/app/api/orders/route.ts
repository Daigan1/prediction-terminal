import { NextResponse } from "next/server";
import { fetchOrderHistory } from "@/lib/adapters/trading";
import type { TradingMode } from "@/types";

export async function POST(request: Request) {
  try {
    const { apiKeys, tradingMode } = await request.json();

    if (!apiKeys) {
      return NextResponse.json(
        { trades: [], error: "API keys required" },
        { status: 401 }
      );
    }

    const mode: TradingMode = tradingMode === "sandbox" ? "sandbox" : "live";
    const trades = await fetchOrderHistory({
      kalshi: apiKeys.kalshi,
      polymarket: apiKeys.polymarket,
      gemini: apiKeys.gemini,
    }, mode);

    return NextResponse.json({ trades });
  } catch (err) {
    console.error("[orders] fetch failed:", err);
    return NextResponse.json(
      {
        trades: [],
        error: err instanceof Error ? err.message : "Failed to fetch orders",
      },
      { status: 500 }
    );
  }
}
