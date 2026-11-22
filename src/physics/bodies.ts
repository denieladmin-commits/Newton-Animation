/**
 * Celestial body data.
 * Source: NASA Goddard Space Flight Center, Planetary Fact Sheets
 * (nssdc.gsfc.nasa.gov/planetary/factsheet). GM values are the fact-sheet
 * "GM (×10⁶ km³/s²)"; radii are volumetric mean radii.
 */

/** Newtonian gravitational constant, CODATA 2018 (N·m²/kg²). */
export const G = 6.6743e-11;

export interface Atmosphere {
  /** Surface density (kg/m³). */
  rho0: number;
  /** Density scale height (m): ρ(h) = ρ₀·e^(−h/H). */
  scaleHeight: number;
  /** Above this altitude (m) density is treated as zero. */
  cutoff: number;
}

export type BodyId = 'earth' | 'moon' | 'mars';

export interface Body {
  id: BodyId;
  /** Standard gravitational parameter GM (m³/s²). */
  GM: number;
  /** Mean radius R (m). */
  radius: number;
  /** null = no atmosphere (Moon). */
  atmosphere: Atmosphere | null;
}

export const BODIES: Record<BodyId, Body> = {
  earth: {
    id: 'earth',
    GM: 3.986004e14,
    radius: 6_371_000,
    // Simple exponential fit to the US Standard Atmosphere; Kármán line at 100 km.
    atmosphere: { rho0: 1.225, scaleHeight: 8_500, cutoff: 100_000 },
  },
  moon: {
    id: 'moon',
    GM: 4.9028e12,
    radius: 1_737_400,
    atmosphere: null,
  },
  mars: {
    id: 'mars',
    GM: 4.282837e13,
    radius: 3_389_500,
    // NASA Mars fact sheet: surface density ≈ 0.020 kg/m³, scale height 11.1 km.
    atmosphere: { rho0: 0.02, scaleHeight: 11_100, cutoff: 80_000 },
  },
};

/** Body mass M = GM / G (kg). */
export const bodyMass = (b: Body): number => b.GM / G;

/** Surface gravity g = GM/R² of the (non-rotating) model planet (m/s²). */
export const surfaceGravity = (b: Body): number => b.GM / (b.radius * b.radius);

/** Air density at altitude h (m) above the surface (kg/m³). */
export function airDensity(b: Body, altitude: number): number {
  const atm = b.atmosphere;
  if (!atm || altitude >= atm.cutoff) return 0;
  return atm.rho0 * Math.exp(-Math.max(0, altitude) / atm.scaleHeight);
}

/** First cosmic velocity v₁ = √(GM/r): circular orbit speed at distance r from the centre. */
export const circularSpeed = (b: Body, r: number): number => Math.sqrt(b.GM / r);

/** Second cosmic (escape) velocity v₂ = √(2GM/r) = √2·v₁. */
export const escapeSpeed = (b: Body, r: number): number => Math.sqrt((2 * b.GM) / r);
