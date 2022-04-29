import {
  createElementFromFile,
  getImageDataFromSrcEl,
  createScopePoints,
  generateViewTransform,
} from './scope.js';
import { GLScopeViewer } from './webgl.js';


const scopeSize = 1600;
const samplingResolution = 256;

let srcEl = null;

const mouse = {
  x: 0,
  y: 0,
};

const worldScale = { x: 0.03, y: 0.03, z: 0.1 }; // or LAB
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
init(imagePreviewCtx, resultCtx)

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

async function init(sourceCtx, scopeCtx) {
  const viewer = new GLScopeViewer(scopeCtx);
  await viewer.init();

  const updatePoints = () => {
    const previewImageData = getImageDataFromSrcEl(srcEl, sourceCtx, samplingResolution);
    const points = createScopePoints(previewImageData);
    viewer.setPoints(points);
  };
  
  const render = () => {
    requestAnimationFrame(render);
    const viewTransform = generateViewTransform(mouse.x, mouse.y, scopeCenter, worldScale, perspectiveStrength);
    viewer.renderScope(viewTransform);
  };
  updatePoints();
  render();
  setInterval(updatePoints, 1000 / 20);
}

async function processNewFile(file) {
  srcEl = await createElementFromFile(file, 'video');
  srcEl.loop = true;
  srcEl.play();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


