import type { State } from '../physics/orbitalPhysics';

/** Maximum spacing between stored trail points (m). Chord error at LEO ≈ 2 cm. */
export const TRAIL_SPACING = 1000;
const MAX_POINTS = 400_000;

/**
 * Growable list of world-space points along a flight.
 * Long integration steps are filled in with cubic Hermite interpolation
 * (uses positions *and* velocities at both ends), so the drawn path stays
 * accurate even when zoomed in after a high time-warp run.
 */
export class Trail {
  xs = new Float64Array(4096);
  ys = new Float64Array(4096);
  length = 0;
  private last: State | null = null;

  reset(start: State) {
    this.length = 0;
    this.last = start;
    this.push(start.x, start.y);
  }

  private push(x: number, y: number) {
    if (this.length === this.xs.length) {
      if (this.length >= MAX_POINTS) this.thin();
      else {
        const nx = new Float64Array(this.xs.length * 2);
        const ny = new Float64Array(this.ys.length * 2);
        nx.set(this.xs);
        ny.set(this.ys);
        this.xs = nx;
        this.ys = ny;
      }
    }
    this.xs[this.length] = x;
    this.ys[this.length] = y;
    this.length++;
  }

  /** Drop every other point (keeps the newest) when the buffer is full. */
  private thin() {
    let j = 0;
    for (let i = 0; i < this.length; i += 2) {
      this.xs[j] = this.xs[i]!;
      this.ys[j] = this.ys[i]!;
      j++;
    }
    this.length = j;
  }

  /** Add the segment from the previous state to `s`. */
  add(s: State) {
    const a = this.last;
    this.last = s;
    if (!a) {
      this.push(s.x, s.y);
      return;
    }
    const lx = this.xs[this.length - 1]!;
    const ly = this.ys[this.length - 1]!;
    const dist = Math.hypot(s.x - lx, s.y - ly);
    if (dist < TRAIL_SPACING && s.t - a.t < 0.1) return; // keep it light at 1x
    const segment = Math.hypot(s.x - a.x, s.y - a.y);
    const n = Math.max(1, Math.ceil(segment / TRAIL_SPACING));
    const h = s.t - a.t;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const p = hermite(a, s, h, u);
      this.push(p.x, p.y);
    }
  }
}

/** Cubic Hermite interpolation between two states, u ∈ [0, 1]. */
export function hermite(a: State, b: State, h: number, u: number): { x: number; y: number } {
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return {
    x: h00 * a.x + h10 * h * a.vx + h01 * b.x + h11 * h * b.vx,
    y: h00 * a.y + h10 * h * a.vy + h01 * b.y + h11 * h * b.vy,
  };
}
