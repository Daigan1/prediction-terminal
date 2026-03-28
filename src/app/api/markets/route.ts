import { NextResponse } from "next/server";
import { fetchAllMarkets } from "@/lib/adapters";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const markets = await fetchAllMarkets();

    return NextResponse.json({
      markets,
      count: markets.length,
      exchanges: {
        kalshi: markets.filter((m) => m.exchange === "kalshi").length,
        polymarket: markets.filter((m) => m.exchange === "polymarket").length,
        gemini: markets.filter((m) => m.exchange === "gemini").length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets", markets: [] },
      { status: 500 }
    );
  }
}
