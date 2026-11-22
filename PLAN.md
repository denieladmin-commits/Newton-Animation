# Newton's Cannonball — Build Plan (finished version)

*Newton ágyúgolyó-kísérlete* · interactive physics web app for high-school classrooms
Stack: Vite + React + TypeScript + Tailwind + HTML5 Canvas + KaTeX → single offline `dist/index.html`

---

## 0. Review of the original spec — what changes

The spec is solid. These are the problems I found and how the plan fixes them:

| # | Issue in original spec | Fix |
|---|---|---|
| 1 | Altitude slider runs **10–1000 km**, but the Everest preset is **8.85 km**, below the minimum. | Slider runs **1–1000 km** on a log scale. Presets: Everest 8.85 km, Kármán line 100 km, ISS 400 km. |
| 2 | **Energy bar with negative PE.** E_p = −GMm/r is always negative, so a two-color bar that adds to a constant can't be drawn honestly. | Signed bar chart with a zero line: E_k (+), E_p (−), total E. **E < 0 → bound, E = 0 → escape threshold, E > 0 → escapes.** This is the strongest teaching point in the app. |
| 3 | **Drag makes total energy drop**, so "total stays constant" isn't true when drag is on. | Add a third segment, "lost to drag / heat" (*hővé alakult*), and say why total falls. |
| 4 | **Realistic drag is very strong.** At 8.85 km and 7.9 km/s, a 10 kg cannonball loses half its speed in about 1 s. | **Simple on/off toggle (*Légellenállás: be / ki*), realistic only, no adjustable strength.** **Off** = Newton's idealised vacuum (the default). **On** = real air: an exponential atmosphere and an iron 10 kg sphere (radius ≈ 6.7 cm, constant drag coefficient C_d ≈ 0.5). The ball slows almost at once and falls short, which shows why Newton's mountain is an idealisation and why real satellites fly above the atmosphere. At ISS height the effect is real but tiny, and the app says so. No atmosphere on the Moon, so the toggle is disabled there. |
| 5 | **Scale.** Earth's radius is 6371 km, but the 1 s fall is 4.9 m, a zoom range of about 10⁶×. A circle 6×10⁶ px wide renders badly on canvas, and an 8.85 km mountain is invisible at full-planet zoom. | At high zoom, draw the surface as a local polyline. At low zoom, draw the mountain and cannon as a screen-space illustration with a small "not to scale" tag. Add a **camera follow** mode. |
| 6 | **1x real-time shows almost nothing at planet zoom.** The ball moves about 1 px/s. | On launch at 1x, the camera auto-frames the cannon. A "4.9 m" drop ruler appears after t = 1 s. |
| 7 | **Arrow lengths:** velocity (m/s) and force (N) have different units, and the vectors must stay readable at every zoom. | Arrows sized in **screen pixels** (fixed base length, scaled by the value relative to v₁ or F at launch) and kept independent of zoom. Real values go in the pill labels. |
| 8 | **F_g needs a mass m**, which otherwise cancels. | Fixed cannonball mass (default 10 kg, editable) used for the F_g label, E_k/E_p in joules, and drag. The formula drawer shows that m cancels out of the trajectory. |
| 9 | The right-angle marker needs a tolerance. | Show it when the angle between v and r is within ±0.5° of 90° (\|v_r\|/\|v\| < 0.009). In an ellipse it appears **only at periapsis and apoapsis**, which is a useful observation in itself. |
| 10 | **500x is too slow for wide ellipses.** As v₀ approaches v₂, the period grows without limit. | Warp presets **1x / 10x / 100x / 500x / 2000x**, with `1–5` keys. Escape runs stop after a distance limit and show a "left the system" badge. |
| 11 | **Single-file build vs. KaTeX fonts.** `vite-plugin-singlefile` inlines JS and CSS, but KaTeX's CSS points to separate `.woff2` font files, so formulas break offline. | Set `build.assetsInlineLimit` very high so the fonts inline as base64 (about +300 KB). Use only woff2 fonts. Load no web fonts; use the system font stack. Set `base: './'` for GitHub Pages. |
| 12 | **RK4 energy drift.** The energy bar exposes tiny integrator errors over many orbits. | Fixed substep RK4 (dt ≤ 1 s sim time, adaptive near periapsis), many substeps per frame at high warp. A unit test caps drift at 10⁻⁶ per orbit. |
| 13 | **Notation must match the class (Romania, taught in Hungarian).** Symbols from Hungary's textbooks (γ, *f*) don't match what students use. | The symbols the class uses (confirmed by the teacher): **G, F (F_g on the arrow), M, R, r = R + h, v₀, v₁, v₂, E_k, E_p, F_cp, a_cp, g**. Decimal comma: `7,91 km/s`. All symbols live in **one file, `src/i18n/notation.ts`**, and the same file drives the symbol glossary (*Jelölések*, §9). Renaming a symbol (e.g. a_cp → a_c) is a one-line change there. |

### Suggested additions (high value, low cost)
- **Newton's fan of shots:** previous shots stay as faded ghost trails with labels A, B, C, D… This recreates the classic diagram and lets students compare speeds side by side.
- **Snap buttons** on the v₀ slider: `v₁`, `v₂`, `0.9·v₁`, plus a live "v₀ = 1.03·v₁" readout.
- **Predicted orbit ghost** (optional toggle): the Kepler conic drawn from the launch state, with periapsis and apoapsis markers and the period T.
- **Landing readout:** range along the surface (km), flight time, and impact speed.
- **Projector mode** (`H`): hides the UI and enlarges labels and vectors.
- Keys: `R` reset shot, `C` clear ghost trails, `F` fullscreen, `L` switch language.
- Physics unit tests (Vitest) as the source of truth.

---

## 1. Architecture

```
src/
  physics/
    bodies.ts            # Earth/Moon/Mars: GM, R, atmosphere {rho0, H, cutoff}
    orbitalPhysics.ts    # state, accel (gravity + drag), rk4Step, simulate(dt)
    vec2.ts              # tiny 2D vector math (no library needed)
    orbitalElements.ts   # ε, h, e, a, periapsis/apoapsis, period, classify()
    kepler.ts            # analytic reference: exact conic & position-at-time (for tests + predicted orbit)
    __tests__/           # see §8
  sim/
    useSimulation.ts     # rAF loop, time warp, substepping, events (crash/escape)
    store.ts             # Zustand (or useReducer): params, sim state, ghosts, ui
  render/
    camera.ts            # world↔screen, zoom/pan/pinch, follow mode, fit-to-orbit
    drawBackground.ts    # starfield (parallax), polar rings
    drawPlanet.ts        # shaded disk, surface detail, atmosphere limb, local-surface mode
    drawTrail.ts         # glowing trails + ghosts, decimated point buffers
    drawVectors.ts       # v, F_g, v_r/v_t projections, 90° marker, pill labels
    drawCannon.ts        # mountain + cannon (screen-space at low zoom)
    CanvasView.tsx       # DPR-aware canvas, pointer events, resize observer
  ui/
    Layout.tsx           # desktop split / mobile stack
    ControlsPanel.tsx    # body, h, v0, drag, warp, play/reset
    FormulaDrawer.tsx    # KaTeX derivations with live values
    EnergyBar.tsx
    LessonPanel.tsx      # 4 challenges (Felfedező mód)
    VerificationPage.tsx # teacher-facing proof page, runs the checks live (§8)
    Telemetry.tsx        # floating HUD on canvas
    ZoomButtons.tsx
  i18n/
    en.ts  hu.ts  index.ts   # typed dictionary, number formatting per locale
    notation.ts              # single source of truth for symbols + glossary entries (§9)
  App.tsx  main.tsx  index.css
```

**Key design rule:** physics is pure TypeScript with no React or canvas dependency, so it can be unit-tested on its own. The renderer reads sim state from a ref, not React state, so the 60 fps drawing doesn't trigger React re-renders. React updates the UI panels at about 10 Hz.

## 2. Physics spec

- State `{x, y, vx, vy, t}` in SI, planet at the origin, launch at `(0, R+h)` with velocity `(v0, 0)`.
- `a = −GM r̂ / r² + a_drag`, where `a_drag = −½ ρ(alt) |v| v / β` and ρ = ρ₀·e^(−alt/H), set to 0 above the cutoff.
- Constants:

| Body | GM (m³/s²) | R (km) | v₁ surface | atmosphere |
|---|---|---|---|---|
| Earth | 3.986004×10¹⁴ | 6371 | 7.91 km/s ✔ | ρ₀ 1.225, H 8.5 km, cutoff 100 km |
| Moon | 4.9048×10¹² | 1737.4 | 1.68 km/s ✔ | none |
| Mars | 4.2828×10¹³ | 3389.5 | 3.55 km/s ✔ | ρ₀ 0.020, H 11.1 km, cutoff 80 km |

  (I checked the v₁ values against √(GM/R); the 8 km → 5.0 m curvature drop checks out too: d²/2R = 5.02 m.)
- Integrator: RK4, substep `dt = min(1 s, 0.002·r/|v|)`. Per frame, sim time = real Δt × warp (Δt clamped to 50 ms).
- Events: **crash** when r ≤ R (interpolated to the exact impact point), **escape** when ε > 0 and r > 30 R, **completed orbit** when the polar angle sweeps 2π (records the measured period).
- Derived live values: v, v_r, v_t, altitude, ε, E_k, E_p, eccentricity, periapsis, apoapsis, T, v₁(r), v₂(r).

## 3. Rendering spec

- Background `#060b19`, three star layers with parallax on pan, dim polar rings every 1000 km (spacing adapts to zoom).
- Planet: radial gradient plus terminator shading, procedural surface detail (Earth: continents; Moon: craters; Mars: rust tones), glowing atmosphere limb (none on the Moon).
- Trail: additive glow (two strokes: a wide translucent one and a thin bright one), color shading by speed, kept to ≤ 5k points by decimation.
- Vectors, drawn last and always on top: 4 px shaft, dark outline for contrast, filled arrowhead, soft glow. v is cyan `#38bdf8`. F_g is coral `#fb7185` with an amber `#f59e0b` glow. v_r and v_t are dashed projections in lighter cyan. The 90° square sits at the ball. Pill labels have a dark background and stay clear of each other.
- Camera: wheel zoom about the cursor, pinch zoom about the midpoint, drag to pan, inertia optional. Zoom limits run from 1 m/px to 2·(30R)/viewport. Buttons: `+`, `−`, `Reset view`, `Follow ball`.

## 4. EdTech features

- **Formula drawer:** a step-by-step derivation F = F_cp → G·Mm/r² = m·v²/r (both m's highlighted and struck through) → v₁ = √(GM/r). Then v₂ = √(2GM/r) = √2·v₁ and E = E_k + E_p = m·v²/2 − G·Mm/r, each with live substituted numbers. Below E, a collapsed *Bővebben* (more) note shows ε = E/m = v²/2 − GM/r: the same energy per kilogram, which doesn't depend on m, so the orbit doesn't either. **Every symbol in a formula is clickable** and opens its glossary entry (§9) ("= √(3.986·10¹⁴ / 6.38·10⁶) = 7.90 km/s").
- **Energy bar** as described in §0.2 and §0.3.
- **Felfedező mód (4 challenges)**, each with a goal, a "set it up for me" button, a guiding question, and a success check:
  1. *Sub-orbital crash:* fire at 3 km/s and predict where it lands. Shows the range readout.
  2. *8 km / 5 m:* 1x speed, zoomed in. After 1 s the ball has moved about 7.9 km and fallen 4.9 m, which is exactly how much the surface curves away. That's why it never lands.
  3. *Circular orbit:* find v₀ so the ball comes back to the cannon. The 90° marker stays on, and the measured T is compared with the predicted T.
  4. *Ellipse → escape:* raise v₀ step by step. The ghost fan shows the ellipse growing, and at v₂ the orbit opens up as E crosses 0.
- **Graphs tab (*Grafikonok*):** altitude r(t), speed v(t), and E_k / E_p / E vs time, plotted live (lightweight canvas plot). Students see the energy trade-off as curves, and the flat total line is visible proof of conservation.
- **Bilingual EN/HU:** every string, formula label and lesson text goes in a typed dictionary (a missing key is a compile error). The language choice is remembered in localStorage.

## 5. Layout

- **≥ 1024 px:** canvas 65% | panel 35% with tabs: Controls / Formulas / Lesson. The HUD (telemetry and energy bar) floats over the canvas.
- **< 1024 px portrait:** `100dvh` stack, canvas 52% / tabs 48% scrollable, touch targets ≥ 44 px, play button always visible.
- **Phone landscape:** side-by-side, with the canvas at 60%.
- `prefers-reduced-motion`: turn off parallax and glow pulsing.

## 6. Build milestones (we'll do these in order)

| M | Deliverable | Done when |
|---|---|---|
| **M1** | Scaffold: Vite + React + TS + Tailwind + KaTeX + singlefile; lint; Vitest | `npm run build` gives one `dist/index.html` that renders a KaTeX formula offline |
| **M2** | Physics core, analytic reference and the full verification suite (§8) | Every check in §8 passes; validation sheet drafted |
| **M3** | Canvas, camera and planet (zoom, pan, pinch, local-surface mode) | Smooth zoom from the full planet down to 1 m/px on desktop and on mobile emulation |
| **M4** | Sim loop, trail, warp, controls, ghosts, events | All four trajectory types happen naturally; warp keys work |
| **M5** | Vectors, projections, 90° marker, labels | Screenshots are legible at both zoom extremes |
| **M6** | Formula drawer, energy bar, telemetry, graphs tab | Live numbers match the physics; the drag-loss segment works |
| **M7** | i18n EN/HU, notation.ts + glossary (*Jelölések*, clickable symbols), lesson mode | Full HU pass with no missing strings; all 4 challenges pass their checks |
| **M8** | Responsive polish, projector mode, shortcuts, a11y | Playwright screenshots at 1440×900 and 390×844 in EN and HU look right |
| **M8b** | Teacher verification page and printable report (§8, Layer 7) | Every check runs in the browser in under 10 s, all pass, the report prints cleanly in HU |
| **M9** | Deploy | GitHub Pages workflow (or Vercel), README with classroom guide |

## 7. Decisions (confirmed)
1. Default language: **Hungarian** (EN one click away).
2. Notation (confirmed by the teacher): **G, F (F_g on the vector arrow), M, R, r = R + h, v₀, v₁, v₂, E_k, E_p, F_cp, a_cp, g**, decimal comma. The same symbols are used in EN and HU; only names and explanations are translated. a_cp may become a_c to match the class notebook; that's one line in `notation.ts`.
3. Launch: **horizontal only**, true to Newton.
4. Deploy: **GitHub Pages via GitHub Actions**, plus the standalone `dist/index.html`.

## 8. Correctness & verification (people learn from this, so it must be right)

**No third-party physics engine.** Game engines (Matter.js, Box2D…) simulate rigid bodies under constant downward gravity, not inverse-square orbits. The physics here is a few dozen lines of our own math, so every line can be checked. Every number on screen comes from the same tested functions; the UI does no physics of its own.

**Layer 1: an independent analytic reference.** Without drag, the exact answer is known in closed form (Kepler conics). `kepler.ts` computes it separately from the integrator, and the tests compare the two:
- the simulated trajectory stays on the exact ellipse or hyperbola (point-by-point error < 1 m per 1000 km);
- the measured period matches Kepler's third law, T = 2π√(a³/GM), within 0.01%;
- the sub-orbital landing point and flight time match the analytic intersection with the surface;
- a launch at exactly v₂ gives total energy E = 0 and the ball escapes; 0.999·v₂ stays bound.

**Layer 2: conservation laws (invariants).** Checked in tests and shown live in a hidden debug overlay (`D` key):
- total energy and angular momentum stay constant without drag (drift < 10⁻⁸ per orbit);
- with drag, energy only ever decreases, and the "lost to heat" amount equals the work done by drag.

**Layer 3: convergence.** Halving the time step must cut the error about 16×. That is RK4's mathematical signature, and it proves the integrator is implemented correctly, not just "close enough".

**Layer 4: textbook and real-world numbers.**
- v₁ = 7.91 / 1.68 / 3.55 km/s and v₂ = 11.2 / 2.38 / 5.03 km/s at the surface (Earth / Moon / Mars).
- In the first second the ball falls 4.90 m, and the surface curves 5.0 m away over 8 km.
- Circular orbit at 400 km: v = 7.67 km/s, T ≈ 92.4 min (the ISS's real period is about 92–93 min).
- Constants are taken from the NASA planetary fact sheets, with the source cited in code.

**Layer 5: randomised (property-based) tests.** Thousands of random combinations of planet, height and speed, checking that invariants hold, the classification (crash / circle / ellipse / escape) agrees with the sign of ε and the periapsis, and nothing produces NaN or infinity.

**Layer 6: vectors and display.**
- F_g always points at the planet's centre (angle error < 0.01°), and v_r and v_t add up exactly to v.
- The 90° marker appears exactly at periapsis and apoapsis and throughout a circular orbit, and nowhere else.
- Rounding and significant figures: HU shows `7,91 km/s`, EN `7.91 km/s`; tests cover the formatting.
- Playwright screenshots at both zoom extremes, in EN and HU.

**Layer 7: proof the teacher can see (*Ellenőrzés* page).** The tests above don't just run on a developer's computer. They are built into the app itself as a teacher-facing page (opened from the *A modellről* box or with `?verify` in the URL). It works offline from the same single file.
- **A "Run all checks" button** (*Ellenőrzések futtatása*) runs the same checks live in the teacher's own browser, in a few seconds. The results are computed there and then, not copied from somewhere.
- **One row per claim**, in plain Hungarian: what is being checked, the expected value and its source (formula, NASA fact sheet, textbook), the value the simulation got, the difference, and ✓ or ✗. Example: "Circular orbit at 400 km: period. Expected 92,4 min (Kepler III), simulated 92,4 min, difference 0,001 %, ✓".
- **Proof charts:**
  - the simulated path drawn on top of the exact ellipse from the formula, so the two lines coincide;
  - total energy over 100 orbits, a flat line with the tiny numerical drift written next to it;
  - the convergence plot, error shrinking 16× each time the step is halved, and what that means in one sentence.
- **Limitations, stated openly:** 2D, point mass, non-rotating planet, spherical planet, simple exponential atmosphere with a constant drag coefficient, no heating or burn-up, no Moon or Sun pulling on the ball. For each one, a sentence on why it doesn't change the lesson.
- **Printable report:** a print button lays it out as an A4 report (date, app version, all results), so the teacher can file it or show it to colleagues.
- `docs/VALIDATION.md` in the repo holds the same content with references, for anyone reviewing the source code.
- **Teacher's notes (`docs/TANARI_MEGJEGYZESEK.md`, Hungarian):** every question a teacher or student might ask, such as why g is 9,82 and not 9,81, why E_p is negative, or why the mountain is invisible at full view. It grows with every milestone and is shown in the app on the *A modellről* and *Ellenőrzés* pages.

## 9. Symbol glossary (*Jelölések*)

A glossary tab/drawer in the app. Each entry has the symbol, its name, a plain explanation, the unit and a typical value. **Clicking a symbol inside any formula opens the same entry** as a popover (KaTeX `\htmlData{sym=…}` + one click handler), so a student can always ask "what is this letter?".

All entries live in `src/i18n/notation.ts`. That one file is used by the formulas, the vector labels, the telemetry and the glossary, so a symbol can never be spelled two different ways in the app.

| Symbol | Name (HU) | Explanation (HU, shown in app) | Unit | Typical value |
|---|---|---|---|---|
| G | Gravitációs állandó | Univerzális állandó: megadja, mekkora vonzóerő hat két tömeg között. | N·m²/kg² | 6,674·10⁻¹¹ |
| F (nyílon F_g) | Gravitációs erő | A bolygó vonzóereje a golyóra; mindig a bolygó középpontja felé mutat. F = G·Mm/r² | N | 10 kg-os golyóra a Föld felszínén ≈ 98 N |
| M | A bolygó tömege | A bolygó (Föld, Hold, Mars) tömege. | kg | Föld: 5,97·10²⁴ kg |
| R | A bolygó sugara | A bolygó középpontja és felszíne közötti távolság. | km | Föld: 6371 km |
| h | A hegy magassága | Milyen magasról lőjük ki a golyót a felszín fölött. | km | Everest: 8,85 km; ISS: 400 km |
| r | Középponttól mért távolság | A golyó távolsága a bolygó középpontjától: r = R + h. | km | ISS magasságában ≈ 6771 km |
| m | A golyó tömege | Az ágyúgolyó tömege; a pályát nem befolyásolja, mert kiesik a képletből. | kg | 10 kg |
| v₀ | Kezdősebesség | A golyó vízszintes sebessége a kilövés pillanatában. | km/s | 0–12 km/s |
| v | Pillanatnyi sebesség | A golyó sebessége az adott pillanatban; a pálya érintője irányába mutat. | km/s | — |
| v₁ | Első kozmikus sebesség | Ekkora sebességgel vízszintesen kilőve a test körpályán kering. v₁ = √(GM/r) | km/s | Földön ≈ 7,9 km/s |
| v₂ | Második kozmikus (szökési) sebesség | Ekkora sebességgel a test végleg elhagyja a bolygót. v₂ = √(2GM/r) = √2·v₁ | km/s | Földön ≈ 11,2 km/s |
| E_k | Mozgási energia | A mozgásból származó energia. E_k = m·v²/2 | J | 10 kg, 7,91 km/s: ≈ 3,1·10⁸ J |
| E_p | Helyzeti energia | Gravitációs helyzeti energia, a nullszint a végtelen távolban van, ezért mindig negatív. E_p = −G·Mm/r | J | 10 kg a Föld felszínén: ≈ −6,3·10⁸ J |
| E | Teljes energia | E = E_k + E_p. Ha negatív, a golyó a bolygó körül marad; ha nulla vagy pozitív, elszökik. | J | körpályán: E = −E_k |
| F_cp | Centripetális erő | Az az erő, amely a testet körpályán tartja; itt a gravitációs erő játssza ezt a szerepet. F_cp = m·v²/r | N | körpályán F_cp = F |
| a_cp | Centripetális gyorsulás | A körpálya középpontja felé mutató gyorsulás. a_cp = v²/r (a füzetben lehet a_c; egy sorban átírható) | m/s² | körpályán a_cp = g(r) |
| g | Nehézségi gyorsulás | A szabadon eső test gyorsulása a felszínen. g = GM/R² | m/s² | Föld ≈ 9,8 (a modellben 9,82, mert a bolygó nem forog; a tankönyvi 9,81 a Föld forgását is tartalmazza); Hold 1,62; Mars 3,73 |
| ε | Fajlagos energia (*Bővebben* only) | Az egy kilogrammra jutó teljes energia: ε = E/m = v²/2 − GM/r. Nem függ a golyó tömegétől, ezért a pálya sem. | J/kg | körpályán a Föld felszínén ≈ −31 MJ/kg |
| T | Keringési idő | Egy teljes kör megtételéhez szükséges idő. | perc | ISS: ≈ 92,4 perc |

The EN glossary uses the same symbols with English names and explanations.

Sketch of `src/i18n/notation.ts`:

```ts
export const notation = {
  v1: {
    tex: 'v_1',                       // used everywhere: formulas, labels, HUD
    unit: 'km/s',
    formula: 'v_1 = \\sqrt{\\frac{GM}{r}}',
    typical: { hu: 'Földön ≈ 7,9 km/s', en: '≈ 7.9 km/s on Earth' },
    name: { hu: 'Első kozmikus sebesség', en: 'First cosmic velocity' },
    explain: {
      hu: 'Ekkora sebességgel vízszintesen kilőve a test körpályán kering.',
      en: 'Fired horizontally at this speed, the body moves on a circular orbit.',
    },
  },
  acp: { tex: 'a_{cp}', /* change to 'a_c' here to rename everywhere */ ... },
  // …one entry per row in the table above
} as const satisfies Record<string, NotationEntry>;
```

## 10. Visual design (decided from prototypes, see `prototypes/`)

Two themes, switchable with a **Valósághű | Newton rajza** button at the top right of the canvas (remembered per device):

| | **Valósághű** (main) | **Newton rajza** (alternative; replaced the earlier chalkboard) |
|---|---|---|
| Background | deep space `#081221`, stars, faint polar grid | laid paper `#efe6d0` with faint grain and foxed edges, double-ruled plate frame |
| Planet | stylised globe: ocean, organic continents, clouds, polar ice, night side, blue atmosphere rim | copper-engraving hatching, denser towards the rim; the same continents, outlined and cross-hatched |
| Lines | precise, thin; no decorative glow | dark-brown ink `#2b2118`; mountain top marked V, landing points A, B, C… as in Newton's figure |
| Vectors | v `#7cd0ff`, F `#ff8f80`, F_d `#d9c7a1` | v indigo ink `#1f4e79`, F red ochre `#9b2d20`, F_d `#6b5d4b` |
| Panel | dark navy `#0f1b2e`, amber "Tűz!" | paper `#f4ecda`, ink-black "Tűz!", oxblood controls `#7a2e1f` |
| Type | Instrument Sans (UI) + Newsreader italic (formula letters) | Newsreader throughout (UI and formula letters) |

Shared in both themes (chosen in round 1):
- **Control panel:** the current list layout, with sentence-case labels instead of all-caps.
- **Vector arrows:** thin textbook style: classic arrowhead, italic v and F with an arrow on top, dashed tangent and radius, a small right-angle square.
- **Energy:** horizontal signed bars with a zero line: E_k, E_p, E, with values and the sentence "E < 0, ezért a golyó a bolygó körül marad."
- **Figure caption** under the canvas ("1. ábra. …"), and italic serif letters A, B, C for earlier shots.
- Fonts are embedded in the single offline file (woff2, Latin + Latin Extended subsets for ő, ű).
