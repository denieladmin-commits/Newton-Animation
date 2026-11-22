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
  earth: { base: '#1d4f91', dark: '#0b2142', ground: '#3d6b45', groundDark: '#1f3a26', glow: [96, 165, 250] },
  moon: { base: '#9ca3af', dark: '#4b5563', ground: '#8b8f96', groundDark: '#4a4d52', glow: null },
  mars: { base: '#c2410c', dark: '#5b1d07', ground: '#a8481f', groundDark: '#5e2511', glow: [251, 146, 60] },
};

const SIZE = 1024;
const cache = new Map<BodyId, HTMLCanvasElement>();

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
    const land = ['#2f6b3a', '#3f7d3f', '#6b6a3a', '#7a6a45'];
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = land[k % land.length]!;
      ctx.globalAlpha = 0.9;
      blob(ctx, rnd, rnd() * SIZE, SIZE * 0.15 + rnd() * SIZE * 0.7, 40 + rnd() * 50, 30);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e8f1fb';
    ctx.beginPath();
    ctx.ellipse(R, 0, R * 0.55, SIZE * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(R, SIZE, R * 0.6, SIZE * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let k = 0; k < 40; k++) {
      ctx.beginPath();
      ctx.ellipse(rnd() * SIZE, rnd() * SIZE, 30 + rnd() * 90, 6 + rnd() * 10, (rnd() - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
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

  // Lighting: bright upper-left, terminator and limb darkening.
  const light = ctx.createRadialGradient(R * 0.55, R * 0.5, R * 0.1, R, R, R * 1.05);
  light.addColorStop(0, 'rgba(255,255,255,0.18)');
  light.addColorStop(0.5, 'rgba(0,0,0,0)');
  light.addColorStop(0.85, 'rgba(0,0,0,0.35)');
  light.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();

  cache.set(id, c);
  return c;
}
