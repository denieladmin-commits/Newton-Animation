/**
 * Draws one frame in the chosen theme: background, planet, mountain, trails,
 * cannon, ball, vectors, scale bar and figure caption.
 * Everything is in true scale; only markers (cannon, ball, letters) have a fixed pixel size.
 */
import type { Body } from '../physics/bodies';
import type { State } from '../physics/orbitalPhysics';
import type { Shot, Simulation } from '../sim/simulation';
import type { Trail } from '../sim/trail';
import type { Theme } from '../theme/themes';
import type { Camera } from './camera';
import { applyChalkGrain, chalkPaint, hatch, mathLetter, tag, type Paint } from './draw';
import { mulberry32, planetTexture, PLANET_STYLE } from './planetTexture';
import { drawVectors } from './vectors';

/** Above this planet radius (px) switch from the disk image to a locally drawn surface. */
const LOCAL_SURFACE_PX = 6_000;

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
      a: 0.2 + rnd() * 0.55,
    })),
  }));
})();

function drawStars(ctx: CanvasRenderingContext2D, cam: Camera, body: Body, color: string) {
  const W = cam.width;
  const H = cam.height;
  const tile = Math.max(W, H);
  ctx.fillStyle = color;
  for (const layer of STAR_LAYERS) {
    // Panning across one planet radius shifts the nearest layer by ~60 px.
    const ox = ((-cam.cx / body.radius) * 60 * layer.parallax) % tile;
    const oy = ((cam.cy / body.radius) * 60 * layer.parallax) % tile;
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

function drawRings(ctx: CanvasRenderingContext2D, cam: Camera, body: Body, color: string) {
  const Rpx = body.radius * cam.scale;
  if (Rpx > LOCAL_SURFACE_PX / 4) return;
  const ox = cam.toScreenX(0);
  const oy = cam.toScreenY(0);
  const step = niceStep(140 / cam.scale); // ring spacing in metres (~140 px)
  const maxR = Math.hypot(Math.abs(ox) + cam.width, Math.abs(oy) + cam.height) / cam.scale;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.08;
  for (let r = body.radius + step; r < maxR && r < body.radius + 400 * step; r += step) {
    ctx.beginPath();
    ctx.arc(ox, oy, r * cam.scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.05;
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(ox + Math.cos(a) * Rpx, oy - Math.sin(a) * Rpx);
    ctx.lineTo(ox + Math.cos(a) * maxR * cam.scale, oy - Math.sin(a) * maxR * cam.scale);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ─────────────────────────────── planet ───────────────────────────────
/** Hatch settings per body in the chalk theme (angle, gap). */
const CHALK_HATCH: Record<Body['id'], [number, number]> = { earth: [35, 7], moon: [-20, 8], mars: [60, 6.5] };

function drawPlanetDisk(ctx: CanvasRenderingContext2D, cam: Camera, body: Body, t: Theme) {
  const ox = cam.toScreenX(0);
  const oy = cam.toScreenY(0);
  const Rpx = body.radius * cam.scale;
  const style = PLANET_STYLE[body.id];

  if (t.chalk) {
    const [angle, gap] = CHALK_HATCH[body.id];
    ctx.fillStyle = hatch(ctx, t.ink, 0.17, gap, angle);
    ctx.beginPath();
    ctx.arc(ox, oy, Rpx, 0, Math.PI * 2);
    ctx.fill();
    // Engraving shading: cross-hatching gets denser towards the rim.
    const band = (w: number, a: number, g: number, ang: number) => {
      ctx.fillStyle = hatch(ctx, t.ink, a, g, ang);
      ctx.beginPath();
      ctx.arc(ox, oy, Rpx, 0, Math.PI * 2);
      ctx.arc(ox, oy, Math.max(0, Rpx - w), 0, Math.PI * 2, true);
      ctx.fill();
    };
    band(Math.min(46, Rpx * 0.14), 0.22, 6, -angle);
    band(Math.min(18, Rpx * 0.06), 0.28, 4.5, angle + 45);
    if (body.atmosphere) {
      ctx.strokeStyle = t.ink;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.arc(ox, oy, Rpx + Math.max(4, body.atmosphere.karman * cam.scale), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = t.ink;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(ox, oy, Rpx, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (style.glow && body.atmosphere) {
    const [r, g, b] = style.glow;
    // Glow is at least 6 px wide so it stays visible; real thickness when zoomed in.
    const thick = Math.max(6, body.atmosphere.karman * cam.scale);
    const grad = ctx.createRadialGradient(ox, oy, Math.max(0, Rpx - 2), ox, oy, Rpx + thick * 2.5);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.7)`);
    grad.addColorStop(0.3, `rgba(${r},${g},${b},0.22)`);
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
  ctx.strokeStyle = style.glow ? `rgba(${style.glow.join(',')},0.7)` : 'rgba(226,232,240,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(ox, oy, Rpx, 0, Math.PI * 2);
  ctx.stroke();
}

/** Close-up: the surface is drawn as a polygon around the visible part of the circle. */
function drawLocalSurface(ctx: CanvasRenderingContext2D, cam: Camera, body: Body, t: Theme) {
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
  /** Path of the band between radii rOuter and rInner over the visible arc. */
  const bandPath = (rOuter: number, rInner: number) => {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const [x, y] = pt(theta0 - span + (2 * span * i) / N, rOuter);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const [x, y] = pt(theta0 - span + (2 * span * i) / N, rInner);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  const surfacePath = () => {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const [x, y] = pt(theta0 - span + (2 * span * i) / N, R);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };

  if (t.chalk) {
    const [angle, gap] = CHALK_HATCH[body.id];
    ctx.fillStyle = hatch(ctx, t.ink, 0.17, gap, angle);
    bandPath(R, R - depth);
    ctx.fill();
    ctx.fillStyle = hatch(ctx, t.ink, 0.22, 6, -angle);
    bandPath(R, R - Math.min(depth, 46 / cam.scale));
    ctx.fill();
    ctx.fillStyle = hatch(ctx, t.ink, 0.28, 4.5, angle + 45);
    bandPath(R, R - Math.min(depth, 18 / cam.scale));
    ctx.fill();
    if (body.atmosphere && body.atmosphere.karman * cam.scale < 4 * cam.height) {
      ctx.strokeStyle = t.ink;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const [x, y] = pt(theta0 - span + (2 * span * i) / N, R + body.atmosphere.karman);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = t.ink;
    ctx.lineWidth = 2.2;
    surfacePath();
    ctx.stroke();
    return;
  }

  // Sky: the real atmosphere, density falling off exponentially with height.
  if (style.glow && body.atmosphere) {
    const atm = body.atmosphere;
    const [gr, gg, gb] = style.glow;
    const top = Math.min(atm.karman, 6 * atm.scaleHeight);
    const [ax, ay] = pt(theta0, R);
    const [bx, by] = pt(theta0, R + top);
    const grad = ctx.createLinearGradient(ax, ay, bx, by);
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      grad.addColorStop(f, `rgba(${gr},${gg},${gb},${(0.42 * Math.exp((-f * top) / atm.scaleHeight)).toFixed(3)})`);
    }
    ctx.fillStyle = grad;
    bandPath(R + top, R);
    ctx.fill();
  }

  const [gx0, gy0] = pt(theta0, R);
  const [gx1, gy1] = pt(theta0, R - Math.min(depth, 40 / cam.scale));
  const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
  g.addColorStop(0, style.ground);
  g.addColorStop(1, style.groundDark);
  ctx.fillStyle = g;
  bandPath(R, R - depth);
  ctx.fill();
  ctx.strokeStyle = 'rgba(226,232,240,0.35)';
  ctx.lineWidth = 1;
  surfacePath();
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

function drawMountain(ctx: CanvasRenderingContext2D, cam: Camera, body: Body, h: number, t: Theme) {
  if (h * cam.scale < 2) return;
  const R = body.radius;
  const halfWidth = 3 * h; // along the surface
  const N = 120;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const u = -1 + (2 * i) / N;
    const theta = Math.PI / 2 - (u * halfWidth) / R;
    const r = R + h * profile(u) - h * 0.02;
    const x = cam.toScreenX(r * Math.cos(theta));
    const y = cam.toScreenY(r * Math.sin(theta));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (t.chalk) {
    ctx.fillStyle = t.bg;
    ctx.fill();
    ctx.fillStyle = hatch(ctx, t.ink, 0.55, 3.6, -35);
    ctx.fill();
    ctx.strokeStyle = t.ink;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    return;
  }
  const summitY = cam.toScreenY(R + h);
  const baseY = cam.toScreenY(R);
  const grad = ctx.createLinearGradient(0, summitY, 0, baseY);
  grad.addColorStop(0, '#f1f5f9');
  grad.addColorStop(0.12, '#cbd5e1');
  grad.addColorStop(0.2, '#6b6158');
  grad.addColorStop(1, '#3b342e');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,228,216,0.45)';
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

type Painted = Omit<Theme, 'trail' | 'ghost' | 'ghostLetter' | 'ink' | 'ball'> & {
  trail: Paint;
  ghost: Paint;
  ghostLetter: Paint;
  ink: Paint;
  ball: Paint;
};

function drawTrail(ctx: CanvasRenderingContext2D, cam: Camera, shot: Shot, current: boolean, t: Painted) {
  const head = current && shot.flight.status === 'flying' ? shot.flight.state : undefined;
  tracePath(ctx, cam, shot.trail, head);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (current) {
    ctx.setLineDash([]);
    ctx.strokeStyle = t.trail;
    ctx.lineWidth = t.trailWidth;
  } else {
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = t.ghost;
    ctx.globalAlpha = t.chalk ? 0.8 : 0.75;
    ctx.lineWidth = 1.3;
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/** Italic letter (A, B, C…) at the end of a shot, like Newton's figure. */
function drawShotLabel(ctx: CanvasRenderingContext2D, cam: Camera, shot: Shot, t: Painted) {
  const n = shot.trail.length;
  const end = { x: shot.trail.xs[n - 1]!, y: shot.trail.ys[n - 1]! };
  const r = Math.hypot(end.x, end.y);
  const off = 18 / cam.scale;
  const x = cam.toScreenX(end.x + (end.x / r) * off);
  const y = cam.toScreenY(end.y + (end.y / r) * off);
  if (x < -40 || y < -40 || x > cam.width + 40 || y > cam.height + 40) return;
  if (shot.flight.status === 'crashed') {
    ctx.fillStyle = t.ghost;
    ctx.beginPath();
    ctx.arc(cam.toScreenX(end.x), cam.toScreenY(end.y), 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  mathLetter(ctx, x - 6, y + 7, shot.label, t.ghostLetter, t.fontMath, 20, { halo: t.halo });
}

// ─────────────────────────────── cannon & ball ───────────────────────────────
function drawCannon(ctx: CanvasRenderingContext2D, sx: number, sy: number, t: Painted) {
  // Muzzle at (sx, sy), barrel pointing right (horizontal launch).
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = t.cannonFill;
  ctx.strokeStyle = t.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-22, -4.5, 22, 9, 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-13, 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, sx: number, sy: number, t: Painted) {
  ctx.fillStyle = t.ball;
  ctx.strokeStyle = t.ballStroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// ─────────────────────────────── scale bar & caption ───────────────────────────────
export function scaleBarLength(scale: number): { meters: number; px: number } {
  const meters = niceStep(120 / scale);
  return { meters, px: meters * scale };
}

function drawScaleBar(ctx: CanvasRenderingContext2D, cam: Camera, label: (m: number) => string, t: Painted, y: number) {
  const { meters, px } = scaleBarLength(cam.scale);
  const x = 18;
  ctx.strokeStyle = t.ink;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y);
  ctx.lineTo(x + px, y);
  ctx.lineTo(x + px, y - 5);
  ctx.stroke();
  ctx.fillStyle = t.ink;
  ctx.font = `13px ${t.fontUi}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label(meters), x, y - 7);
  ctx.globalAlpha = 1;
}

function drawCaption(ctx: CanvasRenderingContext2D, cam: Camera, caption: SceneLabels['caption'], t: Painted) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = t.ink;
  ctx.font = `italic 15px ${t.fontMath}`;
  const x = 18;
  const y = cam.height - 16;
  ctx.fillText(caption.figure, x, y);
  const w = ctx.measureText(caption.figure + ' ').width;
  ctx.font = `15px ${t.fontMath}`;
  ctx.fillText(caption.text, x + w, y);
  ctx.globalAlpha = 1;
}

// ─────────────────────────────── frame ───────────────────────────────
export interface SceneLabels {
  distance: (m: number) => string;
  heightTag: string;
  caption: { figure: string; text: string };
}

export interface SceneOptions {
  theme: Theme;
  vectors: boolean;
  components: boolean;
}

// The still parts of the picture (sky, planet, mountain) are drawn into a cached layer
// that is rebuilt only when the camera, planet, mountain or theme changes.
let staticLayer: HTMLCanvasElement | null = null;
let chalkInk: HTMLCanvasElement | null = null;
let staticKey = '';

/** Green board with faint eraser smudges. */
function drawBoard(ctx: CanvasRenderingContext2D, cam: Camera, t: Theme) {
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, cam.width, cam.height);
  const cx = cam.width * 0.45;
  const cy = cam.height * 0.4;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cam.width, cam.height) * 0.8);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cam.width, cam.height);
}

function drawStatic(ctx: CanvasRenderingContext2D, cam: Camera, sim: Simulation, t: Theme) {
  if (t.chalk) {
    // Chalk drawing goes on its own layer so the grain only erases chalk, not the board.
    const c = ctx.canvas;
    if (!chalkInk) chalkInk = document.createElement('canvas');
    if (chalkInk.width !== c.width || chalkInk.height !== c.height) {
      chalkInk.width = c.width;
      chalkInk.height = c.height;
    }
    const ink = chalkInk.getContext('2d')!;
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.clearRect(0, 0, c.width, c.height);
    ink.setTransform(ctx.getTransform());
    drawFigure(ink, cam, sim, t);
    applyChalkGrain(ink);
    drawBoard(ctx, cam, t);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(chalkInk, 0, 0);
    ctx.restore();
    return;
  }
  drawFigure(ctx, cam, sim, t);
}

function drawFigure(ctx: CanvasRenderingContext2D, cam: Camera, sim: Simulation, t: Theme) {
  const body = sim.body;
  if (!t.chalk) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, cam.width, cam.height);
    if (t.stars) drawStars(ctx, cam, body, t.ink);
    drawRings(ctx, cam, body, t.ink);
  }
  const Rpx = body.radius * cam.scale;
  if (Rpx < LOCAL_SURFACE_PX) drawPlanetDisk(ctx, cam, body, t);
  else drawLocalSurface(ctx, cam, body, t);
  drawMountain(ctx, cam, body, sim.params.altitude, t);
}

function blitStatic(main: CanvasRenderingContext2D, cam: Camera, sim: Simulation, t: Theme) {
  const c = main.canvas;
  const key = [c.width, c.height, cam.cx, cam.cy, cam.scale, sim.params.bodyId, sim.params.altitude, t.id].join('|');
  if (!staticLayer) staticLayer = document.createElement('canvas');
  if (key !== staticKey) {
    if (staticLayer.width !== c.width || staticLayer.height !== c.height) {
      staticLayer.width = c.width;
      staticLayer.height = c.height;
    }
    const sctx = staticLayer.getContext('2d')!;
    sctx.setTransform(main.getTransform());
    drawStatic(sctx, cam, sim, t);
    staticKey = key;
  }
  main.save();
  main.setTransform(1, 0, 0, 1, 0, 0);
  main.clearRect(0, 0, c.width, c.height);
  main.drawImage(staticLayer, 0, 0);
  main.restore();
}

export function drawScene(ctx: CanvasRenderingContext2D, cam: Camera, sim: Simulation, labels: SceneLabels, opts: SceneOptions) {
  const theme = opts.theme;
  const body = sim.body;
  blitStatic(ctx, cam, sim, theme);
  // Moving chalk drawing uses grainy paints instead of a full-screen grain pass.
  const paint = (c: string): Paint => (theme.chalk ? chalkPaint(ctx, c) : c);
  const t: Theme = theme;
  const tp = { ...theme, trail: paint(theme.trail), ghost: paint(theme.ghost), ghostLetter: paint(theme.ghostLetter), ink: paint(theme.ink), ball: paint(theme.ball) };

  for (const g of sim.ghosts) drawTrail(ctx, cam, g, false, tp);
  if (sim.current) drawTrail(ctx, cam, sim.current, true, tp);
  for (const g of sim.ghosts) drawShotLabel(ctx, cam, g, tp);
  if (sim.current && sim.current.flight.status !== 'flying') drawShotLabel(ctx, cam, sim.current, tp);

  const lp = sim.launchPoint;
  const lx = cam.toScreenX(lp.x);
  const ly = cam.toScreenY(lp.y);
  drawCannon(ctx, lx, ly, tp);

  // Vectors: on the flying ball, or a preview of v₀ at the cannon before firing.
  const shot = sim.current;
  const flying = shot && shot.flight.status === 'flying';
  const ballState = shot ? shot.flight.state : { ...lp, vx: sim.params.v0 };
  if (opts.vectors && (flying || !shot)) {
    drawVectors(ctx, cam, ballState, body, body.radius + (shot ? shot.params.altitude : sim.params.altitude), t, {
      components: opts.components,
    });
  }
  drawBall(ctx, cam.toScreenX(ballState.x), cam.toScreenY(ballState.y), tp);

  const showCaption = cam.width >= 520;
  drawScaleBar(ctx, cam, labels.distance, tp, showCaption ? cam.height - 44 : cam.height - 18);
  if (showCaption) drawCaption(ctx, cam, labels.caption, tp);

  // The height tag stays crisp (not chalky): it is UI, not part of the figure.
  if (sim.params.altitude * cam.scale < 2) {
    tag(ctx, lx - 10, ly - 26, labels.heightTag, t.fontUi, t.overlayInk, t.overlayBg, t.overlayLine);
  }
}
