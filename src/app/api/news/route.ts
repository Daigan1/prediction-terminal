import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type NewsArticle = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  snippet: string;
};

/** Extract 3-5 word search queries from market titles */
function extractSearchTerms(titles: string[]): string[] {
  const stopWords = new Set([
    "will", "the", "be", "to", "in", "of", "a", "an", "by", "on", "at",
    "for", "or", "and", "is", "it", "this", "that", "with", "from", "as",
    "before", "after", "above", "below", "between", "during", "than",
    "yes", "no", "end", "price", "market",
  ]);

  const seen = new Set<string>();
  const terms: string[] = [];

  for (const title of titles) {
    // Strip dates, percentages, question marks
    const cleaned = title
      .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, "")
      .replace(/\b\d+(\.\d+)?%/g, "")
      .replace(/[?!]/g, "")
      .trim();

    const words = cleaned
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()))
      .slice(0, 5);

    if (words.length < 2) continue;

    const key = words.map((w) => w.toLowerCase()).join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(words.join(" "));
  }

  return terms.slice(0, 8); // Max 8 search queries
}

/** Parse Google News RSS XML into articles */
function parseRSS(xml: string, query: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim() ?? "";
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim() ?? "";
    const descriptionRaw = block.match(/<description>([\s\S]*?)<\/description>/)?.[1]
      ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
      ?.trim() ?? "";
    // Decode entities first so &lt;a&gt; becomes <a>, then strip all HTML tags
    const description = decodeHTMLEntities(descriptionRaw).replace(/<[^>]+>/g, "").trim();

    // Decode entities then strip HTML tags (Google News uses &lt;a&gt; in some fields)
    const cleanTitle = decodeHTMLEntities(title).replace(/<[^>]+>/g, "").trim();

    if (cleanTitle && link) {
      items.push({
        id: `news-${Buffer.from(cleanTitle).toString("base64url").slice(0, 24)}-${items.length}`,
        title: cleanTitle,
        source: source || extractDomain(link),
        url: link,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        snippet: description.slice(0, 200),
      });
    }
  }

  return items;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const markets: { id: string; title: string; exchange: string }[] = body.markets || [];

    if (markets.length === 0) {
      return NextResponse.json({ news: [], reason: "no markets provided" });
    }

    const titles = markets.map((m) => m.title);
    const searchTerms = extractSearchTerms(titles);

    if (searchTerms.length === 0) {
      return NextResponse.json({ news: [], reason: "could not extract search terms" });
    }

    // Fetch Google News RSS in parallel for each search term
    const allArticles: NewsArticle[] = [];
    const seen = new Set<string>();

    const results = await Promise.allSettled(
      searchTerms.map(async (term) => {
        const encoded = encodeURIComponent(term);
        const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRSS(xml, term);
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const article of result.value) {
          // Dedupe by title similarity
          const key = article.title.toLowerCase().slice(0, 60);
          if (!seen.has(key)) {
            seen.add(key);
            allArticles.push(article);
          }
        }
      }
    }

    // Sort by date descending, take top 30
    allArticles.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    const news = allArticles.slice(0, 30);

    // Link articles back to markets by keyword matching
    const enrichedNews = news.map((article) => {
      const titleLower = article.title.toLowerCase();
      const relatedMarkets = markets
        .filter((m) => {
          const words = m.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
          const matchCount = words.filter((w) => titleLower.includes(w)).length;
          return matchCount >= 2;
        })
        .slice(0, 3)
        .map((m) => ({ id: m.id, title: m.title, exchange: m.exchange }));

      return { ...article, relatedMarkets };
    });

    return NextResponse.json({ news: enrichedNews, count: enrichedNews.length });
  } catch (error) {
    console.error("[news] route error:", error);
    return NextResponse.json({ news: [], error: "Failed to fetch news" }, { status: 500 });
  }
}
