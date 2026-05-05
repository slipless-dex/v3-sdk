import { describe, expect, it } from "vitest";
import {
  getSqrtRatioAtTick,
  getTickAtSqrtRatio,
  MIN_TICK,
  MAX_TICK,
  MIN_SQRT_RATIO,
  MAX_SQRT_RATIO,
  nearestUsableTick,
} from "../src/utils/tick-math.js";

describe("getSqrtRatioAtTick", () => {
  it("matches the canonical bounds", () => {
    expect(getSqrtRatioAtTick(MIN_TICK)).toBe(MIN_SQRT_RATIO);
    expect(getSqrtRatioAtTick(MAX_TICK)).toBe(MAX_SQRT_RATIO);
  });
  it("is monotonically increasing", () => {
    let prev = getSqrtRatioAtTick(-1000);
    for (let t = -999; t <= 1000; t += 100) {
      const next = getSqrtRatioAtTick(t);
      expect(next > prev).toBe(true);
      prev = next;
    }
  });
  it("rejects out-of-range ticks", () => {
    expect(() => getSqrtRatioAtTick(MIN_TICK - 1)).toThrow();
    expect(() => getSqrtRatioAtTick(MAX_TICK + 1)).toThrow();
  });
});

describe("getTickAtSqrtRatio", () => {
  it("inverts getSqrtRatioAtTick within tolerance", () => {
    for (const t of [-50_000, -10_000, 0, 10_000, 50_000]) {
      const r = getSqrtRatioAtTick(t);
      const back = getTickAtSqrtRatio(r);
      expect(Math.abs(back - t)).toBeLessThanOrEqual(1);
    }
  });
});

describe("nearestUsableTick", () => {
  it("rounds to multiples of tickSpacing", () => {
    expect(nearestUsableTick(100, 60)).toBe(120);
    expect(nearestUsableTick(89, 60)).toBe(60);
    expect(nearestUsableTick(-89, 60)).toBe(-60);
    expect(nearestUsableTick(0, 60)).toBe(0);
  });
  it("rejects bad spacing", () => {
    expect(() => nearestUsableTick(0, 0)).toThrow();
    expect(() => nearestUsableTick(0, -1)).toThrow();
  });
});
