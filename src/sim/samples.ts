/**
 * Time series recorded during a flight for the graphs tab. Keeps at most
 * CAPACITY points: when full, every other point is dropped and the sampling
 * interval doubles, so a whole flight always fits with even spacing.
 */
export const CAPACITY = 2048;

export const SERIES = ['t', 'h', 'v', 'ek', 'ep', 'loss'] as const;
export type SeriesKey = (typeof SERIES)[number];

export class SampleBuffer {
  data: Record<SeriesKey, Float64Array>;
  length = 0;
  interval: number;
  private lastT = -Infinity;
  /** Bumped on every change so charts know when to redraw. */
  version = 0;

  constructor(interval = 0.02) {
    this.interval = interval;
    this.data = Object.fromEntries(SERIES.map((k) => [k, new Float64Array(CAPACITY)])) as Record<SeriesKey, Float64Array>;
  }

  /** Offer a sample; it is kept only if enough simulated time has passed. */
  offer(sample: Record<SeriesKey, number>, force = false) {
    if (!force && sample.t - this.lastT < this.interval) return;
    if (this.length === CAPACITY) this.decimate();
    for (const k of SERIES) this.data[k][this.length] = sample[k];
    this.length++;
    this.lastT = sample.t;
    this.version++;
  }

  private decimate() {
    let j = 0;
    for (let i = 0; i < this.length; i += 2) {
      for (const k of SERIES) this.data[k][j] = this.data[k][i]!;
      j++;
    }
    this.length = j;
    this.interval *= 2;
  }
}
