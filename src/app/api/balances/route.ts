import { NextResponse } from "next/server";

// Balances are managed client-side in the Zustand store.
// This route exists for future server-side persistence.

export async function GET() {
  return NextResponse.json({
    live: [
      { exchange: "kalshi", cash: 0, positions: [] },
      { exchange: "polymarket", cash: 0, positions: [] },
      { exchange: "gemini", cash: 0, positions: [] },
    ],
    paper: [
      { exchange: "kalshi", cash: 100000, positions: [] },
      { exchange: "polymarket", cash: 100000, positions: [] },
      { exchange: "gemini", cash: 100000, positions: [] },
    ],
    timestamp: new Date().toISOString(),
  });
}
