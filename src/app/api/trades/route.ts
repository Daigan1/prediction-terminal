import { NextResponse } from "next/server";

// Trades are managed client-side in the Zustand store.
// This route exists for future server-side persistence.

export async function GET() {
  return NextResponse.json({
    trades: [],
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const trade = {
    id: `trade-${Date.now()}`,
    ...body,
    status: body.type === "paper" ? "filled" : "pending",
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({ trade, success: true });
}
