import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BODIES, circularSpeed, escapeSpeed } from './physics/bodies';
import { radius, speed } from './physics/orbitalPhysics';
import { Camera } from './render/camera';
import type { SceneLabels } from './render/scene';
import { Simulation, WARP_PRESETS, type LaunchParams, type Warp } from './sim/simulation';
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
}

function readTelemetry(sim: Simulation): Telemetry {
  const shot = sim.current;
  if (!shot) return { t: 0, altitude: sim.params.altitude, speed: 0, status: 'idle', range: 0, orbits: 0, period: null };
  const s = shot.flight.state;
  return {
    t: s.t,
    altitude: radius(s) - sim.body.radius,
    speed: speed(s),
    status: shot.flight.status,
    range: Math.abs(shot.flight.swept) * sim.body.radius,
    orbits: shot.flight.orbitsCompleted,
    period: shot.flight.measuredPeriod,
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
  const [tele, setTele] = useState<Telemetry>(() => readTelemetry(new Simulation(INITIAL)));

  const sim = useMemo(() => new Simulation(INITIAL), []);
  const camera = useMemo(() => new Camera(), []);
  const followRef = useRef(follow);
  followRef.current = follow;
  const labelsRef = useRef<SceneLabels>({ distance: () => '', heightTag: '' });
  labelsRef.current = {
    distance: (m) => fmtDistance(m, lang),
    heightTag: `h = ${fmt(params.altitude / 1000, lang, params.altitude < 10_000 ? 2 : 0)} km`,
  };

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
    } catch {
      /* storage unavailable: fine */
    }
    document.documentElement.lang = lang;
    document.title = t.appTitle;
  }, [lang, t.appTitle]);

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
    'grid h-11 min-w-11 place-items-center rounded-xl border border-slate-700 bg-slate-900/80 px-2 text-lg text-slate-200 backdrop-blur hover:bg-slate-800';

  return (
    <LangContext.Provider value={lang}>
      <div className="flex h-dvh flex-col overflow-hidden lg:flex-row">
        {/* ── canvas ── */}
        <div className="relative h-[52%] min-h-0 lg:h-full lg:w-[65%]">
          <CanvasView
            sim={sim}
            camera={camera}
            followRef={followRef}
            labelsRef={labelsRef}
            onUserMove={() => setFollow(false)}
            onFirstLayout={() => fitPlanet(false)}
          />
          <div className="pointer-events-none absolute top-3 left-3 max-w-[calc(100%-6rem)] space-y-1.5">
            <div className="pointer-events-auto rounded-xl border border-slate-700/70 bg-slate-950/75 px-3 py-1.5 text-xs backdrop-blur sm:py-2 sm:text-sm">
              <p className="font-medium text-slate-100">{status}</p>
              {tele.status !== 'idle' && (
                <p className="mt-0.5 font-mono text-[11px] text-slate-300 sm:text-xs">
                  <span className="hidden sm:inline">{t.time}: </span>
                  {fmtDuration(tele.t, lang)} · <span className="hidden sm:inline">{t.height}: </span>h = {fmtDistance(tele.altitude, lang)} ·{' '}
                  <span className="hidden sm:inline">{t.velocity}: </span>v = {fmt(tele.speed / 1000, lang, 3)} km/s
                </p>
              )}
            </div>
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button className={overlayBtn} onClick={() => setLang(lang === 'hu' ? 'en' : 'hu')} aria-label="Language">
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
              className={`${overlayBtn} ${follow ? 'border-sky-400 text-sky-300' : ''}`}
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
        <aside className="flex h-[48%] min-h-0 flex-col border-t border-slate-800 bg-slate-950/90 lg:h-full lg:w-[35%] lg:border-t-0 lg:border-l">
          <header className="hidden px-5 pt-4 lg:block">
            <h1 className="text-lg font-semibold text-sky-300">{t.appTitle}</h1>
          </header>
          <nav className="flex gap-1 overflow-x-auto px-3 pt-2 lg:px-4 lg:pt-3" role="tablist">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`min-h-11 shrink-0 rounded-t-lg px-3 text-sm font-medium ${tab === id ? 'bg-slate-800 text-sky-200' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-800 bg-slate-900/40 p-4 lg:p-5">
            {tab === 'controls' ? (
              <ControlsPanel
                params={params}
                snap={snap}
                warp={warp}
                running={running}
                hasShot={tele.status !== 'idle'}
                onParams={setParams}
                onWarp={setWarp}
                onFire={fire}
                onTogglePlay={togglePlay}
                onClear={clear}
              />
            ) : (
              <p className="text-sm text-slate-400">{t.comingSoon}</p>
            )}
          </div>
        </aside>
      </div>
    </LangContext.Provider>
  );
}
