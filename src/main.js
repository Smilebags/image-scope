import { wrap, clamp } from './util';
import {
  getImageDataFromSrcEl,
  generateViewTransform,
} from './scope.js';
import { GLScopeViewer } from './webgl.js';

const scopeSize = 512;
let samplingResolution = 512;

let elementIndex = 0;
let srcEl = null;
makeActiveElement(document.querySelectorAll('img, video')[elementIndex]);
if (!srcEl) {
  console.log('no source element, exiting');
  throw new Error('Exit');
};
let startPointUpdateLoop = () => { };
let stopPointUpdateLoop = () => { };

const rotation = {
  x: 0.5,
  y: 1,
};

const mouse = {
  x: 0,
  y: 0,
};

const draggerState = {
  downMousePos: {
    x: 0,
    y: 0,
  },
  downElPos: {
    x: 0,
    y: 0,
  },
};

const worldScale = { x: 3, y: 3, z: 1 };
const scopeCenter = { x: 0.3127, y: 0.329, z: 0.4 };

let perspectiveStrength = 0;

const containerEl = html`<div style="
    position: fixed;
    top: 0;
    left: 0;
    width: ${scopeSize}px;
    height: ${scopeSize}px;
    z-index: 1000000;
    background-color: #00000022;
"></div>`;

const imagePreviewEl = html`<canvas></canvas>`;
imagePreviewEl.originClean = false;
const resultEl = html`<canvas style="width: 100%; height: 100%;"></canvas>`;
containerEl.appendChild(resultEl);

const draggerEl = html`<div style="
  position: absolute;
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  background-color: #ff0000;
"></div>`;
containerEl.appendChild(draggerEl);

draggerEl.addEventListener('mousedown', e => {
  e.preventDefault();
  e.stopPropagation();
  const { clientX, clientY } = e;
  draggerState.downMousePos = { x: clientX, y: clientY };
  draggerState.downElPos = { x: containerEl.offsetLeft, y: containerEl.offsetTop };
  const onMouseMove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { clientX, clientY } = e;
    const { downMousePos, downElPos } = draggerState;
    const deltaX = clientX - downMousePos.x;
    const deltaY = clientY - downMousePos.y;
    containerEl.style.left = `${downElPos.x + deltaX}px`;
    containerEl.style.top = `${downElPos.y + deltaY}px`;
  };
  const onMouseUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.removeEventListener('mousemove', onMouseMove);
  };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp, { once: true });
});


document.body.appendChild(containerEl);



const dpr = window.devicePixelRatio;
resultEl.width = scopeSize * dpr;
resultEl.height = scopeSize * dpr;

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
      rotation.x = wrap(rotation.x, 0, 1);
      rotation.y = clamp(rotation.y, 0, 1);
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

function makeActiveElement(el) {
  srcEl && (srcEl.style.outline = 'none');
  el.crossOrigin = 'anonymous';
  el.style.outline = '2px solid red';
  srcEl = el;
}

function html(strings, ...keys) {
  const htmlString = strings.map((str, index) => `${str}${keys[index] || ''}`.trim()).join('').trim();
  const doc = new DOMParser().parseFromString(htmlString, "text/html");
  return doc.children[0].children[1].children[0];
}
