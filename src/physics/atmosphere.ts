/**
 * Air density, speed of sound and the drag coefficient of a sphere.
 *
 * Earth: U.S. Standard Atmosphere 1976 (NOAA/NASA/USAF), tabulated density
 *   0–1000 km, interpolated linearly in log(ρ); temperature profile of the
 *   seven standard layers for the speed of sound.
 * Mars: NASA Glenn Research Center Mars atmosphere model (curve fit to Mars
 *   Global Surveyor data): T and p as functions of height, ρ = p / (0.1921·T).
 * Sphere drag: C_d as a function of Mach number (standard sphere drag data,
 *   e.g. Hoerner, "Fluid-Dynamic Drag", 1965; Miller & Bailey 1979).
 */

/** Altitude (km) → density (kg/m³), U.S. Standard Atmosphere 1976. */
const EARTH_DENSITY: [number, number][] = [
  [0, 1.225],
  [5, 0.7364],
  [10, 0.4135],
  [15, 0.1948],
  [20, 0.08891],
  [25, 0.04008],
  [30, 0.01841],
  [40, 0.003996],
  [50, 0.001027],
  [60, 3.097e-4],
  [70, 8.283e-5],
  [80, 1.846e-5],
  [86, 6.958e-6],
  [90, 3.416e-6],
  [100, 5.604e-7],
  [110, 9.708e-8],
  [120, 2.222e-8],
  [150, 2.076e-9],
  [200, 2.541e-10],
  [250, 6.073e-11],
  [300, 1.916e-11],
  [400, 2.803e-12],
  [500, 5.215e-13],
  [600, 1.137e-13],
  [700, 3.07e-14],
  [800, 1.136e-14],
  [900, 5.759e-15],
  [1000, 3.561e-15],
];

/** Altitude (km) → temperature (K) at the layer boundaries, U.S. Standard Atmosphere 1976. */
const EARTH_TEMPERATURE: [number, number][] = [
  [0, 288.15],
  [11, 216.65],
  [20, 216.65],
  [32, 228.65],
  [47, 270.65],
  [51, 270.65],
  [71, 214.65],
  [84.852, 186.946],
];

function interpolate(table: [number, number][], x: number, log: boolean): number {
  if (x <= table[0]![0]) return table[0]![1];
  const last = table[table.length - 1]!;
  if (x >= last[0]) return last[1];
  let i = 1;
  while (table[i]![0] < x) i++;
  const [x0, y0] = table[i - 1]!;
  const [x1, y1] = table[i]!;
  const f = (x - x0) / (x1 - x0);
  return log ? Math.exp(Math.log(y0) + f * (Math.log(y1) - Math.log(y0))) : y0 + f * (y1 - y0);
}

export interface AtmosphereModel {
  /** Density (kg/m³) at altitude h (m) above the surface. */
  density(h: number): number;
  /** Speed of sound (m/s) at altitude h (m). */
  soundSpeed(h: number): number;
  /** Above this altitude (m) the air is treated as vacuum. */
  top: number;
}

export const EARTH_AIR: AtmosphereModel = {
  top: 1_000_000,
  density: (h) => (h >= 1_000_000 ? 0 : interpolate(EARTH_DENSITY, Math.max(0, h) / 1000, true)),
  // a = √(γ·R·T) for dry air, γ = 1.4, R = 287.05 J/(kg·K)
  soundSpeed: (h) => Math.sqrt(1.4 * 287.05 * interpolate(EARTH_TEMPERATURE, Math.max(0, h) / 1000, false)),
};

/** NASA GRC Mars model: temperature (°C) and pressure (kPa) at height h (m). */
function marsTP(h: number): [number, number] {
  const hh = Math.max(0, h);
  const T = hh > 7000 ? -23.4 - 0.00222 * hh : -31 - 0.000998 * hh;
  const p = 0.699 * Math.exp(-0.00009 * hh);
  return [Math.max(T, -130), p];
}

export const MARS_AIR: AtmosphereModel = {
  top: 200_000,
  density: (h) => {
    if (h >= 200_000) return 0;
    const [T, p] = marsTP(h);
    return p / (0.1921 * (T + 273.1));
  },
  // CO₂: γ ≈ 1.29, R = 188.9 J/(kg·K)
  soundSpeed: (h) => Math.sqrt(1.29 * 188.9 * (marsTP(h)[0] + 273.1)),
};

/** Mach number → drag coefficient of a sphere. */
const SPHERE_CD: [number, number][] = [
  [0, 0.47],
  [0.6, 0.5],
  [0.8, 0.58],
  [1.0, 0.8],
  [1.2, 0.98],
  [1.5, 1.0],
  [2.0, 0.98],
  [3.0, 0.95],
  [5.0, 0.93],
  [10.0, 0.92],
];

export function sphereDragCoefficient(mach: number): number {
  return interpolate(SPHERE_CD, mach, false);
}
