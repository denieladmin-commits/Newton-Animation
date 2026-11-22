/**
 * M5: velocity and gravity vectors drawn at the ball in textbook style.
 *
 * Arrow lengths are in screen pixels (independent of zoom):
 *  - v⃗ is 90 px at the circular speed v₁ of the launch height, proportional to |v|;
 *  - F⃗ is 72 px at launch, proportional to the force (∝ 1/r²).
 * Both are clamped so they never vanish or fill the screen. Real values are in the HUD.
 */
import type { Body } from '../physics/bodies';
import { circularSpeed } from '../physics/bodies';
import { isPerpendicular, type State } from '../physics/orbitalPhysics';
import type { Theme } from '../theme/themes';
import type { Camera } from './camera';
import { arrow, mathLetter } from './draw';

export const V_REF_PX = 90;
export const F_REF_PX = 72;
const MIN_PX = 16;
const MAX_V_PX = 190;
const MAX_F_PX = 150;

export interface VectorLayout {
  /** Unit directions in screen space (y down). */
  v: { x: number; y: number };
  f: { x: number; y: number };
  /** Unit radial (outward) and tangential (direction of motion) in screen space. */
  radial: { x: number; y: number };
  tangent: { x: number; y: number };
  vLen: number;
  fLen: number;
  /** Signed component lengths along radial / tangent (px). */
  vrLen: number;
  vtLen: number;
  perpendicular: boolean;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Pure geometry for the vector overlay (unit-tested). `r0` is the launch distance. */
export function vectorLayout(s: State, body: Body, r0: number): VectorLayout {
  const r = Math.hypot(s.x, s.y);
  const speed = Math.hypot(s.vx, s.vy);
  const radial = { x: s.x / r, y: -s.y / r };
  // Tangent in the direction of motion: perpendicular to r, same side as v.
  const h = s.x * s.vy - s.y * s.vx; // >0 counter-clockwise
  const sign = h >= 0 ? 1 : -1;
  const tangent = { x: -radial.y * -sign, y: radial.x * -sign };
  const v = speed > 0 ? { x: s.vx / speed, y: -s.vy / speed } : tangent;
  const vRef = circularSpeed(body, r0);
  const vLen = speed > 0 ? clamp((V_REF_PX * speed) / vRef, MIN_PX, MAX_V_PX) : 0;
  const fLen = clamp(F_REF_PX * (r0 / r) ** 2, MIN_PX, MAX_F_PX);
  const vr = (s.x * s.vx + s.y * s.vy) / r;
  const vt = Math.abs(h) / r;
  const k = speed > 0 ? vLen / speed : 0;
  return {
    v,
    f: { x: -radial.x, y: -radial.y },
    radial,
    tangent,
    vLen,
    fLen,
    vrLen: vr * k,
    vtLen: vt * k,
    perpendicular: isPerpendicular(s),
  };
}

export interface VectorOptions {
  components: boolean;
  /** Drag acceleration (m/s², world frame) when air drag is on. */
  drag?: { x: number; y: number };
}

/** Drag arrow length (px): same scale as F⃗, so the two can be compared directly. */
export function dragArrowLength(dragAccel: number, body: Body, r0: number): number {
  const g0 = body.GM / (r0 * r0);
  return Math.min(MAX_F_PX * 1.4, Math.max(MIN_PX, (F_REF_PX * dragAccel) / g0));
}

export function drawVectors(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  s: State,
  body: Body,
  r0: number,
  theme: Theme,
  opts: VectorOptions,
) {
  const L = vectorLayout(s, body, r0);
  const bx = cam.toScreenX(s.x);
  const by = cam.toScreenY(s.y);
  const t = theme;

  // Guides: dashed tangent line through the ball and dashed radius towards the centre.
  ctx.save();
  ctx.strokeStyle = t.guide;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(bx - L.tangent.x * 70, by - L.tangent.y * 70);
  ctx.lineTo(bx + L.tangent.x * (L.vLen + 70), by + L.tangent.y * (L.vLen + 70));
  ctx.moveTo(bx, by);
  const toCentre = Math.min(Math.hypot(cam.toScreenX(0) - bx, cam.toScreenY(0) - by), 4000);
  ctx.lineTo(bx + L.f.x * toCentre, by + L.f.y * toCentre);
  ctx.stroke();
  ctx.restore();

  // Components v_r and v_t as dashed arrows, with projection lines from the tip of v⃗.
  if (opts.components && L.vLen > 0) {
    const tipX = bx + L.v.x * L.vLen;
    const tipY = by + L.v.y * L.vLen;
    const tX = bx + L.tangent.x * L.vtLen;
    const tY = by + L.tangent.y * L.vtLen;
    const rX = bx + L.radial.x * L.vrLen;
    const rY = by + L.radial.y * L.vrLen;
    ctx.save();
    ctx.strokeStyle = t.guide;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tX, tY);
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(rX, rY);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 0.9;
    if (L.vtLen > 4) arrow(ctx, bx, by, L.tangent.x, L.tangent.y, L.vtLen, t.vel, 1.4, 9, true);
    if (Math.abs(L.vrLen) > 4) {
      const d = Math.sign(L.vrLen);
      arrow(ctx, bx, by, L.radial.x * d, L.radial.y * d, Math.abs(L.vrLen), t.vel, 1.4, 9, true);
    }
    ctx.globalAlpha = 1;
    // Labels sit beside the middle of each component, on the side away from v⃗.
    const size = 17;
    const side = L.vrLen >= 0 ? -1 : 1;
    if (L.vtLen > 18) {
      const mx = bx + L.tangent.x * L.vtLen * 0.55 + L.radial.x * side * 16;
      const my = by + L.tangent.y * L.vtLen * 0.55 + L.radial.y * side * 16;
      mathLetter(ctx, mx - 6, my + 6, 'v', t.vel, t.fontMath, size, { sub: 't', halo: t.halo });
    }
    if (Math.abs(L.vrLen) > 18) {
      const mx = bx + L.radial.x * L.vrLen * 0.55 - L.tangent.x * 18;
      const my = by + L.radial.y * L.vrLen * 0.55 - L.tangent.y * 18;
      mathLetter(ctx, mx - 6, my + 6, 'v', t.vel, t.fontMath, size, { sub: 'r', halo: t.halo });
    }
  }

  // Main vectors
  if (L.vLen > 0) arrow(ctx, bx, by, L.v.x, L.v.y, L.vLen, t.vel, t.vectorWidth, t.arrowHead);
  arrow(ctx, bx, by, L.f.x, L.f.y, L.fLen, t.force, t.vectorWidth, t.arrowHead);

  // Air drag F⃗_d, opposite to the velocity; only when it is noticeable (> 1 % of gravity).
  if (opts.drag) {
    const ad = Math.hypot(opts.drag.x, opts.drag.y);
    const r = Math.hypot(s.x, s.y);
    if (ad > 0.01 * (body.GM / (r * r))) {
      const dx = opts.drag.x / ad;
      const dy = -opts.drag.y / ad;
      const len = dragArrowLength(ad, body, r0);
      const dragColor = theme.drag;
      arrow(ctx, bx, by, dx, dy, len, dragColor, t.vectorWidth, t.arrowHead);
      const px = bx + dx * (len + 14);
      const py = by + dy * (len + 14);
      mathLetter(ctx, px - (dx < 0 ? 22 : 2), py + (dy > 0 ? 18 : 4), 'F', dragColor, t.fontMath, 24, { vector: true, sub: 'd', halo: t.halo });
    }
  }

  // 90° marker between v⃗ and F⃗ when they are perpendicular
  if (L.perpendicular && L.vLen > 0) {
    const q = 11;
    const ax = bx + L.v.x * q;
    const ay = by + L.v.y * q;
    const cx = bx + L.f.x * q;
    const cy = by + L.f.y * q;
    ctx.strokeStyle = t.ink;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + L.f.x * q, ay + L.f.y * q);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }

  // Letters at the arrow tips, pushed away from the arrow so they never overlap it.
  const size = 24;
  const place = (dx: number, dy: number, len: number) => {
    const px = bx + dx * (len + 14);
    const py = by + dy * (len + 14);
    return [px - (dx < 0 ? 16 : 2), py + (dy > 0 ? 18 : 4)] as const;
  };
  if (L.vLen > 0) {
    const [x, y] = place(L.v.x, L.v.y, L.vLen);
    mathLetter(ctx, x, y, 'v', t.vel, t.fontMath, size, { vector: true, halo: t.halo });
  }
  const [fx, fy] = place(L.f.x, L.f.y, L.fLen);
  mathLetter(ctx, fx, fy, 'F', t.force, t.fontMath, size, { vector: true, halo: t.halo });
}
