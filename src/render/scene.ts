/**
 * Draws one frame: space, planet, mountain, trails, cannon, ball, scale bar.
 * Everything is in true scale; only markers (cannon, ball, labels) have a fixed pixel size.
 */
import type { Body } from '../physics/bodies';
import type { State } from '../physics/orbitalPhysics';
import type { Shot, Simulation } from '../sim/simulation';
import type { Trail } from '../sim/trail';
import type { Camera } from './camera';
import { mulberry32, planetTexture, PLANET_STYLE } from './planetTexture';

export const COLORS = {
  space: '#060b19',
  trail: '#38bdf8',
  trailCore: '#bae6fd',
};

/** Above this planet radius (px) switch from the disk image to a locally drawn surface. */
const LOCAL_SURFACE_PX = 6_000;
const GHOST_COLORS = ['#a78bfa', '#f472b6', '#facc15', '#4ade80', '#fb923c', '#f87171', '#2dd4bf', '#e879f9'];

// ─────────────────────────────── stars ───────────────────────────────
interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
}
const STAR_LAYERS: { stars: Star[]; parallax: number }[] = (() => {
  const rnd = mulberry32(42);
  return [0.15, 0.35, 0.7].map((parallax, i) => ({
    parallax,
    stars: Array.from({ length: [260, 120, 50][i]! }, () => ({
      x: rnd(),
      y: rnd(),
      r: [0.5, 0.8, 1.2][i]! * (0.6 + rnd() * 0.8),
      a: 0.25 + rnd() * 0.6,
    })),
  }));
})();

function drawStars(ctx: CanvasRenderingContext2D, cam: Camera, body: Body) {
  const W = cam.width;
  const H = cam.height;
  const tile = Math.max(W, H);
  for (const layer of STAR_LAYERS) {
    // Panning across one planet radius shifts the nearest layer by ~60 px.
    const ox = ((-cam.cx / body.radius) * 60 * layer.parallax) % tile;
    const oy = ((cam.cy / body.radius) * 60 * layer.parallax) % tile;
    ctx.fillStyle = '#e2e8f0';
    for (const s of layer.stars) {
      let x = (s.x * tile + ox) % tile;
      let y = (s.y * tile + oy) % tile;
      if (x < 0) x += tile;
      if (y < 0) y += tile;
      if (x > W || y > H) continue;
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ─────────────────────── polar rings (zoomed-out views) ───────────────────────
function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

function drawRings(ctx: CanvasRenderingContext2D, cam: Camera, body: Body) {
  const Rpx = body.radius * cam.scale;
  if (Rpx > LOCAL_SURFACE_PX / 4) return;
  const ox = cam.toScreenX(0);
  const oy = cam.toScreenY(0);
  const step = niceStep(140 / cam.scale); // ring spacing in metres (~140 px)
  const maxR = Math.hypot(Math.abs(ox) + cam.width, Math.abs(oy) + cam.height) / cam.scale;
  ctx.strokeStyle = 'rgba(148,163,184,0.10)';
  ctx.lineWidth = 1;
  for (let r = body.radius + step; r < maxR && r < body.radius + 400 * step; r += step) {
    ctx.beginPath();
    ctx.arc(ox, oy, r * cam.scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(148,163,184,0.06)';
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(ox + Math.cos(a) * Rpx, oy - Math.sin(a) * Rpx);
    ctx.lineTo(ox + Math.cos(a) * maxR * cam.scale, oy - Math.sin(a) * maxR * cam.scale);
    ctx.stroke();
  }
}

// ─────────────────────────────── planet ───────────────────────────────
function drawPlanetDisk(ctx: CanvasRenderingContext2D, cam: Camera, body: Body) {
  const ox = cam.toScreenX(0);
  const oy = cam.toScreenY(0);
  const Rpx = body.radius * cam.scale;
  const style = PLANET_STYLE[body.id];

  if (style.glow && body.atmosphere) {
    const [r, g, b] = style.glow;
    // Glow is at least 6 px wide so it stays visible; real thickness when zoomed in.
    const thick = Math.max(6, body.atmosphere.cutoff * cam.scale);
    const grad = ctx.createRadialGradient(ox, oy, Rpx, ox, oy, Rpx + thick * 2.5);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(0.3, `rgba(${r},${g},${b},0.18)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ox, oy, Rpx + thick * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(ox, oy, Rpx, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(planetTexture(body.id), ox - Rpx, oy - Rpx, 2 * Rpx, 2 * Rpx);
  ctx.restore();
  ctx.strokeStyle = style.glow ? `rgba(${style.glow.join(',')},0.8)` : 'rgba(226,232,240,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(ox, oy, Rpx, 0, Math.PI * 2);
  ctx.stroke();
}

/** Close-up: the surface is drawn as a polygon around the visible part of the circle. */
function drawLocalSurface(ctx: CanvasRenderingContext2D, cam: Camera, body: Body) {
  const R = body.radius;
  const style = PLANET_STYLE[body.id];
  const theta0 = Math.atan2(cam.cy, cam.cx);
  const half = Math.hypot(cam.width, cam.height) / cam.scale; // world span of the view
  // Ground reaches from the surface down past the deepest visible point.
  const viewDist = Math.hypot(cam.cx, cam.cy);
  const depth = Math.min(R, Math.max(3 * half, R - Math.max(0, viewDist - 2 * half)));
  // Angular half-width must cover the view even at the polygon's inner edge.
  const span = Math.min(Math.PI, (1.5 * half) / Math.max(1, R - depth));
  // Enough vertices that the polygon deviates < 0.5 px from the true circle.
  const N = Math.min(4000, Math.max(96, Math.ceil((2 * span) / Math.sqrt(4 / (R * cam.scale)))));
  const pt = (theta: number, r: number) => [cam.toScreenX(r * Math.cos(theta)), cam.toScreenY(r * Math.sin(theta))] as const;

  // Sky: the real atmosphere, density falling off exponentially with height.
  if (style.glow && body.atmosphere) {
    const atm = body.atmosphere;
    const [gr, gg, gb] = style.glow;
    const top = Math.min(atm.cutoff, 6 * atm.scaleHeight);
    const [ax, ay] = pt(theta0, R);
    const [bx, by] = pt(theta0, R + top);
    const grad = ctx.createLinearGradient(ax, ay, bx, by);
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      grad.addColorStop(f, `rgba(${gr},${gg},${gb},${(0.45 * Math.exp((-f * top) / atm.scaleHeight)).toFixed(3)})`);
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const [x, y] = pt(theta0 - span + (2 * span * i) / N, R + top);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const [x, y] = pt(theta0 - span + (2 * span * i) / N, R);
      ctx.lineTo(x, y);
    }
    ctx.fill();
  }

  // Ground
  const [gx0, gy0] = pt(theta0, R);
  const [gx1, gy1] = pt(theta0, R - Math.min(depth, 40 / cam.scale));
  const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
  g.addColorStop(0, style.ground);
  g.addColorStop(1, style.groundDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const [x, y] = pt(theta0 - span + (2 * span * i) / N, R);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = N; i >= 0; i--) {
    const [x, y] = pt(theta0 - span + (2 * span * i) / N, R - depth);
    ctx.lineTo(x, y);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(226,232,240,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const [x, y] = pt(theta0 - span + (2 * span * i) / N, R);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ─────────────────────────────── mountain ───────────────────────────────
/** Mountain profile f(u), u ∈ [−1, 1]; f(0) = 1 is the summit where the cannon stands. */
function profile(u: number): number {
  const a = Math.abs(u);
  const base = (1 - a) ** 1.4;
  const ridge = 1 + 0.07 * Math.sin(19 * u + 1) * a + 0.04 * Math.sin(47 * u) * a;
  return base * ridge;
}

function drawMountain(ctx: CanvasRenderingContext2D, cam: Camera, body: Body, h: number) {
  if (h * cam.scale < 2) return;
  const R = body.radius;
  const halfWidth = 3 * h; // along the surface
  const N = 120;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = -1 + (2 * i) / N;
    const theta = Math.PI / 2 - (u * halfWidth) / R;
    const r = R + h * profile(u) - h * 0.02;
    pts.push([cam.toScreenX(r * Math.cos(theta)), cam.toScreenY(r * Math.sin(theta))]);
  }
  const summitY = cam.toScreenY(R + h);
  const baseY = cam.toScreenY(R);
  const grad = ctx.createLinearGradient(0, summitY, 0, baseY);
  grad.addColorStop(0, '#f1f5f9');
  grad.addColorStop(0.12, '#cbd5e1');
  grad.addColorStop(0.2, '#6b6158');
  grad.addColorStop(1, '#3b342e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(15,23,42,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ─────────────────────────────── trails ───────────────────────────────
const MARGIN = 50_000; // px; segments entirely beyond this are skipped

function tracePath(ctx: CanvasRenderingContext2D, cam: Camera, trail: Trail, head?: State) {
  ctx.beginPath();
  let px = NaN;
  let py = NaN;
  let pen = false;
  const n = trail.length;
  const inside = (x: number, y: number) => x > -MARGIN && y > -MARGIN && x < cam.width + MARGIN && y < cam.height + MARGIN;
  for (let i = 0; i <= n; i++) {
    let x: number;
    let y: number;
    if (i < n) {
      x = cam.toScreenX(trail.xs[i]!);
      y = cam.toScreenY(trail.ys[i]!);
    } else if (head) {
      x = cam.toScreenX(head.x);
      y = cam.toScreenY(head.y);
    } else break;
    const isLast = i >= n - 1;
    if (!isLast && pen && Math.abs(x - px) < 1 && Math.abs(y - py) < 1) continue;
    const vis = inside(x, y);
    if (pen && (vis || inside(px, py))) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    pen = true;
    px = x;
    py = y;
  }
}

function drawTrail(ctx: CanvasRenderingContext2D, cam: Camera, shot: Shot, current: boolean, color: string) {
  const head = current && shot.flight.status === 'flying' ? shot.flight.state : undefined;
  tracePath(ctx, cam, shot.trail, head);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (current) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(56,189,248,0.22)';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(56,189,248,0.45)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = COLORS.trailCore;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  } else {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.font = '600 13px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 14;
  const h = 22;
  ctx.fillStyle = 'rgba(6,11,25,0.82)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}

function shotEnd(shot: Shot): { x: number; y: number } {
  const n = shot.trail.length;
  return { x: shot.trail.xs[n - 1]!, y: shot.trail.ys[n - 1]! };
}

function drawShotLabel(ctx: CanvasRenderingContext2D, cam: Camera, shot: Shot, color: string, body: Body) {
  const end = shotEnd(shot);
  // For orbits, label the point farthest along the trail; push the label outward.
  const r = Math.hypot(end.x, end.y);
  const off = 16 / cam.scale;
  const x = cam.toScreenX(end.x + (end.x / r) * off);
  const y = cam.toScreenY(end.y + (end.y / r) * off);
  if (x < -40 || y < -40 || x > cam.width + 40 || y > cam.height + 40) return;
  pill(ctx, x, y, shot.label, color);
  if (shot.flight.status === 'crashed') {
    const cx = cam.toScreenX(end.x);
    const cy = cam.toScreenY(end.y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  void body;
}

// ─────────────────────────────── cannon & ball ───────────────────────────────
function drawCannon(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  // Muzzle at (sx, sy), barrel pointing right (horizontal launch).
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-26, -5, 26, 10, 3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-17, 7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 16);
  g.addColorStop(0, 'rgba(186,230,253,0.9)');
  g.addColorStop(0.3, 'rgba(56,189,248,0.35)');
  g.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

// ─────────────────────────────── scale bar ───────────────────────────────
export function scaleBarLength(scale: number): { meters: number; px: number } {
  const meters = niceStep(120 / scale);
  return { meters, px: meters * scale };
}

function drawScaleBar(ctx: CanvasRenderingContext2D, cam: Camera, label: (m: number) => string) {
  const { meters, px } = scaleBarLength(cam.scale);
  const x = 16;
  const y = cam.height - 18;
  ctx.strokeStyle = 'rgba(226,232,240,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y);
  ctx.lineTo(x + px, y);
  ctx.lineTo(x + px, y - 5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(226,232,240,0.9)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label(meters), x, y - 7);
}

// ─────────────────────────────── frame ───────────────────────────────
export interface SceneLabels {
  distance: (m: number) => string;
  heightTag: string;
}

export function drawScene(ctx: CanvasRenderingContext2D, cam: Camera, sim: Simulation, labels: SceneLabels) {
  const body = sim.body;
  ctx.fillStyle = COLORS.space;
  ctx.fillRect(0, 0, cam.width, cam.height);
  drawStars(ctx, cam, body);
  drawRings(ctx, cam, body);

  const Rpx = body.radius * cam.scale;
  if (Rpx < LOCAL_SURFACE_PX) drawPlanetDisk(ctx, cam, body);
  else drawLocalSurface(ctx, cam, body);
  drawMountain(ctx, cam, body, sim.params.altitude);

  sim.ghosts.forEach((g, i) => drawTrail(ctx, cam, g, false, GHOST_COLORS[i % GHOST_COLORS.length]!));
  if (sim.current) drawTrail(ctx, cam, sim.current, true, COLORS.trail);
  sim.ghosts.forEach((g, i) => drawShotLabel(ctx, cam, g, GHOST_COLORS[i % GHOST_COLORS.length]!, body));
  if (sim.current && sim.current.flight.status !== 'flying') drawShotLabel(ctx, cam, sim.current, COLORS.trail, body);

  const lp = sim.launchPoint;
  const lx = cam.toScreenX(lp.x);
  const ly = cam.toScreenY(lp.y);
  drawCannon(ctx, lx, ly);
  if (sim.params.altitude * cam.scale < 2) {
    ctx.globalAlpha = 0.85;
    pill(ctx, lx - 14, ly - 22, labels.heightTag, '#cbd5e1');
    ctx.globalAlpha = 1;
  }

  const ball = sim.current ? sim.current.flight.state : lp;
  drawBall(ctx, cam.toScreenX(ball.x), cam.toScreenY(ball.y));
  drawScaleBar(ctx, cam, labels.distance);
}
