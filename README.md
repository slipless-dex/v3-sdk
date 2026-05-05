<div align="center">
  <a href="https://slipless.xyz">
    <img src=".github/logo.svg" width="140" alt="Slipless" />
  </a>
</div>

<h1 align="center">@slipless/v3-sdk</h1>

<p align="center"><strong>Concentrated-liquidity AMM SDK. Tick math, sqrtPriceX96, single-tick swap step.</strong></p>

<p align="center">
  <a href="https://github.com/slipless-dex/v3-sdk/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/slipless-dex/v3-sdk/ci.yml?branch=main&style=flat-square&color=5cd8ff&label=ci"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-ff6bdb?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/@slipless/v3-sdk"><img alt="npm" src="https://img.shields.io/npm/v/@slipless/v3-sdk?style=flat-square&color=b965ff&label=npm"></a>
</p>

<p align="center">
  <a href="https://slipless.xyz">Site</a> &middot;
  <a href="https://app.slipless.xyz">App</a> &middot;
  <a href="https://docs.slipless.xyz">Docs</a> &middot;
  <a href="https://twitter.com/slipless">Twitter</a>
</p>

---

Concentrated-liquidity AMM SDK. Tick math, sqrtPriceX96 conversions, single-tick swap step, and a `V3Pool` quoter that walks ticks lazily without mutating state.

```bash
npm install @slipless/v3-sdk @slipless/sdk-core
```

## Math correctness

The bit-magic constants in `getSqrtRatioAtTick` are byte-identical to Uniswap V3's reference implementation. They're verified in `test/tick-math.test.ts` against the canonical `MIN_SQRT_RATIO` / `MAX_SQRT_RATIO` bounds. If you intend to broadcast txs, use the on-chain `TickMath` library — this SDK is for off-chain quoting and analytics.

## Usage

```ts
import { V3Pool, getSqrtRatioAtTick } from "@slipless/v3-sdk";

const pool = new V3Pool({
  tokenA: USDC, tokenB: WETH,
  feeBps: 5,           // 0.05%
  tickSpacing: 10,
  sqrtRatioX96: getSqrtRatioAtTick(202_000),
  liquidity: 5_000_000_000_000_000_000n,
  tickCurrent: 202_000,
  ticks: [
    { index: 200_000, liquidityNet: 1_000_000_000_000_000_000n },
    { index: 204_000, liquidityNet: -1_000_000_000_000_000_000n },
  ],
});

const [out] = pool.getOutputAmount(CurrencyAmount.fromRawAmount(USDC, 100_000_000n));
console.log(out.toExact());
```

## License

MIT © Slipless Labs
