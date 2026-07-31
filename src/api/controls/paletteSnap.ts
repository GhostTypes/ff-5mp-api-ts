/**
 * @fileoverview Shared perceptual color machinery for firmware palette snapping.
 *
 * The AD5X and the Creator 5 series each render a material-station slot icon only
 * when the `rgb` value matches an entry in that model's own 24-color firmware
 * palette. The palettes differ (Blue is `#45A8F9` on the AD5X and `#4CAAF8` on the
 * Creator 5), but the snapping algorithm is identical, so the sRGB -> CIE L*a*b*
 * conversion and the CIEDE2000 distance live here and are shared by both.
 *
 * CIEDE2000 is used rather than a naive RGB distance because a palette miss shows
 * the wrong color on the printer; perceptual nearness is what a user expects.
 *
 * Key exports:
 * - PaletteColor: a single palette entry
 * - hexToRgb(): tolerant hex parsing
 * - buildPaletteLab(): precompute a palette's L*a*b* values
 * - snapToPalette(): nearest palette entry for an arbitrary color
 */

/** A single entry in a printer's firmware color palette. */
export interface PaletteColor {
  /** Firmware palette index (0 is the no-match fallback on both models). */
  index: number;
  /** Color name as shown on the printer UI. */
  name: string;
  /** Wire value sent to the printer, always uppercase `#RRGGBB`. */
  hex: string;
}

/** CIE L*a*b* color. */
export interface Lab {
  L: number;
  a: number;
  b: number;
}

/** A palette entry with its L*a*b* value precomputed. */
export interface PaletteLabEntry {
  color: PaletteColor;
  lab: Lab;
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
export function rgbToLab(r: number, g: number, b: number): Lab {
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
export function deltaE2000(c1: Lab, c2: Lab): number {
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

/**
 * Parses a hex color string (`#RRGGBB`, `RRGGBB`, 3-digit shorthand, any case)
 * into its RGB channels. Returns `null` for unparseable input.
 */
export function hexToRgb(hex: string): [number, number, number] | null {
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

/** Precomputes a palette's L*a*b* values once, at module load. */
export function buildPaletteLab(palette: readonly PaletteColor[]): PaletteLabEntry[] {
  return palette.map((color): PaletteLabEntry => {
    const [r, g, b] = hexToRgb(color.hex) ?? [0, 0, 0];
    return { color, lab: rgbToLab(r, g, b) };
  });
}

/**
 * Snaps an arbitrary hex color to the nearest palette entry by CIEDE2000 distance.
 *
 * Unparseable input falls back to `paletteLab[0]`, which on both firmware palettes
 * is White — the same value the firmware itself falls back to on a no-match.
 *
 * @param hex Caller's color (leading `#` optional, any case).
 * @param paletteLab Precomputed palette, from {@link buildPaletteLab}.
 * @param paletteName Used only in the warning logged for unparseable input.
 */
export function snapToPalette(
  hex: string,
  paletteLab: readonly PaletteLabEntry[],
  paletteName: string
): PaletteColor {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    console.warn(`${paletteName}: could not parse "${hex}" as hex; falling back to White.`);
    return paletteLab[0].color;
  }

  const target = rgbToLab(rgb[0], rgb[1], rgb[2]);
  let best = paletteLab[0];
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const entry of paletteLab) {
    const delta = deltaE2000(target, entry.lab);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }
  return best.color;
}
