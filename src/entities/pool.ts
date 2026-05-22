import { Token, CurrencyAmount, Price, ZERO } from "@slipless/sdk-core";

import { getSqrtRatioAtTick, MIN_TICK, MAX_TICK } from "../utils/tick-math.js";
import { computeSwapStep } from "../utils/swap-math.js";

export interface Tick {
  index: number;
  liquidityNet: bigint;
}

export class V3Pool {
  readonly token0: Token;
  readonly token1: Token;
  readonly feeBps: number;
  readonly tickSpacing: number;
  readonly sqrtRatioX96: bigint;
  readonly liquidity: bigint;
  readonly tickCurrent: number;
  readonly ticks: readonly Tick[];

  constructor(args: {
    tokenA: Token;
    tokenB: Token;
    feeBps: number;
    tickSpacing: number;
    sqrtRatioX96: bigint;
    liquidity: bigint;
    tickCurrent: number;
    ticks: readonly Tick[];
  }) {
    if (args.feeBps < 0 || args.feeBps >= 10_000) {
      throw new RangeError("V3Pool: feeBps must be in [0, 10000)");
    }
    if (args.tickSpacing <= 0) {
      throw new RangeError("V3Pool: tickSpacing must be positive");
    }
    const [token0, token1] = args.tokenA.sortsBefore(args.tokenB)
      ? [args.tokenA, args.tokenB]
      : [args.tokenB, args.tokenA];
    this.token0 = token0;
    this.token1 = token1;
    this.feeBps = args.feeBps;
    this.tickSpacing = args.tickSpacing;
    this.sqrtRatioX96 = args.sqrtRatioX96;
    this.liquidity = args.liquidity;
    this.tickCurrent = args.tickCurrent;
    this.ticks = [...args.ticks].sort((a, b) => a.index - b.index);
  }

  involvesToken(token: Token): boolean {
    return token.equals(this.token0) || token.equals(this.token1);
  }

  get token0Price(): Price<Token, Token> {
    return new Price({
      baseCurrency: this.token0,
      quoteCurrency: this.token1,
      numerator: (this.sqrtRatioX96 * this.sqrtRatioX96) >> 96n,
      denominator: 1n << 96n,
    });
  }

  get token1Price(): Price<Token, Token> {
    return this.token0Price.invert();
  }

  /** Pure. Walks ticks lazily. */
  getOutputAmount(inputAmount: CurrencyAmount<Token>): [CurrencyAmount<Token>, V3Pool] {
    if (!this.involvesToken(inputAmount.currency)) {
      throw new Error(`V3Pool.getOutputAmount: ${inputAmount.currency.symbol} not in pool`);
    }
    const zeroForOne = inputAmount.currency.equals(this.token0);

    let sqrtRatio = this.sqrtRatioX96;
    let liquidity = this.liquidity;
    let tickIdx = this.activeTickIndex();
    let remaining = inputAmount.raw;
    let out = 0n;
    const fee = BigInt(this.feeBps);

    let safety = 0;
    while (remaining > ZERO && liquidity > ZERO && safety++ < 2048) {
      const nextTick = zeroForOne ? this.ticks[tickIdx] : this.ticks[tickIdx + 1];
      if (!nextTick) break;

      const sqrtTarget = getSqrtRatioAtTick(clampTick(nextTick.index));
      const step = computeSwapStep({
        sqrtRatioCurrentX96: sqrtRatio,
        sqrtRatioTargetX96: sqrtTarget,
        liquidity,
        amountRemaining: remaining,
        feeBps: fee,
      });

      sqrtRatio = step.sqrtRatioNextX96;
      remaining -= step.amountIn + step.feeAmount;
      out += step.amountOut;

      if (sqrtRatio !== sqrtTarget) break;
      if (zeroForOne) { liquidity -= nextTick.liquidityNet; tickIdx -= 1; }
      else            { liquidity += nextTick.liquidityNet; tickIdx += 1; }
    }

    const output = CurrencyAmount.fromRawAmount(zeroForOne ? this.token1 : this.token0, out);
    const nextPool = new V3Pool({
      tokenA: this.token0,
      tokenB: this.token1,
      feeBps: this.feeBps,
      tickSpacing: this.tickSpacing,
      sqrtRatioX96: sqrtRatio,
      liquidity,
      tickCurrent: this.tickCurrent,
      ticks: this.ticks,
    });
    return [output, nextPool];
  }

  /** Largest tick ≤ tickCurrent. -1 if no ticks. */
  private activeTickIndex(): number {
    if (this.ticks.length === 0) return -1;
    let lo = 0;
    let hi = this.ticks.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.ticks[mid]!.index <= this.tickCurrent) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
}

function clampTick(t: number): number {
  return t < MIN_TICK ? MIN_TICK : t > MAX_TICK ? MAX_TICK : t;
}
