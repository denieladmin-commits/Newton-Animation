/**
 * Jelölések: the symbol glossary, and the pop-up card that opens when a
 * symbol is clicked inside a formula. Content comes from i18n/notation.ts.
 */
import { useEffect, useRef } from 'react';
import { Formula } from '../Formula';
import { useLang, useT } from '../i18n';
import { NOTATION, type SymbolId } from '../i18n/notation';

function EntryBody({ id }: { id: SymbolId }) {
  const lang = useLang();
  const t = useT();
  const e = NOTATION[id];
  return (
    <>
      <p className="text-[15px]">{e.explain[lang]}</p>
      {'formula' in e && e.formula && (
        <div className="overflow-x-auto py-0.5">
          <Formula tex={e.formula} />
        </div>
      )}
      <p className="text-sm text-(--muted)">
        {e.unit && (
          <>
            {t.unit}: {e.unit}
            <br />
          </>
        )}
        {t.typical}: {e.typical[lang]}
      </p>
    </>
  );
}

/**
 * Symbols that actually appear on screen (formulas, arrows, status box, energy bars).
 * The full list, including g and a_cp, is in docs/TANARI_MEGJEGYZESEK.md.
 */
export const ON_SCREEN: SymbolId[] = ['F', 'G', 'M', 'm', 'R', 'h', 'r', 'v0', 'v', 'vr', 'vt', 'v1', 'v2', 'Fcp', 'Fd', 'Ek', 'Ep', 'E', 'W', 'T', 'eps'];

export function GlossaryList() {
  const lang = useLang();
  return (
    <dl className="space-y-4">
      {ON_SCREEN.map((id) => (
        <div key={id} id={`sym-${id}`} className="grid grid-cols-[3rem_1fr] gap-x-3">
          <dt className="pt-0.5 text-lg">
            <Formula tex={NOTATION[id].tex} />
          </dt>
          <dd className="m-0 space-y-1">
            <p className="text-[15px] font-semibold">{NOTATION[id].name[lang]}</p>
            <EntryBody id={id} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface PopoverProps {
  id: SymbolId;
  x: number;
  y: number;
  onClose: () => void;
}

/** Small card next to the clicked symbol; closes on Escape or a click elsewhere. */
export function SymbolPopover({ id, x, y, onClose }: PopoverProps) {
  const lang = useLang();
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as Element).closest?.('[data-sym]')) onClose();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('pointerdown', down);
    ref.current?.focus();
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointerdown', down);
    };
  }, [onClose]);
  const W = 300;
  const left = Math.max(8, Math.min(x - W / 2, window.innerWidth - W - 8));
  const below = y + 12;
  const top = below + 220 > window.innerHeight ? Math.max(8, y - 230) : below;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={NOTATION[id].name[lang]}
      tabIndex={-1}
      className="fixed z-50 space-y-1.5 rounded-xl border border-(--line) bg-(--panel) p-4 text-(--ink) shadow-[0_8px_30px_rgba(0,0,0,0.35)] outline-none"
      style={{ left, top, width: W }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-semibold">
          <span className="mr-2 text-lg">
            <Formula tex={NOTATION[id].tex} />
          </span>
          {NOTATION[id].name[lang]}
        </p>
        <button className="-mr-2 min-h-8 min-w-8 text-(--muted) hover:text-(--ink)" onClick={onClose} aria-label={t.close}>
          ✕
        </button>
      </div>
      <EntryBody id={id} />
    </div>
  );
}
