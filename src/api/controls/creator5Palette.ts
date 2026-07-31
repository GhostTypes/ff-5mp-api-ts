/**
 * @fileoverview Creator 5 / Creator 5 Pro material-station slot color palette
 * and perceptual nearest-color snapping.
 *
 * The Creator 5 `msConfig_cmd` only renders a color icon when the `rgb` field is
 * an EXACT, case-sensitive, byte-for-byte match against one of the firmware's 24
 * built-in palette strings (compared via `std::operator==` @0x0042c5e0 in
 * `firmwareExe` 1.9.2). A non-match leaves the slot's color index at 0 (White).
 * These values DIFFER from the AD5X palette (e.g. Blue is `#4CAAF8` here vs
 * `#45A8F9` on the AD5X), so callers must snap against THIS list specifically.
 *
 * The AD5X has its own 24-entry palette with different values — see
 * `ad5xPalette.ts`. Both models take uppercase `#RRGGBB` on the wire; only the
 * palette contents differ, so {@link Control.configureSlot} model-gates which list
 * it snaps against.
 */
// src/api/controls/creator5Palette.ts

import { buildPaletteLab, type PaletteColor, snapToPalette } from './paletteSnap';

/** A single entry in the Creator 5 firmware color palette. */
export type Creator5PaletteColor = PaletteColor;

/**
 * The firmware's 24-entry UI palette (firmwareExe 1.9.2, Ghidra-confirmed).
 * Index 0 (White) is also what the firmware falls back to on a no-match.
 */
export const CREATOR5_PALETTE: readonly Creator5PaletteColor[] = [
  { index: 0, name: 'White', hex: '#FFFFFF' },
  { index: 1, name: 'Yellow', hex: '#FFF245' },
  { index: 2, name: 'Light Green', hex: '#DEF578' },
  { index: 3, name: 'Green', hex: '#21CC3D' },
  { index: 4, name: 'Dark Green', hex: '#167A4B' },
  { index: 5, name: 'Teal', hex: '#156682' },
  { index: 6, name: 'Cyan', hex: '#24E4A0' },
  { index: 7, name: 'Light Blue', hex: '#7BD9F0' },
  { index: 8, name: 'Blue', hex: '#4CAAF8' },
  { index: 9, name: 'Dark Blue', hex: '#2E54DD' },
  { index: 10, name: 'Purple', hex: '#48358C' },
  { index: 11, name: 'Violet', hex: '#A341F7' },
  { index: 12, name: 'Magenta', hex: '#F435F6' },
  { index: 13, name: 'Pink', hex: '#D5B4DE' },
  { index: 14, name: 'Coral', hex: '#FA6173' },
  { index: 15, name: 'Red', hex: '#F82D29' },
  { index: 16, name: 'Brown', hex: '#805003' },
  { index: 17, name: 'Orange', hex: '#F9903B' },
  { index: 18, name: 'Cream', hex: '#FCEBD7' },
  { index: 19, name: 'Tan', hex: '#D5C5A1' },
  { index: 20, name: 'Dark Brown', hex: '#B17C38' },
  { index: 21, name: 'Gray', hex: '#8C8C89' },
  { index: 22, name: 'Light Gray', hex: '#BEBEBE' },
  { index: 23, name: 'Black', hex: '#1B1B1B' },
];

// L*a*b* values precomputed once at module load.
const PALETTE_LAB = buildPaletteLab(CREATOR5_PALETTE);

/**
 * Snaps an arbitrary hex color to the nearest entry in the Creator 5 firmware
 * palette using the CIEDE2000 perceptual distance in CIE L*a*b* space. The
 * returned {@link Creator5PaletteColor.hex} is always uppercase `#RRGGBB` and is
 * guaranteed to be a byte-for-byte firmware match. Unparseable input falls back
 * to White (index 0, the firmware's own no-match fallback) with a warning.
 * @param hex The caller's color as a hex string (leading `#` optional, any case).
 * @returns The nearest Creator 5 palette entry.
 */
export function snapToCreator5Palette(hex: string): Creator5PaletteColor {
  return snapToPalette(hex, PALETTE_LAB, 'snapToCreator5Palette');
}
