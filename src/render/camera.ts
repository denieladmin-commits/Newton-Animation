/**
 * World ↔ screen transform. World: metres, planet centre at the origin, y up.
 * Screen: CSS pixels, origin top-left, y down. `scale` is pixels per metre.
 */
export const MAX_SCALE = 20; // 20 px per metre: a 4.9 m drop is ~100 px tall

export interface View {
  cx: number;
  cy: number;
  scale: number;
}

export class Camera implements View {
  cx = 0;
  cy = 0;
  scale = 1e-4;
  width = 1;
  height = 1;
  minScale = 1e-7;
  private target: View | null = null;

  setViewport(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  /** Smallest zoom: the whole escape region (radius `extent`) must fit on screen. */
  setExtent(extent: number) {
    this.minScale = Math.min(this.width, this.height) / (2.2 * extent);
    this.scale = this.clampScale(this.scale);
  }

  clampScale(s: number) {
    return Math.min(MAX_SCALE, Math.max(this.minScale, s));
  }

  toScreenX(x: number) {
    return this.width / 2 + (x - this.cx) * this.scale;
  }
  toScreenY(y: number) {
    return this.height / 2 - (y - this.cy) * this.scale;
  }
  toWorld(sx: number, sy: number) {
    return {
      x: this.cx + (sx - this.width / 2) / this.scale,
      y: this.cy - (sy - this.height / 2) / this.scale,
    };
  }

  /** Zoom by `factor` keeping the world point under (sx, sy) fixed. */
  zoomAt(sx: number, sy: number, factor: number) {
    this.target = null;
    const before = this.toWorld(sx, sy);
    this.scale = this.clampScale(this.scale * factor);
    const after = this.toWorld(sx, sy);
    this.cx += before.x - after.x;
    this.cy += before.y - after.y;
  }

  panBy(dxPx: number, dyPx: number) {
    this.target = null;
    this.cx -= dxPx / this.scale;
    this.cy += dyPx / this.scale;
  }

  /** Animate smoothly to a view. */
  animateTo(view: View) {
    this.target = { ...view, scale: this.clampScale(view.scale) };
  }

  /** Frame a world-space box (with margin), leaving `padTop` px free for overlays. */
  fit(minX: number, minY: number, maxX: number, maxY: number, animate = true, padTop = 0) {
    const w = Math.max(maxX - minX, 1);
    const h = Math.max(maxY - minY, 1);
    const usableH = Math.max(1, this.height - padTop);
    const scale = 0.9 * Math.min(this.width / w, usableH / h);
    const view = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 + padTop / 2 / scale, scale };
    if (animate) this.animateTo(view);
    else Object.assign(this, { ...view, scale: this.clampScale(scale) });
  }

  get animating() {
    return this.target !== null;
  }

  /** Step the animation; `followPoint` keeps a point centred (follow mode). */
  update(dt: number, followPoint?: { x: number; y: number }) {
    const t = this.target;
    const k = 1 - Math.exp(-dt * 8);
    if (t) {
      // interpolate scale in log space so zooming feels uniform
      const ls = Math.log(this.scale) + (Math.log(t.scale) - Math.log(this.scale)) * k;
      this.scale = Math.exp(ls);
      if (!followPoint) {
        this.cx += (t.cx - this.cx) * k;
        this.cy += (t.cy - this.cy) * k;
      }
      const done =
        Math.abs(Math.log(t.scale / this.scale)) < 1e-3 &&
        Math.hypot(t.cx - this.cx, t.cy - this.cy) * this.scale < 0.5;
      if (done) {
        this.scale = t.scale;
        if (!followPoint) {
          this.cx = t.cx;
          this.cy = t.cy;
        }
        this.target = null;
      }
    }
    if (followPoint) {
      this.cx = followPoint.x;
      this.cy = followPoint.y;
    }
  }
}
