import type { BodyId } from '../physics/bodies';

/** Deterministic pseudo-random numbers so the planets look the same every time. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PlanetStyle {
  base: string;
  dark: string;
  /** Ground colour when zoomed in close to the surface. */
  ground: string;
  groundDark: string;
  /** Atmosphere glow colour (r, g, b) or null. */
  glow: [number, number, number] | null;
}

export const PLANET_STYLE: Record<BodyId, PlanetStyle> = {
  earth: { base: '#1c4f8a', dark: '#0b2346', ground: '#4d6e43', groundDark: '#24361f', glow: [143, 208, 255] },
  moon: { base: '#9ca3af', dark: '#4b5563', ground: '#8b8f96', groundDark: '#4a4d52', glow: null },
  mars: { base: '#c2410c', dark: '#5b1d07', ground: '#a8481f', groundDark: '#5e2511', glow: [251, 146, 60] },
};

const SIZE = 1024;
const cache = new Map<BodyId, HTMLCanvasElement>();
/** Unlit surface colours of each texture, for matching the close-up ground to the globe. */
const albedo = new Map<BodyId, ImageData>();

/**
 * Surface colour of the globe just inside the rim at polar angle `theta`
 * (world frame: radians from +x, counter-clockwise), averaged over a few pixels.
 * Lets the zoomed-in ground continue the colour of the globe (ice, ocean, land).
 */
export function surfaceColorAt(id: BodyId, theta: number): [number, number, number] {
  planetTexture(id);
  const img = albedo.get(id)!;
  const R = SIZE / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const dr of [0.96, 0.975, 0.99])
    for (const da of [-0.01, 0, 0.01]) {
      const x = Math.round(R + Math.cos(theta + da) * R * dr);
      const y = Math.round(R - Math.sin(theta + da) * R * dr);
      const i = (Math.min(SIZE - 1, Math.max(0, y)) * SIZE + Math.min(SIZE - 1, Math.max(0, x))) * 4;
      r += img.data[i]!;
      g += img.data[i + 1]!;
      b += img.data[i + 2]!;
      n++;
    }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/** Earth's continents on the texture: centre x, centre y, radius (fractions of the disk), stretch. Seed = 101 + 17·i. */
export const EARTH_LAND: [number, number, number, number][] = [
  [0.22, 0.42, 0.17, 1.3], [0.3, 0.72, 0.12, 0.8], [0.62, 0.3, 0.13, 1.1],
  [0.7, 0.58, 0.16, 0.9], [0.86, 0.78, 0.08, 1.2], [0.45, 0.52, 0.05, 1.5],
];

/** Organic closed coastline: a smooth curve through points with seeded radius noise. */
export function coast(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, stretch: number, seed: number, n = 16) {
  const rnd = mulberry32(seed);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.78 + rnd() * 0.34);
    return [cx + Math.cos(a) * rr * stretch, cy + Math.sin(a) * rr] as const;
  });
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  ctx.beginPath();
  const start = mid(pts[n - 1]!, pts[0]!);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = mid(p, pts[(i + 1) % n]!);
    ctx.quadraticCurveTo(p[0], p[1], q[0], q[1]);
  }
  ctx.closePath();
}

/** Blob made of overlapping circles along a random walk (continents, maria, dark regions). */
function blob(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, y: number, size: number, steps: number) {
  for (let i = 0; i < steps; i++) {
    ctx.beginPath();
    ctx.arc(x, y, size * (0.4 + rnd() * 0.6), 0, Math.PI * 2);
    ctx.fill();
    x += (rnd() - 0.5) * size * 1.2;
    y += (rnd() - 0.5) * size * 1.2;
  }
}

/** Pre-rendered planet disk (SIZE × SIZE), shaded with light from the upper left. */
export function planetTexture(id: BodyId): HTMLCanvasElement {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d')!;
  const R = SIZE / 2;
  const st = PLANET_STYLE[id];
  const rnd = mulberry32(id === 'earth' ? 7 : id === 'moon' ? 11 : 23);

  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = st.base;
  ctx.fillRect(0, 0, SIZE, SIZE);

  if (id === 'earth') {
    // Ocean depth variation
    const deep = ctx.createRadialGradient(R * 0.7, R * 0.6, R * 0.1, R, R, R);
    deep.addColorStop(0, 'rgba(70,140,200,0.35)');
    deep.addColorStop(1, 'rgba(5,20,45,0.35)');
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Continents: organic coastlines with drier interiors
    EARTH_LAND.forEach(([cx, cy, r, stretch], i) => {
      ctx.fillStyle = ['#4d6e43', '#557a49', '#5e7347', '#4f7246'][i % 4]!;
      ctx.strokeStyle = 'rgba(210,230,210,0.18)';
      ctx.lineWidth = 2;
      coast(ctx, cx * SIZE, cy * SIZE, r * SIZE, stretch, 101 + i * 17);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = i % 2 ? 'rgba(166,143,94,0.75)' : 'rgba(140,125,85,0.6)';
      coast(ctx, cx * SIZE + r * SIZE * 0.15, cy * SIZE + r * SIZE * 0.1, r * SIZE * 0.32, stretch * 1.2, 7 + i);
      ctx.fill();
    });
    // Small polar ice caps
    ctx.fillStyle = '#eef5fb';
    coast(ctx, R, SIZE * 0.012, SIZE * 0.035, 2.6, 5);
    ctx.fill();
    coast(ctx, R, SIZE * 0.99, SIZE * 0.04, 2.8, 9);
    ctx.fill();
    // Soft cloud bands
    for (let k = 0; k < 34; k++) {
      const x = rnd() * SIZE;
      const y = rnd() * SIZE;
      const w = 40 + rnd() * 110;
      const g = ctx.createRadialGradient(x, y, 0, x, y, w);
      g.addColorStop(0, 'rgba(255,255,255,0.42)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.12 + rnd() * 0.1);
      ctx.translate(-x, -y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, w, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (id === 'moon') {
    ctx.fillStyle = 'rgba(55,60,70,0.45)';
    for (let k = 0; k < 6; k++) blob(ctx, rnd, rnd() * SIZE, rnd() * SIZE, 45 + rnd() * 40, 14);
    for (let k = 0; k < 140; k++) {
      const x = rnd() * SIZE;
      const y = rnd() * SIZE;
      const r = 3 + rnd() ** 3 * 40;
      ctx.fillStyle = 'rgba(40,44,52,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(235,238,245,0.25)';
      ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.beginPath();
      ctx.arc(x + r * 0.08, y + r * 0.08, r, Math.PI * 0.9, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(80,25,8,0.45)';
    for (let k = 0; k < 9; k++) blob(ctx, rnd, rnd() * SIZE, SIZE * 0.2 + rnd() * SIZE * 0.6, 30 + rnd() * 45, 20);
    ctx.fillStyle = 'rgba(234,120,60,0.35)';
    for (let k = 0; k < 6; k++) blob(ctx, rnd, rnd() * SIZE, rnd() * SIZE, 30 + rnd() * 30, 12);
    ctx.fillStyle = '#f8ede6';
    ctx.beginPath();
    ctx.ellipse(R, 6, R * 0.35, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(R, SIZE - 4, R * 0.25, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  albedo.set(id, ctx.getImageData(0, 0, SIZE, SIZE));

  // Lighting: bright upper-left, terminator and limb darkening.
  const light = ctx.createRadialGradient(R * 0.55, R * 0.5, R * 0.1, R, R, R * 1.05);
  light.addColorStop(0, 'rgba(255,255,255,0.18)');
  light.addColorStop(0.5, 'rgba(0,0,0,0)');
  light.addColorStop(0.8, 'rgba(0,0,0,0.38)');
  light.addColorStop(1, 'rgba(2,8,20,0.78)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();

  cache.set(id, c);
  return c;
}
