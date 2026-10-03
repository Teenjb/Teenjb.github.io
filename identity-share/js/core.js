const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'heic', 'heif', 'tif', 'tiff',
]);

export function classifyInput(file) {
  const name = String(file?.name ?? '').toLowerCase();
  const type = String(file?.type ?? '').toLowerCase();
  const extension = name.includes('.') ? name.split('.').pop() : '';

  if (type === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (type === 'image/svg+xml' || extension === 'svg') return null;
  if (IMAGE_EXTENSIONS.has(extension) || type.startsWith('image/')) return 'image';
  return null;
}

export function createWatermarkLabel(purpose, date = new Date()) {
  const cleanPurpose = String(purpose ?? '').trim();
  if (!cleanPurpose) throw new Error('Enter a purpose before creating your copy.');

  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);

  return `${cleanPurpose} • ${dateLabel}`;
}

export function normalizeOpacity(value) {
  const parsedValue = Number(value);
  const validValue = Number.isFinite(parsedValue) ? parsedValue : 0.14;
  return Math.min(0.32, Math.max(0.06, validValue));
}

export function shouldShowInstallButton(isStandalone) {
  return !isStandalone;
}

export async function destroyPdfLoadingTask(task) {
  if (typeof task?.destroy === 'function') await task.destroy();
}

export function toClampedRgba(pixels) {
  if (pixels instanceof Uint8ClampedArray) return pixels;
  if (pixels instanceof ArrayBuffer) return new Uint8ClampedArray(pixels);
  return new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength);
}
