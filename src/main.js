import {
  createElementFromFile,
  getImageDataFromSrcEl,
  generateViewTransform,
} from './scope.js';
import { GLScopeViewer } from './webgl.js';

console.log('starting extension');

const scopeSize = 512;
let samplingResolution = 512;

let elementIndex = 0;
let srcEl = null;
makeActiveElement(document.querySelectorAll('img, video')[elementIndex]);
if (!srcEl) {
  console.log('no source element, exiting');
  throw new Error('Exit');
};
console.log(srcEl);
let startPointUpdateLoop = () => { };
let stopPointUpdateLoop = () => { };

const rotation = {
  x: 0,
  y: 0,
};

const mouse = {
  x: 0,
  y: 0,
};

// const worldScale = { x: 0.03, y: 0.03, z: 0.1 }; // or LAB
// const scopeCenter = { x: 0, y: 0, z: 5 }; // for LAB
const worldScale = { x: 2.5, y: 2.5, z: 1 }; // for xyY
const scopeCenter = { x: 0.3127, y: 0.329, z: 0.4 }; // for xyY

let perspectiveStrength = 1;

const imagePreviewEl = document.createElement('canvas');
imagePreviewEl.originClean = false;
const resultEl = document.createElement('canvas');
resultEl.style.width = '512px';
resultEl.style.position = 'fixed';
resultEl.style.top = '0';
resultEl.style.left = '0';
resultEl.style.zIndex = '1000000';
document.body.appendChild(resultEl);

resultEl.width = scopeSize;
resultEl.height = scopeSize;

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
    const viewTransform = generateViewTransform(rotation.x, rotation.y, scopeCenter, worldScale, perspectiveStrength);
    viewer.renderScope(viewTransform);
  };
  render();
  startPointUpdateLoop();

  const onMouseDown = (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    const onMouseMove = (e) => {
      const relativeX = e.clientX - mouse.x;
      const relativeY = e.clientY - mouse.y;
      rotation.x += 0.001 * relativeX;
      rotation.y += 0.001 * relativeY;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', onMouseMove);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
    }
    window.addEventListener('mouseup', onMouseUp, { once: true });
  };
  resultEl.addEventListener('mousedown', onMouseDown);

  resultEl.addEventListener('wheel', e => {
    e.preventDefault();
    const scale = -e.deltaY / 1000;
    worldScale.x *= 1.0 + scale;
    worldScale.y *= 1.0 + scale;
    worldScale.z *= 1.0 + scale;
    return false;
  });

  const perspectiveIncrement = 0.25;
  document.addEventListener('keydown', e => {
    if (e.key === 'z') {
      perspectiveStrength += perspectiveIncrement;
    } else if (e.key === 'x') {
      perspectiveStrength -= perspectiveIncrement;
    } else if (e.key === 'v') {
      elementIndex += 1;
      makeActiveElement(document.querySelectorAll('img, video')[elementIndex]);
    } else if (e.key === 'c') {
      elementIndex = Math.max(0, elementIndex - 1);
      makeActiveElement(document.querySelectorAll('img, video')[elementIndex]);
    }
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

function makeActiveElement(el) {
  srcEl && (srcEl.style.outline = 'none');
  el.crossOrigin = 'anonymous';
  el.style.outline = '2px solid red';
  srcEl = el;
}