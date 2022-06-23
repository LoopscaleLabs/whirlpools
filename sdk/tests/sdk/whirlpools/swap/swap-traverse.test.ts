import * as anchor from "@project-serum/anchor";
import * as assert from "assert";
import { PublicKey } from "@solana/web3.js";
import {
  WhirlpoolContext,
  AccountFetcher,
  buildWhirlpoolClient,
  PriceMath,
  WhirlpoolClient,
  Whirlpool,
  TICK_ARRAY_SIZE,
  swapQuoteByInputToken,
} from "../../../../src";
import { TickSpacing } from "../../../utils";
import {
  FundedPositionParams,
  fundPositions,
  initTestPoolWithTokens,
} from "../../../utils/init-utils";
import { Percentage } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import { BN } from "bn.js";

describe("swap traversal test", async () => {
  const provider = anchor.Provider.local();
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.Whirlpool;
  const ctx = WhirlpoolContext.fromWorkspace(provider, program);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx, fetcher);
  const tickSpacing = TickSpacing.SixtyFour;
  const slippageTolerance = Percentage.fromFraction(1, 100);

  /**
   * Swap - a->b
   * Curr - last initializable tick
   * |--------------------|b-----x2----a-------b-|x1-a------------------|
   */
  it.only("curr_index on the last initializable tick, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 0, offsetIndex: 0 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 0],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -1, offsetIndex: 44 },
          { arrayIndex: 0, offsetIndex: 1 },
          tickSpacing,
          new BN(250_000_000)
        ),
        buildPosition(
          //b
          { arrayIndex: -1, offsetIndex: 0 },
          { arrayIndex: -1, offsetIndex: TICK_ARRAY_SIZE - 1 },
          tickSpacing,
          new BN(350_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintA,
      new u64(100_000),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
  });

  /**
   * TODO: BUG - tick-array 0 is not correct in quote
   * |--------------------x1a|-b--------a----x2---b-|-------------------|
   */
  it("curr_index on the last initializable tick, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex(
      { arrayIndex: 0, offsetIndex: TICK_ARRAY_SIZE - 1 },
      tickSpacing
    );
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: 0, offsetIndex: TICK_ARRAY_SIZE - 1 },
          { arrayIndex: 1, offsetIndex: 44 },
          tickSpacing,
          new BN(250_000_000)
        ),
        buildPosition(
          //b
          { arrayIndex: 1, offsetIndex: 0 },
          { arrayIndex: 1, offsetIndex: TICK_ARRAY_SIZE - 1 },
          tickSpacing,
          new BN(350_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintB,
      new u64(100_000),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);
  });

  /**
   * |ax1-----------------|a------x2----------|-------------------|
   */
  it("curr_index on the first initializable tick, b->a", () => {});

  /**
   * |--------------x1-a|-----x2----a--------|-------------------|
   */
  it("curr_index on the 2nd last initialized tick, with the next tick initialized, b->a", () => {});

  /**
   * |-------------b----|---x2----a-----b-----|a-x1-------------|
   */
  it("curr_index on the 2nd initialized tick, with the first tick initialized, a->b", () => {});

  /**
   * |----------------|-------a---------b|--------x1----a---b----|
   */
  it("on some tick, traverse to the 1st initialized tick in the next tick-array, a->b", () => {});

  /**
   * |----a--b---x1---- --|a----------b-------|------------------|
   */
  it("on some tick, traverse to the 1st initialized tick in the next tick-array, b->a", () => {});

  /**
   * |-------a----x2------|-----------------|----x1-----a-------|
   */
  it("on some tick, traverse to the next tick in the n+2 tick-array, a->b", () => {});

  /**
   * |-------a------x1----|-----------------|-----x2--------a---|
   */
  it("on some tick, traverse to the next tick in the n+2 tick-array, b->a", () => {});

  /**
   * |------------------|-----------------|---------x1----------|
   */
  it("3 arrays, on some initialized tick, no other initialized tick in the sequence, a->b", () => {});

  /**
   * trade amount < liquidity
   * |----------x1----------|-----------------|-------------------|
   */
  it("3 arrays, on some initialized tick, no other initialized tick in the sequence, b->a", () => {});

  /**
   * trade amount > liquidity
   * |----------x1----------|-----------------|-------------------|
   */
  it("3 arrays, trade amount exceeds liquidity available in array sequence", () => {});

  /**
   * |--------------------|-----------------|-a--------x1----------a| Max
   */
  it("on the last tick-array, traverse to the MAX_TICK_INDEX tick", () => {});

  /**
   * Min |a--------x2--------a----|-----------------|-------------------|
   */
  it("on the first tick-array, traverse to the MIN_TICK_INDEX tick", () => {});
});

export interface SwapTestPoolParams {
  ctx: WhirlpoolContext;
  client: WhirlpoolClient;
  tickSpacing: TickSpacing;
  initSqrtPrice: anchor.BN;
  initArrayStartTicks: number[];
  fundedPositions: FundedPositionParams[];
}

export interface SwapTestSwapParams {
  swapAmount: u64;
  aToB: boolean;
  amountSpecifiedIsInput: boolean;
  slippageTolerance: Percentage;
  tickArrayAddresses: PublicKey[];
}

export interface SwapTestSetup {
  whirlpool: Whirlpool;
  tickArrayAddresses: PublicKey[];
}

async function setupSwapTest(setup: SwapTestPoolParams) {
  const { poolInitInfo, whirlpoolPda, tokenAccountA, tokenAccountB } = await initTestPoolWithTokens(
    setup.ctx,
    setup.tickSpacing,
    setup.initSqrtPrice
  );

  const whirlpool = await setup.client.getPool(whirlpoolPda.publicKey, true);
  console.log(`init tick arrays for - ${JSON.stringify(setup.initArrayStartTicks, undefined, 2)}`);

  (await whirlpool.initTickArrayForTicks(setup.initArrayStartTicks))?.buildAndExecute();

  console.log(`initialized tick-arrays`);
  await fundPositions(setup.ctx, poolInitInfo, tokenAccountA, tokenAccountB, setup.fundedPositions);
  console.log(`funded position`);
  return whirlpool;
}

export interface ArrayTickIndex {
  arrayIndex: number;
  offsetIndex: number;
}

function arrayTickIndexToTickIndex(index: ArrayTickIndex, tickSpacing: number) {
  return index.arrayIndex * TICK_ARRAY_SIZE * tickSpacing + index.offsetIndex * tickSpacing;
}

function buildPosition(
  lower: ArrayTickIndex,
  upper: ArrayTickIndex,
  tickSpacing: number,
  liquidityAmount: anchor.BN
) {
  return {
    tickLowerIndex: arrayTickIndexToTickIndex(lower, tickSpacing),
    tickUpperIndex: arrayTickIndexToTickIndex(upper, tickSpacing),
    liquidityAmount,
  };
}
