/** Small drawing helpers shared by the renderer: hatching, chalk grain, arrows, letters. */
import { mulberry32 } from './planetTexture';

// ─────────────────────────────── hatching ───────────────────────────────
const hatchCache = new Map<string, CanvasPattern>();

/**
 * Engraving-style hatch pattern: parallel lines `gap` CSS px apart at `angle` degrees.
 * Anchored to the screen, so the shading stays crisp at every zoom.
 */
export function hatch(ctx: CanvasRenderingContext2D, color: string, alpha: number, gap: number, angle: number, width = 1) {
  const key = `${color}|${alpha}|${gap}|${angle}|${width}`;
  const hit = hatchCache.get(key);
  if (hit) return hit;
  const tile = document.createElement('canvas');
  const size = Math.max(2, Math.round(gap * 4)); // supersampled tile for smooth lines
  tile.width = size;
  tile.height = size;
  const t = tile.getContext('2d')!;
  t.globalAlpha = alpha;
  t.fillStyle = color;
  t.fillRect(0, 0, Math.max(1, width * 4), size);
  const pattern = ctx.createPattern(tile, 'repeat')!;
  pattern.setTransform(new DOMMatrix().rotateSelf(angle).scaleSelf(0.25, 0.25));
  hatchCache.set(key, pattern);
  return pattern;
}

// ─────────────────────────────── chalk ───────────────────────────────
let grain: HTMLCanvasElement | null = null;

/** Tileable speckle used to break up chalk strokes. */
function grainTile(): HTMLCanvasElement {
  if (grain) return grain;
  grain = document.createElement('canvas');
  grain.width = grain.height = 256;
  const g = grain.getContext('2d')!;
  const img = g.createImageData(256, 256);
  const rnd = mulberry32(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = rnd();
    img.data[i + 3] = r < 0.22 ? 150 + r * 400 : r < 0.5 ? 40 : 0;
  }
  g.putImageData(img, 0, 0);
  return grain;
}

export type Paint = string | CanvasPattern;
const chalkCache = new Map<string, CanvasPattern>();

/**
 * Chalk "paint": the colour with grain holes already punched in, used as stroke and
 * fill style for moving chalk drawing (trails, arrows, letters). Screen-anchored,
 * like the texture of a real board.
 */
export function chalkPaint(ctx: CanvasRenderingContext2D, color: string): CanvasPattern {
  const hit = chalkCache.get(color);
  if (hit) return hit;
  const tile = document.createElement('canvas');
  tile.width = tile.height = 256;
  const g = tile.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-out';
  g.drawImage(grainTile(), 0, 0);
  const p = ctx.createPattern(tile, 'repeat')!;
  chalkCache.set(color, p);
  return p;
}

/**
 * Chalk theme: the canvas is transparent over a CSS chalkboard, so the grain can be
 * erased straight out of the drawing (one fill, no extra layer).
 */
export function applyChalkGrain(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat')!;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

// ─────────────────────────────── arrows & letters ───────────────────────────────
/** Textbook arrow from (x, y) along unit direction (dx, dy), `len` px long. */
export function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  len: number,
  color: Paint,
  width: number,
  head: number,
  dashed = false,
) {
  const x2 = x + dx * len;
  const y2 = y + dy * len;
  const h = Math.min(head, len * 0.6);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.setLineDash(dashed ? [5, 4] : []);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2 - dx * h * 0.6, y2 - dy * h * 0.6);
  ctx.stroke();
  ctx.setLineDash([]);
  // Slightly concave arrowhead, like a printed figure.
  const hx = x2 - dx * h;
  const hy = y2 - dy * h;
  const nx = -dy * h * 0.42;
  const ny = dx * h * 0.42;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(hx + nx, hy + ny);
  ctx.quadraticCurveTo(hx + dx * h * 0.25, hy + dy * h * 0.25, hx - nx, hy - ny);
  ctx.closePath();
  ctx.fill();
}

/**
 * Italic formula letter with an optional subscript and a small vector arrow above,
 * e.g. v⃗, F⃗, v_r. (x, y) is the baseline start.
 */
export function mathLetter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  letter: string,
  color: Paint,
  font: string,
  size: number,
  opts: { sub?: string; vector?: boolean; halo?: string | null } = {},
) {
  ctx.font = `italic 500 ${size}px ${font}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(letter).width;
  const paint = (text: string, tx: number, ty: number) => {
    if (opts.halo) {
      ctx.strokeStyle = opts.halo;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, tx, ty);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, tx, ty);
  };
  paint(letter, x, y);
  if (opts.sub) {
    ctx.font = `italic 500 ${Math.round(size * 0.62)}px ${font}`;
    paint(opts.sub, x + w + 1, y + size * 0.22);
  }
  if (opts.vector) {
    const ay = y - size * 0.82;
    const ax0 = x + size * 0.08;
    const ax1 = x + Math.max(w, size * 0.5) + 1;
    if (opts.halo) {
      ctx.strokeStyle = opts.halo;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax0, ay);
      ctx.lineTo(ax1, ay);
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(ax0, ay);
    ctx.lineTo(ax1 - 3, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax1 + 1, ay);
    ctx.lineTo(ax1 - 4, ay - 2.6);
    ctx.lineTo(ax1 - 4, ay + 2.6);
    ctx.closePath();
    ctx.fill();
  }
}

/** Rounded box with text, used for small overlay tags. */
export function tag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  font: string,
  ink: string,
  bg: string,
  line: string,
) {
  ctx.font = `500 13px ${font}`;
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = bg;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 12, w, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}
