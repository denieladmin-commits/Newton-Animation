import { BODIES, circularSpeed, escapeSpeed, type BodyId } from '../physics/bodies';
import { classifyTrajectory } from '../physics/orbitalElements';
import { fmt } from '../i18n/format';
import { useLang, useT } from '../i18n';
import { WARP_PRESETS, type LaunchParams, type Warp } from '../sim/simulation';

export type SpeedSnap = 'free' | 'v1' | 'v2';

export const ALT_MIN = 1_000;
export const ALT_MAX = 1_000_000;
const ALT_PRESETS = [
  { key: 'presetEverest', h: 8_850 },
  { key: 'presetKarman', h: 100_000 },
  { key: 'presetIss', h: 400_000 },
] as const;

/** Log-scale slider position (0…1000) ↔ altitude (m). */
const altToSlider = (h: number) => (1000 * Math.log(h / ALT_MIN)) / Math.log(ALT_MAX / ALT_MIN);
const sliderToAlt = (s: number) => {
  const h = ALT_MIN * (ALT_MAX / ALT_MIN) ** (s / 1000);
  // round to 3 significant figures so the readout is clean
  const p = 10 ** (Math.floor(Math.log10(h)) - 2);
  return Math.round(h / p) * p;
};

/** Top of the launch-speed slider (m/s): comfortably above escape speed. */
export const maxLaunchSpeed = (p: LaunchParams) =>
  Math.ceil((1.3 * escapeSpeed(BODIES[p.bodyId], BODIES[p.bodyId].radius + p.altitude)) / 500) * 500;

interface Props {
  params: LaunchParams;
  snap: SpeedSnap;
  warp: Warp;
  running: boolean;
  hasShot: boolean;
  onParams: (p: Partial<LaunchParams>, snap?: SpeedSnap) => void;
  onWarp: (w: Warp) => void;
  onFire: () => void;
  onTogglePlay: () => void;
  onClear: () => void;
}

const btn =
  'min-h-11 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40';
const chip = (active: boolean) =>
  `${btn} border ${active ? 'border-sky-400 bg-sky-500/20 text-sky-100' : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'}`;

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function ControlsPanel(props: Props) {
  const { params, snap, warp, running, hasShot } = props;
  const t = useT();
  const lang = useLang();
  const body = BODIES[params.bodyId];
  const r = body.radius + params.altitude;
  const v1 = circularSpeed(body, r);
  const v2 = escapeSpeed(body, r);
  const vMax = maxLaunchSpeed(params);
  const kind = classifyTrajectory({ x: 0, y: r, vx: params.v0, vy: 0 }, body);
  const dragMatters = params.drag && !!body.atmosphere && params.altitude < body.atmosphere.cutoff;
  const kmh = (v: number) => fmt(v / 1000, lang, 2);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button onClick={props.onFire} className={`${btn} bg-amber-500 text-base font-semibold text-slate-950 hover:bg-amber-400`}>
          🔥 {t.fire}
        </button>
        <button onClick={props.onTogglePlay} disabled={!hasShot} className={chip(false)} aria-label={running ? t.pause : t.play}>
          {running ? '⏸' : '▶'} <span className="ml-1 hidden sm:inline">{running ? t.pause : t.play}</span>
        </button>
      </div>

      <Section title={t.body}>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(BODIES) as BodyId[]).map((id) => (
            <button key={id} className={chip(params.bodyId === id)} onClick={() => props.onParams({ bodyId: id })}>
              {t.bodies[id]}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.altitude} aside={<span className="font-mono text-sm text-slate-200">h = {fmt(params.altitude / 1000, lang, params.altitude < 10_000 ? 2 : 0)} km</span>}>
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={altToSlider(params.altitude)}
          onChange={(e) => props.onParams({ altitude: sliderToAlt(Number(e.target.value)) })}
          className="w-full accent-sky-400"
          aria-label={t.altitude}
        />
        <div className="grid grid-cols-3 gap-2">
          {ALT_PRESETS.map((p) => (
            <button key={p.key} className={chip(params.altitude === p.h)} onClick={() => props.onParams({ altitude: p.h })}>
              <span className="block leading-tight">{t[p.key]}</span>
              <span className="block text-xs text-slate-400">{fmt(p.h / 1000, lang, p.h < 10_000 ? 2 : 0)} km</span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title={t.launchSpeed}
        aside={
          <span className="font-mono text-sm text-slate-200">
            v₀ = {kmh(params.v0)} km/s <span className="text-slate-400">= {fmt(params.v0 / v1, lang, 3)}·v₁</span>
          </span>
        }
      >
        <input
          type="range"
          min={0}
          max={vMax}
          step={1}
          value={params.v0}
          onChange={(e) => props.onParams({ v0: Number(e.target.value) }, 'free')}
          className="w-full accent-sky-400"
          aria-label={t.launchSpeed}
        />
        <div className="grid grid-cols-2 gap-2">
          <button className={chip(snap === 'v1')} onClick={() => props.onParams({ v0: v1 }, 'v1')} title={t.firstCosmic}>
            v₁ = {kmh(v1)} km/s
          </button>
          <button className={chip(snap === 'v2')} onClick={() => props.onParams({ v0: v2 }, 'v2')} title={t.secondCosmic}>
            v₂ = {kmh(v2)} km/s
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {[-100, -10, 10, 100].map((d) => (
              <button
                key={d}
                className={`${chip(false)} min-w-11 px-2 font-mono text-xs`}
                onClick={() => props.onParams({ v0: Math.min(vMax, Math.max(0, params.v0 + d)) }, 'free')}
              >
                {d > 0 ? '+' : '−'}
                {Math.abs(d)}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">m/s</span>
        </div>
        <p className="rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-slate-300">
          {dragMatters ? `${t.drag}: ${t.kinds.suborbital}` : t.kinds[kind]}
        </p>
      </Section>

      <Section title={t.drag}>
        <div className="grid grid-cols-2 gap-2">
          <button className={chip(!params.drag || !body.atmosphere)} onClick={() => props.onParams({ drag: false })} disabled={!body.atmosphere}>
            {t.dragOff}
          </button>
          <button className={chip(params.drag && !!body.atmosphere)} onClick={() => props.onParams({ drag: true })} disabled={!body.atmosphere}>
            {t.dragOn}
          </button>
        </div>
        <p className="text-xs text-slate-500">{body.atmosphere ? t.dragNote : t.dragNoAtmosphere}</p>
      </Section>

      <Section title={t.speed}>
        <div className="grid grid-cols-5 gap-1.5">
          {WARP_PRESETS.map((w, i) => (
            <button key={w} className={`${chip(warp === w)} px-1 font-mono`} onClick={() => props.onWarp(w)} title={`${i + 1}`}>
              {fmt(w, lang, 0)}×
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">1× = {t.realTime}</p>
      </Section>

      <button onClick={props.onClear} disabled={!hasShot} className={`${chip(false)} w-full`}>
        {t.clearShots}
      </button>
      <p className="hidden text-xs text-slate-500 lg:block">{t.shortcuts}</p>
    </div>
  );
}
