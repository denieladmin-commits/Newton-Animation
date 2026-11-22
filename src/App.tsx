import { Formula } from './Formula';
import { BODIES, circularSpeed, escapeSpeed } from './physics/bodies';

const fmt = (v: number) => (v / 1000).toLocaleString('hu-RO', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** M1 placeholder: proves React + Tailwind + KaTeX + physics work together offline. */
export default function App() {
  const earth = BODIES.earth;
  const v1 = circularSpeed(earth, earth.radius);
  const v2 = escapeSpeed(earth, earth.radius);
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-sky-300">Newton ágyúgolyója</h1>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 text-xl shadow-xl">
        <Formula display tex={String.raw`G\frac{M\cancel{m}}{r^2} = \frac{\cancel{m}v^2}{r} \;\implies\; v_1 = \sqrt{\frac{GM}{r}}`} />
        <p className="mt-4 text-base text-slate-300">
          Föld felszínén: <Formula tex={`v_1 = ${fmt(v1).replace(',', '{,}')}\\ \\text{km/s}`} />,{' '}
          <Formula tex={`v_2 = ${fmt(v2).replace(',', '{,}')}\\ \\text{km/s}`} />
        </p>
      </div>
      <p className="text-sm text-slate-500">M1 – projektváz · a szimuláció a következő lépésekben készül</p>
    </main>
  );
}
