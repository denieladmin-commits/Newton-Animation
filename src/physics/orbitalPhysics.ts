/**
 * Equations of motion for Newton's cannonball, integrated with classical RK4.
 *
 * Model (stated openly in the app's "About the model" box):
 *  - 2D, planet centred at the origin, spherical and non-rotating;
 *  - the cannonball is a point mass; only the planet's gravity acts (+ optional drag);
 *  - drag: F = ½·ρ·C_d·A·v², opposite to the velocity, exponential atmosphere.
 *
 * Units are SI throughout (m, s, kg). Energies are tracked per unit mass (J/kg)
 * and multiplied by the cannonball's mass only for display.
 */
import { airDensity, type Body } from './bodies';

/** Simulation state. `w` is the work done by drag per unit mass (J/kg, ≤ 0). */
export interface State {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
}

export interface Projectile {
  /** Mass m (kg). */
  mass: number;
  /** Drag coefficient C_d (dimensionless). */
  dragCoefficient: number;
  /** Cross-section area A (m²). */
  area: number;
}

const IRON_DENSITY = 7_870; // kg/m³

/** A solid iron sphere of the given mass. */
export function ironCannonball(mass: number): Projectile {
  const radius = Math.cbrt((3 * mass) / (4 * Math.PI * IRON_DENSITY));
  return { mass, dragCoefficient: 0.5, area: Math.PI * radius * radius };
}

/** Default: 10 kg iron ball (radius ≈ 6.7 cm). */
export const DEFAULT_PROJECTILE: Projectile = ironCannonball(10);

export interface Forces {
  /** Gravitational acceleration (m/s²). */
  gx: number;
  gy: number;
  /** Drag acceleration (m/s²). */
  dx: number;
  dy: number;
}

export interface Environment {
  body: Body;
  drag: boolean;
  projectile: Projectile;
}

/** Accelerations acting on the ball in state s. */
export function forces(s: State, env: Environment): Forces {
  const r2 = s.x * s.x + s.y * s.y;
  const r = Math.sqrt(r2);
  const gOverR = -env.body.GM / (r2 * r);
  const out: Forces = { gx: gOverR * s.x, gy: gOverR * s.y, dx: 0, dy: 0 };
  if (env.drag && env.body.atmosphere) {
    const rho = airDensity(env.body, r - env.body.radius);
    if (rho > 0) {
      const p = env.projectile;
      const v = Math.hypot(s.vx, s.vy);
      const k = (0.5 * rho * p.dragCoefficient * p.area * v) / p.mass;
      out.dx = -k * s.vx;
      out.dy = -k * s.vy;
    }
  }
  return out;
}

type Deriv = [number, number, number, number, number]; // dx, dy, dvx, dvy, dw

function derivative(s: State, env: Environment): Deriv {
  const f = forces(s, env);
  // dw/dt = power of the drag force per unit mass = a_drag · v
  return [s.vx, s.vy, f.gx + f.dx, f.gy + f.dy, f.dx * s.vx + f.dy * s.vy];
}

function offset(s: State, d: Deriv, h: number): State {
  return {
    t: s.t + h,
    x: s.x + d[0] * h,
    y: s.y + d[1] * h,
    vx: s.vx + d[2] * h,
    vy: s.vy + d[3] * h,
    w: s.w + d[4] * h,
  };
}

/** One classical 4th-order Runge–Kutta step of length h. */
export function rk4Step(s: State, h: number, env: Environment): State {
  const k1 = derivative(s, env);
  const k2 = derivative(offset(s, k1, h / 2), env);
  const k3 = derivative(offset(s, k2, h / 2), env);
  const k4 = derivative(offset(s, k3, h), env);
  const c = (i: number) => (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!) / 6;
  return {
    t: s.t + h,
    x: s.x + h * c(0),
    y: s.y + h * c(1),
    vx: s.vx + h * c(2),
    vy: s.vy + h * c(3),
    w: s.w + h * c(4),
  };
}

/** Fraction of the local dynamical time used per step. Smaller = more accurate. */
export const STEP_FRACTION = 0.002;
/** Upper bound on a single integration step (s). */
export const MAX_STEP = 60;

/**
 * Adaptive step size: a small fraction of the shortest relevant timescale —
 * the orbital (dynamical) time √(r³/GM), the crossing time r/v, and, with drag,
 * the time drag needs to change the speed noticeably.
 */
export function stepSize(s: State, env: Environment): number {
  const r = Math.hypot(s.x, s.y);
  const v = Math.hypot(s.vx, s.vy);
  let tau = Math.sqrt((r * r * r) / env.body.GM);
  if (v > 0) tau = Math.min(tau, r / v);
  const f = forces(s, env);
  const aDrag = Math.hypot(f.dx, f.dy);
  if (aDrag > 0 && v > 0) tau = Math.min(tau, (10 * v) / aDrag);
  return Math.min(MAX_STEP, STEP_FRACTION * tau);
}

// ───────────────────────────── Derived quantities ─────────────────────────────

export const radius = (s: State): number => Math.hypot(s.x, s.y);
export const speed = (s: State): number => Math.hypot(s.vx, s.vy);

/** Radial (v_r, + = away from centre) and tangential (v_t ≥ 0) velocity components. */
export function velocityComponents(s: State): { vr: number; vt: number } {
  const r = radius(s);
  const vr = (s.x * s.vx + s.y * s.vy) / r;
  const vt = Math.abs(s.x * s.vy - s.y * s.vx) / r;
  return { vr, vt };
}

/** Specific kinetic energy v²/2 (J/kg). */
export const specificKinetic = (s: State): number => 0.5 * (s.vx * s.vx + s.vy * s.vy);
/** Specific potential energy −GM/r (J/kg), zero at infinity. */
export const specificPotential = (s: State, body: Body): number => -body.GM / radius(s);
/** Specific total energy ε = v²/2 − GM/r (J/kg). */
export const specificEnergy = (s: State, body: Body): number =>
  specificKinetic(s) + specificPotential(s, body);
/** Specific angular momentum h = r × v (m²/s); negative = clockwise. */
export const specificAngularMomentum = (s: State): number => s.x * s.vy - s.y * s.vx;

/**
 * Tolerance for the 90° marker: shown when the angle between r and v is within
 * ±0.5° of 90°, i.e. |v_r|/|v| < sin(0.5°).
 */
export const PERPENDICULAR_TOLERANCE = Math.sin((0.5 * Math.PI) / 180);

/** Is the velocity perpendicular to gravity (within ±0.5°)? */
export function isPerpendicular(s: State): boolean {
  const v = speed(s);
  if (v === 0) return false;
  return Math.abs(velocityComponents(s).vr) / v < PERPENDICULAR_TOLERANCE;
}

// ───────────────────────────────── Flight ──────────────────────────────────

export interface LaunchConfig {
  body: Body;
  /** Launch altitude h above the surface (m). */
  altitude: number;
  /** Horizontal launch speed v₀ (m/s). */
  v0: number;
  drag: boolean;
  projectile?: Projectile;
}

export type FlightStatus = 'flying' | 'crashed' | 'escaped';

export type FlightEvent =
  | { type: 'crash'; t: number; state: State }
  | { type: 'escape'; t: number; state: State }
  | { type: 'orbit'; t: number; count: number };

export interface Flight {
  env: Environment;
  launch: State;
  state: State;
  status: FlightStatus;
  /** Polar angle swept since launch (rad, signed). */
  swept: number;
  orbitsCompleted: number;
  /** Time of the first completed revolution = measured period (s). */
  measuredPeriod: number | null;
  /** Distance from the centre beyond which an unbound ball counts as escaped (m). */
  escapeRadius: number;
}

/** Launch from the mountain top at (0, R + h), fired horizontally in +x. */
export function launchState(config: LaunchConfig): State {
  return { t: 0, x: 0, y: config.body.radius + config.altitude, vx: config.v0, vy: 0, w: 0 };
}

export function createFlight(config: LaunchConfig): Flight {
  const launch = launchState(config);
  return {
    env: { body: config.body, drag: config.drag, projectile: config.projectile ?? DEFAULT_PROJECTILE },
    launch,
    state: launch,
    status: 'flying',
    swept: 0,
    orbitsCompleted: 0,
    measuredPeriod: null,
    escapeRadius: 30 * config.body.radius,
  };
}

const BISECTION_ITERATIONS = 60;

/** Find the exact moment within a step at which the ball reaches the surface. */
function findImpact(prev: State, h: number, env: Environment): State {
  const R = env.body.radius;
  let lo = 0;
  let hi = h;
  let hit = rk4Step(prev, h, env);
  for (let i = 0; i < BISECTION_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    const s = rk4Step(prev, mid, env);
    if (radius(s) > R) lo = mid;
    else {
      hi = mid;
      hit = s;
    }
  }
  return hit;
}

/**
 * Advance the flight by `duration` seconds of simulated time, in adaptive RK4
 * sub-steps. Stops early on impact or escape. Returns the events that happened.
 * `onStep` is called after every accepted sub-step (used for trails / graphs).
 */
export function advanceFlight(
  flight: Flight,
  duration: number,
  onStep?: (s: State) => void,
): FlightEvent[] {
  const events: FlightEvent[] = [];
  if (flight.status !== 'flying') return events;
  const { env } = flight;
  const R = env.body.radius;
  const tEnd = flight.state.t + duration;

  while (flight.state.t < tEnd) {
    const prev = flight.state;
    const h = Math.min(stepSize(prev, env), tEnd - prev.t);
    if (h <= 0) break;
    let next = rk4Step(prev, h, env);

    if (radius(next) <= R) {
      next = findImpact(prev, h, env);
      flight.state = next;
      flight.status = 'crashed';
      onStep?.(next);
      events.push({ type: 'crash', t: next.t, state: next });
      return events;
    }

    // Track the swept polar angle to detect completed revolutions.
    const dTheta = Math.atan2(prev.x * next.y - prev.y * next.x, prev.x * next.x + prev.y * next.y);
    const before = flight.swept;
    flight.swept += dTheta;
    const target = 2 * Math.PI * (flight.orbitsCompleted + 1);
    if (Math.abs(flight.swept) >= target && Math.abs(before) < target) {
      const frac = (target - Math.abs(before)) / Math.abs(dTheta);
      const tOrbit = prev.t + frac * h;
      flight.orbitsCompleted += 1;
      if (flight.measuredPeriod === null) flight.measuredPeriod = tOrbit;
      events.push({ type: 'orbit', t: tOrbit, count: flight.orbitsCompleted });
    }

    flight.state = next;
    onStep?.(next);

    if (
      radius(next) > flight.escapeRadius &&
      specificEnergy(next, env.body) >= 0 &&
      velocityComponents(next).vr > 0
    ) {
      flight.status = 'escaped';
      events.push({ type: 'escape', t: next.t, state: next });
      return events;
    }
  }
  return events;
}
