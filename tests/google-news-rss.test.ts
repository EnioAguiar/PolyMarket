import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchGoogleNewsRss } from '../src/research/sources/google-news-rss.js';

// Real Google News RSS response captured 2026-09-22 via:
//   curl -s "https://news.google.com/rss/search?q=bitcoin&hl=en-US&gl=US&ceid=US:en"
// Trimmed to 2 items; tag shapes (title/link/pubDate/source url="...") preserved verbatim.
const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><generator>NFE/5.0</generator><title>"bitcoin" - Google News</title>
<item><title>Live updates: Bitcoin trades near $86,000 as U.S. stocks post small gains - CoinDesk</title><link>https://news.google.com/rss/articles/CBMi0wFBVV95cUxQWmF1NkswTVRERGNDRXRoVEdQeHRtb2ZndWZ3NXhBNlJ5WHpreTNoTkFLYlFxclZXRUxuUGttVHpiX0JRRThuVEpzMkN5Wmdmb194SFV4MG9CMDdHUHFBbjRpOENBX1hoTzBxNFA2SFdnYy1ubEZPWmtwZUltaU9hc0NsZTBGWHotOGFNU0FpbzRtSDEtSkRKNEJyU1k5RGItd3ZFV3hXYzdFMlJTWUZnaHpwVVJaVThNTWptd3FPQUV6WXZ6SU5iek9CWWxuUjVZS0RR?oc=5</link><guid isPermaLink="false">CBMi0wFBVV95cUxQWmF1NkswTVRERGNDRXRoVEdQeHRtb2ZndWZ3NXhBNlJ5WHpreTNoTkFLYlFxclZXRUxuUGttVHpiX0JRRThuVEpzMkN5Wmdmb194SFV4MG9CMDdHUHFBbjRpOENBX1hoTzBxNFA2SFdnYy1ubEZPWmtwZUltaU9hc0NsZTBGWHotOGFNU0FpbzRtSDEtSkRKNEJyU1k5RGItd3ZFV3hXYzdFMlJTWUZnaHpwVVJaVThNTWptd3FPQUV6WXZ6SU5iek9CWWxuUjVZS0RR</guid><pubDate>Tue, 22 Sep 2026 14:35:00 GMT</pubDate><description>&lt;a href="https://news.google.com/rss/articles/CBMi0wFBVV95cUxQWmF1NkswTVRERGNDRXRoVEdQeHRtb2ZndWZ3NXhBNlJ5WHpreTNoTkFLYlFxclZXRUxuUGttVHpiX0JRRThuVEpzMkN5Wmdmb194SFV4MG9CMDdHUHFBbjRpOENBX1hoTzBxNFA2SFdnYy1ubEZPWmtwZUltaU9hc0NsZTBGWHotOGFNU0FpbzRtSDEtSkRKNEJyU1k5RGItd3ZFV3hXYzdFMlJTWUZnaHpwVVJaVThNTWptd3FPQUV6WXZ6SU5iek9CWWxuUjVZS0RR?oc=5" target="_blank"&gt;Live updates: Bitcoin trades near $86,000 as U.S. stocks post small gains&lt;/a&gt;&amp;nbsp;&amp;nbsp;CoinDesk</description><source url="https://www.coindesk.com">CoinDesk</source></item>
<item><title>Bitcoin hits highest level since January at $86,000, as the market debates whether the 'crypto winter' is over - CNBC</title><link>https://news.google.com/rss/articles/CBMicEFVX3lxTFB1ZmdGWG5ublkyVnNGaHplY002MVBfV1g0a1Fpckd0N2lRM0RsSWk4R0R1cjQtVXd5T2dhRERVdFc1MVctWndZWTQ5TTY3dlhwOHNVTXVrNnh4SmkyVjRodWQySmF6Zzd5SkdNdHNSY2c</link><guid isPermaLink="false">CBMicEFVX3lxTFB1ZmdGWG5ublkyVnNGaHplY002MVBfV1g0a1Fpckd0N2lRM0RsSWk4R0R1cjQtVXd5T2dhRERVdFc1MVctWndZWTQ5TTY3dlhwOHNVTXVrNnh4SmkyVjRodWQySmF6Zzd5SkdNdHNSY2c</guid><pubDate>Tue, 22 Sep 2026 13:10:00 GMT</pubDate><description>bitcoin market update</description><source url="https://www.cnbc.com">CNBC</source></item>
</channel></rss>`;

// Fixture spanning a date boundary, for the leakage-prevention test: one
// item published before the cutoff, one on/after it.
const DATED_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>"example market" - Google News</title>
<item>
<title>Pre-resolution speculation piece - Example News</title>
<link>https://example.com/before</link>
<pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate>
<source url="https://example.com">Example News</source>
</item>
<item>
<title>Market resolved, here is what happened - Example News</title>
<link>https://example.com/after</link>
<pubDate>Mon, 15 Sep 2026 10:00:00 GMT</pubDate>
<source url="https://example.com">Example News</source>
</item>
</channel>
</rss>`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('searchGoogleNewsRss', () => {
  it('parses real RSS item fields into NewsArticle objects', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_RSS,
    } as Response);

    const articles = await searchGoogleNewsRss('bitcoin');

    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({
      title: 'Live updates: Bitcoin trades near $86,000 as U.S. stocks post small gains - CoinDesk',
      link: 'https://news.google.com/rss/articles/CBMi0wFBVV95cUxQWmF1NkswTVRERGNDRXRoVEdQeHRtb2ZndWZ3NXhBNlJ5WHpreTNoTkFLYlFxclZXRUxuUGttVHpiX0JRRThuVEpzMkN5Wmdmb194SFV4MG9CMDdHUHFBbjRpOENBX1hoTzBxNFA2SFdnYy1ubEZPWmtwZUltaU9hc0NsZTBGWHotOGFNU0FpbzRtSDEtSkRKNEJyU1k5RGItd3ZFV3hXYzdFMlJTWUZnaHpwVVJaVThNTWptd3FPQUV6WXZ6SU5iek9CWWxuUjVZS0RR?oc=5',
      pubDate: 'Tue, 22 Sep 2026 14:35:00 GMT',
      source: 'CoinDesk',
    });
  });

  it('respects maxResults', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_RSS,
    } as Response);

    const articles = await searchGoogleNewsRss('bitcoin', { maxResults: 1 });
    expect(articles).toHaveLength(1);
  });

  it('throws on a non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(searchGoogleNewsRss('bitcoin')).rejects.toThrow('429');
  });

  it('appends a before: operator to the query when opts.before is set', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => DATED_RSS,
    } as Response);

    await searchGoogleNewsRss('example market', { before: new Date('2026-09-10T00:00:00Z') });

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(calledUrl)).toContain('before:2026-09-10');
  });

  it('drops items whose pubDate is on/after the before cutoff (leakage prevention)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => DATED_RSS,
    } as Response);

    const articles = await searchGoogleNewsRss('example market', {
      before: new Date('2026-09-10T00:00:00Z'),
    });

    expect(articles).toHaveLength(1);
    expect(articles[0].link).toBe('https://example.com/before');
  });
});
