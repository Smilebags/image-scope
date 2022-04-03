import {
  createImageFromFile,
  renderImagePreviewCanvas,
  createScopePoints,
  renderScope,
  generateViewTransform,
} from './scope.js';

const scopeSize = 1024;
const samplingResolution = 256;

const worldScale = { x: 0.03, y: 0.03, z: 0.08 };
const scopeCenter = { x: 0, y: 0, z: 3 };

let t = 0;
const perspectiveStrength = 0;

const fileInput = document.getElementById('file-input');
const imagePreviewEl = document.getElementById('image-preview');

const resultEl = document.getElementById('result');
resultEl.width = scopeSize;
resultEl.height = scopeSize;

const imagePreviewCtx = imagePreviewEl.getContext('2d');
const resultCtx = resultEl.getContext('2d');

resultCtx.width = scopeSize;
resultCtx.height = scopeSize;

fileInput.addEventListener('change', async e => {
  fileInput.disabled = true;
  const file = e.target.files[0];
  await processNewFile(file, imagePreviewCtx, resultCtx);
  fileInput.disabled = false;
});

async function processNewFile(file, sourceCtx, scopeCtx) {
  const image = await createImageFromFile(file);
  renderImagePreviewCanvas(image, sourceCtx, samplingResolution);
  const previewImageData = sourceCtx.getImageData(0, 0, sourceCtx.width, sourceCtx.height);
  const points = createScopePoints(previewImageData);
  t = 0;
  while (t < 1) {
    const viewTransform = generateViewTransform(t, scopeCenter, worldScale, perspectiveStrength);
    await renderScope(points, scopeCtx, t, scopeSize, viewTransform);
    await sleep(1);
    t += 0.01;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
