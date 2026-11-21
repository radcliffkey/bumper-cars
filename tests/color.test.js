import { describe, it, expect } from 'vitest';
import { shade, mix, cssColor, colorInt, hexToHsl, hslToHex, luminance, rgbToHex } from '../src/utils/color.js';

describe('colour helpers', () => {
  it('shade lightens and darkens every channel, clamped', () => {
    expect(shade('#800000', 10)).toBe('#9a1a1a');
    expect(shade('#101010', -10)).toBe('#000000');
    expect(shade('#ffffff', 100)).toBe('#ffffff');
  });

  it('mix blends linearly', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#102030', '#102030', 0.7)).toBe('#102030');
  });

  it('converts between numbers and CSS strings', () => {
    expect(cssColor(0x0a0b0c)).toBe('#0a0b0c');
    expect(colorInt('#5a3e2b')).toBe(0x5a3e2b);
    expect(rgbToHex([300, -5, 16])).toBe('#ff0010');
  });

  it.each(['#5a7fc0', '#e5443b', '#808080', '#ffcf3f'])('round-trips %s through HSL', (hex) => {
    expect(hslToHex(...hexToHsl(hex))).toBe(hex);
  });

  it('orders colours by perceived brightness', () => {
    expect(luminance('#ffffff')).toBeGreaterThan(luminance('#ffff00'));
    expect(luminance('#00ff00')).toBeGreaterThan(luminance('#0000ff'));
  });
});
