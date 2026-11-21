// Colour helpers shared by the art code, the HUD and the constants. Colours are '#rrggbb'
// strings, or 0xrrggbb numbers where Phaser shapes take them. Pure: no Phaser, no DOM.

const clampByte = (v) => Math.min(255, Math.max(0, Math.round(v)));

export function hexToRgb(hex) {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(rgb) {
  return `#${rgb.map((v) => clampByte(v).toString(16).padStart(2, '0')).join('')}`;
}

/** 0xrrggbb number for a '#rrggbb' string. */
export function colorInt(hex) {
  return Number.parseInt(hex.replace('#', ''), 16);
}

/** '#rrggbb' string for a 0xrrggbb number, for Phaser text styles. */
export function cssColor(rgb) {
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

/** Lightens (positive `percent`) or darkens (negative) every channel by the same amount. */
export function shade(hex, percent) {
  return rgbToHex(hexToRgb(hex).map((v) => v + Math.round((255 * percent) / 100)));
}

/** Linear blend from `a` to `b`. */
export function mix(a, b, t) {
  const [ca, cb] = [hexToRgb(a), hexToRgb(b)];
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

/** [hue in degrees, saturation 0..1, lightness 0..1]. */
export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex(h, s, l) {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const [sat, light] = [clamp(s), clamp(l)];
  const k = (n) => (n + (((h % 360) + 360) % 360) / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return rgbToHex([f(0), f(8), f(4)].map((v) => v * 255));
}

/** Perceived brightness 0..255, for ordering tones. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
