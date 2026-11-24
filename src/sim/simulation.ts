import { BODIES, type Body, type BodyId } from '../physics/bodies';
import {
  advanceFlight,
  createFlight,
  launchState,
  DEFAULT_PROJECTILE,
  type Flight,
  type FlightEvent,
  type State,
} from '../physics/orbitalPhysics';
import { SampleBuffer, type SeriesKey } from './samples';
import { Trail } from './trail';

/** Mass of the cannonball used for forces and energies in joules (kg). */
export const BALL_MASS = DEFAULT_PROJECTILE.mass;

/** Energies of the ball in joules: kinetic, potential (zero at infinity), and lost to drag. */
export function energies(s: State, body: Body) {
  const m = BALL_MASS;
  const r = Math.hypot(s.x, s.y);
  const ek = 0.5 * m * (s.vx * s.vx + s.vy * s.vy);
  const ep = (-body.GM * m) / r;
  return { ek, ep, e: ek + ep, loss: -m * s.w };
}

function sampleOf(s: State, body: Body): Record<SeriesKey, number> {
  const { ek, ep, loss } = energies(s, body);
  return { t: s.t, h: Math.hypot(s.x, s.y) - body.radius, v: Math.hypot(s.vx, s.vy), ek, ep, loss };
}

export const WARP_PRESETS = [1, 100, 500] as const;
export type Warp = (typeof WARP_PRESETS)[number];

export interface LaunchParams {
  bodyId: BodyId;
  /** Mountain height h (m). */
  altitude: number;
  /** Launch speed v₀ (m/s). */
  v0: number;
  drag: boolean;
}

export interface Shot {
  label: string;
  flight: Flight;
  trail: Trail;
  params: LaunchParams;
  samples: SampleBuffer;
}

const MAX_GHOSTS = 8;
const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Owns the current shot, previous shots (ghosts) and the clock. No React, no canvas. */
export class Simulation {
  params: LaunchParams;
  warp: Warp = 1;
  running = false;
  current: Shot | null = null;
  ghosts: Shot[] = [];
  lastEvents: FlightEvent[] = [];
  private shotCount = 0;
  /** Bumped on every change listeners should know about (cheap change detection). */
  version = 0;

  constructor(params: LaunchParams) {
    this.params = params;
  }

  get body(): Body {
    return BODIES[this.params.bodyId];
  }

  /** Launch position for the current parameters (for drawing the cannon). */
  get launchPoint() {
    return launchState({ body: this.body, altitude: this.params.altitude, v0: 0, drag: false });
  }

  setParams(next: Partial<LaunchParams>) {
    const prev = this.params;
    this.params = { ...prev, ...next };
    // A different planet or mountain makes old shots meaningless for comparison.
    if (this.params.bodyId !== prev.bodyId || this.params.altitude !== prev.altitude) {
      this.clearShots();
    }
    this.version++;
  }

  fire() {
    if (this.current) {
      this.ghosts.push(this.current);
      if (this.ghosts.length > MAX_GHOSTS) this.ghosts.shift();
    }
    const flight = createFlight({
      body: this.body,
      altitude: this.params.altitude,
      v0: this.params.v0,
      drag: this.params.drag,
    });
    const trail = new Trail();
    trail.reset(flight.state);
    const samples = new SampleBuffer();
    samples.offer(sampleOf(flight.state, this.body), true);
    this.current = {
      label: LABELS[this.shotCount % LABELS.length]!,
      flight,
      trail,
      params: { ...this.params },
      samples,
    };
    this.shotCount++;
    this.lastEvents = [];
    this.running = true;
    this.version++;
  }

  clearShots() {
    this.current = null;
    this.ghosts = [];
    this.shotCount = 0;
    this.lastEvents = [];
    this.running = false;
    this.version++;
  }

  /** Advance by `realDt` seconds of wall-clock time (scaled by the time warp). */
  tick(realDt: number): FlightEvent[] {
    const shot = this.current;
    if (!this.running || !shot || shot.flight.status !== 'flying') return [];
    const dt = Math.min(realDt, 0.05) * this.warp;
    const body = shot.flight.env.body;
    const events = advanceFlight(shot.flight, dt, (s) => {
      shot.trail.add(s);
      shot.samples.offer(sampleOf(s, body));
    });
    // Always keep the final point (impact or escape) in the graphs.
    if (shot.flight.status !== 'flying') shot.samples.offer(sampleOf(shot.flight.state, body), true);
    if (events.length) {
      this.lastEvents = [...this.lastEvents, ...events].slice(-5);
      if (shot.flight.status !== 'flying') this.running = false;
      this.version++;
    }
    return events;
  }
}
