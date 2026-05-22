import { TWO_96 } from "@slipless/sdk-core";

const MAX_UINT_160 = (1n << 160n) - 1n;

/** Δtoken0 between two sqrt-prices, both ≤ uint160. Always positive. */
export function getAmount0Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp: boolean,
): bigint {
  const [a, b] = sqrtRatioAX96 < sqrtRatioBX96
    ? [sqrtRatioAX96, sqrtRatioBX96]
    : [sqrtRatioBX96, sqrtRatioAX96];
  if (a === 0n) throw new RangeError("getAmount0Delta: sqrtPrice is zero");

  const num1 = liquidity << 96n;
  const num2 = b - a;
  return roundUp
    ? mulDivRoundingUp(mulDivRoundingUp(num1, num2, b), 1n, a)
    : (num1 * num2) / b / a;
}

/** Δtoken1 between two sqrt-prices. */
export function getAmount1Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp: boolean,
): bigint {
  const [a, b] = sqrtRatioAX96 < sqrtRatioBX96
    ? [sqrtRatioAX96, sqrtRatioBX96]
    : [sqrtRatioBX96, sqrtRatioAX96];
  return roundUp
    ? mulDivRoundingUp(liquidity, b - a, TWO_96)
    : (liquidity * (b - a)) / TWO_96;
}

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
    ? nextSqrtPriceFromAmount0(sqrtPriceX96, liquidity, amountIn)
    : nextSqrtPriceFromAmount1(sqrtPriceX96, liquidity, amountIn);
}

function nextSqrtPriceFromAmount0(sqrtP: bigint, L: bigint, amount: bigint): bigint {
  const num1 = L << 96n;
  const product = amount * sqrtP;
  if (product / amount === sqrtP) {
    const denom = num1 + product;
    if (denom >= num1) return mulDivRoundingUp(num1, sqrtP, denom);
  }
  return mulDivRoundingUp(num1, 1n, num1 / sqrtP + amount);
}

function nextSqrtPriceFromAmount1(sqrtP: bigint, L: bigint, amount: bigint): bigint {
  const next = sqrtP + (amount << 96n) / L;
  if (next > MAX_UINT_160) throw new Error("nextSqrtPrice overflow");
  return next;
}

function mulDivRoundingUp(a: bigint, b: bigint, denominator: bigint): bigint {
  const product = a * b;
  const result = product / denominator;
  return product % denominator > 0n ? result + 1n : result;
}
