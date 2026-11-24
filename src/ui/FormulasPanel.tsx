import { useState } from 'react';
import { Formula } from '../Formula';
import { bodyMass, G, type Body } from '../physics/bodies';
import { fmt, texNum, type Lang } from '../i18n/format';
import { useLang, useT } from '../i18n';
import { sym, type SymbolId } from '../i18n/notation';
import { SymbolPopover } from './Glossary';
import { BALL_MASS } from '../sim/simulation';
import type { ThemeId } from '../theme/themes';

/** TeX colours per theme (KaTeX needs literal hex values). */
const TEX_COLORS: Record<ThemeId, { hl: string; ek: string; ep: string; e: string }> = {
  real: { hl: '#e8b44c', ek: '#3987e5', ep: '#d55181', e: '#c98500' },
  newton: { hl: '#9b2d20', ek: '#2a5f9e', ep: '#a8326e', e: '#8a5a00' },
};

interface Props {
  body: Body;
  /** Launch distance from the centre, R + h (m). */
  r0: number;
  altitude: number;
  /** Ball now: distance (m), speed (m/s). */
  r: number;
  v: number;
  themeId: ThemeId;
}

export function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5 border-b border-(--line) pb-5 last:border-b-0">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** Display formula that scrolls sideways on narrow screens instead of overflowing. */
const Display = ({ tex }: { tex: string }) => (
  <div className="-mx-1 overflow-x-auto px-1 py-1 text-[1.05rem]">
    <Formula display tex={tex} />
  </div>
);

const km = (m: number, lang: Lang) => `${fmt(m / 1000, lang, m < 10_000 ? 2 : 0)} km`;

export function FormulasPanel({ body, r0, altitude, r, v, themeId }: Props) {
  const t = useT();
  const lang = useLang();
  const [more, setMore] = useState(false);
  const [popover, setPopover] = useState<{ id: SymbolId; x: number; y: number } | null>(null);
  const c = TEX_COLORS[themeId];
  const M = bodyMass(body);
  const m = BALL_MASS;
  const n = (x: number, d = 3) => texNum(x, lang, d);
  const plain = (x: number, d: number) => texNum(x, lang, d, false);

  const F = (body.GM * m) / (r * r);
  const v1 = Math.sqrt(body.GM / r0);
  const v2 = Math.SQRT2 * v1;
  const ek = 0.5 * m * v * v;
  const ep = (-body.GM * m) / r;
  const e = ek + ep;
  const eps = e / m;

  // Clickable symbols, all from i18n/notation.ts.
  const [Fs, Gs, Ms, ms, rs, vs, v1s, v2s, Es, Eks, Eps, Fcps, epss] = (
    ['F', 'G', 'M', 'm', 'r', 'v', 'v1', 'v2', 'E', 'Ek', 'Ep', 'Fcp', 'eps'] as const
  ).map(sym);
  const cancelM = `\\color{${c.hl}}{\\cancel{${ms}}}`;

  const onClick = (e: React.MouseEvent) => {
    const el = (e.target as Element).closest('[data-sym]') as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPopover({ id: el.dataset.sym as SymbolId, x: rect.left + rect.width / 2, y: rect.bottom });
  };

  return (
    <div className="formulas space-y-5" onClick={onClick}>
      <p className="text-sm text-(--muted)">
        {t.fLive} {t.glossaryHint}
      </p>

      <Step title={t.fForceTitle}>
        <p className="text-[15px]">{t.fForceIntro}</p>
        <Display
          tex={`\\begin{aligned} ${Fs} &= ${Gs}\\,\\frac{${Ms}\\,${ms}}{${rs}^2} \\\\ &= ${n(G)} \\cdot \\frac{${n(M)} \\cdot ${m}}{\\left(${n(r)}\\right)^2}\\ \\mathrm{N} \\\\ &\\approx ${plain(F, F >= 100 ? 0 : 1)}\\ \\mathrm{N} \\end{aligned}`}
        />
      </Step>

      <Step title={t.fV1Title}>
        <p className="text-[15px]">{t.fV1Intro}</p>
        <Display
          tex={`${Fs} = ${Fcps} \\;\\Rightarrow\\; ${Gs}\\,\\frac{${Ms}\\,${cancelM}}{${rs}^2} = \\frac{${cancelM}\\,${vs}^2}{${rs}} \\;\\Rightarrow\\; ${v1s} = \\sqrt{\\frac{${Gs}${Ms}}{${rs}}}`}
        />
        <p className="text-sm text-(--muted)">{t.fMassCancels}</p>
        <p className="text-[15px]">{t.fAtMountain(km(body.radius, lang), km(altitude, lang))}</p>
        <Display tex={`\\begin{aligned} ${v1s} &= \\sqrt{\\frac{${n(G)} \\cdot ${n(M)}}{${n(r0)}}}\\ \\mathrm{m/s} \\\\ &\\approx ${plain(v1 / 1000, 2)}\\ \\mathrm{km/s} \\end{aligned}`} />
      </Step>

      <Step title={t.fV2Title}>
        <p className="text-[15px]">{t.fV2Intro}</p>
        <Display tex={`${v2s} = \\sqrt{\\frac{2${Gs}${Ms}}{${rs}}} = \\sqrt{2}\\cdot ${v1s} \\approx ${plain(v2 / 1000, 2)}\\ \\mathrm{km/s}`} />
      </Step>

      <Step title={t.fEnergyTitle}>
        <p className="text-[15px]">{t.fEnergyIntro.replace('E_p', 'Eₚ')}</p>
        <Display
          tex={`{\\color{${c.e}}${Es}} = {\\color{${c.ek}}${Eks}} + {\\color{${c.ep}}${Eps}} = \\frac{1}{2}\\,${ms}\\,${vs}^2 - ${Gs}\\,\\frac{${Ms}\\,${ms}}{${rs}}`}
        />
        <Display
          tex={`\\begin{aligned} {\\color{${c.e}}${Es}} &= ${n(ek, 2)}\\ \\mathrm{J} + \\left(${n(ep, 2)}\\ \\mathrm{J}\\right) \\\\ &= ${n(e, 2)}\\ \\mathrm{J} \\end{aligned}`}
        />
        <p className="text-[15px]">{e < 0 ? t.energyBound : t.energyFree}</p>
        <button
          className="min-h-11 text-sm font-semibold text-(--ink) underline decoration-(--chip-on-line) decoration-2 underline-offset-4"
          aria-expanded={more}
          onClick={() => setMore((x) => !x)}
        >
          {more ? '−' : '+'} {t.fMore}
        </button>
        {more && (
          <>
            <p className="text-[15px]">{t.fMoreText}</p>
            <Display tex={`${epss} = \\frac{${Es}}{${ms}} = \\frac{${vs}^2}{2} - \\frac{${Gs}${Ms}}{${rs}} = ${n(eps, 2)}\\ \\mathrm{J/kg}`} />
          </>
        )}
      </Step>


      {popover && <SymbolPopover {...popover} onClose={() => setPopover(null)} />}
    </div>
  );
}
