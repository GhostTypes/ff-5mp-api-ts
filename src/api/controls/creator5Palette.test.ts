/**
 * @fileoverview Unit tests for the Creator 5 palette + nearest-color snapping.
 * Verifies the CIEDE2000 perceptual snap produces byte-for-byte firmware palette
 * matches (exact, case-sensitive "#RRGGBB") for the msConfig_cmd wire format.
 */
import { describe, expect, it } from 'vitest';
import { CREATOR5_PALETTE, snapToCreator5Palette } from './creator5Palette';

describe('snapToCreator5Palette', () => {
  const paletteHexes = CREATOR5_PALETTE.map((c) => c.hex);

  it('the palette has exactly 24 entries, all uppercase "#RRGGBB", index 0 = White', () => {
    expect(CREATOR5_PALETTE).toHaveLength(24);
    for (const c of CREATOR5_PALETTE) {
      expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(c.hex).toBe(c.hex.toUpperCase());
    }
    expect(CREATOR5_PALETTE[0]).toEqual({ index: 0, name: 'White', hex: '#FFFFFF' });
  });

  it('every palette entry snaps to itself', () => {
    for (const c of CREATOR5_PALETTE) {
      expect(snapToCreator5Palette(c.hex).hex).toBe(c.hex);
    }
  });

  it('never returns an off-palette value', () => {
    const inputs = ['#FF0000', '#123456', '#00FF00', '#ABCDEF', '#112233', '#FEDCBA', '#8080FF'];
    for (const input of inputs) {
      const snapped = snapToCreator5Palette(input).hex;
      expect(paletteHexes).toContain(snapped);
    }
  });

  it('always returns uppercase "#RRGGBB" with the leading "#"', () => {
    for (const input of ['#ff0000', 'ff0000', '#4caaf8', '4CAAf8', '#abc']) {
      const snapped = snapToCreator5Palette(input).hex;
      expect(snapped).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('snaps pure red #FF0000 to palette Red #F82D29', () => {
    expect(snapToCreator5Palette('#FF0000').hex).toBe('#F82D29');
  });

  it('snaps an exact palette entry to itself regardless of input case/shape', () => {
    expect(snapToCreator5Palette('#4CAAF8').hex).toBe('#4CAAF8');
    expect(snapToCreator5Palette('#4caaf8').hex).toBe('#4CAAF8');
    expect(snapToCreator5Palette('4caaF8').hex).toBe('#4CAAF8');
  });

  it('snaps white to #FFFFFF (3-digit shorthand too)', () => {
    expect(snapToCreator5Palette('#FFFFFF').hex).toBe('#FFFFFF');
    expect(snapToCreator5Palette('#FFF').hex).toBe('#FFFFFF');
  });

  it('falls back to White (index 0) on unparseable input', () => {
    expect(snapToCreator5Palette('not-a-color')).toEqual(CREATOR5_PALETTE[0]);
    expect(snapToCreator5Palette('')).toEqual(CREATOR5_PALETTE[0]);
  });
});
