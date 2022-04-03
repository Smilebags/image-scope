const scopeSize = 1024;
const dotSize = 1;
const samplingResolution = 512;

const scopeCenter = { x: 0.4, y: 0.333 };
const scopeZoom = 1.6;

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
  renderScope(previewImageData);
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

async function renderScope(imageData) {
  const { width, height } = imageData;
  const { data } = imageData;

  renderScopeBackground();

  let frameStart = Date.now();
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const index = (x + y * width) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      resultCtx.fillStyle = `rgba(${r}, ${g}, ${b})`;

      const coords = convertsRGBToScopeCoords({ r, g, b });
      resultCtx.fillRect(coords.x * scopeSize, (1 - coords.y) * scopeSize, dotSize, dotSize);
    }
    const now = Date.now();
    if (now - frameStart > 1000 / 30) {
      frameStart = Date.now();
      await sleep(1);
    }
  }
}

function renderScopeBackground() {
  resultCtx.fillStyle = '#000';
  resultCtx.fillRect(0, 0, scopeSize, scopeSize);
  for (let side = 0; side < 6; side++) {
    for (let point = 0; point < 255; point++) {
      let r = 0;
      let g = 0;
      let b = 0;

      switch (side) {
        case 0:
          r = 255;
          g = point;
          break;
        case 1:
          g = 255;
          r = 255 - point;
          break;
        case 2:
          g = 255;
          b = point;
          break;
        case 3:
          b = 255;
          g = 255 - point;
          break;
        case 4:
          b = 255;
          r = point;
          break;
        case 5:
          r = 255;
          b = 255 - point;
      }

      resultCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      const coords = convertsRGBToScopeCoords({ r, g, b });
      resultCtx.fillRect(coords.x * scopeSize, (1 - coords.y) * scopeSize, dotSize, dotSize);
    }
  }
}

function convertsRGBToScopeCoords(rgb) {
  const norm = normaliseuInt8(rgb);
  const linear = sRGBToLinearsRGB(norm);
  const XYZ = linearsRGBToCIEXYZ(linear);
  const xyY = CIEXYZtoCIExyY(XYZ);
  return {
    x: ((xyY.x - scopeCenter.x) * scopeZoom) + 0.5,
    y: ((xyY.y - scopeCenter.y) * scopeZoom) + 0.5,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));