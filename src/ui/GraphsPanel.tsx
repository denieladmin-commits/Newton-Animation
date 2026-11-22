/**
 * Graphs tab: altitude, speed and energies against time for the current shot.
 * Three charts (never a dual axis), a shared hover crosshair with a tooltip,
 * a legend plus direct labels for the energy chart, and a table view.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { fmt, fmtSci, sciParts, type Lang } from '../i18n/format';
import { useLang, useT } from '../i18n';
import type { Simulation } from '../sim/simulation';
import type { SampleBuffer } from '../sim/samples';
import type { ThemeId } from '../theme/themes';

interface SeriesDef {
  key: string;
  label: string;
  sub?: string;
  color: string; // CSS variable name
  value: (b: SampleBuffer, i: number) => number;
}

interface ChartDef {
  id: string;
  title: string;
  unit: string;
  series: SeriesDef[];
  /** Divide values by this for the axis (e.g. 1000 for km). */
  div?: number;
  /** Energy chart: axis in units of 10^k J with a zero line. */
  sci?: boolean;
}

function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (hi - lo < 1e-12) {
    hi = lo + 1;
  }
  const raw = (hi - lo) / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

/** Time axis unit chosen from the length of the flight. */
function timeUnit(tMax: number, lang: Lang): { div: number; label: string } {
  if (tMax < 180) return { div: 1, label: lang === 'hu' ? 'mp' : 's' };
  if (tMax < 3 * 3600) return { div: 60, label: lang === 'hu' ? 'perc' : 'min' };
  return { div: 3600, label: lang === 'hu' ? 'óra' : 'h' };
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

interface ChartProps {
  def: ChartDef;
  buf: SampleBuffer;
  version: number;
  hover: number | null;
  onHover: (i: number | null) => void;
  lang: Lang;
  themeId: ThemeId;
  timeLabel: string;
}

function Chart({ def, buf, version, hover, onHover, lang, themeId, timeLabel }: ChartProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t = useT();
  const [width, setWidth] = useState(300);
  const H = 184;
  const pad = { l: 46, r: 64, t: 10, b: 40 };
  const n = buf.length;

  // y range over all series
  const range = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of def.series)
      for (let i = 0; i < n; i++) {
        const v = s.value(buf, i);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    if (!Number.isFinite(lo)) return { lo: 0, hi: 1, k: 0 };
    if (def.sci) {
      lo = Math.min(lo, 0);
      hi = Math.max(hi, 0);
      const k = sciParts(Math.max(Math.abs(lo), Math.abs(hi)), 2)[1];
      return { lo, hi, k };
    }
    const div = def.div ?? 1;
    lo /= div;
    hi /= div;
    if (def.id !== 'v') lo = Math.min(lo, 0);
    const padY = (hi - lo) * 0.08 || 1;
    return { lo: def.id === 'h' && lo >= 0 ? 0 : lo - padY * (def.id === 'v' ? 1 : 0), hi: hi + padY, k: 0 };
  }, [def, buf, n, version]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = ref.current!;
    const ro = new ResizeObserver(() => setWidth(c.getBoundingClientRect().width));
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    c.width = Math.round(width * dpr);
    c.height = Math.round(H * dpr);
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, H);
    if (n < 2) return;
    const ink = css('--ink');
    const muted = css('--muted');
    const grid = css('--grid');
    const font = css('--font-ui');
    const tMax = buf.data.t[n - 1]!;
    const tu = timeUnit(tMax, lang);
    const scaleY = def.sci ? 10 ** range.k : 1;
    const lo = range.lo / scaleY;
    const hi = range.hi / scaleY;
    const yTicks = niceTicks(lo, hi);
    const yMin = Math.min(lo, yTicks[0]!);
    const yMax = Math.max(hi, yTicks[yTicks.length - 1]!);
    const X = (t: number) => pad.l + (t / (tMax || 1)) * (width - pad.l - pad.r);
    const Y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - pad.t - pad.b);

    // grid + y labels
    ctx.font = `12px ${font}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (const v of yTicks) {
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, Y(v));
      ctx.lineTo(width - pad.r, Y(v));
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.fillText(fmt(v, lang, Number.isInteger(v) ? 0 : 1), pad.l - 6, Y(v));
    }
    if (yMin < 0 && yMax > 0) {
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(pad.l, Y(0));
      ctx.lineTo(width - pad.r, Y(0));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // x labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = muted;
    for (const tt of niceTicks(0, tMax / tu.div, 5)) {
      const x = X(tt * tu.div);
      if (x > width - pad.r + 1) continue;
      ctx.fillText(fmt(tt, lang, Number.isInteger(tt) ? 0 : 1), x, H - pad.b + 6);
    }
    ctx.textAlign = 'right';
    ctx.fillText(timeLabel.replace('{u}', tu.label), width - pad.r, H - pad.b + 22);

    // series lines (2 px) + direct labels at the right end
    const ends: { y: number; s: SeriesDef }[] = [];
    for (const s of def.series) {
      ctx.strokeStyle = css(s.color);
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const v = s.value(buf, i) / (def.sci ? scaleY : (def.div ?? 1));
        const x = X(buf.data.t[i]!);
        const y = Y(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ends.push({ y: Y(s.value(buf, n - 1) / (def.sci ? scaleY : (def.div ?? 1))), s });
    }
    if (def.series.length > 1) {
      // keep direct labels from colliding
      // Keep direct labels apart (15 px) and inside the plot area.
      ends.sort((a, b) => a.y - b.y);
      const top = pad.t + 6;
      const bottom = H - pad.b - 4;
      for (let i = 0; i < ends.length; i++) ends[i]!.y = Math.max(ends[i]!.y, top, i ? ends[i - 1]!.y + 15 : top);
      for (let i = ends.length - 1; i >= 0; i--) ends[i]!.y = Math.min(ends[i]!.y, i === ends.length - 1 ? bottom : ends[i + 1]!.y - 15);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (const { y, s } of ends) {
        const x = width - pad.r + 6;
        ctx.fillStyle = css(s.color);
        ctx.fillRect(x, y - 1, 10, 2);
        ctx.fillStyle = ink;
        ctx.font = `italic 15px ${css('--font-math')}`;
        ctx.fillText(s.label, x + 14, y);
        if (s.sub) {
          const w = ctx.measureText(s.label).width;
          ctx.font = `italic 11px ${css('--font-math')}`;
          ctx.fillText(s.sub, x + 14 + w + 1, y + 4);
        }
      }
    }

    // hover crosshair
    if (hover !== null && hover < n) {
      const x = X(buf.data.t[hover]!);
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, H - pad.b);
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (const s of def.series) {
        const y = Y(s.value(buf, hover) / (def.sci ? scaleY : (def.div ?? 1)));
        ctx.fillStyle = css(s.color);
        ctx.strokeStyle = css('--panel');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [width, version, hover, range, def, buf, n, lang, themeId, timeLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const x = clientX - rect.left;
    if (n < 2) return;
    const tMax = buf.data.t[n - 1]!;
    const t = ((x - pad.l) / (width - pad.l - pad.r)) * tMax;
    // binary search for the nearest sample
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (buf.data.t[mid]! < t) lo = mid;
      else hi = mid;
    }
    onHover(Math.abs(buf.data.t[lo]! - t) < Math.abs(buf.data.t[hi]! - t) ? lo : hi);
  };

  const unitText = def.sci && range.k !== 0 ? `10${fmtSci(10 ** range.k, lang, 0).replace(/^1·10/, '')} ${def.unit}` : def.unit;
  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-semibold">{def.title}</span>
        <span className="text-sm text-(--muted)">{unitText}</span>
      </figcaption>
      {def.series.length > 1 && (
        <ul className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={t.legend}>
          {def.series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: `var(${s.color})` }} />
              <span className="font-math italic">
                {s.label}
                {s.sub && <sub>{s.sub}</sub>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <canvas
        ref={ref}
        className="block w-full touch-pan-y"
        style={{ height: H }}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => onHover(null)}
        role="img"
        aria-label={def.title}
      />
    </figure>
  );
}

interface Props {
  sim: Simulation;
  themeId: ThemeId;
}

export function GraphsPanel({ sim, themeId }: Props) {
  const t = useT();
  const lang = useLang();
  const [version, setVersion] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const shot = sim.current;
  const buf = shot?.samples;

  // Redraw a few times per second while data is coming in.
  useEffect(() => {
    let last = -1;
    const id = setInterval(() => {
      const v = (sim.current?.samples.version ?? 0) + (sim.current ? sim.ghosts.length * 1e9 : 0);
      if (v !== last) {
        last = v;
        setVersion((x) => x + 1);
      }
    }, 250);
    return () => clearInterval(id);
  }, [sim]);

  const drag = !!shot?.params.drag && !!sim.body.atmosphere;
  const charts: ChartDef[] = useMemo(
    () => [
      { id: 'h', title: t.gHeight, unit: 'km', div: 1000, series: [{ key: 'h', label: 'h', color: '--s-ek', value: (b, i) => b.data.h[i]! }] },
      { id: 'v', title: t.gSpeed, unit: 'km/s', div: 1000, series: [{ key: 'v', label: 'v', color: '--s-ek', value: (b, i) => b.data.v[i]! }] },
      {
        id: 'e',
        title: t.gEnergy,
        unit: 'J',
        sci: true,
        series: [
          { key: 'ek', label: 'E', sub: 'k', color: '--s-ek', value: (b, i) => b.data.ek[i]! },
          { key: 'ep', label: 'E', sub: 'p', color: '--s-ep', value: (b, i) => b.data.ep[i]! },
          { key: 'e', label: 'E', color: '--s-e', value: (b, i) => b.data.ek[i]! + b.data.ep[i]! },
          ...(drag ? [{ key: 'loss', label: 'W', color: '--s-loss', value: (b: SampleBuffer, i: number) => b.data.loss[i]! }] : []),
        ],
      },
    ],
    [t, drag],
  );

  if (!buf || buf.length < 2) return <p className="text-[15px] text-(--muted)">{t.gEmpty}</p>;

  const n = buf.length;
  const tMax = buf.data.t[n - 1]!;
  const tu = timeUnit(tMax, lang);
  const timeLabel = `${t.gTime} ({u})`;
  const hi = hover !== null && hover < n ? hover : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        {/* Tooltip readout for the hovered moment (shared by all charts). */}
        <p className="min-h-6 text-sm tabular-nums" aria-live="polite">
          {hi !== null && (
            <>
              t = {fmt(buf.data.t[hi]! / tu.div, lang, 1)} {tu.label}&ensp; h = {fmt(buf.data.h[hi]! / 1000, lang, 1)} km&ensp; v ={' '}
              {fmt(buf.data.v[hi]! / 1000, lang, 3)} km/s&ensp; E = {fmtSci(buf.data.ek[hi]! + buf.data.ep[hi]!, lang)} J
            </>
          )}
        </p>
        <button
          className="min-h-11 shrink-0 rounded-lg border border-(--line) px-3 text-sm hover:text-(--ink)"
          aria-pressed={table}
          onClick={() => setTable((x) => !x)}
        >
          {table ? t.gChart : t.gTable}
        </button>
      </div>

      {table ? (
        <DataTable buf={buf} lang={lang} />
      ) : (
        charts.map((def) => (
          <Chart key={def.id} def={def} buf={buf} version={version} hover={hi} onHover={setHover} lang={lang} themeId={themeId} timeLabel={timeLabel} />
        ))
      )}
      <p className="text-sm text-(--muted)">{drag ? t.gEnergyNoteDrag : t.gEnergyNote.replace('E_k', 'Eₖ').replace('E_p', 'Eₚ')}</p>
    </div>
  );
}

function DataTable({ buf, lang }: { buf: SampleBuffer; lang: Lang }) {
  const n = buf.length;
  const rows = Array.from({ length: Math.min(12, n) }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, Math.min(12, n) - 1)));
  const tu = timeUnit(buf.data.t[n - 1]!, lang);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-sm tabular-nums">
        <thead className="text-(--muted)">
          <tr>
            <th className="py-1 pr-2 font-normal">t ({tu.label})</th>
            <th className="py-1 pr-2 font-normal">h (km)</th>
            <th className="py-1 pr-2 font-normal">v (km/s)</th>
            <th className="py-1 pr-2 font-normal">Eₖ (J)</th>
            <th className="py-1 pr-2 font-normal">Eₚ (J)</th>
            <th className="py-1 font-normal">E (J)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i} className="border-t border-(--line)">
              <td className="py-1 pr-2">{fmt(buf.data.t[i]! / tu.div, lang, 1)}</td>
              <td className="py-1 pr-2">{fmt(buf.data.h[i]! / 1000, lang, 1)}</td>
              <td className="py-1 pr-2">{fmt(buf.data.v[i]! / 1000, lang, 3)}</td>
              <td className="py-1 pr-2">{fmtSci(buf.data.ek[i]!, lang)}</td>
              <td className="py-1 pr-2">{fmtSci(buf.data.ep[i]!, lang)}</td>
              <td className="py-1">{fmtSci(buf.data.ek[i]! + buf.data.ep[i]!, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
