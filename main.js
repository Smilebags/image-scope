const scopeSize = 1024;
const dotSize = 1;
const samplingResolution = 256;

const worldScale = { x: 1.4, y: 1.4, z: 0.6 };
const scopeCenter = { x: 0.3127, y: 0.3291, z: 0.3 };

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
  // const reader = new FileReader();
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

function lerp3(a, b, mix) {
  return {
    r: lerp(a.r, b.r, mix),
    g: lerp(a.g, b.g, mix),
    b: lerp(a.b, b.b, mix),
  };
}

function lerp(a, b, mix) {
  return a + (b - a) * mix;
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
  const xyY = CIEXYZtoCIExyY(XYZ);
  return {
    x: isNaN(xyY.x) ? 0 : xyY.x,
    y: isNaN(xyY.y) ? 0 : xyY.y,
    z: isNaN(xyY.Y) ? 0 : xyY.Y,  
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

function normaliseuInt8({ r, g, b }) {
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
  }
}

function sRGBToLinearsRGB({ r, g, b }) {
  const linearR = Math.pow(r, 2.2);
  const linearG = Math.pow(g, 2.2);
  const linearB = Math.pow(b, 2.2);
  return { r: linearR, g: linearG, b: linearB };
}

function linearsRGBToCIEXYZ({ r, g, b }) {
  const X = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  return { X, Y, Z };
}

function CIEXYZtoCIExyY({ X, Y, Z }) {
  const x = X / (X + Y + Z);
  const y = Y / (X + Y + Z);
  return { x, y, Y };
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

// point is vec4, viewTransform is mat4
// return camera frustrum coordinate vec4
function vec4Mat4Multiply(point, viewTransform) {
  const a = point;
  const b = viewTransform;
  return [
    a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12],
    a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13],
    a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14],
    a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15],
  ];
}

// a and b are mat4
function mat4Multiply(a, b) {
  return [
    a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12],
    a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13],
    a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14],
    a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15],
    a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12],
    a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13],
    a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14],
    a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15],
    a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12],
    a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13],
    a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14],
    a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15],
    a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12],
    a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13],
    a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14],
    a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15],
  ];
}

function createRotateXYTransform(angle) {
  return [
    Math.cos(angle), -Math.sin(angle), 0, 0,
    Math.sin(angle), Math.cos(angle), 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

function createRotateYZTransform(angle) {
  return [
    1, 0, 0, 0,
    0, Math.cos(angle), -Math.sin(angle), 0,
    0, Math.sin(angle), Math.cos(angle), 0,
    0, 0, 0, 1,
  ];
}