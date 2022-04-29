import {
  createImageFromFile,
  renderImagePreviewCanvas,
  createScopePoints,
  generateViewTransform,
} from './scope.js';
import { GLScopeViewer } from './webgl.js';


const scopeSize = 1600;
const samplingResolution = 1024;

const mouse = {
  x: 0,
  y: 0,
};

const worldScale = { x: 0.02, y: 0.02, z: 0.1 }; // or LAB
const scopeCenter = { x: 0, y: 0, z: 5 }; // for LAB
// const worldScale = { x: 2.5, y: 2.5, z: 1 }; // for xyY
// const scopeCenter = { x: 0.3127, y: 0.329, z: 0.4 }; // for xyY

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

resultEl.addEventListener('mousemove', (e) => {
  const rect = resultEl.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width);
  mouse.y = (e.clientY - rect.top) / rect.height;
});

resultEl.addEventListener('wheel', e => {
  e.preventDefault();
  const scale = -e.deltaY / 1000;
  worldScale.x *= 1.0 + scale;
  worldScale.y *= 1.0 + scale;
  worldScale.z *= 1.0 + scale;
  return false;
});


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
  const render = () => {
    requestAnimationFrame(render);
    const viewTransform = generateViewTransform(mouse.x, mouse.y, scopeCenter, worldScale, perspectiveStrength);
    viewer.renderScope(viewTransform);
  };
  render();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


