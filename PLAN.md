# Newton's Cannonball — Build Plan (finished version)

*Newton ágyúgolyó-kísérlete* · interactive physics web app for high-school classrooms
Stack: Vite + React + TypeScript + Tailwind + HTML5 Canvas + KaTeX → single offline `dist/index.html`

---

## 0. Review of the original spec — what changes

The spec is solid. These are the problems I found and how the plan fixes them:

| # | Issue in original spec | Fix |
|---|---|---|
| 1 | Altitude slider runs **10–1000 km**, but the Everest preset is **8.85 km**, below the minimum. | Slider runs **1–1000 km** on a log scale. Presets: Everest 8.85 km, Kármán line 100 km, ISS 400 km. |
| 2 | **Energy bar with negative PE.** E_p = −GMm/r is always negative, so a two-color bar that adds to a constant can't be drawn honestly. | Signed bar chart with a zero line: E_k (+), E_p (−), total ε. **ε < 0 → bound, ε = 0 → escape threshold, ε > 0 → escapes.** This is the strongest teaching point in the app. |
| 3 | **Drag makes total energy drop**, so "total stays constant" isn't true when drag is on. | Add a third segment, "lost to drag / heat" (*hővé alakult*), and say why total falls. |
| 4 | **Realistic drag is too strong to show.** At 8.85 km and 7.9 km/s (about Mach 25), a real cannonball stops within seconds. You'd see no spiral. | Use an exponential atmosphere with a **teaching-scale ballistic coefficient** (one "drag strength" control), labelled *simplified model*. Hide the toggle on the Moon, which has no atmosphere. Mars gets a thin atmosphere. |
| 5 | **Scale.** Earth's radius is 6371 km, but the 1 s fall is 4.9 m, a zoom range of about 10⁶×. A circle 6×10⁶ px wide renders badly on canvas, and an 8.85 km mountain is invisible at full-planet zoom. | At high zoom, draw the surface as a local polyline. At low zoom, draw the mountain and cannon as a screen-space illustration with a small "not to scale" tag. Add a **camera follow** mode. |
| 6 | **1x real-time shows almost nothing at planet zoom.** The ball moves about 1 px/s. | On launch at 1x, the camera auto-frames the cannon. A "4.9 m" drop ruler appears after t = 1 s. |
| 7 | **Arrow lengths:** velocity (m/s) and force (N) have different units, and the vectors must stay readable at every zoom. | Arrows sized in **screen pixels** (fixed base length, scaled by the value relative to v₁ or F at launch) and kept independent of zoom. Real values go in the pill labels. |
| 8 | **F_g needs a mass m**, which otherwise cancels. | Fixed cannonball mass (default 10 kg, editable) used for the F_g label, E_k/E_p in joules, and drag. The formula drawer shows that m cancels out of the trajectory. |
| 9 | The right-angle marker needs a tolerance. | Show it when the angle between v and r is within ±0.5° of 90° (\|v_r\|/\|v\| < 0.009). In an ellipse it appears **only at periapsis and apoapsis**, which is a useful observation in itself. |
| 10 | **500x is too slow for wide ellipses.** As v₀ approaches v₂, the period grows without limit. | Warp presets **1x / 10x / 100x / 500x / 2000x**, with `1–5` keys. Escape runs stop after a distance limit and show a "left the system" badge. |
| 11 | **Single-file build vs. KaTeX fonts.** `vite-plugin-singlefile` inlines JS and CSS, but KaTeX's CSS points to separate `.woff2` font files, so formulas break offline. | Set `build.assetsInlineLimit` very high so the fonts inline as base64 (about +300 KB). Use only woff2 fonts. Load no web fonts; use the system font stack. Set `base: './'` for GitHub Pages. |
| 12 | **RK4 energy drift.** The energy bar exposes tiny integrator errors over many orbits. | Fixed substep RK4 (dt ≤ 1 s sim time, adaptive near periapsis), many substeps per frame at high warp. A unit test caps drift at 10⁻⁶ per orbit. |
| 13 | **Hungarian conventions.** | Decimal comma (`7,91 km/s`) and a thin-space thousands separator in HU. HU textbooks often write the gravitational constant as **γ** (or *f*) instead of G, so this is switchable. Show both *második kozmikus sebesség* and *szökési sebesség*. |

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
    orbitalElements.ts   # ε, h, e, a, periapsis/apoapsis, period, classify()
    physics.test.ts
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
    Telemetry.tsx        # floating HUD on canvas
    ZoomButtons.tsx
  i18n/
    en.ts  hu.ts  index.ts   # typed dictionary, number formatting per locale
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

- **Formula drawer:** a step-by-step derivation F_g = F_cp → γMm/r² = mv²/r (both m's highlighted and struck through) → v₁ = √(γM/r). Then v₂ = √(2γM/r) and ε = v²/2 − γM/r, each with live substituted numbers ("= √(3.986·10¹⁴ / 6.38·10⁶) = 7.90 km/s").
- **Energy bar** as described in §0.2 and §0.3.
- **Felfedező mód (4 challenges)**, each with a goal, a "set it up for me" button, a guiding question, and a success check:
  1. *Sub-orbital crash:* fire at 3 km/s and predict where it lands. Shows the range readout.
  2. *8 km / 5 m:* 1x speed, zoomed in. After 1 s the ball has moved about 7.9 km and fallen 4.9 m, which is exactly how much the surface curves away. That's why it never lands.
  3. *Circular orbit:* find v₀ so the ball comes back to the cannon. The 90° marker stays on, and the measured T is compared with the predicted T.
  4. *Ellipse → escape:* raise v₀ step by step. The ghost fan shows the ellipse growing, and at v₂ the orbit opens up as ε crosses 0.
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
| **M2** | Physics core and tests | Tests pass: 4.90 m fall in 1 s, circular period matches Kepler within 0.1%, energy drift < 10⁻⁶ per orbit, v₂ escapes, crash detected |
| **M3** | Canvas, camera and planet (zoom, pan, pinch, local-surface mode) | Smooth zoom from the full planet down to 1 m/px on desktop and on mobile emulation |
| **M4** | Sim loop, trail, warp, controls, ghosts, events | All four trajectory types happen naturally; warp keys work |
| **M5** | Vectors, projections, 90° marker, labels | Screenshots are legible at both zoom extremes |
| **M6** | Formula drawer, energy bar, telemetry | Live numbers match the physics; the drag-loss segment works |
| **M7** | i18n EN/HU and lesson mode | Full HU pass with no missing strings; all 4 challenges pass their checks |
| **M8** | Responsive polish, projector mode, shortcuts, a11y | Playwright screenshots at 1440×900 and 390×844 in EN and HU look right |
| **M9** | Deploy | GitHub Pages workflow (or Vercel), README with classroom guide |

## 7. Decisions (confirmed)
1. Default language: **Hungarian** (EN one click away).
2. Gravitational constant: **γ in HU, G in EN**.
3. Launch: **horizontal only**, true to Newton.
4. Deploy: **GitHub Pages via GitHub Actions**, plus the standalone `dist/index.html`.
