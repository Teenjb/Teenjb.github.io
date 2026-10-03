import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyInput, createWatermarkLabel, destroyPdfLoadingTask, normalizeOpacity, shouldShowInstallButton, toClampedRgba } from '../identity-share/js/core.js';

test('classifies supported photo formats from their extension when MIME is missing', () => {
  for (const name of ['front.JPG', 'scan.png', 'photo.webp', 'photo.gif', 'photo.bmp', 'photo.avif', 'photo.heic', 'photo.heif', 'scan.tif', 'scan.tiff']) {
    assert.equal(classifyInput({ name, type: '' }), 'image', name);
  }
});

test('classifies scanned PDFs from either MIME type or extension', () => {
  assert.equal(classifyInput({ name: 'scan.pdf', type: 'application/octet-stream' }), 'pdf');
  assert.equal(classifyInput({ name: 'scan', type: 'application/pdf' }), 'pdf');
});

test('rejects unsupported input files', () => {
  assert.equal(classifyInput({ name: 'notes.txt', type: 'text/plain' }), null);
  assert.equal(classifyInput({ name: 'archive.zip', type: 'application/zip' }), null);
});

test('creates a purpose and local-date watermark label', () => {
  assert.equal(
    createWatermarkLabel('  Rental application  ', new Date(2026, 9, 3, 12)),
    'Rental application • 3 Oct 2026',
  );
});

test('requires a non-empty purpose for a watermark label', () => {
  assert.throws(() => createWatermarkLabel('   ', new Date(2026, 9, 3)), /Enter a purpose/);
});

test('keeps watermark opacity in the readable range', () => {
  assert.equal(normalizeOpacity(0.14), 0.14);
  assert.equal(normalizeOpacity(0), 0.06);
  assert.equal(normalizeOpacity(1), 0.32);
  assert.equal(normalizeOpacity(Number.NaN), 0.14);
});

test('releases PDF.js through its loading task lifecycle', async () => {
  let destroyCalls = 0;
  const loadingTask = {
    promise: Promise.resolve({ getPage() {} }),
    destroy() { destroyCalls += 1; },
  };

  await destroyPdfLoadingTask(loadingTask);

  assert.equal(destroyCalls, 1);
});

test('converts decoder bytes to the pixel type required by canvas ImageData', () => {
  const pixels = toClampedRgba(new Uint8Array([0, 127, 255, 64]));

  assert.ok(pixels instanceof Uint8ClampedArray);
  assert.deepEqual([...pixels], [0, 127, 255, 64]);
});

test('offers install help in browser tabs and hides it in standalone app mode', () => {
  assert.equal(shouldShowInstallButton(false), true);
  assert.equal(shouldShowInstallButton(true), false);
});
