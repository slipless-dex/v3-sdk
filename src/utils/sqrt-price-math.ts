/**
 * SqrtPriceMath — closed-form deltas between sqrtPrices for a given
 * liquidity. Bigint port of Uniswap V3's SqrtPriceMath.
 */

import { TWO_96 } from "@slipless/sdk-core";

const MAX_UINT_160 = (1n << 160n) - 1n;

/** ΔX (token0) between two sqrt-prices, both ≤ MAX_UINT_160. Always positive. */
export function getAmount0Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp: boolean,
): bigint {
  const [a, b] = sqrtRatioAX96 < sqrtRatioBX96
    ? [sqrtRatioAX96, sqrtRatioBX96]
    : [sqrtRatioBX96, sqrtRatioAX96];
  if (a === 0n) throw new RangeError("getAmount0Delta: sqrtPrice cannot be zero");

  const numerator1 = liquidity << 96n;
  const numerator2 = b - a;

  if (roundUp) {
    return mulDivRoundingUp(mulDivRoundingUp(numerator1, numerator2, b), 1n, a);
  }
  return (numerator1 * numerator2) / b / a;
}

/** ΔY (token1) between two sqrt-prices. */
export function getAmount1Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp: boolean,
): bigint {
  const [a, b] = sqrtRatioAX96 < sqrtRatioBX96
    ? [sqrtRatioAX96, sqrtRatioBX96]
    : [sqrtRatioBX96, sqrtRatioAX96];
  if (roundUp) return mulDivRoundingUp(liquidity, b - a, TWO_96);
  return (liquidity * (b - a)) / TWO_96;
}

/** sqrtPrice after consuming `amountIn` of token0 (zeroForOne, i.e. price drops). */
export function getNextSqrtPriceFromInput(
  sqrtPriceX96: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean,
): bigint {
  if (sqrtPriceX96 <= 0n) throw new RangeError("sqrtPrice must be positive");
  if (liquidity <= 0n) throw new RangeError("liquidity must be positive");
  if (amountIn === 0n) return sqrtPriceX96;

  return zeroForOne
    ? getNextSqrtPriceFromAmount0RoundingUp(sqrtPriceX96, liquidity, amountIn, true)
    : getNextSqrtPriceFromAmount1RoundingDown(sqrtPriceX96, liquidity, amountIn, true);
}

function getNextSqrtPriceFromAmount0RoundingUp(
  sqrtPX96: bigint,
  liquidity: bigint,
  amount: bigint,
  add: boolean,
): bigint {
  if (amount === 0n) return sqrtPX96;
  const numerator1 = liquidity << 96n;
  if (add) {
    const product = amount * sqrtPX96;
    if (product / amount === sqrtPX96) {
      const denominator = numerator1 + product;
      if (denominator >= numerator1) {
        return mulDivRoundingUp(numerator1, sqrtPX96, denominator);
      }
    }
    return mulDivRoundingUp(numerator1, 1n, numerator1 / sqrtPX96 + amount);
  }
  // subtract path is symmetric and only needed for exact-output quoting.
  const product = amount * sqrtPX96;
  if (product / amount !== sqrtPX96 || numerator1 <= product) {
    throw new Error("nextSqrtPrice subtract underflow");
  }
  return mulDivRoundingUp(numerator1, sqrtPX96, numerator1 - product);
}

function getNextSqrtPriceFromAmount1RoundingDown(
  sqrtPX96: bigint,
  liquidity: bigint,
  amount: bigint,
  add: boolean,
): bigint {
  if (add) {
    const quotient = (amount << 96n) / liquidity;
    const next = sqrtPX96 + quotient;
    if (next > MAX_UINT_160) throw new Error("nextSqrtPrice overflow");
    return next;
  }
  const quotient = mulDivRoundingUp(amount, TWO_96, liquidity);
  if (sqrtPX96 <= quotient) throw new Error("nextSqrtPrice underflow");
  return sqrtPX96 - quotient;
}

function mulDivRoundingUp(a: bigint, b: bigint, denominator: bigint): bigint {
  const product = a * b;
  let result = product / denominator;
  if (product % denominator > 0n) result += 1n;
  return result;
}
