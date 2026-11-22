import { useEffect, useState } from 'react';
import { fmt, fmtDuration } from '../i18n/format';
import { useLang, useT } from '../i18n';
import { LESSON_DONE, LESSON_UI, LESSONS } from '../i18n/lessons';
import { LESSON_ANSWERS, LESSON_SETUPS, lessonResult, type LessonResult, type LessonSetup } from '../sim/lessons';
import type { Simulation } from '../sim/simulation';

interface Progress {
  answers: (number | null)[];
  results: (LessonResult | null)[];
}

/** Which lesson is open survives switching tabs (the panel remounts). */
let lastOpen = 0;

const EMPTY: Progress = { answers: [null, null, null, null], results: [null, null, null, null] };

function load(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem('lessons') ?? '') as Progress;
    if (p.answers?.length === 4 && p.results?.length === 4) return p;
  } catch {
    /* none saved */
  }
  return EMPTY;
}

/** Lesson 2 figure: the ball's drop and the surface curvature over the first second, vertically exaggerated. */
function CurvatureInset({ x, drop, curve }: { x: number; drop: number; curve: number }) {
  const lang = useLang();
  const d = LESSON_DONE[lang];
  const W = 320;
  const H = 150;
  const x0 = 20;
  const x1 = W - 20;
  const y0 = 34;
  const sy = 80 / drop; // px per metre vertically
  const sx = (x1 - x0) / x; // px per metre horizontally
  const k = Math.round(sy / sx / 10) * 10;
  const path = (depth: number) =>
    Array.from({ length: 41 }, (_, i) => {
      const u = i / 40;
      return `${i ? 'L' : 'M'}${(x0 + u * (x1 - x0)).toFixed(1)} ${(y0 + u * u * depth * sy).toFixed(1)}`;
    }).join(' ');
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={d.insetScale(String(k))}>
        <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="var(--muted)" strokeDasharray="4 4" />
        <path d={path(curve)} fill="none" stroke="var(--s-ep)" strokeWidth="5" strokeOpacity="0.45" strokeLinecap="round" />
        <path d={path(drop)} fill="none" stroke="var(--s-ek)" strokeWidth="2" />
        <circle cx={x0} cy={y0} r="4" fill="var(--ink)" />
        <circle cx={x1} cy={y0 + drop * sy} r="4" fill="var(--s-ek)" />
        <line x1={x1 + 8} y1={y0} x2={x1 + 8} y2={y0 + drop * sy} stroke="var(--ink)" />
        <text x={x0} y={y0 - 10} fontSize="12" fill="var(--muted)">
          {fmt(x / 1000, lang, 2)} km
        </text>
        <text x={x0 + 40} y={y0 + 70} fontSize="12" fill="var(--ink)">
          {d.insetBall(fmt(drop, lang, 2))}
        </text>
        <text x={x0 + 40} y={y0 + 88} fontSize="12" fill="var(--ink)">
          {d.insetSurface(fmt(curve, lang, 2))}
        </text>
        <text x={x0} y={H - 6} fontSize="11" fill="var(--muted)">
          {d.insetScale(String(k))}
        </text>
      </svg>
    </figure>
  );
}

interface Props {
  sim: Simulation;
  onSetup: (s: LessonSetup) => void;
  /** Current launch speed (m/s) and quick controls, so students can work without switching tabs. */
  v0: number;
  onV0: (v0: number) => void;
  onFire: () => void;
}

export function LessonPanel({ sim, onSetup, v0, onV0, onFire }: Props) {
  const t = useT();
  const lang = useLang();
  const ui = LESSON_UI[lang];
  const texts = LESSONS[lang];
  const done = LESSON_DONE[lang];
  const [open, setOpenState] = useState(lastOpen);
  const setOpen = (i: number) => {
    lastOpen = i;
    setOpenState(i);
  };
  const [progress, setProgress] = useState<Progress>(load);

  // Check the tasks a few times per second; a solved lesson stays solved.
  useEffect(() => {
    const id = setInterval(() => {
      const shots = [...sim.ghosts, ...(sim.current ? [sim.current] : [])];
      setProgress((p) => {
        let changed = false;
        const results = p.results.map((r, i) => {
          if (r) return r;
          const now = lessonResult(i, shots);
          if (now) changed = true;
          return now;
        });
        return changed ? { ...p, results } : p;
      });
    }, 300);
    return () => clearInterval(id);
  }, [sim]);

  useEffect(() => {
    try {
      localStorage.setItem('lessons', JSON.stringify(progress));
    } catch {
      /* storage unavailable: fine */
    }
  }, [progress]);

  const solvedCount = progress.results.filter(Boolean).length;
  const v = (ms: number) => fmt(ms / 1000, lang, 2);

  const message = (r: LessonResult) => {
    switch (r.kind) {
      case 'range':
        return done.range(fmt(r.km, lang, 0));
      case 'curvature':
        return done.curvature(fmt(r.x / 1000, lang, 2), fmt(r.drop, lang, 2), fmt(r.curve, lang, 2));
      case 'circle':
        return done.circle(v(r.v0), fmtDuration(r.period, lang), fmtDuration(r.kepler, lang));
      case 'escape':
        return done.escape(v(r.v0), v(r.v2));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-(--muted)">{ui.progress(solvedCount)}</p>
        <button className="min-h-11 text-sm text-(--muted) underline underline-offset-4 hover:text-(--ink)" onClick={() => setProgress(EMPTY)}>
          {ui.reset}
        </button>
      </div>
      <ol className="m-0 list-none space-y-3 p-0">
        {texts.map((L, i) => {
          const result = progress.results[i];
          const answer = progress.answers[i];
          const isOpen = open === i;
          return (
            <li key={i} className={`rounded-xl border ${isOpen ? 'border-(--chip-on-line)' : 'border-(--line)'}`}>
              <button className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${result ? 'bg-(--chip-on-line) text-(--panel)' : 'border border-(--line)'}`}
                  aria-label={result ? ui.solved : undefined}
                >
                  {result ? '✓' : i + 1}
                </span>
                <span className="text-[15px] font-semibold">{L.title}</span>
              </button>
              {isOpen && (
                <div className="space-y-3 px-4 pb-4">
                  <p className="text-[15px]">{L.intro}</p>
                  <button
                    className="min-h-11 rounded-lg border border-(--chip-on-line) px-4 text-[15px] font-semibold hover:bg-(--chip-on)"
                    onClick={() => onSetup(LESSON_SETUPS[i]!)}
                  >
                    {ui.setup}
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-[15px] tabular-nums">
                      <span className="font-math italic">v</span>
                      <sub>0</sub> = {fmt(v0 / 1000, lang, 2)} km/s
                    </span>
                    {[-100, 100].map((d) => (
                      <button
                        key={d}
                        className="min-h-11 min-w-12 rounded-lg border border-(--line) px-2 text-sm"
                        onClick={() => onV0(Math.max(0, v0 + d))}
                      >
                        {d > 0 ? '+' : '−'}
                        {Math.abs(d)}
                      </button>
                    ))}
                    <button
                      className="min-h-11 rounded-lg bg-(--fire) px-5 text-[15px] font-bold text-(--fire-ink) hover:bg-(--fire-hover)"
                      onClick={onFire}
                    >
                      {t.fire}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-(--muted)">{ui.predict}</p>
                    <p className="text-[15px]">{L.question}</p>
                    <div className="grid gap-2">
                      {L.options.map((o, k) => {
                        const chosen = answer === k;
                        const right = k === LESSON_ANSWERS[i];
                        return (
                          <button
                            key={k}
                            aria-pressed={chosen}
                            className={`min-h-11 rounded-lg border px-3 py-2 text-left text-[15px] ${
                              chosen ? (right ? 'border-(--chip-on-line) bg-(--chip-on) font-semibold' : 'border-(--s-ep)') : 'border-(--line)'
                            }`}
                            onClick={() =>
                              setProgress((p) => ({ ...p, answers: p.answers.map((a, j) => (j === i ? k : a)) }))
                            }
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                    {answer !== null && answer !== undefined && (
                      <p className="border-l-2 border-(--chip-on-line) py-1 pl-3 text-[15px]">{answer === LESSON_ANSWERS[i] ? L.right : L.wrong}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-(--muted)">{ui.yourTask}</p>
                    <p className="text-[15px]">{L.task}</p>
                    <p className="text-sm text-(--muted)">{L.hint}</p>
                    {result ? (
                      <div className="space-y-2 rounded-lg bg-(--chip-on) p-3">
                        <p className="text-[15px] font-semibold">✓ {ui.solved}</p>
                        <p className="text-[15px]">{message(result)}</p>
                        {result.kind === 'curvature' && <CurvatureInset x={result.x} drop={result.drop} curve={result.curve} />}
                      </div>
                    ) : (
                      <p className="text-sm text-(--muted)">{ui.notYet}</p>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
