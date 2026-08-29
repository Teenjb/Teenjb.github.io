import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../JS/function.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../CSS/Style.css', import.meta.url), 'utf8');
const robots = await readFile(new URL('../robots.txt', import.meta.url), 'utf8').catch(() => '');
const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8').catch(() => '');
const favicon = await readFile(new URL('../asset/Image/favicon.svg', import.meta.url), 'utf8').catch(() => '');

test('provides recruiter-focused search metadata and profile structured data', () => {
  assert.match(html, /<title>Fateen Najib Indramustika \| Software Engineer \| Cloud, Backend &amp; AI<\/title>/i);
  assert.match(html, /<meta name="description" content="[^\"]*software engineer[^\"]*cloud infrastructure[^\"]*backend systems[^\"]*AI engineering[^\"]*"\s*\/?\s*>/i);
  assert.match(html, /<meta name="author" content="Fateen Najib Indramustika"\s*\/?\s*>/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/teenjb\.me\/"\s*\/?\s*>/i);
  assert.match(html, /<meta property="og:type" content="website"\s*\/?\s*>/i);
  assert.match(html, /<meta property="og:url" content="https:\/\/teenjb\.me\/"\s*\/?\s*>/i);
  assert.match(html, /<meta property="og:image" content="https:\/\/teenjb\.me\/asset\/Image\/Profile\.jpeg"\s*\/?\s*>/i);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"\s*\/?\s*>/i);
  assert.match(html, /<h1>Software engineer building<br>cloud, backend, and AI systems\.<\/h1>/i);

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(jsonLdMatch, 'expected a JSON-LD script block');
  const structuredData = JSON.parse(jsonLdMatch[1]);
  const profilePage = structuredData['@graph'].find((item) => item['@type'] === 'ProfilePage');
  const person = structuredData['@graph'].find((item) => item['@type'] === 'Person');
  assert.equal(profilePage.url, 'https://teenjb.me/');
  assert.equal(profilePage.mainEntity['@id'], 'https://teenjb.me/#person');
  assert.equal(person['@id'], 'https://teenjb.me/#person');
  assert.equal(person.name, 'Fateen Najib Indramustika');
  assert.equal(person.jobTitle, 'Software Engineer');
  assert.deepEqual(person.sameAs, [
    'https://github.com/Teenjb',
    'https://www.linkedin.com/in/fateen-indramustika-109355175/',
    'https://medium.com/@fateennjb.i',
  ]);
});

test('allows crawling and publishes the homepage sitemap', () => {
  assert.match(robots, /^User-agent: \*\nAllow: \/\nSitemap: https:\/\/teenjb\.me\/sitemap\.xml\n?$/);
  assert.match(sitemap, /<loc>https:\/\/teenjb\.me\/<\/loc>/);
});

test('uses the FN monogram as the browser icon', () => {
  assert.match(html, /<link rel="icon" href="asset\/Image\/favicon\.svg" type="image\/svg\+xml">/i);
  assert.match(favicon, />FN<\/text>/i);
  assert.doesNotMatch(favicon, /<tspan|FN\./i);
  assert.match(favicon, /<text x="32"[^>]*text-anchor="middle"[^>]*font-family="Arial, Helvetica, sans-serif"/i);
});

test('provides the revised portfolio sections and résumé CTA', () => {
  for (const section of ['about', 'projects', 'experience', 'capabilities', 'writing', 'contact']) {
    assert.match(html, new RegExp(`<section[^>]+id="${section}"`, 'i'));
  }
  assert.doesNotMatch(html, /id="creative"/);
  assert.match(html, /asset\/PDF\/CV%20Fateen%20Najib%20Indramustika%20\(19%20Jul%202026\)\.pdf/);
  assert.match(html, /asset\/Image\/Profile\.jpeg/);
});

test('keeps the header visible while navigating the page', () => {
  assert.match(script, /siteHeader\.style\.position = 'sticky'/);
});

test('uses direct contact instead of an inactive form', () => {
  assert.doesNotMatch(html, /<form\b/i);
  assert.match(html, /href="mailto:[^"]+"/);
});

test('includes a stable Medium fallback and loads writing data', () => {
  assert.match(html, /https:\/\/medium\.com\/@fateennjb\.i/);
  assert.match(script, /data\/medium-posts\.json/);
});

test('provides restrained, accessible first-entrance motion', () => {
  assert.match(css, /--motion-ease:/);
  assert.match(css, /\.motion-ready\s+\.reveal/);
  assert.match(css, /\.reveal\.is-visible/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.motion-ready\s+\.reveal/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /observeReveals/);
  assert.match(script, /posts\.querySelectorAll\('\.post'\)/);
  assert.doesNotMatch(css, /\.about-grid img:hover\{[^}]*filter:/);
  assert.match(script, /const scrambleHeroTitle/);
  assert.match(script, /const scrambleAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'/);
  assert.match(script, /scrambleHeroTitle\(\)/);
  assert.match(script, /character === character\.toUpperCase\(\) \? scrambledCharacter : scrambledCharacter\.toLowerCase\(\)/);
  assert.match(css, /scroll-snap-type:y mandatory/);
  assert.match(css, /main > \.section\{scroll-snap-align:center/);
  assert.match(css, /@media\(prefers-reduced-motion:no-preference\)\{\s*html\{scroll-snap-type:y mandatory/);
});
