/**
 * Verification suite for the physics core (PLAN.md §8, layers 1–6).
 * Each `it` states the physical claim it checks.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { BODIES, circularSpeed, escapeSpeed, surfaceGravity, type Body } from '../bodies';
import {
  advanceFlight,
  createFlight,
  forces,
  isPerpendicular,
  radius,
  rk4Step,
  specificAngularMomentum,
  specificEnergy,
  speed,
  velocityComponents,
  DEFAULT_PROJECTILE,
  type Environment,
  type Flight,
  type FlightEvent,
  type State,
} from '../orbitalPhysics';
import { classifyTrajectory, elementsFromState } from '../orbitalElements';
import { analyticImpact, propagate } from '../kepler';

const earth = BODIES.earth;
const EVEREST = 8_850;
const ISS = 400_000;

const relErr = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

function run(flight: Flight, duration: number, onStep?: (s: State) => void): FlightEvent[] {
  return advanceFlight(flight, duration, onStep);
}

// ───────────────────────── Layer 4: textbook numbers ─────────────────────────
describe('textbook values (NASA fact-sheet constants)', () => {
  it.each([
    ['earth', 7.91, 11.19],
    ['moon', 1.68, 2.38],
    ['mars', 3.55, 5.03],
  ] as const)('%s: v₁ ≈ %f km/s and v₂ ≈ %f km/s at the surface', (id, v1, v2) => {
    const b = BODIES[id];
    expect(circularSpeed(b, b.radius) / 1000).toBeCloseTo(v1, 2);
    expect(escapeSpeed(b, b.radius) / 1000).toBeCloseTo(v2, 2);
  });

  it('v₂ = √2 · v₁', () => {
    const r = earth.radius + ISS;
    expect(escapeSpeed(earth, r) / circularSpeed(earth, r)).toBeCloseTo(Math.SQRT2, 12);
  });

  it('surface gravity of the non-rotating model: Earth 9.82, Moon 1.62, Mars 3.73 m/s²', () => {
    expect(surfaceGravity(BODIES.earth)).toBeCloseTo(9.82, 2);
    expect(surfaceGravity(BODIES.moon)).toBeCloseTo(1.62, 2);
    expect(surfaceGravity(BODIES.mars)).toBeCloseTo(3.73, 2);
  });

  it('circular orbit at ISS altitude (400 km): v = 7.67 km/s, T = 92.4 min', () => {
    const r = earth.radius + ISS;
    expect(circularSpeed(earth, r) / 1000).toBeCloseTo(7.67, 2);
    const T = 2 * Math.PI * Math.sqrt(r ** 3 / earth.GM);
    expect(T / 60).toBeCloseTo(92.4, 1);
  });
});

// ─────────────────────── The "8 km / 5 m" principle ───────────────────────
describe('Newton’s insight: the first second of flight', () => {
  const r0 = earth.radius + EVEREST;
  const g0 = earth.GM / r0 ** 2;

  it('dropped from rest, the ball falls ½·g·t² ≈ 4.9 m in the first second', () => {
    const f = createFlight({ body: earth, altitude: EVEREST, v0: 0, drag: false });
    run(f, 1);
    const fall = r0 - radius(f.state);
    expect(fall).toBeCloseTo(0.5 * g0, 3);
    expect(fall).toBeCloseTo(4.9, 1);
  });

  it('fired at v₁, it falls the same 4.9 m below its launch line — and the surface curves away by just as much', () => {
    const v1 = circularSpeed(earth, r0);
    const f = createFlight({ body: earth, altitude: EVEREST, v0: v1, drag: false });
    run(f, 1);
    const dropBelowLaunchLine = r0 - f.state.y;
    expect(dropBelowLaunchLine).toBeCloseTo(0.5 * g0, 2);
    // How far the curved surface drops away from a horizontal line after the same distance:
    const d = f.state.x;
    const curvatureDrop = Math.sqrt(r0 ** 2 + d ** 2) - r0;
    expect(curvatureDrop).toBeCloseTo(dropBelowLaunchLine, 2);
    // …so the height above the ground does not change at all.
    expect(Math.abs(radius(f.state) - r0)).toBeLessThan(1e-3);
    expect(d / 1000).toBeCloseTo(7.9, 1);
  });

  it('Earth’s surface drops ≈ 5 m over 8 km (d²/2R)', () => {
    expect((8000 ** 2) / (2 * earth.radius)).toBeCloseTo(5.02, 2);
  });
});

// ──────────────────── Layer 1: exact analytic reference ────────────────────
describe('agreement with the exact Kepler solution (drag-free)', () => {
  const cases: [string, Body, number, number][] = [
    ['Earth circular, ISS altitude', earth, ISS, 1.0],
    ['Earth ellipse, e ≈ 0.44', earth, EVEREST, 1.2],
    ['Earth ellipse, e ≈ 0.96 (near escape)', earth, EVEREST, 1.4],
    ['Moon ellipse', BODIES.moon, 50_000, 1.1],
    ['Mars ellipse', BODIES.mars, 100_000, 1.25],
    ['Earth hyperbola (escape)', earth, EVEREST, 1.6],
  ];

  it.each(cases)('%s: simulated path stays on the exact conic', (_name, body, h, factor) => {
    const r0 = body.radius + h;
    const v0 = factor * circularSpeed(body, r0);
    const f = createFlight({ body, altitude: h, v0, drag: false });
    const el = elementsFromState(f.launch, body.GM);
    const duration = Number.isFinite(el.period) ? el.period : 50_000;
    let worst = 0;
    let checks = 0;
    const samples = 200;
    for (let i = 1; i <= samples; i++) {
      run(f, duration / samples);
      if (f.status !== 'flying') break;
      const exact = propagate(f.launch, body.GM, f.state.t);
      const err = Math.hypot(f.state.x - exact.x, f.state.y - exact.y) / radius(f.state);
      worst = Math.max(worst, err);
      checks++;
    }
    expect(checks).toBeGreaterThan(10);
    // < 1 m of position error per 1000 km of distance
    expect(worst).toBeLessThan(1e-6);
  });

  it('measured period matches Kepler’s third law within 0.01 %', () => {
    for (const [body, h, factor] of [
      [earth, ISS, 1.0],
      [earth, EVEREST, 1.2],
      [BODIES.moon, 20_000, 1.05],
      [BODIES.mars, 300_000, 1.3],
    ] as const) {
      const r0 = body.radius + h;
      const f = createFlight({ body, altitude: h, v0: factor * circularSpeed(body, r0), drag: false });
      const T = elementsFromState(f.launch, body.GM).period;
      run(f, T * 1.01);
      expect(f.measuredPeriod).not.toBeNull();
      expect(relErr(f.measuredPeriod!, T)).toBeLessThan(1e-4);
    }
  });

  it('a sub-orbital shot lands where and when Kepler predicts', () => {
    for (const v0 of [1000, 3000, 5000, 7000, 7800]) {
      const f = createFlight({ body: earth, altitude: EVEREST, v0, drag: false });
      const events = run(f, 1e5);
      const crash = events.find((e) => e.type === 'crash');
      expect(crash).toBeDefined();
      expect(Math.abs(radius(f.state) - earth.radius)).toBeLessThan(1e-3);
      const exact = analyticImpact(earth.GM, earth.radius, earth.radius + EVEREST, v0)!;
      expect(relErr(f.state.t, exact.time)).toBeLessThan(1e-6);
      const angle = Math.atan2(f.state.x, f.state.y);
      // surface range error < 1 m
      expect(Math.abs(angle - exact.angle) * earth.radius).toBeLessThan(1);
      // …and the range the app displays (from the swept angle) agrees too
      expect(Math.abs(Math.abs(f.swept) - exact.angle) * earth.radius).toBeLessThan(1);
    }
  });

  it('range readout from ISS height matches Kepler (4.0 → 1382 km, 6.0 → 2856 km, 7.3 → 7384 km)', () => {
    for (const [v0, km] of [[4000, 1382], [6000, 2856], [7000, 5171], [7300, 7384]] as const) {
      const f = createFlight({ body: earth, altitude: ISS, v0, drag: false });
      run(f, 1e5);
      expect(f.status).toBe('crashed');
      expect(Math.abs(f.swept) * earth.radius / 1000).toBeCloseTo(km, 0);
    }
  });

  it('dropped from rest: free-fall time matches the closed-form solution', () => {
    const f = createFlight({ body: earth, altitude: 100_000, v0: 0, drag: false });
    run(f, 1e4);
    const exact = analyticImpact(earth.GM, earth.radius, earth.radius + 100_000, 0)!;
    expect(f.status).toBe('crashed');
    expect(relErr(f.state.t, exact.time)).toBeLessThan(1e-6);
  });
});

// ─────────────────────── Escape at the second cosmic speed ───────────────────────
describe('second cosmic (escape) velocity', () => {
  const r0 = earth.radius + EVEREST;
  const v2 = escapeSpeed(earth, r0);

  it('at exactly v₂ the total energy is zero', () => {
    const f = createFlight({ body: earth, altitude: EVEREST, v0: v2, drag: false });
    expect(Math.abs(specificEnergy(f.launch, earth)) / (earth.GM / r0)).toBeLessThan(1e-12);
  });

  it('fired at exactly v₂ (the v₂ button) the ball escapes, within ~1 min at 500×', () => {
    for (const id of ['earth', 'moon', 'mars'] as const) {
      const b = BODIES[id];
      const f = createFlight({ body: b, altitude: 400_000, v0: escapeSpeed(b, b.radius + 400_000), drag: false });
      expect(classifyTrajectory(f.launch, b)).toBe('escape');
      const events = run(f, 1e6);
      expect(events.some((e) => e.type === 'escape')).toBe(true);
      expect(f.state.t / 500).toBeLessThan(60);
    }
  });

  it('just above v₂ the ball escapes; just below, it stays bound', () => {
    const fast = createFlight({ body: earth, altitude: EVEREST, v0: 1.001 * v2, drag: false });
    const events = run(fast, 1e7);
    expect(events.some((e) => e.type === 'escape')).toBe(true);
    expect(fast.status).toBe('escaped');

    const slow = createFlight({ body: earth, altitude: EVEREST, v0: 0.999 * v2, drag: false });
    expect(specificEnergy(slow.launch, earth)).toBeLessThan(0);
    expect(classifyTrajectory(slow.launch, earth)).toBe('elliptical');
  });
});

// ─────────────────────── Layer 2: conservation laws ───────────────────────
describe('conservation laws (drag-free)', () => {
  it('energy and angular momentum drift < 10⁻⁸ per orbit (10 orbits)', () => {
    for (const factor of [1.0, 1.2, 1.35]) {
      const r0 = earth.radius + EVEREST;
      const f = createFlight({ body: earth, altitude: EVEREST, v0: factor * circularSpeed(earth, r0), drag: false });
      const E0 = specificEnergy(f.launch, earth);
      const L0 = specificAngularMomentum(f.launch);
      const T = elementsFromState(f.launch, earth.GM).period;
      let worstE = 0;
      let worstL = 0;
      run(f, 10 * T, (s) => {
        worstE = Math.max(worstE, relErr(specificEnergy(s, earth), E0));
        worstL = Math.max(worstL, relErr(specificAngularMomentum(s), L0));
      });
      expect(f.orbitsCompleted).toBeGreaterThanOrEqual(9);
      expect(worstE / 10).toBeLessThan(1e-8);
      expect(worstL / 10).toBeLessThan(1e-8);
    }
  });
});

// ─────────────────────── Layer 3: convergence order ───────────────────────
describe('RK4 convergence', () => {
  it('halving the time step cuts the error ≈ 16× (4th-order method)', () => {
    const r0 = earth.radius + ISS;
    const s0: State = { t: 0, x: 0, y: r0, vx: 1.15 * circularSpeed(earth, r0), vy: 0, w: 0 };
    const env: Environment = { body: earth, drag: false, projectile: DEFAULT_PROJECTILE };
    const duration = 4000;
    const exact = propagate(s0, earth.GM, duration);
    const errorWithStep = (h: number) => {
      let s = s0;
      const n = Math.round(duration / h);
      for (let i = 0; i < n; i++) s = rk4Step(s, h, env);
      return Math.hypot(s.x - exact.x, s.y - exact.y);
    };
    const e1 = errorWithStep(80);
    const e2 = errorWithStep(40);
    const e3 = errorWithStep(20);
    expect(e1 / e2).toBeGreaterThan(13);
    expect(e1 / e2).toBeLessThan(19);
    expect(e2 / e3).toBeGreaterThan(13);
    expect(e2 / e3).toBeLessThan(19);
  });
});

// ─────────────────────────────── Drag ───────────────────────────────
describe('air drag (realistic, on/off)', () => {
  it('energy only decreases, and the loss equals the work done by drag', () => {
    const r0 = earth.radius + 60_000;
    const f = createFlight({ body: earth, altitude: 60_000, v0: circularSpeed(earth, r0), drag: true });
    const E0 = specificEnergy(f.launch, earth);
    let prevE = E0;
    let monotonic = true;
    let worstBalance = 0;
    run(f, 20_000, (s) => {
      const E = specificEnergy(s, earth);
      if (E > prevE + 1e-6) monotonic = false;
      prevE = E;
      // E(t) − w(t) must stay equal to E0 (w = drag work, ≤ 0)
      worstBalance = Math.max(worstBalance, Math.abs(E - s.w - E0) / Math.abs(E0));
    });
    expect(monotonic).toBe(true);
    expect(worstBalance).toBeLessThan(1e-6);
    expect(f.status).toBe('crashed');
  });

  it('from Everest at v₁, real air halves the speed within ~1–2 s and the ball falls short', () => {
    const r0 = earth.radius + EVEREST;
    const v1 = circularSpeed(earth, r0);
    const f = createFlight({ body: earth, altitude: EVEREST, v0: v1, drag: true });
    run(f, 2);
    expect(speed(f.state)).toBeLessThan(v1 / 2);
    run(f, 1e4);
    expect(f.status).toBe('crashed');
  });

  it('the Moon has no air: drag on or off gives the same path', () => {
    const moon = BODIES.moon;
    const a = createFlight({ body: moon, altitude: 10_000, v0: 1500, drag: true });
    const b = createFlight({ body: moon, altitude: 10_000, v0: 1500, drag: false });
    run(a, 3000);
    run(b, 3000);
    expect(a.state).toEqual(b.state);
  });

  it('real air thins out but does not stop at 100 km: tiny drag at 400 km, none above 1000 km', () => {
    const env: Environment = { body: earth, drag: true, projectile: DEFAULT_PROJECTILE };
    const at = (h: number) => {
      const fr = forces({ t: 0, x: 0, y: earth.radius + h, vx: 7700, vy: 0, w: 0 }, env);
      return Math.hypot(fr.dx, fr.dy);
    };
    expect(at(400_000)).toBeGreaterThan(0);
    expect(at(400_000)).toBeLessThan(1e-5); // < one millionth of g
    expect(at(1_000_001)).toBe(0);
  });
});

// ─────────────────────── Layer 6: vectors & 90° marker ───────────────────────
describe('vectors and the 90° marker', () => {
  const env: Environment = { body: earth, drag: false, projectile: DEFAULT_PROJECTILE };

  it('gravity always points at the planet’s centre (< 0.01°)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }),
        fc.double({ min: earth.radius, max: 30 * earth.radius, noNaN: true }),
        (theta, r) => {
          const s: State = { t: 0, x: r * Math.cos(theta), y: r * Math.sin(theta), vx: 1, vy: 2, w: 0 };
          const f = forces(s, env);
          const toCentre = Math.atan2(-s.y, -s.x);
          const dir = Math.atan2(f.gy, f.gx);
          const diff = Math.abs(Math.atan2(Math.sin(dir - toCentre), Math.cos(dir - toCentre)));
          return diff < (0.01 * Math.PI) / 180;
        },
      ),
    );
  });

  it('v_r and v_t add up exactly to v (Pythagoras)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e7, max: 1e7, noNaN: true }),
        fc.double({ min: 7e6, max: 1e8, noNaN: true }),
        fc.double({ min: -2e4, max: 2e4, noNaN: true }),
        fc.double({ min: -2e4, max: 2e4, noNaN: true }),
        (x, y, vx, vy) => {
          const s: State = { t: 0, x, y, vx, vy, w: 0 };
          const { vr, vt } = velocityComponents(s);
          const v = speed(s);
          return Math.abs(Math.hypot(vr, vt) - v) <= 1e-9 * Math.max(1, v);
        },
      ),
    );
  });

  it('circular orbit: v ⟂ F_g during the whole revolution', () => {
    const r0 = earth.radius + ISS;
    const f = createFlight({ body: earth, altitude: ISS, v0: circularSpeed(earth, r0), drag: false });
    let always = true;
    run(f, 5600, (s) => {
      if (!isPerpendicular(s)) always = false;
    });
    expect(always).toBe(true);
  });

  it('ellipse: v ⟂ F_g only near periapsis and apoapsis', () => {
    const r0 = earth.radius + EVEREST;
    const f = createFlight({ body: earth, altitude: EVEREST, v0: 1.2 * circularSpeed(earth, r0), drag: false });
    const el = elementsFromState(f.launch, earth.GM);
    let wrong = 0;
    let perpendicularSamples = 0;
    run(f, el.period, (s) => {
      if (!isPerpendicular(s)) return;
      perpendicularSamples++;
      const r = radius(s);
      const nearApsis =
        Math.abs(r - el.periapsis) / el.periapsis < 0.01 || Math.abs(r - el.apoapsis) / el.apoapsis < 0.01;
      if (!nearApsis) wrong++;
    });
    expect(perpendicularSamples).toBeGreaterThan(0);
    expect(wrong).toBe(0);
  });
});

// ─────────────────────── Layer 5: randomised tests ───────────────────────
describe('randomised launches (property-based)', () => {
  it('any planet, height and speed: no NaN, invariants hold, outcome matches the energy/periapsis prediction', () => {
    const bodyArb = fc.constantFrom(BODIES.earth, BODIES.moon, BODIES.mars);
    fc.assert(
      fc.property(
        bodyArb,
        fc.double({ min: 1_000, max: 1_000_000, noNaN: true }),
        fc.double({ min: 0, max: 1.4, noNaN: true }),
        (body, h, frac) => {
          const r0 = body.radius + h;
          const v0 = frac * escapeSpeed(body, r0);
          const f = createFlight({ body, altitude: h, v0, drag: false });
          const kind = classifyTrajectory(f.launch, body);
          if (Math.abs(frac - 1) < 0.003) return true; // too close to parabolic to finish quickly
          const el = elementsFromState(f.launch, body.GM);
          const E0 = el.energy;
          const duration = Number.isFinite(el.period) ? el.period * 1.05 : 1e8;
          let ok = true;
          advanceFlight(f, duration, (s) => {
            if (!Number.isFinite(s.x + s.y + s.vx + s.vy)) ok = false;
            if (Math.abs(specificEnergy(s, body) - E0) > 1e-7 * Math.abs(body.GM / r0)) ok = false;
          });
          if (!ok) return false;
          if (kind === 'suborbital') return f.status === 'crashed';
          if (kind === 'escape') return f.status === 'escaped';
          return f.status === 'flying' && f.orbitsCompleted >= 1;
        },
      ),
      { numRuns: 150 },
    );
  });
});
