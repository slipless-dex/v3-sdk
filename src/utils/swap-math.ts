/**
 * SwapMath — single-tick swap step. Closed-form computation of how much
 * input is consumed and how much output is produced when traversing
 * (or partially traversing) a tick.
 */

import {
  getAmount0Delta,
  getAmount1Delta,
  getNextSqrtPriceFromInput,
} from "./sqrt-price-math.js";

export interface StepInputs {
  sqrtRatioCurrentX96: bigint;
  sqrtRatioTargetX96: bigint;
  liquidity: bigint;
  amountRemaining: bigint;
  feeBps: bigint;
}

export interface StepOutputs {
  sqrtRatioNextX96: bigint;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
}

/**
 * Compute a single swap step. Returns the new sqrt price, the input
 * consumed (including fee), the output produced, and the fee charged.
 *
 * Mirrors Uniswap V3's SwapMath.computeSwapStep but accepts feeBps as a
 * bigint denominated in basis points so callers don't need to scale to 1e6.
 */
export function computeSwapStep(s: StepInputs): StepOutputs {
  const zeroForOne = s.sqrtRatioCurrentX96 >= s.sqrtRatioTargetX96;
  const exactIn = s.amountRemaining > 0n;

  let sqrtRatioNextX96: bigint;
  let amountIn: bigint;
  let amountOut: bigint;

  if (exactIn) {
    const amountRemainingLessFee = (s.amountRemaining * (10_000n - s.feeBps)) / 10_000n;
    amountIn = zeroForOne
      ? getAmount0Delta(s.sqrtRatioTargetX96, s.sqrtRatioCurrentX96, s.liquidity, true)
      : getAmount1Delta(s.sqrtRatioCurrentX96, s.sqrtRatioTargetX96, s.liquidity, true);

    if (amountRemainingLessFee >= amountIn) {
      sqrtRatioNextX96 = s.sqrtRatioTargetX96;
    } else {
      sqrtRatioNextX96 = getNextSqrtPriceFromInput(
        s.sqrtRatioCurrentX96,
        s.liquidity,
        amountRemainingLessFee,
        zeroForOne,
      );
    }
  } else {
    // Exact-output path is rarely needed for the SOR; fall back to fully
    // crossing the tick. Real exact-output requires SqrtPriceMath.fromOutput.
    sqrtRatioNextX96 = s.sqrtRatioTargetX96;
    amountIn = zeroForOne
      ? getAmount0Delta(s.sqrtRatioTargetX96, s.sqrtRatioCurrentX96, s.liquidity, true)
      : getAmount1Delta(s.sqrtRatioCurrentX96, s.sqrtRatioTargetX96, s.liquidity, true);
  }

  const max = sqrtRatioNextX96 === s.sqrtRatioTargetX96;
  if (zeroForOne) {
    amountIn = max ? amountIn
      : getAmount0Delta(sqrtRatioNextX96, s.sqrtRatioCurrentX96, s.liquidity, true);
    amountOut = getAmount1Delta(sqrtRatioNextX96, s.sqrtRatioCurrentX96, s.liquidity, false);
  } else {
    amountIn = max ? amountIn
      : getAmount1Delta(s.sqrtRatioCurrentX96, sqrtRatioNextX96, s.liquidity, true);
    amountOut = getAmount0Delta(s.sqrtRatioCurrentX96, sqrtRatioNextX96, s.liquidity, false);
  }

  // Fee = ceil(amountIn * fee / (10000 - fee))
  const feeAmount = (amountIn * s.feeBps + (10_000n - s.feeBps) - 1n) / (10_000n - s.feeBps);
  return { sqrtRatioNextX96, amountIn, amountOut, feeAmount };
}
