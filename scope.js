import {
  vec4Mat4Multiply,
  mat4Multiply,
  createRotateXYTransform,
  createRotateYZTransform,
  lerp3
} from './math.js';
import {
  normaliseuInt8,
  sRGBToLinearsRGB,
  linearsRGBToCIEXYZ,
  CIEXYZtoCIELAB
} from './colour.js';

export function createImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = URL.createObjectURL(file);
  });
}

export function renderImagePreviewCanvas(image, ctx, targetResolution) {
  const max = Math.max(image.naturalWidth, image.naturalHeight);
  const fractionOfMax = {
    width: image.naturalWidth / max,
    height: image.naturalHeight / max,
  };

  const elWidth = Math.floor(fractionOfMax.width * targetResolution);
  const elHeight = Math.floor(fractionOfMax.height * targetResolution);

  ctx.canvas.width = elWidth;
  ctx.canvas.height = elHeight;
  ctx.width = elWidth;
  ctx.height = elHeight;
  ctx.drawImage(image, 0, 0, elWidth, elHeight);
}

export function createScopePoints(imageData) {
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
      });
    }
  }
  return points;
}

export async function renderScope(points, ctx, time, scopeSize, viewTransform) {
  renderBackground(ctx, scopeSize);
  const transformedPoints = points.map(point => applyViewTransform(point, viewTransform));
  transformedPoints.sort((a, b) => b.z - a.z);
  transformedPoints.forEach(({ x, y, z, r, g, b, a }) => {
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    ctx.fillRect(x * scopeSize, (1 - y) * scopeSize, 1, 1);
  });
}

function renderBackground(ctx, scopeSize) {
  ctx.fillStyle = '#666';
  ctx.fillRect(0, 0, scopeSize, scopeSize);
}

function createScopeOutlinePoints() {
  const blackRed = generateSegment(
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 0, b: 0 }
  );
  const blackGreen = generateSegment(
    { r: 0, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 }
  );
  const blackBlue = generateSegment(
    { r: 0, g: 0, b: 0 },
    { r: 0, g: 0, b: 255 }
  );
  const redYellow = generateSegment(
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 255, b: 0 }
  );
  const greenYellow = generateSegment(
    { r: 0, g: 255, b: 0 },
    { r: 255, g: 255, b: 0 }
  );
  const greenCyan = generateSegment(
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 255, b: 255 }
  );
  const blueCyan = generateSegment(
    { r: 0, g: 0, b: 255 },
    { r: 0, g: 255, b: 255 }
  );
  const blueMagenta = generateSegment(
    { r: 0, g: 0, b: 255 },
    { r: 255, g: 0, b: 255 }
  );
  const redMagenta = generateSegment(
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 0, b: 255 }
  );
  const cyanWhite = generateSegment(
    { r: 0, g: 255, b: 255 },
    { r: 255, g: 255, b: 255 }
  );
  const magentaWhite = generateSegment(
    { r: 255, g: 0, b: 255 },
    { r: 255, g: 255, b: 255 }
  );
  const yellowWhite = generateSegment(
    { r: 255, g: 255, b: 0 },
    { r: 255, g: 255, b: 255 }
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

function applyViewTransform(point, viewTransform) {
  const transformed = vec4Mat4Multiply([point.x, point.y, point.z, 1], viewTransform);
  return {
    ...point,
    x: 0.5 + (transformed[0] / transformed[2]),
    y: 0.5 + (transformed[1] / transformed[2]),
    z: transformed[2],
  };
}

export function generateViewTransform(time, scopeCenter, worldScale, perspectiveStrength = 1) {
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
    createRotateYZTransform(Math.PI / 3)
  );

  const worldTransform = mat4Multiply(
    mat4Multiply(worldTranslateTransform, worldScaleTransform),
    worldRotateTransform
  );

  return mat4Multiply(worldTransform, cameraTransform);
}
