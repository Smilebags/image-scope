import {
  createImageFromFile,
  renderImagePreviewCanvas,
  createScopePoints,
  // renderScope,
  generateViewTransform,
} from './scope.js';
import { GLScopeViewer } from './webgl.js';


const scopeSize = 1024;
const samplingResolution = 512;

const worldScale = { x: 2.5, y: 2.5, z: 1 };
const scopeCenter = { x: 0.3127, y: 0.329, z: 0.4 };

const perspectiveStrength = 0.1;

const fileInput = document.getElementById('file-input');
const imagePreviewEl = document.getElementById('image-preview');

const resultEl = document.getElementById('result');
resultEl.width = scopeSize;
resultEl.height = scopeSize;

const imagePreviewCtx = imagePreviewEl.getContext('2d');

const resultCtx = resultEl.getContext('webgl2');
if (!resultCtx) {
  alert('Your browser does not support WebGL2');
}


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

  const viewer = new GLScopeViewer(scopeCtx);
  await viewer.setPoints(points);
  const startTime = Date.now();
  while (true) {
    const t = (Date.now() - startTime) / 1000 / 10;
    const viewTransform = generateViewTransform(t, scopeCenter, worldScale, perspectiveStrength);
    await viewer.renderScope(t, scopeSize, viewTransform);
    await sleep(1);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


