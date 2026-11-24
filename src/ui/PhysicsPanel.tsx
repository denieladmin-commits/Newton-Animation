import type { ComponentProps } from 'react';
import { useT } from '../i18n';
import type { Simulation } from '../sim/simulation';
import { EnergyChart } from './EnergyChart';
import { FormulasPanel, Step } from './FormulasPanel';
import { GlossaryList } from './Glossary';

type Props = ComponentProps<typeof FormulasPanel> & { sim: Simulation; onVerify: () => void };

/** The "Fizika" tab: live derivation, energy over time, symbols, link to the verification page. */
export function PhysicsPanel({ sim, onVerify, ...formulas }: Props) {
  const t = useT();
  return (
    <div className="space-y-5">
      <FormulasPanel {...formulas} />
      <Step title={t.gEnergy}>
        <EnergyChart sim={sim} themeId={formulas.themeId} />
      </Step>
      <Step title={t.glossary}>
        <GlossaryList />
      </Step>
      <button
        className="min-h-11 w-full rounded-lg border border-(--chip-on-line) px-4 text-[15px] font-semibold hover:bg-(--chip-on)"
        onClick={onVerify}
      >
        {t.verifyOpen}
      </button>
    </div>
  );
}
