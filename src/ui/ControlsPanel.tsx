import { BODIES, circularSpeed, escapeSpeed, type BodyId } from '../physics/bodies';
import { classifyTrajectory } from '../physics/orbitalElements';
import { fmt } from '../i18n/format';
import { useLang, useT } from '../i18n';
import { WARP_PRESETS, type LaunchParams, type Warp } from '../sim/simulation';
import type { ThemeId } from '../theme/themes';

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
  advancedOpen: boolean;
  onAdvanced: (open: boolean) => void;
  /** Energy bars, rendered between the drag and vector sections. */
  energy: React.ReactNode;
  params: LaunchParams;
  snap: SpeedSnap;
  warp: Warp;
  running: boolean;
  hasShot: boolean;
  themeId: ThemeId;
  onTheme: (id: ThemeId) => void;
  vectors: boolean;
  components: boolean;
  onVectors: (on: boolean) => void;
  onComponents: (on: boolean) => void;
  onParams: (p: Partial<LaunchParams>, snap?: SpeedSnap) => void;
  onWarp: (w: Warp) => void;
  onFire: () => void;
  onTogglePlay: () => void;
  onClear: () => void;
}

const btn =
  'min-h-11 rounded-lg px-3 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--chip-on-line) disabled:opacity-40';
const chip = (active: boolean) =>
  `${btn} border ${active ? 'border-(--chip-on-line) bg-(--chip-on) font-semibold text-(--chip-on-ink)' : 'border-(--line) text-(--muted) hover:text-(--ink)'}`;

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-semibold">{title}</h3>
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
  // Below ~150 km real air stops the ball within one orbit; higher up the orbit only decays slowly.
  const dragMatters = params.drag && !!body.atmosphere && params.altitude < 150_000;
  const kmh = (v: number) => fmt(v / 1000, lang, 2);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button onClick={props.onFire} className={`${btn} min-h-12 bg-(--fire) text-base font-bold text-(--fire-ink) hover:bg-(--fire-hover)`}>
          {t.fire}
        </button>
        <button onClick={props.onTogglePlay} disabled={!hasShot} className={chip(false)} aria-label={running ? t.pause : t.play}>
          {running ? '⏸' : '▶'} <span className="ml-1 hidden sm:inline">{running ? t.pause : t.play}</span>
        </button>
      </div>

      <Section title={t.speed}>
        <div className="grid grid-cols-3 gap-2">
          {WARP_PRESETS.map((w, i) => (
            <button key={w} className={`${chip(warp === w)} px-1`} onClick={() => props.onWarp(w)} title={`${i + 1}`}>
              {fmt(w, lang, 0)}×
            </button>
          ))}
        </div>
        <p className="text-sm text-(--muted)">1× = {t.realTime}</p>
      </Section>


      <p className="text-[15px]">
        {t.body}: <span className="font-semibold">{t.bodies[params.bodyId]}</span>
      </p>

      <Section title={t.altitude} aside={<span className="text-[15px]">h = {fmt(params.altitude / 1000, lang, params.altitude < 10_000 ? 2 : 0)} km</span>}>
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={altToSlider(params.altitude)}
          onChange={(e) => props.onParams({ altitude: sliderToAlt(Number(e.target.value)) })}
          className="w-full"
          aria-label={t.altitude}
        />
        <div className="grid grid-cols-3 gap-2">
          {ALT_PRESETS.map((p) => (
            <button key={p.key} className={chip(params.altitude === p.h)} onClick={() => props.onParams({ altitude: p.h })}>
              <span className="block leading-tight">
                {p.key === 'presetKarman' ? (
                  <>
                    <span className="sm:hidden">{t.presetKarmanShort}</span>
                    <span className="hidden sm:inline">{t[p.key]}</span>
                  </>
                ) : (
                  t[p.key]
                )}
              </span>
              <span className="block text-xs text-(--muted)">{fmt(p.h / 1000, lang, p.h < 10_000 ? 2 : 0)} km</span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title={t.launchSpeed}
        aside={
          <span className="text-[15px]">
            v₀ = {kmh(params.v0)} km/s <span className="text-(--muted)">= {fmt(params.v0 / v1, lang, 3)}·v₁</span>
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
          className="w-full"
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
            {[-100, 100].map((d) => (
              <button
                key={d}
                className={`${chip(false)} min-w-11 px-2 text-sm`}
                onClick={() => props.onParams({ v0: Math.min(vMax, Math.max(0, params.v0 + d)) }, 'free')}
              >
                {d > 0 ? '+' : '−'}
                {Math.abs(d)}
              </button>
            ))}
          </div>
          <span className="text-sm text-(--muted)">m/s</span>
        </div>
        <p className="border-l-2 border-(--chip-on-line) py-1 pl-3 text-[15px]">
          {dragMatters ? `${t.drag}: ${t.kinds.suborbital}` : t.kinds[kind]}
        </p>
      </Section>

      <Section title={t.energy} aside={<span className="text-sm text-(--muted)">{t.energyBall}</span>}>
        {props.energy}
      </Section>

      <details className="group rounded-xl border border-(--line)" open={props.advancedOpen} onToggle={(e) => props.onAdvanced((e.target as HTMLDetailsElement).open)}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold">
          {t.advanced}
          <span className="text-(--muted) transition-transform group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="space-y-6 px-4 pt-2 pb-4">
      <Section title={t.body}>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(BODIES) as BodyId[]).map((id) => (
            <button key={id} className={chip(params.bodyId === id)} onClick={() => props.onParams({ bodyId: id })}>
              {t.bodies[id]}
            </button>
          ))}
        </div>
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
        <p className="text-sm text-(--muted)">{body.atmosphere ? t.dragNote : t.dragNoAtmosphere}</p>
      </Section>

      <Section title={t.vectors}>
        <div className="grid grid-cols-2 gap-2">
          <button className={chip(props.vectors)} aria-pressed={props.vectors} onClick={() => props.onVectors(!props.vectors)}>
            {t.vectorsShow}
          </button>
          <button
            className={chip(props.vectors && props.components)}
            aria-pressed={props.components}
            disabled={!props.vectors}
            onClick={() => props.onComponents(!props.components)}
          >
            {t.components}
          </button>
        </div>
        <p className="text-sm text-(--muted)">
          <span className="font-math italic">v</span><sub className="font-math italic">r</sub>,{' '}
          <span className="font-math italic">v</span><sub className="font-math italic">t</sub>: {t.componentsHint}
        </p>
      </Section>

      {/* On phones the style switch lives here instead of on the canvas. */}
      <div className="sm:hidden">
        <Section title={t.theme}>
          <div className="grid grid-cols-2 gap-2">
            {(['real', 'newton'] as const).map((id) => (
              <button key={id} className={chip(props.themeId === id)} aria-pressed={props.themeId === id} onClick={() => props.onTheme(id)}>
                {id === 'real' ? t.themeReal : t.themeNewton}
              </button>
            ))}
          </div>
        </Section>
      </div>

        </div>
      </details>

      <button onClick={props.onClear} disabled={!hasShot} className={`${chip(false)} w-full`}>
        {t.clearShots}
      </button>
    </div>
  );
}
