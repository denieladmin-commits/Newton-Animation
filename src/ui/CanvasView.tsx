import { useEffect, useRef } from 'react';
import type { Camera } from '../render/camera';
import { drawScene, type SceneLabels, type SceneOptions } from '../render/scene';
import type { Simulation } from '../sim/simulation';

interface Props {
  sim: Simulation;
  camera: Camera;
  /** Read every frame, so it can change without re-subscribing. */
  followRef: React.RefObject<boolean>;
  viewRef: React.RefObject<{ labels: SceneLabels; options: SceneOptions }>;
  onUserMove: () => void;
  onFirstLayout: () => void;
}

/** Canvas + animation loop + mouse/touch camera control. */
export function CanvasView({ sim, camera, followRef, viewRef, onUserMove, onFirstLayout }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onUserMove, onFirstLayout });
  cb.current = { onUserMove, onFirstLayout };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let laidOut = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      camera.setViewport(rect.width, rect.height);
      camera.setExtent(32 * sim.body.radius);
      if (!laidOut && rect.width > 0) {
        laidOut = true;
        cb.current.onFirstLayout();
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      sim.tick(dt);
      const shot = sim.current;
      const follow = followRef.current && shot ? shot.flight.state : undefined;
      camera.update(dt, follow);
      const view = viewRef.current!;
      drawScene(ctx, camera, sim, view.labels, view.options);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // ── pointer input: drag to pan, two fingers to pinch-zoom ──
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { dist: number; mx: number; my: number } | null = null;
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pinchState = () => {
      const [a, b] = [...pointers.values()];
      return { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), mx: (a!.x + b!.x) / 2, my: (a!.y + b!.y) / 2 };
    };
    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, local(e));
      if (pointers.size === 2) pinch = pinchState();
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size === 1) {
        if (p.x !== prev.x || p.y !== prev.y) {
          cb.current.onUserMove();
          camera.panBy(p.x - prev.x, p.y - prev.y);
        }
      } else if (pointers.size === 2 && pinch) {
        const now = pinchState();
        cb.current.onUserMove();
        camera.panBy(now.mx - pinch.mx, now.my - pinch.my);
        camera.zoomAt(now.mx, now.my, now.dist / pinch.dist);
        pinch = now;
      }
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = pointers.size === 2 ? pinchState() : null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      // In follow mode, zoom around the centre so the ball stays put.
      const [zx, zy] = followRef.current ? [camera.width / 2, camera.height / 2] : [sx, sy];
      camera.zoomAt(zx, zy, Math.exp(-delta * 0.0015));
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', wheel);
    };
  }, [sim, camera, followRef, viewRef]);

  return <canvas ref={canvasRef} className="block h-full w-full touch-none select-none" />;
}
