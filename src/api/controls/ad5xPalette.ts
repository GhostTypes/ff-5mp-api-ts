/**
 * @fileoverview AD5X material-station slot color palette and nearest-color snapping.
 *
 * The AD5X material-station UI renders a color icon only for one of the firmware's
 * 24 built-in palette colors; any other value leaves the slot without an icon. The
 * `rgb` field is sent as uppercase `#RRGGBB`, exactly as the printer's own UI stores
 * it — the `#` is part of the value and must not be stripped.
 *
 * These values DIFFER from the Creator 5 palette (Blue is `#45A8F9` here vs
 * `#4CAAF8` there), so callers must snap against THIS list for the AD5X. The
 * snapping machinery itself is shared — see `paletteSnap.ts`.
 *
 * Key exports:
 * - AD5X_PALETTE: the firmware's 24-entry color palette
 * - AD5X_MATERIALS: the 14 material names the UI renders
 * - snapToAD5XPalette(): nearest palette entry for an arbitrary color
 */

import { buildPaletteLab, type PaletteColor, snapToPalette } from './paletteSnap';

/** A single entry in the AD5X firmware color palette. */
export type AD5XPaletteColor = PaletteColor;

/**
 * The firmware's 24-entry UI palette. Index 0 (White) is also the value the
 * firmware falls back to when a color does not match.
 */
export const AD5X_PALETTE: readonly AD5XPaletteColor[] = [
  { index: 0, name: 'White', hex: '#FFFFFF' },
  { index: 1, name: 'Yellow', hex: '#FEF043' },
  { index: 2, name: 'Light Green', hex: '#DCF478' },
  { index: 3, name: 'Green', hex: '#0ACC38' },
  { index: 4, name: 'Dark Green', hex: '#067749' },
  { index: 5, name: 'Teal', hex: '#0C6283' },
  { index: 6, name: 'Cyan', hex: '#0DE2A0' },
  { index: 7, name: 'Light Blue', hex: '#75D9F3' },
  { index: 8, name: 'Blue', hex: '#45A8F9' },
  { index: 9, name: 'Dark Blue', hex: '#2750E0' },
  { index: 10, name: 'Purple', hex: '#46328E' },
  { index: 11, name: 'Violet', hex: '#A03CF7' },
  { index: 12, name: 'Magenta', hex: '#F330F9' },
  { index: 13, name: 'Pink', hex: '#D4B0DC' },
  { index: 14, name: 'Coral', hex: '#F95D73' },
  { index: 15, name: 'Red', hex: '#F72224' },
  { index: 16, name: 'Brown', hex: '#7C4B00' },
  { index: 17, name: 'Orange', hex: '#F98D33' },
  { index: 18, name: 'Cream', hex: '#FDEBD5' },
  { index: 19, name: 'Tan', hex: '#D3C4A3' },
  { index: 20, name: 'Dark Brown', hex: '#AF7836' },
  { index: 21, name: 'Gray', hex: '#898989' },
  { index: 22, name: 'Light Gray', hex: '#BCBCBC' },
  { index: 23, name: 'Black', hex: '#161616' },
];

/** The 14 material names the AD5X material-station UI renders. */
export const AD5X_MATERIALS: readonly string[] = [
  'PLA',
  'PLA-CF',
  'PETG',
  'PETG-CF',
  'ABS',
  'TPU',
  'SILK',
  'PA',
  'PA-CF',
  'PAHT-CF',
  'PC',
  'PC-ABS',
  'PET-CF',
  'PPS-CF',
];

// L*a*b* values precomputed once at module load.
const PALETTE_LAB = buildPaletteLab(AD5X_PALETTE);

/**
 * Snaps an arbitrary hex color to the nearest entry in the AD5X firmware palette
 * using CIEDE2000 perceptual distance. The returned {@link AD5XPaletteColor.hex} is
 * always uppercase `#RRGGBB`. Unparseable input falls back to White (index 0, the
 * firmware's own no-match fallback) with a warning.
 *
 * @param hex The caller's color as a hex string (leading `#` optional, any case).
 * @returns The nearest AD5X palette entry.
 */
export function snapToAD5XPalette(hex: string): AD5XPaletteColor {
  return snapToPalette(hex, PALETTE_LAB, 'snapToAD5XPalette');
}
