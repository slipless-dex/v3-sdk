import {
  getAmount0Delta,
  getAmount1Delta,
  getNextSqrtPriceFromInput,
} from "./sqrt-price-math.js";

export interface StepInputs {
  sqrtRatioCurrentX96: bigint;
  sqrtRatioTargetX96: bigint;
  liquidity: bigint;
  /** Positive = exact-in. */
  amountRemaining: bigint;
  feeBps: bigint;
}

export interface StepOutputs {
  sqrtRatioNextX96: bigint;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
}

export function computeSwapStep(s: StepInputs): StepOutputs {
  const zeroForOne = s.sqrtRatioCurrentX96 >= s.sqrtRatioTargetX96;
  const exactIn = s.amountRemaining > 0n;

  let sqrtNext: bigint;
  let amountIn: bigint;

  if (exactIn) {
    const inAfterFee = (s.amountRemaining * (10_000n - s.feeBps)) / 10_000n;
    amountIn = zeroForOne
      ? getAmount0Delta(s.sqrtRatioTargetX96, s.sqrtRatioCurrentX96, s.liquidity, true)
      : getAmount1Delta(s.sqrtRatioCurrentX96, s.sqrtRatioTargetX96, s.liquidity, true);

    sqrtNext = inAfterFee >= amountIn
      ? s.sqrtRatioTargetX96
      : getNextSqrtPriceFromInput(s.sqrtRatioCurrentX96, s.liquidity, inAfterFee, zeroForOne);
  } else {
    // Exact-out: SOR rarely needs it; fall back to crossing the tick.
    sqrtNext = s.sqrtRatioTargetX96;
    amountIn = zeroForOne
      ? getAmount0Delta(s.sqrtRatioTargetX96, s.sqrtRatioCurrentX96, s.liquidity, true)
      : getAmount1Delta(s.sqrtRatioCurrentX96, s.sqrtRatioTargetX96, s.liquidity, true);
  }

  const maxed = sqrtNext === s.sqrtRatioTargetX96;
  let amountOut: bigint;
  if (zeroForOne) {
    if (!maxed) amountIn = getAmount0Delta(sqrtNext, s.sqrtRatioCurrentX96, s.liquidity, true);
    amountOut = getAmount1Delta(sqrtNext, s.sqrtRatioCurrentX96, s.liquidity, false);
  } else {
    if (!maxed) amountIn = getAmount1Delta(s.sqrtRatioCurrentX96, sqrtNext, s.liquidity, true);
    amountOut = getAmount0Delta(s.sqrtRatioCurrentX96, sqrtNext, s.liquidity, false);
  }

  // ceil(amountIn * fee / (10000 - fee))
  const feeAmount = (amountIn * s.feeBps + (10_000n - s.feeBps) - 1n) / (10_000n - s.feeBps);
  return { sqrtRatioNextX96: sqrtNext, amountIn, amountOut, feeAmount };
}
