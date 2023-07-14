export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
export function wrap(value, min, max) {
  const range = max - min;
  const offsetValue = value - min;
  const wrappedValue = (offsetValue % range) + min;
  return wrappedValue;
}
