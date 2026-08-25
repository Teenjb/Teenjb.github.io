import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const profileUrl = 'https://medium.com/@fateennjb.i';
const feedUrl = `${profileUrl}/feed`;
const outputPath = resolve('data/medium-posts.json');

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(value = '') {
  return decodeEntities(value
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? cleanText(match[1]) : '';
}

function categoryValues(xml) {
  return [...xml.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'medium.com' || url.hostname.endsWith('.medium.com'))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function parseMediumFeed(xml) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, 6).map((match) => {
    const item = match[1];
    const title = tagValue(item, 'title');
    const url = safeUrl(tagValue(item, 'link'));

    if (!url) throw new Error('Medium feed item must provide a safe URL');
    if (!title) throw new Error('Medium feed item must provide a title');

    const publishedAt = new Date(tagValue(item, 'pubDate')).toISOString();

    return {
      title,
      url,
      publishedAt,
      categories: categoryValues(item),
      excerpt: tagValue(item, 'description').slice(0, 220),
    };
  });
}

export async function refreshMediumPosts({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(feedUrl, { headers: { Accept: 'application/rss+xml, application/xml, text/xml' } });
  if (!response.ok) throw new Error(`Medium feed request failed with ${response.status}`);

  const articles = parseMediumFeed(await response.text());
  const payload = { profileUrl, updatedAt: new Date().toISOString(), articles };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  refreshMediumPosts().then(
    ({ articles }) => console.log(`Wrote ${articles.length} Medium articles to ${outputPath}`),
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}
