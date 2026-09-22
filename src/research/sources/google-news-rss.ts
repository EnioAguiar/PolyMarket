export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export interface SearchOptions {
  maxResults?: number;
  before?: Date; // exclude articles published on/after this date
}

// CONFIRMED LEAKAGE LIMITATION (2026-09-22, live run 4 of the sub-project 4
// validation): `before` only prevents leakage when the market's resolveDate
// is genuinely close to the real-world moment the outcome became known --
// true for an hourly crypto price-threshold check (resolveDate IS the
// instant of resolution), false for most administratively-resolved event
// markets. Real example: this filter worked exactly as designed and still
// let the answer through, because the cutoff itself was wrong, not the
// filtering -- "Will Kamala
// Harris win the 2024 Democratic Presidential Nomination?" (resolveDate
// 2024-08-19) was judged on the real, correctly-pre-cutoff-dated headline
// "It's official: Kamala Harris becomes Democrats' 2024 presidential
// nominee" -- the real-world nomination event (virtual roll call, early
// August) had already happened and been reported *before* Polymarket's
// own resolveDate, which reflects the contract's administrative close, not
// the moment of real-world certainty. No date-filtering fix inside this
// function can close that gap -- the input `before` timestamp itself is
// the wrong proxy for "when this event's outcome became knowable" on
// slow/administratively-resolved markets. Any caller backtesting against
// this kind of market needs a cutoff meaningfully earlier than
// resolveDate (with margin sized per market type), not resolveDate itself.
export async function searchGoogleNewsRss(query: string, opts: SearchOptions = {}): Promise<NewsArticle[]> {
  const maxResults = opts.maxResults ?? 10;
  let searchQuery = query;
  if (opts.before) {
    searchQuery += ` before:${opts.before.toISOString().split('T')[0]}`;
  }
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google News RSS error: ${response.status}`);
  }
  const xml = await response.text();
  let articles = parseRssItems(xml);
  if (opts.before) {
    // Defensive second layer: Google's before: operator is a query hint,
    // not something this project controls or can fully trust server-side.
    // Fail CLOSED: an item whose pubDate can't be verified as pre-cutoff
    // must be dropped, not kept — this guard exists to prevent post-
    // resolution news from leaking into a pre-resolution backtest.
    const cutoff = opts.before;
    articles = articles.filter((a) => {
      const pubDate = new Date(a.pubDate);
      return Number.isNaN(pubDate.getTime()) ? false : pubDate < cutoff;
    });
  }
  return articles.slice(0, maxResults);
}

function parseRssItems(xml: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const block of itemBlocks) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const source = extractSourceTag(block);
    if (title && link) {
      items.push({ title, link, pubDate: pubDate || '', source: source || '' });
    }
  }

  return items;
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return null;
  return decodeXmlEntities(match[1].trim());
}

function extractSourceTag(block: string): string | null {
  const match = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
  if (!match) return null;
  return decodeXmlEntities(match[1].trim());
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
