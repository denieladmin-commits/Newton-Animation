/**
 * The eight checks on the teacher's Ellenőrzés page. Each one runs the real
 * simulation code in the browser and compares it with an independent value:
 * a formula, Kepler's laws, or a published reference table.
 * The full suite (npm test) and docs/VALIDATION.md cover much more.
 */
import { BODIES, circularSpeed, escapeSpeed } from '../physics/bodies';
import { EARTH_AIR } from '../physics/atmosphere';
import { advanceFlight, createFlight, forces, specificEnergy, DEFAULT_PROJECTILE } from '../physics/orbitalPhysics';
import { elementsFromState } from '../physics/orbitalElements';
import { analyticImpact } from '../physics/kepler';
import type { Lang } from '../i18n/format';
import { fmt, fmtSci } from '../i18n/format';

export interface CheckResult {
  pass: boolean;
  measured: string;
  expected: string;
}

export interface Check {
  id: string;
  title: Record<Lang, string>;
  source: Record<Lang, string>;
  run: (lang: Lang) => CheckResult;
}

const earth = BODIES.earth;
const EVEREST = 8_850;
const ISS = 400_000;

export const CHECKS: Check[] = [
  {
    id: 'v1',
    title: { hu: 'Első kozmikus sebesség a Föld felszínén', en: "First cosmic velocity at the Earth's surface" },
    source: { hu: 'v₁ = √(GM/R); GM és R: NASA bolygó-adatlap; tankönyvi érték 7,91 km/s', en: 'v₁ = √(GM/R); GM and R: NASA fact sheet; textbook value 7.91 km/s' },
    run: (lang) => {
      // Fire at v₁ and check that the ball really stays on a circle for a whole orbit.
      const v1 = circularSpeed(earth, earth.radius);
      const f = createFlight({ body: earth, altitude: 0.001, v0: v1, drag: false });
      let maxDev = 0;
      advanceFlight(f, 5100, (s) => (maxDev = Math.max(maxDev, Math.abs(Math.hypot(s.x, s.y) - earth.radius))));
      const pass = Math.abs(v1 / 1000 - 7.91) < 0.005 && maxDev < 1 && f.status === 'flying';
      return {
        pass,
        measured: `${fmt(v1 / 1000, lang, 3)} km/s; ${lang === 'hu' ? 'eltérés a körtől egy kör alatt' : 'deviation from the circle over one orbit'}: ${fmt(maxDev * 1000, lang, 1)} mm`,
        expected: '7,91 km/s'.replace(',', lang === 'hu' ? ',' : '.'),
      };
    },
  },
  {
    id: 'fall',
    title: { hu: 'Esés az első másodpercben (Everest, elejtve)', en: 'Fall in the first second (Everest, dropped)' },
    source: { hu: 's = ½·g·t², g = GM/r²', en: 's = ½·g·t², g = GM/r²' },
    run: (lang) => {
      const r0 = earth.radius + EVEREST;
      const f = createFlight({ body: earth, altitude: EVEREST, v0: 0, drag: false });
      advanceFlight(f, 1);
      const fall = r0 - Math.hypot(f.state.x, f.state.y);
      const exact = 0.5 * (earth.GM / r0 ** 2);
      return { pass: Math.abs(fall - exact) < 1e-3, measured: `${fmt(fall, lang, 3)} m`, expected: `${fmt(exact, lang, 3)} m` };
    },
  },
  {
    id: 'iss',
    title: { hu: 'Keringési idő 400 km-en (ISS magassága)', en: 'Orbital period at 400 km (ISS height)' },
    source: { hu: 'Kepler III. törvénye: T = 2π√(r³/GM)', en: "Kepler's third law: T = 2π√(r³/GM)" },
    run: (lang) => {
      const r0 = earth.radius + ISS;
      const f = createFlight({ body: earth, altitude: ISS, v0: circularSpeed(earth, r0), drag: false });
      advanceFlight(f, 5600);
      const T = f.measuredPeriod ?? NaN;
      const kepler = 2 * Math.PI * Math.sqrt(r0 ** 3 / earth.GM);
      return {
        pass: Math.abs(T - kepler) / kepler < 1e-4,
        measured: `${fmt(T / 60, lang, 2)} ${lang === 'hu' ? 'perc' : 'min'}`,
        expected: `${fmt(kepler / 60, lang, 2)} ${lang === 'hu' ? 'perc' : 'min'}`,
      };
    },
  },
  {
    id: 'v2',
    title: { hu: 'Második kozmikus sebesség: v₂ = √2·v₁, és ott E = 0', en: 'Second cosmic velocity: v₂ = √2·v₁, and E = 0 there' },
    source: { hu: '½mv² = G·Mm/r ⇒ v₂ = √(2GM/r)', en: '½mv² = G·Mm/r ⇒ v₂ = √(2GM/r)' },
    run: (lang) => {
      const r0 = earth.radius + ISS;
      const ratio = escapeSpeed(earth, r0) / circularSpeed(earth, r0);
      const f = createFlight({ body: earth, altitude: ISS, v0: escapeSpeed(earth, r0), drag: false });
      const e = specificEnergy(f.launch, earth) / (earth.GM / r0);
      return {
        pass: Math.abs(ratio - Math.SQRT2) < 1e-12 && Math.abs(e) < 1e-12,
        measured: `v₂/v₁ = ${fmt(ratio, lang, 6)}; E/|Eₚ| = ${fmt(Math.abs(e) < 1e-15 ? 0 : e, lang, 0)}`,
        expected: `√2 = ${fmt(Math.SQRT2, lang, 6)}; 0`,
      };
    },
  },
  {
    id: 'energy',
    title: { hu: 'Energiamegmaradás 10 keringés alatt (ellipszis)', en: 'Energy conservation over 10 orbits (ellipse)' },
    source: { hu: 'Konzervatív erőtérben E = Eₖ + Eₚ állandó', en: 'In a conservative field E = Eₖ + Eₚ is constant' },
    run: (lang) => {
      const r0 = earth.radius + ISS;
      const f = createFlight({ body: earth, altitude: ISS, v0: 1.2 * circularSpeed(earth, r0), drag: false });
      const E0 = specificEnergy(f.launch, earth);
      const T = elementsFromState(f.launch, earth.GM).period;
      let worst = 0;
      advanceFlight(f, 10 * T, (s) => (worst = Math.max(worst, Math.abs(specificEnergy(s, earth) - E0) / Math.abs(E0))));
      return {
        pass: worst < 1e-8 && f.orbitsCompleted >= 9,
        measured: `${lang === 'hu' ? 'legnagyobb relatív eltérés' : 'largest relative change'}: ${fmtSci(worst, lang, 1)}`,
        expected: lang === 'hu' ? '< 10⁻⁸ (gyakorlatilag 0)' : '< 10⁻⁸ (practically 0)',
      };
    },
  },
  {
    id: 'landing',
    title: { hu: 'Becsapódás helye: 6 km/s, 400 km magasról', en: 'Landing point: 6 km/s from 400 km' },
    source: { hu: 'Pontos Kepler-pálya (ellipszis metszése a bolygóval)', en: 'Exact Kepler orbit (ellipse meeting the planet)' },
    run: (lang) => {
      const f = createFlight({ body: earth, altitude: ISS, v0: 6000, drag: false });
      advanceFlight(f, 1e5);
      const range = (Math.abs(f.swept) * earth.radius) / 1000;
      const exact = analyticImpact(earth.GM, earth.radius, earth.radius + ISS, 6000)!;
      const exactKm = (exact.angle * earth.radius) / 1000;
      return {
        pass: f.status === 'crashed' && Math.abs(range - exactKm) < 0.001,
        measured: `${fmt(range, lang, 1)} km, ${fmt(f.state.t, lang, 1)} s`,
        expected: `${fmt(exactKm, lang, 1)} km, ${fmt(exact.time, lang, 1)} s`,
      };
    },
  },
  {
    id: 'central',
    title: { hu: 'A gravitációs erő a bolygó középpontja felé mutat', en: "Gravity points at the planet's centre" },
    source: { hu: 'Newton gravitációs törvénye: centrális erő', en: "Newton's law of gravitation: a central force" },
    run: (lang) => {
      const env = { body: earth, drag: false, projectile: DEFAULT_PROJECTILE };
      let worst = 0;
      for (let i = 0; i < 1000; i++) {
        const a = (i / 1000) * 2 * Math.PI;
        const r = earth.radius * (1 + (i % 7));
        const s = { t: 0, x: r * Math.cos(a), y: r * Math.sin(a), vx: 0, vy: 0, w: 0 };
        const g = forces(s, env);
        const diff = Math.atan2(g.gy, g.gx) - Math.atan2(-s.y, -s.x);
        worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))));
      }
      const deg = (worst * 180) / Math.PI;
      return {
        pass: deg < 0.01,
        measured: `${lang === 'hu' ? '1000 helyen a legnagyobb eltérés' : 'largest error at 1000 positions'}: ${deg < 1e-9 ? '0' : fmtSci(deg, lang, 1)}°`,
        expected: '0°',
      };
    },
  },
  {
    id: 'air',
    title: { hu: 'Levegő sűrűsége 9 km-en', en: 'Air density at 9 km' },
    source: {
      hu: 'U.S. Standard Atmosphere 1976 (NOAA/NASA/USAF) táblázata; a modell a táblázati pontok között interpolál',
      en: 'U.S. Standard Atmosphere 1976 (NOAA/NASA/USAF) table; the model interpolates between table points',
    },
    run: (lang) => {
      // 9 km is not one of the model's table points, so this tests the interpolation.
      const model = EARTH_AIR.density(9_000);
      const ref = 0.46706;
      return {
        pass: Math.abs(model - ref) / ref < 0.01,
        measured: `${fmt(model, lang, 4)} kg/m³`,
        expected: `${fmt(ref, lang, 4)} kg/m³ (±1 %)`,
      };
    },
  },
];
