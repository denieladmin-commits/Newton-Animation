import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BODIES, circularSpeed, escapeSpeed } from './physics/bodies';
import { DEFAULT_PROJECTILE, forces, radius, speed } from './physics/orbitalPhysics';
import { Camera } from './render/camera';
import type { SceneLabels, SceneOptions } from './render/scene';
import { THEMES, type ThemeId } from './theme/themes';
import { energies, Simulation, WARP_PRESETS, type LaunchParams, type Warp } from './sim/simulation';
import { EnergyBars, energyScale } from './ui/EnergyBars';
import { FormulasPanel } from './ui/FormulasPanel';
import { GraphsPanel } from './ui/GraphsPanel';
import { LessonPanel } from './ui/LessonPanel';
import type { LessonSetup } from './sim/lessons';
import { fmt, fmtDistance, fmtDuration, type Lang } from './i18n/format';
import { LangContext } from './i18n';
import { STRINGS } from './i18n/strings';
import { CanvasView } from './ui/CanvasView';
import { ControlsPanel, maxLaunchSpeed, type SpeedSnap } from './ui/ControlsPanel';

const INITIAL: LaunchParams = { bodyId: 'earth', altitude: 8_850, v0: 6_000, drag: false };
/** Pixels kept free at the top of the canvas for the status box. */
const HUD_SPACE = 96;
type Tab = 'controls' | 'formulas' | 'graphs' | 'lesson';

interface Telemetry {
  t: number;
  altitude: number;
  speed: number;
  status: 'idle' | 'flying' | 'crashed' | 'escaped';
  range: number;
  orbits: number;
  period: number | null;
  /** Gravitational force on the ball (N). */
  force: number;
  /** Distance from the planet's centre (m). */
  r: number;
  ek: number;
  ep: number;
  loss: number;
  /** Energy bar scale for this shot (J). */
  scale: number;
  /** Air-drag force on the ball (N), 0 without drag. */
  dragForce: number;
}

function readTelemetry(sim: Simulation): Telemetry {
  const shot = sim.current;
  const forceAt = (r: number) => (sim.body.GM * DEFAULT_PROJECTILE.mass) / (r * r);
  const p = shot ? shot.params : sim.params;
  const r0 = sim.body.radius + p.altitude;
  const scale = energyScale(sim.body, r0, p.v0);
  if (!shot) {
    const lp = { ...sim.launchPoint, vx: sim.params.v0 };
    const en = energies(lp, sim.body);
    return {
      t: 0,
      altitude: sim.params.altitude,
      speed: sim.params.v0,
      status: 'idle',
      range: 0,
      orbits: 0,
      period: null,
      force: forceAt(r0),
      r: r0,
      ek: en.ek,
      ep: en.ep,
      loss: 0,
      scale,
      dragForce: 0,
    };
  }
  const s = shot.flight.state;
  const en = energies(s, sim.body);
  return {
    t: s.t,
    altitude: radius(s) - sim.body.radius,
    speed: speed(s),
    status: shot.flight.status,
    range: Math.abs(shot.flight.swept) * sim.body.radius,
    orbits: shot.flight.orbitsCompleted,
    period: shot.flight.measuredPeriod,
    force: forceAt(radius(s)),
    r: radius(s),
    ek: en.ek,
    ep: en.ep,
    loss: en.loss,
    scale,
    dragForce: shot.flight.env.drag
      ? (() => {
          const f = forces(s, shot.flight.env);
          return Math.hypot(f.dx, f.dy) * DEFAULT_PROJECTILE.mass;
        })()
      : 0,
  };
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('lang') as Lang) || 'hu';
    } catch {
      return 'hu';
    }
  });
  const t = STRINGS[lang];
  const [params, setParamsState] = useState<LaunchParams>(INITIAL);
  const [snap, setSnap] = useState<SpeedSnap>('free');
  const [warp, setWarpState] = useState<Warp>(1);
  const [running, setRunning] = useState(false);
  const [follow, setFollow] = useState(false);
  const [tab, setTab] = useState<Tab>('controls');
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    try {
      // 'chalk' was the earlier alternative style; it became Newton's figure.
      const saved = localStorage.getItem('theme');
      return saved === 'newton' || saved === 'chalk' ? 'newton' : 'real';
    } catch {
      return 'real';
    }
  });
  const [vectors, setVectors] = useState(true);
  const [components, setComponents] = useState(false);
  const [tele, setTele] = useState<Telemetry>(() => readTelemetry(new Simulation(INITIAL)));

  const sim = useMemo(() => new Simulation(INITIAL), []);
  const camera = useMemo(() => new Camera(), []);
  const followRef = useRef(follow);
  followRef.current = follow;
  const heightText = `${fmt(params.altitude / 1000, lang, params.altitude < 10_000 ? 2 : 0)} km`;
  const labels: SceneLabels = {
    distance: (m) => fmtDistance(m, lang),
    heightTag: `h = ${heightText}`,
    caption: { figure: t.figure, text: t.caption(heightText, t.bodiesOn[params.bodyId]) },
  };
  const options: SceneOptions = { theme: THEMES[themeId], vectors, components };
  const viewRef = useRef({ labels, options });
  viewRef.current = { labels, options };

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
    } catch {
      /* storage unavailable: fine */
    }
    document.documentElement.lang = lang;
    document.title = t.appTitle;
  }, [lang, t.appTitle]);

  useEffect(() => {
    try {
      localStorage.setItem('theme', themeId);
    } catch {
      /* storage unavailable: fine */
    }
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  // Telemetry for the UI at 10 Hz (the canvas itself redraws every frame).
  useEffect(() => {
    const id = setInterval(() => {
      setTele(readTelemetry(sim));
      setRunning(sim.running);
    }, 100);
    return () => clearInterval(id);
  }, [sim]);

  const fitPlanet = useCallback(
    (animate = true) => {
      const R = sim.body.radius;
      const h = sim.params.altitude;
      // Keep the top strip free so the status box never hides the cannon.
      camera.fit(-1.15 * R, -1.15 * R, 1.15 * R, 1.15 * R + h, animate, HUD_SPACE);
    },
    [sim, camera],
  );

  /** Frame the planet plus every trajectory drawn so far. */
  const fitAll = useCallback(() => {
    const R = sim.body.radius;
    let [x0, y0, x1, y1] = [-1.15 * R, -1.15 * R, 1.15 * R, 1.15 * R];
    for (const shot of [...sim.ghosts, ...(sim.current ? [sim.current] : [])]) {
      const tr = shot.trail;
      for (let i = 0; i < tr.length; i += 16) {
        x0 = Math.min(x0, tr.xs[i]!);
        x1 = Math.max(x1, tr.xs[i]!);
        y0 = Math.min(y0, tr.ys[i]!);
        y1 = Math.max(y1, tr.ys[i]!);
      }
    }
    setFollow(false);
    camera.fit(x0, y0, x1, y1, true, HUD_SPACE);
  }, [sim, camera]);

  const setParams = useCallback(
    (p: Partial<LaunchParams>, nextSnap?: SpeedSnap) => {
      const prev = sim.params;
      let next = { ...prev, ...p };
      const s = nextSnap ?? snap;
      const body = BODIES[next.bodyId];
      const r = body.radius + next.altitude;
      if (p.bodyId && p.bodyId !== prev.bodyId && s === 'free') {
        // Keep the same fraction of v₁ when switching planets.
        const ratio = prev.v0 / circularSpeed(BODIES[prev.bodyId], BODIES[prev.bodyId].radius + prev.altitude);
        next.v0 = Math.round(ratio * circularSpeed(body, r));
      }
      if (s === 'v1') next.v0 = circularSpeed(body, r);
      if (s === 'v2') next.v0 = escapeSpeed(body, r);
      next = { ...next, v0: Math.min(next.v0, maxLaunchSpeed(next)) };
      sim.setParams(next);
      setParamsState(next);
      if (nextSnap) setSnap(nextSnap);
      if (next.bodyId !== prev.bodyId) {
        camera.setExtent(32 * body.radius);
        setFollow(false);
        fitPlanet();
      }
    },
    [sim, camera, snap, fitPlanet],
  );

  const fire = useCallback(() => {
    sim.fire();
    setRunning(true);
    // At real-time speed, zoom to the cannon so the motion is visible.
    if (sim.warp === 1) {
      const lp = sim.launchPoint;
      const width = Math.max(40_000, sim.params.v0 * 8);
      camera.animateTo({ cx: lp.x, cy: lp.y, scale: Math.min(camera.width, camera.height) / width });
      setFollow(true);
    }
  }, [sim, camera]);

  const togglePlay = useCallback(() => {
    if (!sim.current || sim.current.flight.status !== 'flying') {
      fire();
      return;
    }
    sim.running = !sim.running;
    setRunning(sim.running);
  }, [sim, fire]);

  const setWarp = useCallback(
    (w: Warp) => {
      sim.warp = w;
      setWarpState(w);
    },
    [sim],
  );

  const clear = useCallback(() => {
    sim.clearShots();
    setRunning(false);
    setFollow(false);
  }, [sim]);

  /** Lesson "set it up for me": planet, height, speed and time warp, with old shots cleared. */
  const applySetup = useCallback(
    (ls: LessonSetup) => {
      clear();
      if (ls.v0 === 'v1') setParams({ bodyId: ls.bodyId, altitude: ls.altitude, drag: false }, 'v1');
      else setParams({ bodyId: ls.bodyId, altitude: ls.altitude, drag: false, v0: ls.v0 }, 'free');
      setWarp(ls.warp);
      fitPlanet();
    },
    [clear, setParams, setWarp, fitPlanet],
  );

  const zoom = useCallback((f: number) => camera.zoomAt(camera.width / 2, camera.height / 2, f), [camera]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'range') return;
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'Enter' && el.tagName !== 'BUTTON') fire();
      else if (e.key >= '1' && e.key <= '5') setWarp(WARP_PRESETS[Number(e.key) - 1]!);
      else if (e.key === '+' || e.key === '=') zoom(1.5);
      else if (e.key === '-' || e.key === '_') zoom(1 / 1.5);
      else if (e.key === '0') fitAll();
      else if (e.key.toLowerCase() === 'f') setFollow((v) => !v);
      else if (e.key.toLowerCase() === 'l') setLang((l) => (l === 'hu' ? 'en' : 'hu'));
      else if (e.key.toLowerCase() === 'v') setVectors((v) => !v);
      else if (e.key.toLowerCase() === 't') setThemeId((th) => (th === 'real' ? 'newton' : 'real'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, fire, setWarp, zoom, fitAll]);

  const status =
    tele.status === 'idle'
      ? t.ready
      : tele.status === 'crashed'
        ? t.crashed(fmtDistance(tele.range, lang), fmtDuration(tele.t, lang))
        : tele.status === 'escaped'
          ? t.escaped
          : tele.orbits > 0 && tele.period
            ? t.orbits(tele.orbits, fmtDuration(tele.period, lang))
            : running
              ? t.flying
              : t.paused;

  const tabs: [Tab, string][] = [
    ['controls', t.tabControls],
    ['formulas', t.tabFormulas],
    ['graphs', t.tabGraphs],
    ['lesson', t.tabLesson],
  ];
  const overlayBtn =
    'grid h-11 min-w-11 place-items-center rounded-xl border border-(--overlay-line) bg-(--overlay-bg) px-2 text-lg text-(--overlay-ink) backdrop-blur-sm hover:brightness-125 focus-visible:outline-2 focus-visible:outline-(--chip-on-line)';
  const segBtn = (on: boolean) =>
    `min-h-9 rounded-lg px-3 text-sm transition-colors ${on ? 'bg-(--overlay-ink) font-semibold text-(--overlay-bg)' : 'text-(--overlay-muted) hover:text-(--overlay-ink)'}`;
  const fmtForce = (n: number) => (n >= 100 ? fmt(n, lang, 0) : fmt(n, lang, n >= 10 ? 1 : 2));

  return (
    <LangContext.Provider value={lang}>
      <div className="flex h-dvh flex-col overflow-hidden lg:flex-row">
        {/* ── canvas ── */}
        <div className="relative h-[52%] min-h-0 lg:h-full lg:w-[65%]">
          <CanvasView
            sim={sim}
            camera={camera}
            followRef={followRef}
            viewRef={viewRef}
            onUserMove={() => setFollow(false)}
            onFirstLayout={() => fitPlanet(false)}
          />
          <div className="pointer-events-none absolute top-3 left-3 max-w-[calc(100%-7rem)] sm:max-w-[calc(100%-19rem)]">
            <div className="pointer-events-auto rounded-xl border border-(--overlay-line) bg-(--overlay-bg) px-3.5 py-2 text-(--overlay-ink) backdrop-blur-sm">
              <p className="text-sm font-semibold sm:text-[15px]">{status}</p>
              <p className="mt-0.5 text-xs text-(--overlay-muted) sm:text-[13px]">
                {tele.status !== 'idle' && <>t = {fmtDuration(tele.t, lang)}&ensp;</>}
                h = {fmtDistance(tele.altitude, lang)}&ensp;
                {tele.status !== 'idle' && <>v = {fmt(tele.speed / 1000, lang, 3)} km/s&ensp;</>}
                F = {fmtForce(tele.force)} N
                {tele.dragForce >= 0.01 && <>&ensp;F<sub>d</sub> = {fmtForce(tele.dragForce)} N</>}
              </p>
            </div>
          </div>
          <div className="absolute top-3 right-3 flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div
              role="radiogroup"
              aria-label={t.theme}
              className="hidden gap-0.5 rounded-xl sm:flex border border-(--overlay-line) bg-(--overlay-bg) p-1 backdrop-blur-sm"
            >
              {(['real', 'newton'] as const).map((id) => (
                <button key={id} role="radio" aria-checked={themeId === id} className={segBtn(themeId === id)} onClick={() => setThemeId(id)}>
                  {id === 'real' ? t.themeReal : t.themeNewton}
                </button>
              ))}
            </div>
            <button className={overlayBtn} onClick={() => setLang(lang === 'hu' ? 'en' : 'hu')} aria-label={t.language}>
              <span className="text-sm font-semibold">{lang === 'hu' ? 'EN' : 'HU'}</span>
            </button>
          </div>
          <div className="absolute right-3 bottom-3 flex flex-col gap-2">
            <button className={overlayBtn} onClick={() => zoom(1.6)} aria-label={t.zoomIn} title={t.zoomIn}>
              +
            </button>
            <button className={overlayBtn} onClick={() => zoom(1 / 1.6)} aria-label={t.zoomOut} title={t.zoomOut}>
              −
            </button>
            <button className={overlayBtn} onClick={fitAll} aria-label={t.fitView} title={t.fitView}>
              ⤢
            </button>
            <button
              className={`${overlayBtn} ${follow ? 'outline-2 outline-(--chip-on-line)' : ''}`}
              onClick={() => setFollow((v) => !v)}
              aria-pressed={follow}
              aria-label={t.follow}
              title={t.follow}
            >
              ◎
            </button>
          </div>
        </div>

        {/* ── side panel ── */}
        <aside className="flex h-[48%] min-h-0 flex-col border-t border-(--line) bg-(--panel) lg:h-full lg:w-[35%] lg:border-t-0 lg:border-l">
          <header className="hidden px-6 pt-5 lg:block">
            <h1 className="font-math text-[27px] leading-tight">
              <i>Newton</i>
              {lang === 'hu' ? ' ' : ''}
              {t.titleTail}
            </h1>
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b border-(--line) px-3 pt-2 lg:px-5 lg:pt-3" role="tablist">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`-mb-px min-h-11 shrink-0 border-b-2 px-3 text-sm ${tab === id ? 'border-(--chip-on-line) font-semibold' : 'border-transparent text-(--muted) hover:text-(--ink)'}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:px-6 lg:py-5">
            {tab === 'controls' ? (
              <ControlsPanel
                energy={
                  <EnergyBars
                    ek={tele.ek}
                    ep={tele.ep}
                    loss={tele.loss}
                    drag={(tele.status === 'idle' ? params.drag : (sim.current?.params.drag ?? false)) && !!sim.body.atmosphere}
                    scale={tele.scale}
                  />
                }
                params={params}
                snap={snap}
                warp={warp}
                running={running}
                hasShot={tele.status !== 'idle'}
                themeId={themeId}
                onTheme={setThemeId}
                vectors={vectors}
                components={components}
                onVectors={setVectors}
                onComponents={setComponents}
                onParams={setParams}
                onWarp={setWarp}
                onFire={fire}
                onTogglePlay={togglePlay}
                onClear={clear}
              />
            ) : tab === 'formulas' ? (
              <FormulasPanel
                body={sim.body}
                r0={sim.body.radius + (sim.current?.params.altitude ?? params.altitude)}
                altitude={sim.current?.params.altitude ?? params.altitude}
                r={tele.r}
                v={tele.speed}
                themeId={themeId}
              />
            ) : tab === 'graphs' ? (
              <GraphsPanel sim={sim} themeId={themeId} />
            ) : (
              <LessonPanel
                sim={sim}
                onSetup={applySetup}
                v0={params.v0}
                onV0={(v) => setParams({ v0: Math.min(v, maxLaunchSpeed(params)) }, 'free')}
                onFire={fire}
              />
            )}
          </div>
        </aside>
      </div>
    </LangContext.Provider>
  );
}
