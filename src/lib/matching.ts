import { Market, MatchedGroup, Opportunity, Exchange } from "@/types";

// ── Title Normalization ──

function normalize(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''""]/g, "")
    .replace(/\?/g, "")
    .replace(/\bwill\b/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/\bby\b/g, "")
    .replace(/\bbefore\b/g, "")
    .replace(/\babove\b/g, "")
    .replace(/\bexceeds?\b/g, "")
    .replace(/\bgreater\s+than\b/g, "")
    .replace(/\breaches?\b/g, "")
    .replace(/\bgets?\s+to\b/g, "")
    .replace(/\bhits?\b/g, "")
    .replace(/\bon\b/g, "")
    .replace(/\bat\b/g, "")
    .replace(/\bin\b/g, "")
    .replace(/\bof\b/g, "")
    .replace(/\ba\b/g, "")
    .replace(/\ban\b/g, "")
    .replace(/\bbe\b/g, "")
    .replace(/\bto\b/g, "")
    .replace(/\bend\b/g, "")
    .replace(/\beoy\b/g, "end year")
    .replace(/\bq[1-4]\b/g, (m) => m) // keep quarter refs
    .replace(/btc\/usd/g, "bitcoin")
    .replace(/\bbtc\b/g, "bitcoin")
    .replace(/\$(\d)/g, "$1") // remove $ before numbers
    .replace(/,/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract key terms for matching (numbers, proper nouns, etc.)
function extractKeyTerms(normalized: string): string[] {
  const terms = normalized.split(" ").filter((t) => t.length > 1);
  // Prioritize numbers (years, prices, percentages) and longer words
  return terms.sort((a, b) => {
    const aIsNum = /^\d+$/.test(a);
    const bIsNum = /^\d+$/.test(b);
    if (aIsNum && !bIsNum) return -1;
    if (!aIsNum && bIsNum) return 1;
    return b.length - a.length;
  });
}

// Calculate similarity score between two normalized titles
function similarity(a: string, b: string): number {
  const termsA = extractKeyTerms(a);
  const termsB = extractKeyTerms(b);
  if (termsA.length === 0 || termsB.length === 0) return 0;

  let matchCount = 0;
  let weightedMatch = 0;
  const totalWeight = termsA.length + termsB.length;

  for (const term of termsA) {
    if (termsB.includes(term)) {
      matchCount++;
      // Numbers/years are higher weight
      weightedMatch += /^\d+$/.test(term) ? 3 : 1;
    }
  }
  for (const term of termsB) {
    if (termsA.includes(term)) {
      weightedMatch += /^\d+$/.test(term) ? 3 : 1;
    }
  }

  // Jaccard-like similarity with weighting
  const setA = new Set(termsA);
  const setB = new Set(termsB);
  const union = new Set([...setA, ...setB]);
  const intersection = [...setA].filter((t) => setB.has(t));

  const jaccard = intersection.length / union.size;
  const weightedScore = weightedMatch / (totalWeight || 1);

  return jaccard * 0.6 + weightedScore * 0.4;
}

// ── Duplicate Detection ──

const MATCH_THRESHOLD = 0.45;

export function findMatchedGroups(markets: Market[]): MatchedGroup[] {
  const groups: MatchedGroup[] = [];
  const assigned = new Set<string>();

  // Pre-compute normalized titles
  const normalized = new Map<string, string>();
  for (const m of markets) {
    normalized.set(m.id, normalize(m.title));
  }

  // Compare markets across different exchanges
  for (let i = 0; i < markets.length; i++) {
    if (assigned.has(markets[i].id)) continue;

    const group: Market[] = [markets[i]];
    const baseNorm = normalized.get(markets[i].id)!;

    for (let j = i + 1; j < markets.length; j++) {
      if (assigned.has(markets[j].id)) continue;
      // Only match across different exchanges
      if (markets[j].exchange === markets[i].exchange) {
        // But check if same exchange markets in the group already cover this exchange
        if (group.some((g) => g.exchange === markets[j].exchange)) continue;
      }

      const candNorm = normalized.get(markets[j].id)!;
      const score = similarity(baseNorm, candNorm);

      if (score >= MATCH_THRESHOLD) {
        // Check the candidate against ALL markets already in the group
        const matchesAll = group.every(
          (g) => similarity(normalized.get(g.id)!, candNorm) >= MATCH_THRESHOLD
        );
        if (matchesAll) {
          group.push(markets[j]);
        }
      }
    }

    // Only create a group if we have markets from 2+ exchanges
    const exchanges = new Set(group.map((m) => m.exchange));
    if (exchanges.size >= 2) {
      for (const m of group) assigned.add(m.id);

      const avgConfidence =
        group.reduce((sum, m) => {
          const scores = group
            .filter((g) => g.id !== m.id)
            .map((g) =>
              similarity(normalized.get(m.id)!, normalized.get(g.id)!)
            );
          return sum + (scores.length > 0 ? Math.max(...scores) : 0);
        }, 0) / group.length;

      // Build a cleaner title from the shortest market title
      const sortedByLen = [...group].sort(
        (a, b) => a.title.length - b.title.length
      );
      const normalizedTitle = sortedByLen[0].title.replace(/\?$/, "").trim();

      groups.push({
        id: `match-${i}`,
        markets: group,
        confidence: Math.round(avgConfidence * 100) / 100,
        explanation: `${exchanges.size} exchanges have equivalent markets`,
        normalizedTitle,
        differences: describeDifferences(group),
      });
    }
  }

  return groups.sort((a, b) => b.confidence - a.confidence);
}

function describeDifferences(markets: Market[]): string[] {
  const diffs: string[] = [];

  // Price spread
  const yesPrices = markets.map((m) => m.yesPrice);
  const spread = Math.max(...yesPrices) - Math.min(...yesPrices);
  if (spread > 0.02) {
    diffs.push(`${(spread * 100).toFixed(1)}¢ price spread`);
  }

  // Volume difference
  const volumes = markets.map((m) => m.volume);
  const maxVol = Math.max(...volumes);
  const minVol = Math.min(...volumes);
  if (maxVol > 0 && minVol > 0 && maxVol / minVol > 3) {
    diffs.push("Significant volume difference");
  }

  // Date difference
  const dates = markets
    .map((m) => m.endDate)
    .filter(Boolean)
    .map((d) => new Date(d).getTime());
  if (dates.length >= 2) {
    const dateSpread = Math.max(...dates) - Math.min(...dates);
    if (dateSpread > 86400000 * 7) {
      diffs.push("Different expiry dates");
    }
  }

  if (diffs.length === 0) diffs.push("Minor wording differences only");

  return diffs;
}

// ── Exchange Fee Rates ──
// Trading fees per exchange (as decimal, e.g., 0.02 = 2%)
export const EXCHANGE_FEES: Record<Exchange, number> = {
  kalshi: 0.01,      // 1% per trade
  polymarket: 0.02,  // 2% per trade
  gemini: 0.015,     // 1.5% per trade
};

export function getExchangeFee(exchange: Exchange): number {
  return EXCHANGE_FEES[exchange];
}

// ── Arbitrage Detection ──

export function findOpportunities(groups: MatchedGroup[]): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const group of groups) {
    if (group.markets.length < 2) continue;

    // Find the cheapest YES and the most expensive YES
    const sorted = [...group.markets].sort(
      (a, b) => a.yesPrice - b.yesPrice
    );
    const cheapest = sorted[0];
    const mostExpensive = sorted[sorted.length - 1];

    const edge =
      Math.round((mostExpensive.yesPrice - cheapest.yesPrice) * 10000) / 100;

    const buyFee = EXCHANGE_FEES[cheapest.exchange];
    const sellFee = EXCHANGE_FEES[mostExpensive.exchange];
    const effectiveBuy = cheapest.yesPrice * (1 + buyFee);
    const effectiveSell = mostExpensive.yesPrice * (1 - sellFee);
    const edgeAfterFees =
      Math.round((effectiveSell - effectiveBuy) * 10000) / 100;

    if (edge >= 1.0) {
      opportunities.push({
        id: `opp-${group.id}`,
        matchGroupId: group.id,
        type: edge >= 4 ? "arbitrage" : "spread",
        edge,
        edgeAfterFees,
        buyExchange: cheapest.exchange,
        sellExchange: mostExpensive.exchange,
        buyPrice: cheapest.yesPrice,
        sellPrice: mostExpensive.yesPrice,
        buyMarketId: cheapest.id,
        sellMarketId: mostExpensive.id,
        buyFee,
        sellFee,
        marketTitle: group.normalizedTitle,
        executable: edgeAfterFees >= 1,
        timestamp: new Date().toISOString(),
      });
    }

    // Also check NO side
    const sortedNo = [...group.markets].sort(
      (a, b) => a.noPrice - b.noPrice
    );
    const cheapestNo = sortedNo[0];
    const expensiveNo = sortedNo[sortedNo.length - 1];
    const noEdge =
      Math.round((expensiveNo.noPrice - cheapestNo.noPrice) * 10000) / 100;

    const noBuyFee = EXCHANGE_FEES[cheapestNo.exchange];
    const noSellFee = EXCHANGE_FEES[expensiveNo.exchange];
    const noEffectiveBuy = cheapestNo.noPrice * (1 + noBuyFee);
    const noEffectiveSell = expensiveNo.noPrice * (1 - noSellFee);
    const noEdgeAfterFees =
      Math.round((noEffectiveSell - noEffectiveBuy) * 10000) / 100;

    if (noEdge >= 1.0 && cheapestNo.exchange !== cheapest.exchange) {
      opportunities.push({
        id: `opp-no-${group.id}`,
        matchGroupId: group.id,
        type: noEdge >= 4 ? "arbitrage" : "spread",
        edge: noEdge,
        edgeAfterFees: noEdgeAfterFees,
        buyExchange: cheapestNo.exchange,
        sellExchange: expensiveNo.exchange,
        buyPrice: cheapestNo.noPrice,
        sellPrice: expensiveNo.noPrice,
        buyMarketId: cheapestNo.id,
        sellMarketId: expensiveNo.id,
        buyFee: noBuyFee,
        sellFee: noSellFee,
        marketTitle: `${group.normalizedTitle} (NO)`,
        executable: noEdgeAfterFees >= 1,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return opportunities.sort((a, b) => b.edgeAfterFees - a.edgeAfterFees);
}
