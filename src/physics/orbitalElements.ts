/**
 * Conic-section (Kepler) orbital elements computed from a position/velocity state.
 * Valid for the drag-free two-body problem. Used for the predicted-orbit outline,
 * the telemetry panel and — independently of the integrator — the verification tests.
 */
import type { Body } from './bodies';

export interface PlanarState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Elements {
  /** Specific orbital energy ε (J/kg). */
  energy: number;
  /** Specific angular momentum h (m²/s), signed (negative = clockwise). */
  h: number;
  /** Eccentricity e. */
  e: number;
  /** Direction of periapsis (rad, world frame). For circles: direction of the state. */
  periapsisAngle: number;
  /** Semi-latus rectum p = h²/GM (m). */
  p: number;
  /** Semi-major axis a (m); positive for ellipses, negative for hyperbolas, ∞ for parabolas. */
  a: number;
  /** Periapsis distance (m). */
  periapsis: number;
  /** Apoapsis distance (m); Infinity if unbound. */
  apoapsis: number;
  /** Orbital period T (s); Infinity if unbound. */
  period: number;
  /** True anomaly ν of the given state (rad, in the direction of motion). */
  trueAnomaly: number;
}

/** Eccentricities below this are treated as circular. */
export const CIRCULAR_TOLERANCE = 1e-9;

export function elementsFromState(s: PlanarState, GM: number): Elements {
  const r = Math.hypot(s.x, s.y);
  const v2 = s.vx * s.vx + s.vy * s.vy;
  const rv = s.x * s.vx + s.y * s.vy;
  const h = s.x * s.vy - s.y * s.vx;
  const energy = v2 / 2 - GM / r;
  // Eccentricity vector: e = ((v² − GM/r)·r − (r·v)·v) / GM
  const ex = ((v2 - GM / r) * s.x - rv * s.vx) / GM;
  const ey = ((v2 - GM / r) * s.y - rv * s.vy) / GM;
  const e = Math.hypot(ex, ey);
  const p = (h * h) / GM;
  const dir = Math.sign(h) || 1;

  let periapsisAngle: number;
  let trueAnomaly: number;
  if (e < CIRCULAR_TOLERANCE) {
    periapsisAngle = Math.atan2(s.y, s.x);
    trueAnomaly = 0;
  } else {
    periapsisAngle = Math.atan2(ey, ex);
    // Angle from periapsis to the position, measured in the direction of motion.
    const cr = ex * s.y - ey * s.x;
    const dt = ex * s.x + ey * s.y;
    trueAnomaly = dir * Math.atan2(cr, dt);
  }

  const a = energy === 0 ? Infinity : -GM / (2 * energy);
  const periapsis = p / (1 + e);
  const bound = energy < 0;
  const apoapsis = bound ? p / (1 - e) : Infinity;
  const period = bound ? 2 * Math.PI * Math.sqrt((a * a * a) / GM) : Infinity;

  return { energy, h, e, periapsisAngle, p, a, periapsis, apoapsis, period, trueAnomaly };
}

/** Relative tolerance for "total energy is zero" (rounding of v₂ = √(2GM/r)). */
export const ENERGY_TOLERANCE = 1e-9;

export type TrajectoryKind = 'suborbital' | 'circular' | 'elliptical' | 'escape';

/**
 * What kind of path will a drag-free ball follow?
 * Tolerance for "circular": |v₀ − v₁| / v₁ < 0.1 % (e < ~0.002).
 */
export function classifyTrajectory(s: PlanarState, body: Body): TrajectoryKind {
  const el = elementsFromState(s, body.GM);
  // E = 0 exactly (fired at v₂) is a parabola: it escapes. Allow for rounding.
  if (el.energy >= -ENERGY_TOLERANCE * (body.GM / Math.hypot(s.x, s.y))) return 'escape';
  if (el.periapsis < body.radius) return 'suborbital';
  if (el.e < 0.002) return 'circular';
  return 'elliptical';
}
