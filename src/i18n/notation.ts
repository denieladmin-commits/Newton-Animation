/**
 * Single source of truth for every physics symbol the app shows (PLAN.md §9).
 *
 * The formulas, the glossary (Jelölések) and the symbol pop-ups all read from here,
 * so a symbol can never be written two different ways. To match a class notebook,
 * change the `tex` field once (e.g. a_cp → a_c) and every formula follows.
 * Notation confirmed by the teacher: Romania, taught in Hungarian.
 */
import type { Lang } from './format';

export interface NotationEntry {
  /** TeX used in formulas. */
  tex: string;
  /** Unit as plain text ('' for none). */
  unit: string;
  /** Defining formula (TeX), if it has one. */
  formula?: string;
  name: Record<Lang, string>;
  explain: Record<Lang, string>;
  typical: Record<Lang, string>;
}

export const NOTATION = {
  G: {
    tex: 'G',
    unit: 'N·m²/kg²',
    name: { hu: 'Gravitációs állandó', en: 'Gravitational constant' },
    explain: {
      hu: 'Univerzális állandó: megadja, mekkora vonzóerő hat két tömeg között.',
      en: 'A universal constant: it sets how strongly any two masses attract each other.',
    },
    typical: { hu: '6,674·10⁻¹¹', en: '6.674·10⁻¹¹' },
  },
  F: {
    tex: 'F',
    unit: 'N',
    formula: 'F = G\\,\\frac{Mm}{r^2}',
    name: { hu: 'Gravitációs erő', en: 'Gravitational force' },
    explain: {
      hu: 'A bolygó vonzóereje a golyóra. Mindig a bolygó középpontja felé mutat; a képen a piros nyíl.',
      en: "The planet's pull on the ball. It always points to the planet's centre; the red arrow in the picture.",
    },
    typical: { hu: '10 kg-os golyóra a Föld felszínén ≈ 98 N, 400 km-en ≈ 87 N', en: 'on a 10 kg ball: ≈ 98 N at the surface, ≈ 87 N at 400 km' },
  },
  M: {
    tex: 'M',
    unit: 'kg',
    name: { hu: 'A bolygó tömege', en: "The planet's mass" },
    explain: { hu: 'A bolygó (Föld, Hold, Mars) tömege.', en: 'The mass of the planet (Earth, Moon, Mars).' },
    typical: { hu: 'Föld: 5,97·10²⁴ kg', en: 'Earth: 5.97·10²⁴ kg' },
  },
  R: {
    tex: 'R',
    unit: 'km',
    name: { hu: 'A bolygó sugara', en: "The planet's radius" },
    explain: { hu: 'A bolygó középpontja és felszíne közötti távolság.', en: "The distance from the planet's centre to its surface." },
    typical: { hu: 'Föld: 6371 km; Hold: 1737 km; Mars: 3390 km', en: 'Earth: 6371 km; Moon: 1737 km; Mars: 3390 km' },
  },
  h: {
    tex: 'h',
    unit: 'km',
    name: { hu: 'A hegy magassága', en: 'Mountain height' },
    explain: { hu: 'Milyen magasról lőjük ki a golyót a felszín fölött.', en: 'How high above the surface the ball is fired from.' },
    typical: { hu: 'Everest: 8,85 km; ISS: 400 km', en: 'Everest: 8.85 km; ISS: 400 km' },
  },
  r: {
    tex: 'r',
    unit: 'km',
    formula: 'r = R + h',
    name: { hu: 'Középponttól mért távolság', en: 'Distance from the centre' },
    explain: { hu: 'A golyó távolsága a bolygó középpontjától.', en: "The ball's distance from the planet's centre." },
    typical: { hu: 'ISS magasságában ≈ 6771 km', en: 'at ISS height ≈ 6771 km' },
  },
  m: {
    tex: 'm',
    unit: 'kg',
    name: { hu: 'A golyó tömege', en: "The ball's mass" },
    explain: {
      hu: 'Az ágyúgolyó tömege. A pályát nem befolyásolja, mert kiesik a képletből.',
      en: 'The mass of the cannonball. It does not change the path, because it cancels out of the formula.',
    },
    typical: { hu: '10 kg', en: '10 kg' },
  },
  v0: {
    tex: 'v_0',
    unit: 'km/s',
    name: { hu: 'Kezdősebesség', en: 'Launch speed' },
    explain: { hu: 'A golyó vízszintes sebessége a kilövés pillanatában.', en: 'The horizontal speed of the ball at the moment of firing.' },
    typical: { hu: '0–14 km/s', en: '0–14 km/s' },
  },
  v: {
    tex: 'v',
    unit: 'km/s',
    name: { hu: 'Pillanatnyi sebesség', en: 'Velocity' },
    explain: {
      hu: 'A golyó sebessége az adott pillanatban. A pálya érintője irányába mutat; a képen a kék (táblán sárga) nyíl.',
      en: 'The velocity of the ball at this moment. It points along the tangent of the path; the blue (yellow on the board) arrow.',
    },
    typical: { hu: '—', en: '—' },
  },
  vr: {
    tex: 'v_r',
    unit: 'km/s',
    name: { hu: 'Radiális sebesség', en: 'Radial velocity' },
    explain: {
      hu: 'A sebesség sugárirányú része: kifelé mutat, ha a golyó távolodik, befelé, ha közeledik. Körpályán nulla.',
      en: 'The part of the velocity along the radius: outward when the ball moves away, inward when it comes closer. Zero on a circle.',
    },
    typical: { hu: 'körpályán 0', en: '0 on a circular orbit' },
  },
  vt: {
    tex: 'v_t',
    unit: 'km/s',
    name: { hu: 'Tangenciális sebesség', en: 'Tangential velocity' },
    explain: {
      hu: 'A sebesség érintőirányú része, a bolygó körüli „körbehaladás”.',
      en: 'The part of the velocity along the tangent: the motion around the planet.',
    },
    typical: { hu: 'körpályán = v₁', en: '= v₁ on a circular orbit' },
  },
  v1: {
    tex: 'v_1',
    unit: 'km/s',
    formula: 'v_1 = \\sqrt{\\frac{GM}{r}}',
    name: { hu: 'Első kozmikus sebesség', en: 'First cosmic velocity' },
    explain: {
      hu: 'Ekkora sebességgel vízszintesen kilőve a test körpályán kering.',
      en: 'Fired horizontally at this speed, the body moves on a circular orbit.',
    },
    typical: { hu: 'Földön ≈ 7,9 km/s', en: '≈ 7.9 km/s on Earth' },
  },
  v2: {
    tex: 'v_2',
    unit: 'km/s',
    formula: 'v_2 = \\sqrt{\\frac{2GM}{r}} = \\sqrt{2}\\,v_1',
    name: { hu: 'Második kozmikus (szökési) sebesség', en: 'Second cosmic (escape) velocity' },
    explain: {
      hu: 'Ekkora sebességgel a test végleg elhagyja a bolygót.',
      en: 'At this speed the body leaves the planet for good.',
    },
    typical: { hu: 'Földön ≈ 11,2 km/s', en: '≈ 11.2 km/s on Earth' },
  },
  Ek: {
    tex: 'E_k',
    unit: 'J',
    formula: 'E_k = \\frac{1}{2}\\,m v^2',
    name: { hu: 'Mozgási energia', en: 'Kinetic energy' },
    explain: { hu: 'A mozgásból származó energia.', en: 'The energy of motion.' },
    typical: { hu: '10 kg, 7,67 km/s: ≈ 2,94·10⁸ J', en: '10 kg at 7.67 km/s: ≈ 2.94·10⁸ J' },
  },
  Ep: {
    tex: 'E_p',
    unit: 'J',
    formula: 'E_p = -G\\,\\frac{Mm}{r}',
    name: { hu: 'Helyzeti energia', en: 'Potential energy' },
    explain: {
      hu: 'Gravitációs helyzeti energia. A nullszint a végtelen távolban van, ezért mindig negatív.',
      en: 'Gravitational potential energy. It is zero infinitely far away, so it is always negative.',
    },
    typical: { hu: '10 kg a Föld felszínén: ≈ −6,26·10⁸ J', en: '10 kg at the Earth’s surface: ≈ −6.26·10⁸ J' },
  },
  E: {
    tex: 'E',
    unit: 'J',
    formula: 'E = E_k + E_p',
    name: { hu: 'Teljes energia', en: 'Total energy' },
    explain: {
      hu: 'Ha negatív, a golyó a bolygó körül marad; ha nulla vagy pozitív, elszökik.',
      en: 'If it is negative, the ball stays around the planet; if it is zero or positive, it escapes.',
    },
    typical: { hu: 'körpályán E = −E_k', en: 'on a circular orbit E = −E_k' },
  },
  W: {
    tex: 'W',
    unit: 'J',
    name: { hu: 'Hővé alakult energia', en: 'Energy turned into heat' },
    explain: {
      hu: 'A légellenállás munkája: ennyi mozgási energiát alakított hővé a levegő.',
      en: 'The work done by air drag: how much energy the air turned into heat.',
    },
    typical: { hu: 'légellenállás nélkül 0', en: '0 without air drag' },
  },
  Fcp: {
    tex: 'F_{cp}',
    unit: 'N',
    formula: 'F_{cp} = \\frac{m v^2}{r}',
    name: { hu: 'Centripetális erő', en: 'Centripetal force' },
    explain: {
      hu: 'Az az erő, amely a testet körpályán tartja. Itt a gravitációs erő játssza ezt a szerepet.',
      en: 'The force that keeps a body on a circle. Here, gravity plays this role.',
    },
    typical: { hu: 'körpályán F_cp = F', en: 'on a circular orbit F_cp = F' },
  },
  acp: {
    tex: 'a_{cp}',
    unit: 'm/s²',
    formula: 'a_{cp} = \\frac{v^2}{r}',
    name: { hu: 'Centripetális gyorsulás', en: 'Centripetal acceleration' },
    explain: {
      hu: 'A körpálya középpontja felé mutató gyorsulás. (A füzetben lehet a_c; ez egy sorban átírható.)',
      en: 'The acceleration pointing to the centre of the circle.',
    },
    typical: { hu: 'körpályán = a nehézségi gyorsulás az adott magasságban', en: 'on a circular orbit = gravitational acceleration at that height' },
  },
  g: {
    tex: 'g',
    unit: 'm/s²',
    formula: 'g = \\frac{GM}{R^2}',
    name: { hu: 'Nehézségi gyorsulás', en: 'Gravitational acceleration' },
    explain: {
      hu: 'A szabadon eső test gyorsulása a felszínen. A modellben a bolygó nem forog, ezért a Földön 9,82 (a tankönyvi 9,81 a forgást is tartalmazza).',
      en: 'The acceleration of a falling body at the surface. The model planet does not rotate, so on Earth it is 9.82 (the textbook 9.81 includes rotation).',
    },
    typical: { hu: 'Föld 9,82; Hold 1,62; Mars 3,73', en: 'Earth 9.82; Moon 1.62; Mars 3.73' },
  },
  T: {
    tex: 'T',
    unit: 's',
    formula: 'T = 2\\pi\\sqrt{\\frac{a^3}{GM}}',
    name: { hu: 'Keringési idő', en: 'Orbital period' },
    explain: { hu: 'Egy teljes kör megtételéhez szükséges idő.', en: 'The time for one full orbit.' },
    typical: { hu: 'ISS (400 km): ≈ 92,4 perc', en: 'ISS (400 km): ≈ 92.4 min' },
  },
  eps: {
    tex: '\\varepsilon',
    unit: 'J/kg',
    formula: '\\varepsilon = \\frac{E}{m} = \\frac{v^2}{2} - \\frac{GM}{r}',
    name: { hu: 'Fajlagos energia (Bővebben)', en: 'Specific energy (More)' },
    explain: {
      hu: 'Az egy kilogrammra jutó teljes energia. Nem függ a golyó tömegétől, ezért a pálya sem.',
      en: "Total energy per kilogram. It does not depend on the ball's mass, so neither does the path.",
    },
    typical: { hu: 'körpályán 400 km-en ≈ −2,94·10⁷ J/kg', en: 'circular orbit at 400 km: ≈ −2.94·10⁷ J/kg' },
  },
} satisfies Record<string, NotationEntry>;

export type SymbolId = keyof typeof NOTATION;

/** The symbol's TeX, wrapped so a click on it in a formula opens its glossary entry. */
export const sym = (id: SymbolId): string => `\\htmlData{sym=${id}}{${NOTATION[id].tex}}`;
