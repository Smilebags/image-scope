import {
  createElementFromFile,
  getImageDataFromSrcEl,
  generateViewTransform,
} from './scope.js';
import { GLScopeViewer } from './webgl.js';

const scopeSize = 2000;
let samplingResolution = 512;

let srcEl = null;
let startPointUpdateLoop = () => {};
let stopPointUpdateLoop = () => {};

const mouse = {
  x: 0,
  y: 0,
};

// const worldScale = { x: 0.03, y: 0.03, z: 0.1 }; // or LAB
// const scopeCenter = { x: 0, y: 0, z: 5 }; // for LAB
const worldScale = { x: 2.5, y: 2.5, z: 1 }; // for xyY
const scopeCenter = { x: 0.3127, y: 0.329, z: 0.4 }; // for xyY

let perspectiveStrength = 1;

const fileInput = document.getElementById('file-input');
const imagePreviewEl = document.getElementById('preview');
const resultEl = document.getElementById('result');

resultEl.width = scopeSize;
resultEl.height = scopeSize;
// resultEl.style.width = `${scopeSize}px`;
// resultEl.style.height = `${scopeSize}px`;

const imagePreviewCtx = imagePreviewEl.getContext('2d');
const resultCtx = resultEl.getContext('webgl2');

if (!resultCtx) {
  alert('Your browser does not support WebGL2');
}
init(imagePreviewCtx, resultCtx)

async function init(sourceCtx, scopeCtx) {
  const viewer = new GLScopeViewer(scopeCtx);
  await viewer.init();

  const updatePoints = () => {
    const previewImageData = getImageDataFromSrcEl(srcEl, sourceCtx, samplingResolution);
    viewer.setBufferData(previewImageData.data);
  };
  
  let intervalRef = null;
  startPointUpdateLoop = () => {
    if (!intervalRef) {
      intervalRef = setInterval(updatePoints, 1000 / 25);
      updatePoints();
    }
  };
  stopPointUpdateLoop = () => {
    if (intervalRef) {
      clearInterval(intervalRef);
      intervalRef = null;
    }
    updatePoints();
  };
  
  const render = () => {
    requestAnimationFrame(render);
    const viewTransform = generateViewTransform(mouse.x, mouse.y, scopeCenter, worldScale, perspectiveStrength);
    viewer.renderScope(viewTransform);
  };
  render();
  startPointUpdateLoop();

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

  // listen to z and x and increment perspectiveStrength
  const perspectiveIncrement = 0.25;
  document.addEventListener('keydown', e => {
    console.log('keydown', e);
    if (e.key === 'z') {
      perspectiveStrength += perspectiveIncrement;
    } else if (e.key === 'x') {
      perspectiveStrength -= perspectiveIncrement;
    }
    console.log(perspectiveStrength);
  });
}

async function processNewFile(file) {
  const { el, fileType } = await createElementFromFile(file);
  srcEl = el;
  if (fileType === 'video') {
    samplingResolution = 1024;
    startPointUpdateLoop();
  } else {
    samplingResolution = 2048;
    stopPointUpdateLoop();
  }
}
