/**
 * @fileoverview Unit tests for the AD5X palette + nearest-color snapping.
 *
 * Mirrors the Creator 5 suite: the msConfig_cmd wire format needs a byte-for-byte
 * firmware palette match, sent as uppercase "#RRGGBB" with the leading "#". The
 * palette-difference test guards against the two models' lists drifting into each
 * other, which would silently send a Creator 5 color to an AD5X.
 */
import { describe, expect, it } from 'vitest';
import { AD5X_MATERIALS, AD5X_PALETTE, snapToAD5XPalette } from './ad5xPalette';
import { CREATOR5_PALETTE } from './creator5Palette';

describe('snapToAD5XPalette', () => {
  const paletteHexes = AD5X_PALETTE.map((c) => c.hex);

  it('the palette has exactly 24 entries, all uppercase "#RRGGBB", index 0 = White', () => {
    expect(AD5X_PALETTE).toHaveLength(24);
    for (const c of AD5X_PALETTE) {
      expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(c.hex).toBe(c.hex.toUpperCase());
    }
    expect(AD5X_PALETTE[0]).toEqual({ index: 0, name: 'White', hex: '#FFFFFF' });
  });

  it('indices are sequential 0-23', () => {
    AD5X_PALETTE.forEach((color, position) => {
      expect(color.index).toBe(position);
    });
  });

  it('every palette entry snaps to itself', () => {
    for (const c of AD5X_PALETTE) {
      expect(snapToAD5XPalette(c.hex).hex).toBe(c.hex);
    }
  });

  it('never returns an off-palette value', () => {
    const inputs = ['#FF0000', '#123456', '#00FF00', '#ABCDEF', '#112233', '#FEDCBA', '#8080FF'];
    for (const input of inputs) {
      expect(paletteHexes).toContain(snapToAD5XPalette(input).hex);
    }
  });

  it('always returns uppercase "#RRGGBB" with the leading "#"', () => {
    for (const input of ['#ff0000', 'ff0000', '#45a8f9', '45A8f9', '#abc']) {
      expect(snapToAD5XPalette(input).hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('accepts a bare hex with no leading "#" and returns it prefixed', () => {
    // Values read back from an AD5X slot can arrive without the "#".
    expect(snapToAD5XPalette('161616').hex).toBe('#161616');
    expect(snapToAD5XPalette('7C4B00').hex).toBe('#7C4B00');
  });

  it('snaps an exact palette entry to itself regardless of input case/shape', () => {
    expect(snapToAD5XPalette('#45A8F9').hex).toBe('#45A8F9');
    expect(snapToAD5XPalette('#45a8f9').hex).toBe('#45A8F9');
    expect(snapToAD5XPalette('45a8F9').hex).toBe('#45A8F9');
  });

  it('snaps pure red #FF0000 to palette Red #F72224', () => {
    expect(snapToAD5XPalette('#FF0000').hex).toBe('#F72224');
  });

  it('snaps white to #FFFFFF (3-digit shorthand too)', () => {
    expect(snapToAD5XPalette('#FFFFFF').hex).toBe('#FFFFFF');
    expect(snapToAD5XPalette('#FFF').hex).toBe('#FFFFFF');
  });

  it('falls back to White (index 0) on unparseable input', () => {
    expect(snapToAD5XPalette('not-a-color')).toEqual(AD5X_PALETTE[0]);
    expect(snapToAD5XPalette('')).toEqual(AD5X_PALETTE[0]);
  });

  it('uses AD5X values, not Creator 5 values, where the two palettes differ', () => {
    // Blue and Black differ between the models; snapping must not cross over.
    expect(snapToAD5XPalette('#45A8F9').hex).toBe('#45A8F9');
    expect(snapToAD5XPalette('#161616').hex).toBe('#161616');

    const creator5Hexes = CREATOR5_PALETTE.map((c) => c.hex);
    expect(creator5Hexes).not.toContain('#45A8F9');
    expect(creator5Hexes).not.toContain('#161616');
  });
});

describe('AD5X_MATERIALS', () => {
  it('lists the 14 materials the AD5X UI renders, starting with PLA', () => {
    expect(AD5X_MATERIALS).toHaveLength(14);
    expect(AD5X_MATERIALS[0]).toBe('PLA');
    expect(AD5X_MATERIALS).toContain('PETG');
    expect(AD5X_MATERIALS).toContain('PPS-CF');
  });
});
