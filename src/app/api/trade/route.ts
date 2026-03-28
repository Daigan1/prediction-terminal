import { NextResponse } from "next/server";
import { placeOrder, extractSymbol } from "@/lib/adapters/trading";
import type { OrderRequest, TradingMode } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { marketId, exchange, side, outcome, quantity, price, apiKeys, tradingMode } = body;

    if (!marketId || !exchange || !side || !outcome || !quantity || !price) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!apiKeys) {
      return NextResponse.json(
        { success: false, error: "API keys required for live trading" },
        { status: 401 }
      );
    }

    const order: OrderRequest = {
      exchange,
      symbol: extractSymbol(marketId),
      side,
      outcome,
      quantity,
      price,
    };

    const mode: TradingMode = tradingMode === "sandbox" ? "sandbox" : "live";
    const result = await placeOrder(order, apiKeys, mode);

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (err) {
    console.error("[trade] order failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Order execution failed",
      },
      { status: 500 }
    );
  }
}
