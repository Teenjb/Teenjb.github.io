import * as pdfjsLib from '../vendor/pdfjs/pdf.mjs';
import { classifyInput, createWatermarkLabel, destroyPdfLoadingTask, normalizeOpacity, shouldShowInstallButton, toClampedRgba } from './core.js';

const MAX_FILE_BYTES = 70 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 45_000_000;
const MAX_PDF_PIXELS = 30_000_000;
const PDF_WORKER_URL = new URL('../vendor/pdfjs/pdf.worker.mjs', import.meta.url);
const CMAP_URL = new URL('../vendor/pdfjs/cmaps/', import.meta.url).href;
const STANDARD_FONTS_URL = new URL('../vendor/pdfjs/standard_fonts/', import.meta.url).href;
const ICC_URL = new URL('../vendor/pdfjs/iccs/', import.meta.url).href;
const WASM_URL = new URL('../vendor/pdfjs/wasm/', import.meta.url).href;

pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL.href;

const elements = {
  dropZone: document.querySelector('#drop-zone'),
  fileInput: document.querySelector('#file-input'),
  documentControls: document.querySelector('#document-controls'),
  fileName: document.querySelector('#file-name'),
  fileDetail: document.querySelector('#file-detail'),
  fileBadge: document.querySelector('#file-badge'),
  clearButton: document.querySelector('#clear-button'),
  purpose: document.querySelector('#purpose'),
  opacity: document.querySelector('#opacity'),
  opacityValue: document.querySelector('#opacity-value'),
  downloadButton: document.querySelector('#download-button'),
  pdfPageControl: document.querySelector('#pdf-page-control'),
  pdfPage: document.querySelector('#pdf-page'),
  pdfPageCount: document.querySelector('#pdf-page-count'),
  previewStage: document.querySelector('#preview-stage'),
  previewEmpty: document.querySelector('#preview-empty'),
  previewCanvas: document.querySelector('#preview-canvas'),
  previewLoading: document.querySelector('#preview-loading'),
  previewStatus: document.querySelector('#preview-status'),
  statusMessage: document.querySelector('#status-message'),
  installButton: document.querySelector('#install-button'),
  installDialog: document.querySelector('#install-dialog'),
};

let currentFile = null;
let currentSource = null;
let sourceCleanup = null;
let currentPdf = null;
let currentPdfTask = null;
let currentPdfPage = 1;
let renderTask = null;
let installPrompt = null;

const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
elements.installButton.hidden = !shouldShowInstallButton(isStandalone);

function setStatus(message = '') {
  elements.statusMessage.textContent = message;
}

function setPreviewStatus(message) {
  elements.previewStatus.lastChild.textContent = ` ${message}`;
}

function setLoading(isLoading) {
  elements.previewLoading.hidden = !isLoading;
  elements.previewEmpty.hidden = isLoading || Boolean(currentSource);
  elements.previewCanvas.hidden = isLoading || !currentSource;
  elements.downloadButton.disabled = isLoading || !currentSource || !elements.purpose.value.trim();
}

function getFileSizeLabel(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSafeBaseName(name) {
  return name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 45) || 'document';
}

function showSource(source, detail) {
  currentSource = source;
  elements.fileDetail.textContent = detail;
  elements.previewEmpty.hidden = true;
  elements.previewCanvas.hidden = false;
  elements.previewStatus.lastChild.textContent = ' Preview ready';
  setStatus('');
  renderPreview();
}

function drawWatermark(context, width, height, label) {
  const fontSize = Math.max(12, Math.min(62, width / 33));
  const lineHeight = fontSize * 3.25;
  const radius = Math.hypot(width, height);

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(-Math.PI / 7.5);
  context.font = `650 ${fontSize}px "Arial", "Helvetica Neue", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = Math.max(1, fontSize * 0.055);
  context.strokeStyle = 'rgba(255, 255, 255, .78)';
  context.fillStyle = 'rgba(13, 31, 41, .88)';
  context.globalAlpha = normalizeOpacity(Number(elements.opacity.value) / 100);

  const textWidth = context.measureText(label).width + fontSize * 3.1;
  for (let y = -radius; y <= radius; y += lineHeight) {
    for (let x = -radius; x <= radius; x += textWidth) {
      context.strokeText(label, x, y);
      context.fillText(label, x, y);
    }
  }
  context.restore();
}

function renderPreview() {
  elements.previewLoading.hidden = true;
  if (!currentSource) {
    setLoading(false);
    return;
  }

  const width = currentSource.width;
  const height = currentSource.height;
  const canvas = elements.previewCanvas;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(currentSource, 0, 0, width, height);

  const purpose = elements.purpose.value.trim();
  if (purpose) {
    drawWatermark(context, width, height, createWatermarkLabel(purpose));
  }

  elements.previewEmpty.hidden = true;
  canvas.hidden = false;
  elements.downloadButton.disabled = !purpose;
  elements.previewStatus.lastChild.textContent = purpose ? ' Preview ready' : ' Add a purpose to continue';
}

function clearCurrentDocument({ clearPurpose = true } = {}) {
  if (renderTask) {
    try { renderTask.cancel(); } catch { /* The page may have completed before cancellation. */ }
    renderTask = null;
  }
  currentPdf = null;
  if (currentPdfTask) {
    destroyPdfLoadingTask(currentPdfTask).catch(() => {});
    currentPdfTask = null;
  }
  sourceCleanup?.();
  sourceCleanup = null;
  currentFile = null;
  currentSource = null;
  currentPdfPage = 1;
  elements.fileInput.value = '';
  elements.documentControls.hidden = true;
  elements.pdfPageControl.hidden = true;
  elements.fileName.textContent = 'Document';
  elements.fileDetail.textContent = 'Ready to mark';
  elements.fileBadge.textContent = 'IMG';
  elements.previewCanvas.width = 1;
  elements.previewCanvas.height = 1;
  elements.previewCanvas.hidden = true;
  elements.previewEmpty.hidden = false;
  elements.previewLoading.hidden = true;
  elements.downloadButton.disabled = true;
  elements.previewStatus.lastChild.textContent = ' Waiting for a photo';
  if (clearPurpose) elements.purpose.value = '';
  setStatus('');
}

function ensureLocalScript(path, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(path, import.meta.url).href;
    script.onload = () => window[globalName] ? resolve(window[globalName]) : reject(new Error('A local image decoder could not be started.'));
    script.onerror = () => reject(new Error('A local image decoder could not be loaded.'));
    document.head.append(script);
  });
}

async function decodeTiff(file) {
  const pako = await ensureLocalScript('../vendor/tiff/pako.min.js', 'pako');
  const UTIF = await ensureLocalScript('../vendor/tiff/UTIF.js', 'UTIF');
  window.pako = pako;
  const data = new Uint8Array(await file.arrayBuffer());
  const pages = UTIF.decode(data.buffer);
  if (!pages.length) throw new Error('No image page was found in this TIFF file.');
  const page = pages[0];
  UTIF.decodeImage(data.buffer, page);
  const pixels = UTIF.toRGBA8(page);
  const canvas = document.createElement('canvas');
  canvas.width = page.width;
  canvas.height = page.height;
  const context = canvas.getContext('2d', { willReadFrequently: false });
  context.putImageData(new ImageData(toClampedRgba(pixels), page.width, page.height), 0, 0);
  return canvas;
}

async function decodeImageFile(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  let imageBlob = file;

  if (extension === 'heic' || extension === 'heif' || /image\/hei[cf]/i.test(file.type)) {
    const convertHeic = await ensureLocalScript('../vendor/heic/heic2any.min.js', 'heic2any');
    const converted = await convertHeic({ blob: file, toType: 'image/png' });
    imageBlob = Array.isArray(converted) ? converted[0] : converted;
  } else if (extension === 'tif' || extension === 'tiff' || /image\/tiff/i.test(file.type)) {
    return decodeTiff(file);
  }

  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(imageBlob, { imageOrientation: 'from-image' });
      sourceCleanup = () => bitmap.close?.();
      return bitmap;
    } catch {
      // Some browsers can display a format in <img> that createImageBitmap cannot decode.
    }
  }

  const objectUrl = URL.createObjectURL(imageBlob);
  const image = new Image();
  image.src = objectUrl;
  try {
    await image.decode();
    sourceCleanup = () => URL.revokeObjectURL(objectUrl);
    return image;
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function loadPdf(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjsLib.getDocument({
    data,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    iccUrl: ICC_URL,
    standardFontDataUrl: STANDARD_FONTS_URL,
    wasmUrl: WASM_URL,
  });
  currentPdfTask = task;
  currentPdf = await task.promise;
  elements.pdfPage.max = String(currentPdf.numPages);
  elements.pdfPage.value = '1';
  elements.pdfPageCount.textContent = `of ${currentPdf.numPages}`;
  elements.pdfPageControl.hidden = false;
  await renderPdfPage(1);
}

async function renderPdfPage(pageNumber) {
  if (!currentPdf) return;
  if (renderTask) {
    try { renderTask.cancel(); } catch { /* Ignore a completed page. */ }
  }

  currentPdfPage = Math.min(currentPdf.numPages, Math.max(1, Number(pageNumber) || 1));
  elements.pdfPage.value = String(currentPdfPage);
  currentSource = null;
  setLoading(true);
  setPreviewStatus(`Rendering page ${currentPdfPage}`);

  try {
    const page = await currentPdf.getPage(currentPdfPage);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1.6, Math.sqrt(MAX_PDF_PIXELS / (baseViewport.width * baseViewport.height)));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    renderTask = page.render({ canvas, canvasContext: context, viewport });
    await renderTask.promise;
    renderTask = null;
    currentSource = canvas;
    elements.fileDetail.textContent = `PDF · page ${currentPdfPage} of ${currentPdf.numPages}`;
    renderPreview();
  } catch (error) {
    renderTask = null;
    if (error?.name !== 'RenderingCancelledException') {
      currentSource = null;
      setLoading(false);
      setStatus('This PDF page could not be rendered. Try another page or a photo instead.');
    }
  }
}

async function processFile(file) {
  clearCurrentDocument();
  if (!file) return;
  const kind = classifyInput(file);
  if (!kind) {
    setStatus('Choose a supported photo or PDF file. SVG and other document types are not accepted.');
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    setStatus('This file is larger than 70 MB. Please choose a smaller file.');
    return;
  }

  currentFile = file;
  elements.documentControls.hidden = false;
  elements.fileName.textContent = file.name;
  elements.fileDetail.textContent = `Loading · ${getFileSizeLabel(file.size)}`;
  elements.fileBadge.textContent = kind === 'pdf' ? 'PDF' : (file.name.split('.').pop() || 'IMG').slice(0, 4).toUpperCase();
  elements.pdfPageControl.hidden = true;
  elements.previewEmpty.hidden = true;
  elements.previewLoading.hidden = false;
  elements.previewCanvas.hidden = true;
  elements.previewStatus.lastChild.textContent = ' Reading file';
  setStatus('');

  try {
    if (kind === 'pdf') {
      await loadPdf(file);
    } else {
      const source = await decodeImageFile(file);
      if (source.width * source.height > MAX_IMAGE_PIXELS) {
        sourceCleanup?.();
        sourceCleanup = null;
        throw new Error('This image is too large for safe processing on this device. Try a smaller copy.');
      }
      showSource(source, `${file.name.split('.').pop().toUpperCase()} · ${getFileSizeLabel(file.size)}`);
    }
  } catch (error) {
    currentSource = null;
    elements.previewLoading.hidden = true;
    elements.previewEmpty.hidden = false;
    elements.previewCanvas.hidden = true;
    elements.downloadButton.disabled = true;
    elements.previewStatus.lastChild.textContent = ' Unable to read file';
    setStatus(error?.message || 'This file could not be opened. Try a different photo or PDF.');
  }
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Your browser could not create the downloaded image.')), type, 0.94);
  });
}

async function downloadCopy() {
  if (!currentSource || !currentFile) return;
  const purpose = elements.purpose.value.trim();
  if (!purpose) {
    setStatus('Enter a purpose to continue.');
    elements.purpose.focus();
    return;
  }

  elements.downloadButton.disabled = true;
  setStatus('Creating your copy on this device…');
  try {
    const output = document.createElement('canvas');
    output.width = currentSource.width;
    output.height = currentSource.height;
    const context = output.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(currentSource, 0, 0, output.width, output.height);
    drawWatermark(context, output.width, output.height, createWatermarkLabel(purpose));

    const type = document.querySelector('input[name="format"]:checked').value;
    const blob = await canvasToBlob(output, type);
    const extension = type === 'image/png' ? 'png' : 'jpg';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getSafeBaseName(currentFile.name)}-share-copy.${extension}`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setStatus('Your watermarked copy is ready. It was created on this device.');
  } catch (error) {
    setStatus(error?.message || 'The copy could not be created. Try a smaller image or another format.');
  } finally {
    elements.downloadButton.disabled = !currentSource || !elements.purpose.value.trim();
  }
}

elements.dropZone.addEventListener('click', (event) => {
  if (event.target !== elements.fileInput) elements.fileInput.click();
});
elements.dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.fileInput.addEventListener('change', () => processFile(elements.fileInput.files?.[0]));
elements.clearButton.addEventListener('click', () => clearCurrentDocument());
elements.purpose.addEventListener('input', () => {
  renderPreview();
  setStatus('');
});
elements.opacity.addEventListener('input', () => {
  elements.opacityValue.value = `${elements.opacity.value}%`;
  elements.opacityValue.textContent = `${elements.opacity.value}%`;
  renderPreview();
});
elements.downloadButton.addEventListener('click', downloadCopy);
elements.pdfPage.addEventListener('change', () => renderPdfPage(elements.pdfPage.value));

for (const eventName of ['dragenter', 'dragover']) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add('is-dragging');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove('is-dragging');
  });
}
elements.dropZone.addEventListener('drop', (event) => processFile(event.dataTransfer?.files?.[0]));

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  elements.installButton.hidden = false;
});
elements.installButton.addEventListener('click', async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
  } else if (typeof elements.installDialog.showModal === 'function') {
    elements.installDialog.showModal();
  }
});
window.addEventListener('appinstalled', () => { elements.installButton.hidden = true; });

window.addEventListener('pagehide', () => clearCurrentDocument());

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}
