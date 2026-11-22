/**
 * The two visual themes (PLAN.md §10). The canvas reads these tokens directly;
 * the panel gets the same colours through CSS variables (see index.css).
 */
export type ThemeId = 'real' | 'newton';

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
  /** Engraving style (Newton's 1728 figure): paper, ink, hatching, double-ruled frame. */
  engraving: boolean;
  vel: string;
  force: string;
  /** Air-drag arrow. */
  drag: string;
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
    engraving: false,
    vel: '#7cd0ff',
    force: '#ff8f80',
    drag: '#d9c7a1',
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
  newton: {
    // After the figure in Newton's "A Treatise of the System of the World" (1728):
    // copper engraving, dark-brown ink on laid paper.
    id: 'newton',
    bg: '#efe6d0',
    ink: '#2b2118',
    guide: 'rgba(43,33,24,0.4)',
    halo: '#efe6d0',
    stars: false,
    engraving: true,
    vel: '#1f4e79',
    force: '#9b2d20',
    drag: '#6b5d4b',
    trail: '#2b2118',
    ghost: '#5a4a3a',
    ghostLetter: '#2b2118',
    ball: '#2b2118',
    ballStroke: '#efe6d0',
    cannonFill: '#efe6d0',
    mountainFill: '#efe6d0',
    mountainInk: '#2b2118',
    overlayBg: 'rgba(244,236,218,0.94)',
    overlayInk: '#2b2118',
    overlayMuted: '#5f5244',
    overlayLine: 'rgba(43,33,24,0.35)',
    fontUi: MATH,
    fontMath: MATH,
    trailWidth: 1.6,
    vectorWidth: 2,
    arrowHead: 13,
  },
};
