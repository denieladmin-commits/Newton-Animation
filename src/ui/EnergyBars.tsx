import type { Body } from '../physics/bodies';
import { fmtSci } from '../i18n/format';
import { useLang, useT } from '../i18n';
import { BALL_MASS } from '../sim/simulation';

/**
 * Fixed scale (J) for one shot, so the bars never jump: large enough for the
 * deepest E_p (at the surface) and the largest E_k the ball can reach (at impact
 * or at launch, whichever is larger).
 */
export function energyScale(body: Body, r0: number, v0: number): number {
  const m = BALL_MASS;
  const epSurface = (body.GM * m) / body.radius;
  const ek0 = 0.5 * m * v0 * v0;
  const ekMax = ek0 + body.GM * m * (1 / body.radius - 1 / r0);
  return 1.05 * Math.max(epSurface, ekMax);
}

interface Props {
  ek: number;
  ep: number;
  loss: number;
  drag: boolean;
  scale: number;
}

/** Horizontal signed bars around a zero line: E_k (+), E_p (−), E, and drag losses. */
export function EnergyBars({ ek, ep, loss, drag, scale }: Props) {
  const t = useT();
  const lang = useLang();
  const e = ek + ep;
  const rows: { sym: string; sub: string; name: string; value: number; color: string }[] = [
    { sym: 'E', sub: 'k', name: t.ekName, value: ek, color: 'var(--s-ek)' },
    { sym: 'E', sub: 'p', name: t.epName, value: ep, color: 'var(--s-ep)' },
    { sym: 'E', sub: '', name: t.eName, value: e, color: 'var(--s-e)' },
  ];
  if (drag && loss > 0) rows.push({ sym: 'W', sub: '', name: t.lossName, value: loss, color: 'var(--s-loss)' });

  return (
    <figure className="m-0 space-y-2" aria-label={t.energy}>
      <div className="grid grid-cols-[2.2rem_minmax(4.5rem,auto)_1fr_6.2rem] items-center gap-x-2 gap-y-2">
        {rows.map((r) => {
          const frac = Math.min(1, Math.abs(r.value) / scale) / 2; // half the track per side
          const pos = r.value >= 0;
          return (
            <div key={r.name} className="contents">
              <span className="font-math text-lg italic" style={{ color: r.color }}>
                {r.sym}
                {r.sub && <sub className="text-[0.7em]">{r.sub}</sub>}
              </span>
              <span className="text-sm text-(--muted)">{r.name}</span>
              <span className="relative block h-5" aria-hidden>
                <span className="absolute inset-y-[-4px] left-1/2 w-px bg-(--ink) opacity-70" />
                <span
                  className={`absolute inset-y-0 ${pos ? 'rounded-r' : 'rounded-l'}`}
                  style={{
                    background: r.color,
                    left: pos ? '50%' : `calc(50% - ${frac * 100}%)`,
                    width: `${frac * 100}%`,
                  }}
                />
              </span>
              <span className="text-right text-sm tabular-nums">{fmtSci(r.value, lang)} J</span>
            </div>
          );
        })}
      </div>
      <figcaption className="text-sm text-(--muted)">
        {drag && loss > 0 ? t.energyDrag : e < 0 ? t.energyBound : t.energyFree}
      </figcaption>
    </figure>
  );
}
