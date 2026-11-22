/**
 * Guided lessons (Felfedező mód): what each one sets up, and how the app
 * decides that the student has completed the task. Pure functions: tested.
 */
import { BODIES, circularSpeed, escapeSpeed, type BodyId } from '../physics/bodies';
import { advanceFlight, createFlight } from '../physics/orbitalPhysics';
import { elementsFromState } from '../physics/orbitalElements';
import type { Shot, Warp } from './simulation';

export interface LessonSetup {
  bodyId: BodyId;
  altitude: number;
  /** Launch speed in m/s, or 'v1' for the first cosmic velocity at that height. */
  v0: number | 'v1';
  warp: Warp;
}

export const LESSON_SETUPS: [LessonSetup, LessonSetup, LessonSetup, LessonSetup] = [
  { bodyId: 'earth', altitude: 400_000, v0: 4_000, warp: 500 },
  { bodyId: 'earth', altitude: 8_850, v0: 'v1', warp: 1 },
  { bodyId: 'earth', altitude: 400_000, v0: 7_000, warp: 500 },
  { bodyId: 'earth', altitude: 400_000, v0: 9_000, warp: 2000 },
];

/** Index of the correct answer to each prediction question. */
export const LESSON_ANSWERS = [1, 1, 1, 1] as const;

export type LessonResult =
  | { kind: 'range'; km: number }
  | { kind: 'curvature'; x: number; drop: number; curve: number }
  | { kind: 'circle'; v0: number; period: number; kepler: number }
  | { kind: 'escape'; v0: number; v2: number };

/** The first second of a horizontal shot at v₁: distance, drop below the launch line, and how far the surface curves away. */
export function firstSecond(bodyId: BodyId, altitude: number) {
  const body = BODIES[bodyId];
  const r0 = body.radius + altitude;
  const f = createFlight({ body, altitude, v0: circularSpeed(body, r0), drag: false });
  advanceFlight(f, 1);
  const x = f.state.x;
  return { x, drop: r0 - f.state.y, curve: Math.hypot(r0, x) - r0 };
}

/** Has the student completed lesson `i` with any of these shots? Returns the numbers to show, or null. */
export function lessonResult(i: number, shots: Shot[]): LessonResult | null {
  if (i === 0) {
    let best = 0;
    for (const s of shots)
      if (s.flight.status === 'crashed') best = Math.max(best, Math.abs(s.flight.swept) * s.flight.env.body.radius);
    return best >= 5_000_000 ? { kind: 'range', km: best / 1000 } : null;
  }
  if (i === 1) {
    for (const s of shots) {
      const body = s.flight.env.body;
      const v1 = circularSpeed(body, body.radius + s.params.altitude);
      if (s.params.altitude <= 10_000 && Math.abs(s.params.v0 - v1) / v1 < 0.01 && s.flight.state.t >= 1 && !s.params.drag) {
        return { kind: 'curvature', ...firstSecond(body.id, s.params.altitude) };
      }
    }
    return null;
  }
  if (i === 2) {
    for (const s of shots) {
      const el = elementsFromState(s.flight.launch, s.flight.env.body.GM);
      if (s.flight.orbitsCompleted >= 1 && el.e < 0.01 && s.flight.measuredPeriod !== null && !s.params.drag)
        return { kind: 'circle', v0: s.params.v0, period: s.flight.measuredPeriod, kepler: el.period };
    }
    return null;
  }
  for (const s of shots)
    if (s.flight.status === 'escaped') {
      const body = s.flight.env.body;
      return { kind: 'escape', v0: s.params.v0, v2: escapeSpeed(body, body.radius + s.params.altitude) };
    }
  return null;
}
