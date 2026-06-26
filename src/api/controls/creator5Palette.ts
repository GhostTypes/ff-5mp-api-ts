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
 * By contrast the AD5X accepts freeform hex (with the `#` stripped), so the two
 * wire formats are mutually exclusive — see {@link Control.configureSlot} for the
 * model-gating that splits them.
 */
// src/api/controls/creator5Palette.ts

/** A single entry in the Creator 5 firmware color palette. */
export interface Creator5PaletteColor {
  /** Firmware palette index (0 = White = the no-match fallback). */
  index: number;
  /** Color name as shown on the printer UI. */
  name: string;
  /** Wire value sent to the printer, always uppercase `#RRGGBB`. */
  hex: string;
}

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

/** CIE L*a*b* color. */
interface Lab {
  L: number;
  a: number;
  b: number;
}

/** sRGB component (0-255) channel transfer function -> linear value (0-1). */
function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** D65 reference white point used by the sRGB -> XYZ transform. */
const D65 = { Xn: 0.95047, Yn: 1.0, Zn: 1.08883 };

/**
 * Converts an sRGB color (0-255 channels) to CIE L*a*b* under a D65 illuminant.
 * Used as the perceptual basis for the CIEDE2000 nearest-color match.
 */
function rgbToLab(r: number, g: number, b: number): Lab {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);

  let x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  let y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  let z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;

  x /= D65.Xn;
  y /= D65.Yn;
  z /= D65.Zn;

  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** atan2 -> hue in degrees, normalized to [0, 360). */
function atan2deg(ordinate: number, abscissa: number): number {
  let h = (Math.atan2(ordinate, abscissa) * 180) / Math.PI;
  if (h < 0) h += 360;
  return h;
}

/**
 * CIEDE2000 color difference between two L*a*b* colors (kL=kC=kH=1). This is the
 * most accurate standard delta-E metric and is preferred here because the
 * firmware renders only an exact palette match — snapping to the wrong
 * perceptual neighbor would display the wrong color on the printer.
 */
function deltaE2000(c1: Lab, c2: Lab): number {
  const { L: L1, a: a1, b: b1 } = c1;
  const { L: L2, a: a2, b: b2 } = c2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Cbar ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 6103515625))); // 25^7 = 6103515625

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const h1p = atan2deg(b1, a1p);
  const h2p = atan2deg(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else if (diff > 180) dhp = diff - 360;
    else dhp = diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp: number;
  if (C1p * C2p === 0) {
    hbarp = h1p + h2p;
  } else {
    const diff = Math.abs(h1p - h2p);
    if (diff <= 180) hbarp = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
    else hbarp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(((hbarp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hbarp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hbarp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hbarp - 63) * Math.PI) / 180);

  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Cbarp7 = Cbarp ** 7;
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + 6103515625));
  const SL = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin((2 * dTheta * Math.PI) / 180) * RC;

  const termL = dLp / SL;
  const termC = dCp / SC;
  const termH = dHp / SH;

  return Math.sqrt(termL * termL + termC * termC + termH * termH + RT * termC * termH);
}

// Palette entries with their L*a*b* values precomputed once at module load.
const PALETTE_LAB: { color: Creator5PaletteColor; lab: Lab }[] = CREATOR5_PALETTE.map(
  (color): { color: Creator5PaletteColor; lab: Lab } => {
    const [r, g, b] = hexToRgb(color.hex) ?? [0, 0, 0];
    return { color, lab: rgbToLab(r, g, b) };
  }
);

/**
 * Parses a hex color string (`#RRGGBB`, `RRGGBB`, 3-digit shorthand, any case)
 * into its RGB channels. Returns `null` for unparseable input.
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(clean)) return null;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

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
  const rgb = hexToRgb(hex);
  if (!rgb) {
    console.warn(`snapToCreator5Palette: could not parse "${hex}" as hex; falling back to White.`);
    return CREATOR5_PALETTE[0];
  }

  const target = rgbToLab(rgb[0], rgb[1], rgb[2]);
  let best = PALETTE_LAB[0];
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const entry of PALETTE_LAB) {
    const delta = deltaE2000(target, entry.lab);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }
  return best.color;
}
