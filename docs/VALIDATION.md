# Validation sheet — physics core

*Draft (milestone M2). Every claim below is checked automatically by `npm test`
(`src/physics/__tests__/physics.test.ts`). The in-app Ellenőrzés page (M8b) will run the same checks
in the browser and show them in Hungarian.*

## Model and its simplifications
| Assumption | Why it doesn't change the lesson |
|---|---|
| 2D motion in the plane of the orbit | Without a sideways push, a horizontally fired ball stays in that plane anyway. |
| Point-mass cannonball | The ball's size is negligible compared with the planet. |
| Spherical, **non-rotating** planet | Newton's thought experiment ignores rotation. Side effect: surface g on the model Earth is **9,82 m/s²**; the textbook 9,81 m/s² already includes the centrifugal effect of rotation. |
| Only the planet's gravity (no Moon or Sun) | Their pull on the ball is under 0,01 % of Earth's. |
| Air drag: F = ½ρC_d(M)Av²; U.S. Standard Atmosphere 1976 (Earth, 0–1000 km), NASA GRC model (Mars); sphere C_d from Mach number; 10 kg iron sphere (r ≈ 6,7 cm) | No heating/ablation, wind or solar-activity changes of the upper atmosphere. The essential point holds: in air the ball slows down almost at once and never reaches orbit. |

## Constants
| Quantity | Earth | Moon | Mars | Source |
|---|---|---|---|---|
| GM (m³/s²) | 3,986004·10¹⁴ | 4,9028·10¹² | 4,282837·10¹³ | NASA planetary fact sheets |
| R (km), mean | 6371,0 | 1737,4 | 3389,5 | NASA planetary fact sheets |
| Atmosphere | U.S. Standard Atmosphere 1976 table, 0–1000 km | none | ρ = p/(0,1921·T), NASA GRC curve fit | NOAA/NASA/USAF 1976; NASA Glenn Research Center |
| G (N·m²/kg²) | 6,6743·10⁻¹¹ | | | CODATA 2018 |

## Checks (all passing)
| # | Claim | Expected | Tolerance |
|---|---|---|---|
| 1 | v₁ at the surface | 7,91 / 1,68 / 3,55 km/s | 0,005 km/s |
| 2 | v₂ at the surface | 11,19 / 2,38 / 5,03 km/s | 0,005 km/s |
| 3 | v₂ = √2·v₁ | exact | 10⁻¹² |
| 4 | Circular orbit at 400 km | 7,67 km/s, T = 92,4 min | 0,005 km/s / 0,05 min |
| 5 | Dropped from 8,85 km, fall in 1 s | ½·g·t² ≈ 4,9 m | 1 mm |
| 6 | Fired at v₁: drop below launch line = drop of the curved surface; height unchanged | ≈ 4,9 m both; Δh = 0 | 1 cm / 1 mm |
| 7 | Simulated path vs. exact Kepler conic (circle, 3 ellipses on 3 planets, hyperbola) | same path | < 1 m per 1000 km |
| 8 | Measured period vs. Kepler's third law (4 orbits) | T = 2π√(a³/GM) | 0,01 % |
| 9 | Sub-orbital landing time and place (5 speeds) | analytic impact | 10⁻⁶ in time, < 1 m in range |
| 9b | Range shown in the app, from 400 km: 4,0 / 6,0 / 7,0 / 7,3 km/s | 1382 / 2856 / 5171 / 7384 km | 0,5 km |
| 10 | Free fall from 100 km | closed-form fall time | 10⁻⁶ |
| 11 | Total energy at exactly v₂ | 0 | 10⁻¹² |
| 12 | v₂ and 1,001·v₂ escape (declared at 10 R with E ≥ 0, moving outward; < 60 s at 500×); 0,999·v₂ stays bound | — | — |
| 13 | Energy and angular momentum without drag | constant | < 10⁻⁸ per orbit (measured ≈ 6·10⁻¹⁴ over 10 orbits) |
| 14 | Halving the time step | error ÷ 16 (4th-order method) | ratio 13–19 |
| 15 | With drag: energy only decreases; loss = work done by drag | balance | 10⁻⁶ |
| 16 | From Everest at v₁ with air: speed halves within 2 s, ball lands | — | measured: halves in 0,43 s, 2,3 km/s after 1 s, lands 16 km away after 68 s at ≈ 160 m/s |
| 17 | Moon: drag toggle changes nothing; Earth drag tiny at 400 km (< 10⁻⁶ g), zero above 1000 km | — | exact |
| 17b | Air density equals the U.S. Standard Atmosphere 1976 table at 0 / 10 / 30 / 100 / 400 km; decreases monotonically; ≈ 0,47 kg/m³ at 8,85 km | 1,225 / 0,4135 / 0,01841 / 5,604·10⁻⁷ / 2,803·10⁻¹² kg/m³ | 10⁻⁶ |
| 17c | Speed of sound 340,3 m/s at sea level, 295,1 m/s at 15 km; sphere C_d 0,47 → 0,8 (Mach 1) → 0,92 (Mach 25) | — | 0,5 m/s / 0,01 |
| 18 | F_g always points at the planet's centre | — | < 0,01° (random positions) |
| 19 | v_r and v_t combine exactly to v | — | 10⁻⁹ (random states) |
| 20 | 90° marker: always on in a circular orbit; on an ellipse only at periapsis/apoapsis | — | ±0,5° |
| 21 | 150 random launches (planet, height 1–1000 km, speed 0–1,4·v₂) | no NaN; energy conserved; crash/orbit/escape as predicted | — |
| 22 | Vector overlay at launch: v⃗ horizontal, F⃗ straight down, 90° marker on | exact | 10⁻¹² |
| 23 | Arrow lengths: v⃗ ∝ speed (90 px at v₁), F⃗ ∝ 1/r² (72 px at launch) | proportional | 10⁻⁹ |
| 24 | Drawn components v_r + v_t add up to v⃗ (in pixels) | exact | 10⁻⁹ |
| 25 | Force readout: 10 kg ball at 0 / 8,85 / 400 km | 98,2 / 97,9 / 86,9 N | 0,05 N |
| 26 | Energy bars never exceed their fixed scale (60 random launches, all planets, drag on/off) | — | property test |
| 27 | 10 kg ball, circular orbit at 400 km | E_k = 2,94·10⁸ J, E_p = −5,89·10⁸ J, E = −E_k | 3 significant figures |
| 28 | Graph samples: at most 2048 points, evenly thinned, first point kept | — | unit test |

## In-app Ellenőrzés page
Eight of the checks above also run live in the browser (src/verify/checks.ts, tested in src/verify/__tests__): v₁ at the surface (with one simulated orbit), the 1-second fall, the ISS period, v₂ = √2·v₁ with E = 0, energy over 10 orbits, the sub-orbital landing point, the direction of gravity, and air density at 9 km against the U.S. Standard Atmosphere 1976 (0,46706 kg/m³; not a table point of the model, so it tests the interpolation).
