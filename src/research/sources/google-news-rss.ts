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
    const cutoff = opts.before;
    articles = articles.filter((a) => {
      const pubDate = new Date(a.pubDate);
      return Number.isNaN(pubDate.getTime()) ? true : pubDate < cutoff;
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
