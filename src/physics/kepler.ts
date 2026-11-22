/**
 * Exact analytic solution of the drag-free two-body problem (Kepler's laws).
 *
 * This is the independent reference the numerical integrator is checked against:
 * it shares no code with orbitalPhysics.ts, only the starting state.
 */
import { elementsFromState, type PlanarState } from './orbitalElements';

function solveElliptic(M: number, e: number): number {
  // Kepler's equation M = E − e·sin E (Newton's method).
  let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1);
  for (let i = 0; i < 100; i++) {
    const f = E - e * Math.sin(E) - M;
    const dE = f / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-15 * Math.max(1, Math.abs(E))) break;
  }
  return E;
}

function solveHyperbolic(M: number, e: number): number {
  // Hyperbolic Kepler equation M = e·sinh H − H.
  let H = Math.asinh(M / e);
  for (let i = 0; i < 200; i++) {
    const f = e * Math.sinh(H) - H - M;
    const dH = f / (e * Math.cosh(H) - 1);
    H -= dH;
    if (Math.abs(dH) < 1e-15 * Math.max(1, Math.abs(H))) break;
  }
  return H;
}

/** Mean anomaly → true anomaly, and back, for e < 1 and e > 1. */
function trueToMean(nu: number, e: number): number {
  if (e < 1) {
    const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
    return E - e * Math.sin(E);
  }
  const H = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
  return e * Math.sinh(H) - H;
}

function meanToTrue(M: number, e: number): number {
  if (e < 1) {
    const E = solveElliptic(M, e);
    return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  }
  const H = solveHyperbolic(M, e);
  return 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2));
}

/** Normalise an angle to (−π, π]. */
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Exact position and velocity at time t after the given state (drag-free).
 * Parabolic orbits (e = 1 exactly) are not supported.
 */
export function propagate(s0: PlanarState, GM: number, t: number): PlanarState {
  const el = elementsFromState(s0, GM);
  const { e, p, periapsisAngle } = el;
  if (Math.abs(e - 1) < 1e-9) throw new Error('parabolic orbit not supported');
  const dir = Math.sign(el.h) || 1;
  const n = Math.sqrt(GM / Math.abs(el.a) ** 3); // mean motion

  let nu: number;
  if (e < 1) {
    const M = wrap(trueToMean(wrap(el.trueAnomaly), e) + n * t);
    nu = meanToTrue(M, e);
  } else {
    nu = meanToTrue(trueToMean(el.trueAnomaly, e) + n * t, e);
  }

  const r = p / (1 + e * Math.cos(nu));
  const theta = periapsisAngle + dir * nu;
  const c = Math.cos(theta);
  const sn = Math.sin(theta);
  const k = Math.sqrt(GM / p);
  const vr = k * e * Math.sin(nu);
  const vt = k * (1 + e * Math.cos(nu));
  return {
    x: r * c,
    y: r * sn,
    vx: vr * c - dir * vt * sn,
    vy: vr * sn + dir * vt * c,
  };
}

/**
 * Where and when does a ball launched horizontally from distance r0 at speed v0
 * hit a sphere of radius R? Returns null if it never does.
 * `angle` is the polar angle swept from launch to impact (rad); the surface
 * range is R·angle.
 */
export function analyticImpact(
  GM: number,
  R: number,
  r0: number,
  v0: number,
): { time: number; angle: number } | null {
  const s0 = { x: 0, y: r0, vx: v0, vy: 0 };
  const el = elementsFromState(s0, GM);
  if (el.periapsis >= R) return null;
  if (v0 === 0) {
    // Radial free fall: time from rest at r0 to R (closed form).
    const t =
      Math.sqrt((r0 * r0 * r0) / (2 * GM)) *
      (Math.sqrt((R / r0) * (1 - R / r0)) + Math.acos(Math.sqrt(R / r0)));
    return { time: t, angle: 0 };
  }
  const { e, p } = el;
  // Launch is at apoapsis (ν = π) because v0 < v1 here. Impact on the way down: ν ∈ (π, 2π).
  const nuImpact = 2 * Math.PI - Math.acos((p / R - 1) / e);
  const n = Math.sqrt(GM / el.a ** 3);
  const M0 = Math.PI; // mean anomaly at apoapsis
  const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nuImpact / 2)) + 2 * Math.PI;
  const M1 = E - e * Math.sin(E);
  return { time: (M1 - M0) / n, angle: nuImpact - Math.PI };
}
