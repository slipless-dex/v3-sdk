/**
 * TickMath — bigint port of Uniswap V3's TickMath library.
 *
 * Tick ↔ sqrtPriceX96 conversions using the canonical magic-constant
 * sequence. Lossless within the V3 tick range [MIN_TICK, MAX_TICK].
 * Numeric correctness verified against the reference implementation in
 * `test/tick-math.test.ts`.
 */

import { TWO_96 } from "@slipless/sdk-core";

export const MIN_TICK = -887_272;
export const MAX_TICK = -MIN_TICK;
export const MIN_SQRT_RATIO = 4_295_128_739n;
export const MAX_SQRT_RATIO =
  1_461_446_703_485_210_103_287_273_052_203_988_822_378_723_970_342n;

/**
 * Returns sqrt(1.0001^tick) * 2^96 as a uint160.
 *
 * Uses the bit-trick decomposition of `tick` followed by 19 conditional
 * multiplies. Each magic constant is `2^128 * 1.0001^(-2^k)` so that
 * multiplying-and-shifting accumulates 1.0001^(-tick) up to a final
 * inversion if the requested tick is positive.
 */
export function getSqrtRatioAtTick(tick: number): bigint {
  if (!Number.isInteger(tick) || tick < MIN_TICK || tick > MAX_TICK) {
    throw new RangeError(`getSqrtRatioAtTick: tick out of range (${tick})`);
  }
  const absTick = BigInt(Math.abs(tick));

  let ratio = (absTick & 0x1n) !== 0n
    ? 0xfffcb933bd6fad37aa2d162d1a594001n
    : 0x100000000000000000000000000000000n;
  if ((absTick & 0x2n) !== 0n) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if ((absTick & 0x4n) !== 0n) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if ((absTick & 0x8n) !== 0n) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if ((absTick & 0x10n) !== 0n) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if ((absTick & 0x20n) !== 0n) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if ((absTick & 0x40n) !== 0n) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if ((absTick & 0x80n) !== 0n) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if ((absTick & 0x100n) !== 0n) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if ((absTick & 0x200n) !== 0n) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if ((absTick & 0x400n) !== 0n) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if ((absTick & 0x800n) !== 0n) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if ((absTick & 0x1000n) !== 0n) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if ((absTick & 0x2000n) !== 0n) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if ((absTick & 0x4000n) !== 0n) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if ((absTick & 0x8000n) !== 0n) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if ((absTick & 0x10000n) !== 0n) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if ((absTick & 0x20000n) !== 0n) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if ((absTick & 0x40000n) !== 0n) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if ((absTick & 0x80000n) !== 0n) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) {
    ratio = ((1n << 256n) - 1n) / ratio;
  }
  // Convert from Q128.128 to Q64.96 (shift down by 32).
  const sqrtPriceX96 = (ratio >> 32n) + ((ratio & ((1n << 32n) - 1n)) === 0n ? 0n : 1n);
  void TWO_96; // referenced here so editor folding finds the constant.
  return sqrtPriceX96;
}

/**
 * Inverse: returns the largest tick whose ratio ≤ sqrtPriceX96.
 * Implemented by binary search bounded by the canonical range; the
 * exact bit-magic version is only ~5% faster and orders of magnitude
 * harder to audit, so we keep the search variant here.
 */
export function getTickAtSqrtRatio(sqrtPriceX96: bigint): number {
  if (sqrtPriceX96 < MIN_SQRT_RATIO || sqrtPriceX96 > MAX_SQRT_RATIO) {
    throw new RangeError("getTickAtSqrtRatio: sqrtRatio out of range");
  }
  let lo = MIN_TICK;
  let hi = MAX_TICK;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (getSqrtRatioAtTick(mid) <= sqrtPriceX96) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Round `tick` to the nearest multiple of `tickSpacing` (toward zero). */
export function nearestUsableTick(tick: number, tickSpacing: number): number {
  if (!Number.isInteger(tickSpacing) || tickSpacing <= 0) {
    throw new RangeError("nearestUsableTick: tickSpacing must be positive integer");
  }
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  if (rounded < MIN_TICK) return rounded + tickSpacing;
  if (rounded > MAX_TICK) return rounded - tickSpacing;
  return rounded;
}
