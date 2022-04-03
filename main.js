import {
  vec4Mat4Multiply,
  mat4Multiply,
  createRotateXYTransform,
  createRotateYZTransform,
  lerp3,
} from './math.js';
import {
  normaliseuInt8,
  sRGBToLinearsRGB,
  linearsRGBToCIEXYZ,
  CIEXYZtoCIELAB,
} from './colour.js';

const scopeSize = 1024;
const dotSize = 1;
const samplingResolution = 256;

const worldScale = { x: 0.03, y: 0.03, z: 0.05 };
const scopeCenter = { x: 0, y: 0, z: 3 };

let t = 0;
const perspectiveStrength = 1;

const fileInput = document.getElementById('file-input');
const imagePreviewEl = document.getElementById('image-preview');

const resultEl = document.getElementById('result');
resultEl.width = scopeSize;
resultEl.height = scopeSize;

const imagePreviewCtx = imagePreviewEl.getContext('2d');
const resultCtx = resultEl.getContext('2d');

resultCtx.width = scopeSize;
resultCtx.height = scopeSize;

fileInput.addEventListener('change', (e) => {
  handleFileChange(e);
});

async function handleFileChange(e) {
  const file = e.target.files[0];
  const image = await createImageFromFile(file);
  renderImagePreviewCanvas(image);
  const previewImageData = imagePreviewCtx.getImageData(0, 0, imagePreviewCtx.width, imagePreviewCtx.height);
  const points = createScopePoints(previewImageData);
  t = 0;
  while (t < 1) {
    await renderScope(points);
    await sleep(1);
    t += 0.02;
  }
}

function createImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = URL.createObjectURL(file);
  });
}

function renderImagePreviewCanvas(image) {
  const max = Math.max(image.naturalWidth, image.naturalHeight);
  const fractionOfMax = {
    width: image.naturalWidth / max,
    height: image.naturalHeight / max,
  }
  const elWidth = Math.floor(fractionOfMax.width * samplingResolution);
  const elHeight = Math.floor(fractionOfMax.height * samplingResolution);

  imagePreviewEl.width = elWidth;
  imagePreviewEl.height = elHeight;
  imagePreviewCtx.width = elWidth;
  imagePreviewCtx.height = elHeight;
  imagePreviewCtx.drawImage(image, 0, 0, elWidth, elHeight);
}

function createScopePoints(imageData) {
  const { width, height } = imageData;
  const { data } = imageData;
  const points = [];
  points.push(...createScopeOutlinePoints());
  
  for (let w = 0; w < width; w++) {
    for (let h = 0; h < height; h++) {
      const index = (w + h * width) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      const { x, y, z } = convertsRGBToxyz({ r, g, b });
      points.push({
        x, y, z, r, g, b, a,
      })
    }
  }
  return points;
}

async function renderScope(points) {
  renderScopeBackground();
  const viewTransform = generateViewTransform(t);
  const transformedPoints = points.map(point => transformPointToView(point, viewTransform));
  transformedPoints.sort((a, b) => b.z - a.z);
  transformedPoints.forEach(({ x, y, z, r, g, b, a }) => {
    resultCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    resultCtx.fillRect(x * scopeSize, (1 - y) * scopeSize, dotSize, dotSize);
  });
}

function renderScopeBackground() {
  resultCtx.fillStyle = '#888';
  resultCtx.fillRect(0, 0, scopeSize, scopeSize);
}

function createScopeOutlinePoints() {
  const blackRed = generateSegment(
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 0, b: 0 },
  );
  const blackGreen = generateSegment(
    { r: 0, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },
  );
  const blackBlue = generateSegment(
    { r: 0, g: 0, b: 0 },
    { r: 0, g: 0, b: 255 },
  );
  const redYellow = generateSegment(
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 255, b: 0 },
  );
  const greenYellow = generateSegment(
    { r: 0, g: 255, b: 0 },
    { r: 255, g: 255, b: 0 },
  );
  const greenCyan = generateSegment(
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 255, b: 255 },
  );
  const blueCyan = generateSegment(
    { r: 0, g: 0, b: 255 },
    { r: 0, g: 255, b: 255 },
  );
  const blueMagenta = generateSegment(
    { r: 0, g: 0, b: 255 },
    { r: 255, g: 0, b: 255 },
  );
  const redMagenta = generateSegment(
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 0, b: 255 },
  );
  const cyanWhite = generateSegment(
    { r: 0, g: 255, b: 255 },
    { r: 255, g: 255, b: 255 },
  );
  const magentaWhite = generateSegment(
    { r: 255, g: 0, b: 255 },
    { r: 255, g: 255, b: 255 },
  );
  const yellowWhite = generateSegment(
    { r: 255, g: 255, b: 0 },
    { r: 255, g: 255, b: 255 },
  );

  const createPoints = segment => segment.map(sample => {
    const { r, g, b } = sample;
    const { x, y, z } = convertsRGBToxyz({ r, g, b });
    return { x, y, z, r, g, b, a: 255 };
  });

  const segments = [
    blackRed,
    blackGreen,
    blackBlue,
    redYellow,
    greenYellow,
    greenCyan,
    blueCyan,
    blueMagenta,
    redMagenta,
    cyanWhite,
    magentaWhite,
    yellowWhite,
  ];
  return segments.flatMap(createPoints);
}


function generateSegment(startRGB, endRGB, count = 255) {
  const segment = [];
  for (let i = 0; i < count; i++) {
    const mix = i / count;
    const rgb = lerp3(startRGB, endRGB, mix);
    segment.push(rgb);
  }
  return segment;
}

function convertsRGBToxyz(rgb) {
  const norm = normaliseuInt8(rgb);
  const linear = sRGBToLinearsRGB(norm);
  const XYZ = linearsRGBToCIEXYZ(linear);
  const lab = CIEXYZtoCIELAB(XYZ);
  return {
    x: isNaN(lab.a) ? 0 : lab.a,
    y: isNaN(lab.b) ? 0 : lab.b,  
    z: isNaN(lab.L) ? 0 : lab.L,
  };
}

function transformPointToView(point, viewTransform) {
  const transformed = vec4Mat4Multiply([point.x, point.y, point.z, 1], viewTransform);
  return {
    ...point,
    x: 0.5 + (transformed[0] / transformed[2]),
    y: 0.5 + (transformed[1] / transformed[2]),
    z: transformed[2],
  };
}

function generateViewTransform(time) {
  const cameraTransform = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, -perspectiveStrength, 0,
    0, 0, 1, 1,
  ];
  const worldTranslateTransform = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    -scopeCenter.x, -scopeCenter.y, -scopeCenter.z, 1,
  ];
  const worldScaleTransform = [
    worldScale.x, 0, 0, 0,
    0, worldScale.y, 0, 0,
    0, 0, worldScale.z, 0,
    0, 0, 0, 1,
  ];

  const worldRotateTransform = mat4Multiply(
    createRotateXYTransform(time * 2 * Math.PI),
    createRotateYZTransform(Math.PI / 3),
  );

  const worldTransform = mat4Multiply(
    mat4Multiply(worldTranslateTransform, worldScaleTransform),
    worldRotateTransform,
  );

  return mat4Multiply(worldTransform, cameraTransform);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
