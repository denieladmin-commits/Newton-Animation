/**
 * Ellenőrzés: the teacher's proof page. One button runs eight checks live in
 * this browser; printing uses the browser's own print with a print stylesheet.
 */
import { useState } from 'react';
import { useLang } from '../i18n';
import { CHECKS, type CheckResult } from '../verify/checks';

const TEXT = {
  hu: {
    title: 'Ellenőrzés',
    intro:
      'Ezek az ellenőrzések most, ebben a böngészőben futtatják a szimuláció programját, és az eredményt független értékkel vetik össze: képlettel, Kepler törvényeivel vagy nemzetközi referenciatáblázattal. Semmi sincs előre beírva.',
    run: 'Futtatás',
    running: 'Fut…',
    print: 'Nyomtatás',
    close: 'Vissza az alkalmazáshoz',
    measured: 'Szimuláció',
    expected: 'Várt érték',
    source: 'Forrás',
    summary: (n: number, total: number) => `${n} / ${total} ellenőrzés sikeres`,
    more: 'A teljes, több mint 60 automatikus tesztből álló ellenőrzés és a források listája a projekt docs/VALIDATION.md fájljában található; a modell egyszerűsítéseit a docs/TANARI_MEGJEGYZESEK.md írja le.',
    date: 'Futtatva',
  },
  en: {
    title: 'Verification',
    intro:
      'These checks run the simulation code now, in this browser, and compare the result with an independent value: a formula, Kepler’s laws or an international reference table. Nothing is written in advance.',
    run: 'Run',
    running: 'Running…',
    print: 'Print',
    close: 'Back to the app',
    measured: 'Simulation',
    expected: 'Expected',
    source: 'Source',
    summary: (n: number, total: number) => `${n} of ${total} checks passed`,
    more: 'The full suite of more than 60 automated tests and the list of sources are in the project’s docs/VALIDATION.md; the model’s simplifications are described in docs/TANARI_MEGJEGYZESEK.md.',
    date: 'Run on',
  },
};

export function VerificationPage({ onClose }: { onClose: () => void }) {
  const lang = useLang();
  const T = TEXT[lang];
  const [results, setResults] = useState<(CheckResult | null)[]>(() => CHECKS.map(() => null));
  const [busy, setBusy] = useState(false);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const run = async () => {
    setBusy(true);
    setResults(CHECKS.map(() => null));
    for (let i = 0; i < CHECKS.length; i++) {
      // Let the page repaint between checks so the results appear one by one.
      await new Promise((r) => setTimeout(r, 30));
      const res = CHECKS[i]!.run(lang);
      setResults((prev) => prev.map((x, j) => (j === i ? res : x)));
    }
    setRanAt(new Date());
    setBusy(false);
  };

  const done = results.filter(Boolean) as CheckResult[];
  const passed = done.filter((r) => r.pass).length;
  const btn = 'min-h-11 rounded-lg px-4 text-[15px] font-semibold';

  return (
    <div className="verify-page fixed inset-0 z-40 overflow-y-auto bg-(--panel) text-(--ink)" role="dialog" aria-modal="true" aria-label={T.title}>
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-math text-3xl">
            <i>Newton</i> {lang === 'hu' ? 'ágyúgolyója' : 'cannonball'} · {T.title}
          </h1>
          <button className={`${btn} no-print border border-(--line)`} onClick={onClose}>
            {T.close}
          </button>
        </header>
        <p className="max-w-[70ch] text-[15px]">{T.intro}</p>
        <div className="no-print flex flex-wrap gap-2">
          <button className={`${btn} bg-(--fire) text-(--fire-ink) hover:bg-(--fire-hover) disabled:opacity-60`} onClick={run} disabled={busy}>
            {busy ? T.running : T.run}
          </button>
          <button className={`${btn} border border-(--line)`} onClick={() => window.print()} disabled={!ranAt}>
            {T.print}
          </button>
        </div>
        {done.length > 0 && (
          <p className="text-[15px] font-semibold" aria-live="polite">
            {T.summary(passed, CHECKS.length)}
            {ranAt && (
              <span className="ml-2 font-normal text-(--muted)">
                {T.date}: {ranAt.toLocaleString(lang === 'hu' ? 'hu-HU' : 'en-GB')}
              </span>
            )}
          </p>
        )}
        <ol className="m-0 list-none space-y-3 p-0">
          {CHECKS.map((c, i) => {
            const r = results[i];
            return (
              <li key={c.id} className="check rounded-xl border border-(--line) p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      r ? (r.pass ? 'bg-(--chip-on-line) text-(--panel)' : 'bg-(--s-ep) text-white') : 'border border-(--line) text-(--muted)'
                    }`}
                    aria-label={r ? (r.pass ? '✓' : '✗') : undefined}
                  >
                    {r ? (r.pass ? '✓' : '✗') : i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-[15px] font-semibold">{c.title[lang]}</p>
                    {r && (
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm tabular-nums">
                        <dt className="text-(--muted)">{T.measured}</dt>
                        <dd className="m-0">{r.measured}</dd>
                        <dt className="text-(--muted)">{T.expected}</dt>
                        <dd className="m-0">{r.expected}</dd>
                      </dl>
                    )}
                    <p className="text-sm text-(--muted)">
                      {T.source}: {c.source[lang]}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-(--muted)">{T.more}</p>
      </div>
    </div>
  );
}
