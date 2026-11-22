/**
 * The two visual themes (PLAN.md §10). The canvas reads these tokens directly;
 * the panel gets the same colours through CSS variables (see index.css).
 */
export type ThemeId = 'real' | 'chalk';

export interface Theme {
  id: ThemeId;
  /** Canvas background. */
  bg: string;
  /** Main drawing ink (planet outline, labels, guide lines). */
  ink: string;
  /** Faint ink for guides (tangent, radius, rings). */
  guide: string;
  /** Text outline drawn behind letters on busy backgrounds (null = none). */
  halo: string | null;
  stars: boolean;
  /** Chalk grain over all drawing. */
  chalk: boolean;
  vel: string;
  force: string;
  trail: string;
  ghost: string;
  ghostLetter: string;
  ball: string;
  ballStroke: string;
  cannonFill: string;
  mountainFill: string;
  mountainInk: string;
  /** Status box / overlay background. */
  overlayBg: string;
  overlayInk: string;
  overlayMuted: string;
  overlayLine: string;
  fontUi: string;
  fontMath: string;
  /** Line widths (CSS px). */
  trailWidth: number;
  vectorWidth: number;
  arrowHead: number;
}

const MATH = '"Newsreader", "Times New Roman", serif';

export const THEMES: Record<ThemeId, Theme> = {
  real: {
    id: 'real',
    bg: '#081221',
    ink: '#e8e4d8',
    guide: 'rgba(232,228,216,0.32)',
    halo: '#081221',
    stars: true,
    chalk: false,
    vel: '#7cd0ff',
    force: '#ff8f80',
    trail: '#7cd0ff',
    ghost: '#c9b8f0',
    ghostLetter: '#e8e4d8',
    ball: '#f5f3ea',
    ballStroke: '#081221',
    cannonFill: '#0e1a2b',
    mountainFill: '#5a5148',
    mountainInk: '#e8e4d8',
    overlayBg: 'rgba(8,18,33,0.82)',
    overlayInk: '#e8e4d8',
    overlayMuted: '#a9b3c2',
    overlayLine: '#2a3a52',
    fontUi: '"Instrument Sans", system-ui, sans-serif',
    fontMath: MATH,
    trailWidth: 2.2,
    vectorWidth: 2.4,
    arrowHead: 13,
  },
  chalk: {
    id: 'chalk',
    bg: '#25362e',
    ink: '#eeede5',
    guide: 'rgba(238,237,229,0.38)',
    halo: null,
    stars: false,
    chalk: true,
    vel: '#f4e27a',
    force: '#f28b82',
    trail: '#f4e27a',
    ghost: '#eeede5',
    ghostLetter: '#eeede5',
    ball: '#eeede5',
    ballStroke: '#25362e',
    cannonFill: '#25362e',
    mountainFill: '#25362e',
    mountainInk: '#eeede5',
    overlayBg: 'rgba(37,54,46,0.92)',
    overlayInk: '#eeede5',
    overlayMuted: '#c8cbbf',
    overlayLine: 'rgba(238,237,229,0.45)',
    fontUi: '"Instrument Sans", system-ui, sans-serif',
    fontMath: MATH,
    trailWidth: 2.8,
    vectorWidth: 2.8,
    arrowHead: 15,
  },
};
