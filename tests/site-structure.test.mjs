import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../JS/function.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../CSS/Style.css', import.meta.url), 'utf8');

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
