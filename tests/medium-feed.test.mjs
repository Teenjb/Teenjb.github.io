import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMediumFeed } from '../scripts/fetch-medium-feed.mjs';

const feed = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title><![CDATA[Building a safer home network]]></title>
    <link>https://medium.com/@fateennjb.i/home-network</link>
    <pubDate>Thu, 25 May 2023 07:04:24 GMT</pubDate>
    <category><![CDATA[security]]></category>
    <category><![CDATA[networking]]></category>
    <description><![CDATA[<p>A practical guide to improving home network safety.</p>]]></description>
  </item>
</channel></rss>`;

test('parses Medium feed items into safe portfolio article data', () => {
  assert.deepEqual(parseMediumFeed(feed), [{
    title: 'Building a safer home network',
    url: 'https://medium.com/@fateennjb.i/home-network',
    publishedAt: '2023-05-25T07:04:24.000Z',
    categories: ['security', 'networking'],
    excerpt: 'A practical guide to improving home network safety.',
  }]);
});

test('returns no articles when a Medium feed has no items', () => {
  assert.deepEqual(parseMediumFeed('<rss><channel><title>Empty</title></channel></rss>'), []);
});

test('rejects a feed item that does not provide a safe article URL', () => {
  assert.throws(
    () => parseMediumFeed('<rss><channel><item><title>Unsafe</title><link>javascript:alert(1)</link></item></channel></rss>'),
    /safe URL/,
  );
});
