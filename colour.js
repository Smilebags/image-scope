export function normaliseuInt8({ r, g, b }) {
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
  };
}
export function sRGBToLinearsRGB({ r, g, b }) {
  const linearR = Math.pow(r, 2.2);
  const linearG = Math.pow(g, 2.2);
  const linearB = Math.pow(b, 2.2);
  return { r: linearR, g: linearG, b: linearB };
}
export function linearsRGBToCIEXYZ({ r, g, b }) {
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
export function CIEXYZtoCIELAB(xyz) {
  const { X, Y, Z } = xyz;
  const x = X / 95.047;
  const y = Y / 100.000;
  const z = Z / 108.883;
  const fx = x > 0.008856 ? x ** (1 / 3) : (7.787 * x) + (16 / 116);
  const fy = y > 0.008856 ? y ** (1 / 3) : (7.787 * y) + (16 / 116);
  const fz = z > 0.008856 ? z ** (1 / 3) : (7.787 * z) + (16 / 116);
  const L = (116 * fy) - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return { L, a, b };
}
