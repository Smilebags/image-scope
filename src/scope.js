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
  CIEXYZtoCIELAB,
} from './colour.js';

// export async function createElementFromFile(file) {
//   const fileType = file.type.split('/')[0];
//   return {
//     el: await (fileType === 'image' ? createImageFromFile(file) : createVideoFromFile(file)),
//     fileType,
//   };
// }

// function createVideoFromFile(file) {
//   return new Promise((resolve, reject) => {
//     const el = document.createElement('video');
//     el.onloadeddata = () => resolve(el);
//     el.loop = true;
//     el.src = URL.createObjectURL(file);
//     el.play();
//   });
// }

// function createImageFromFile(file) {
//   return new Promise((resolve, reject) => {
//     const el = document.createElement('img');
//     el.onload = () => resolve(el);
//     el.onerror = () => reject(new Error('Could not load image'));
//     el.src = URL.createObjectURL(file);
//   });
// }

export function getImageDataFromSrcEl(el, ctx, targetResolution) {
  const height = el?.videoHeight || el?.naturalHeight;
  const width = el?.videoWidth || el?.naturalWidth;
  if (el && height && width) {
    const max = Math.max(width, height);
    const fractionOfMax = {
      width: width / max,
      height: height / max,
    };

    const elWidth = Math.floor(fractionOfMax.width * targetResolution);
    const elHeight = Math.floor(fractionOfMax.height * targetResolution);

    ctx.canvas.width = elWidth;
    ctx.canvas.height = elHeight;
    ctx.width = elWidth;
    ctx.height = elHeight;
    ctx.drawImage(el, 0, 0, elWidth, elHeight);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
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

export function createScopeOutlinePoints() {
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

  const createPoints = segment => segment.flatMap(sample => {
    const { r, g, b } = sample;
    return [r, g, b, 255];
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

function generateSegment(startRGB, endRGB, count = 512) {
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
    x: (transformed[0] / transformed[2]),
    y: (transformed[1] / transformed[2]),
    z: transformed[2],
  };
}

export function generateViewTransform(x, y, scopeCenter, worldScale, perspectiveStrength) {
  const cameraTransform = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, -0.1, perspectiveStrength,
    0, 0, 0, 1,
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
    createRotateXYTransform(-x * 2 * Math.PI),
    createRotateYZTransform(y * 2 * Math.PI / 2)
  );

  const worldTransform = mat4Multiply(
    mat4Multiply(worldTranslateTransform, worldScaleTransform),
    worldRotateTransform
  );

  return mat4Multiply(worldTransform, cameraTransform);
}
