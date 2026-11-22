import { describe, expect, it } from 'vitest';
import { EARTH_AIR, MARS_AIR, sphereDragCoefficient } from '../atmosphere';

describe('Earth air: U.S. Standard Atmosphere 1976', () => {
  it.each([
    [0, 1.225],
    [10_000, 0.4135],
    [30_000, 0.01841],
    [100_000, 5.604e-7],
    [400_000, 2.803e-12],
  ])('density at %i m = %f kg/m³ (table value)', (h, rho) => {
    expect(EARTH_AIR.density(h) / rho).toBeCloseTo(1, 6);
  });

  it('between table points the density is within the neighbouring values and decreases with height', () => {
    let prev = Infinity;
    for (let h = 0; h <= 1_000_000; h += 2_500) {
      const rho = EARTH_AIR.density(h);
      expect(rho).toBeLessThan(prev);
      prev = rho;
    }
    // 8 850 m (Everest): standard atmosphere gives ≈ 0.47 kg/m³
    expect(EARTH_AIR.density(8_850)).toBeCloseTo(0.47, 1);
  });

  it('speed of sound: 340,3 m/s at sea level, 295 m/s at 11–20 km', () => {
    expect(EARTH_AIR.soundSpeed(0)).toBeCloseTo(340.3, 0);
    expect(EARTH_AIR.soundSpeed(15_000)).toBeCloseTo(295.1, 0);
  });
});

describe('Mars air: NASA Glenn Research Center model', () => {
  it('surface density ≈ 0,015 kg/m³, speed of sound ≈ 240 m/s, thinner with height', () => {
    expect(MARS_AIR.density(0)).toBeCloseTo(0.015, 3);
    expect(MARS_AIR.soundSpeed(0)).toBeGreaterThan(220);
    expect(MARS_AIR.soundSpeed(0)).toBeLessThan(250);
    expect(MARS_AIR.density(20_000)).toBeLessThan(MARS_AIR.density(0) / 4);
  });
});

describe('sphere drag coefficient', () => {
  it('≈ 0,47 slow, rises through the sound barrier, ≈ 0,92 at hypersonic speed', () => {
    expect(sphereDragCoefficient(0.3)).toBeCloseTo(0.485, 2);
    expect(sphereDragCoefficient(1.0)).toBeCloseTo(0.8, 2);
    expect(sphereDragCoefficient(25)).toBeCloseTo(0.92, 2);
  });
});
