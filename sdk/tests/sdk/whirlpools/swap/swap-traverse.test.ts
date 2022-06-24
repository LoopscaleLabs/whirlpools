import * as anchor from "@project-serum/anchor";
import * as assert from "assert";
import {
  WhirlpoolContext,
  AccountFetcher,
  buildWhirlpoolClient,
  PriceMath,
  TICK_ARRAY_SIZE,
  swapQuoteByInputToken,
  MAX_TICK_INDEX,
  MIN_TICK_INDEX,
  PoolUtil,
} from "../../../../src";
import { getTokenBalance, TickSpacing } from "../../../utils";
import { Percentage, resolveOrCreateATA, TokenUtil } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import { BN } from "bn.js";
import {
  arrayTickIndexToTickIndex,
  buildPosition,
  setupSwapTest,
} from "../../../utils/swap-test-utils";

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
   * TODO: Error 1787 (InvalidTickArraySequence)
   * Swap - a->b
   * Curr - last initializable tick
   * |--------------------|b-----x2----a-------b-|x1-a------------------|
   */
  it("curr_index on the last initializable tick, a->b", async () => {
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

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * TODO: BUG - tick-array 0 is not correct in quote
   * |--------------------x1,a|-b--------a----x2---b-|-------------------|
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
   * TODO: BUG - tick-array 0 is not correct in quote
   * b|a,x1--------------|a------x2----------|-------------------b|
   */
  it("curr_index on the first initializable tick, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 0, offsetIndex: 0 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-5632, 0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: 0, offsetIndex: 0 },
          { arrayIndex: 1, offsetIndex: 0 },
          tickSpacing,
          new BN(250_000_000)
        ),
        buildPosition(
          //b
          { arrayIndex: -1, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: TICK_ARRAY_SIZE - 1 },
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
   * // TODO: can't cross 5632 barrier with current quoter
   * |--------b-----x1-a|-----x2----a------b--|-------------------|
   */
  it("curr_index on the 2nd last initialized tick, with the next tick initialized, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex(
      { arrayIndex: 0, offsetIndex: TICK_ARRAY_SIZE - 2 }, // 5504
      tickSpacing
    );
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-5632, 0, 5632, 11264],
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
          { arrayIndex: 0, offsetIndex: 44 },
          { arrayIndex: 1, offsetIndex: TICK_ARRAY_SIZE - 4 },
          tickSpacing,
          new BN(350_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();

    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintB,
      new u64(1080000),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    const { address: tokenAAta } = await resolveOrCreateATA(
      ctx.connection,
      ctx.provider.wallet.publicKey,
      whirlpoolData.tokenMintA,
      fetcher.getAccountRentExempt
    );
    const walletA = await getTokenBalance(provider, tokenAAta);
    console.log(
      `walletA - ${walletA} estimatedAmountIn - ${quote.estimatedAmountIn}, estimatedAmountOut - ${quote.estimatedAmountOut}`
    );
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * |-----------b--x2--|-------a-----b-----|a-x1-------------|
   */
  it("curr_index on the 2nd initialized tick, with the first tick initialized, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 2, offsetIndex: 1 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: 1, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: 0 },
          tickSpacing,
          new BN(250_000_000)
        ),
        buildPosition(
          //b
          { arrayIndex: 0, offsetIndex: 44 },
          { arrayIndex: 1, offsetIndex: 64 },
          tickSpacing,
          new BN(350_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintA,
      new u64(80_000_000),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * TODO: BN failure (Assertion failed)
   * |----------------|-----a----x2-----b|--------x1----a---b----|
   */
  it("on some tick, traverse to the 1st initialized tick in the next tick-array, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 2, offsetIndex: 22 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: 1, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: 44 },
          tickSpacing,
          new BN(250_000_000)
        ),
        buildPosition(
          //b
          { arrayIndex: 1, offsetIndex: TICK_ARRAY_SIZE - 1 },
          { arrayIndex: 2, offsetIndex: 64 },
          tickSpacing,
          new BN(350_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintA,
      new u64(8_000_000),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * TODO: crossed max tick-array on any token input
   * |----a--b---x1------|a---x2-----b-------|------------------|
   */
  it("on some tick, traverse to the 1st initialized tick in the next tick-array, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: -1, offsetIndex: 64 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-5632, 0, 5632],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -1, offsetIndex: 10 },
          { arrayIndex: 0, offsetIndex: 0 },
          tickSpacing,
          new BN(250_000_000)
        ),
        buildPosition(
          //b
          { arrayIndex: -1, offsetIndex: 22 },
          { arrayIndex: 0, offsetIndex: 64 },
          tickSpacing,
          new BN(350_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintB,
      new u64(8),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * TODO: BN failure (Assertion failed)
   * |-------a----x2------|-----------------|----x1-----a-------|
   */
  it("on some tick, traverse to the next tick in the n+2 tick-array, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 1, offsetIndex: 22 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-5632, 0, 5632],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -1, offsetIndex: 10 },
          { arrayIndex: 1, offsetIndex: 23 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintA,
      new u64(8),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * TODO: Crossed maximum number of tick arrays
   * |-------a------x1----|-----------------|-----x2--------a---|
   */
  it("on some tick, traverse to the next tick in the n+2 tick-array, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: -1, offsetIndex: 22 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-5632, 0, 5632],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -1, offsetIndex: 10 },
          { arrayIndex: 1, offsetIndex: 23 },
          tickSpacing,
          new BN(250_000_000)
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

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * TODO: Crossed maximum number of tick arrays
   * |----------------|-----------------|-------x1--------|
   */
  it("3 arrays, on some initialized tick, no other initialized tick in the sequence, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 1, offsetIndex: 22 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -2, offsetIndex: 10 },
          { arrayIndex: 2, offsetIndex: 23 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintA,
      new u64(8),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * TODO: Crossed maximum number of tick arrays
   * |-----x1-------------|-----------------|-------------------|
   */
  it("3 arrays, on some initialized tick, no other initialized tick in the sequence, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: -1, offsetIndex: 22 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -2, offsetIndex: 10 },
          { arrayIndex: 2, offsetIndex: 23 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintB,
      new u64(8),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * TODO: Crossed maximum number of tick arrays
   * trade amount > liquidity
   * |----------x1----------|-----------------|-------------------|
   */
  it("3 arrays, trade amount exceeds liquidity available in array sequence", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: -1, offsetIndex: 22 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -2, offsetIndex: 10 },
          { arrayIndex: 2, offsetIndex: 23 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintB,
      new u64(8),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * // TODO: TickUtil is incorrectly failing with `startTickIndex is too large`
   * |a--------x1----------a| Max
   */
  it("on the last tick-array, traverse to the MAX_TICK_INDEX tick", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 78, offsetIndex: 22 }, tickSpacing);
    console.log(`currIndex - ${currIndex}`);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [MAX_TICK_INDEX],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: 78, offsetIndex: 0 }, // 439,296
          { arrayIndex: 78, offsetIndex: 67 }, // 443,584
          tickSpacing,
          new BN(250)
        ),
      ],
      tokenMintAmount: new BN("95000000000000000"),
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintB,
      new u64(8),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    await (await whirlpool.swap(quote)).buildAndExecute();
    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });

  /**
   * TODO: Calculated tick-array includes the out of bounds tick-arrays
   * Min |a--------x2--------a----|-----------------|-------------------|
   */
  it("on the first tick-array, traverse to the MIN_TICK_INDEX tick", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: -79, offsetIndex: 22 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [MIN_TICK_INDEX],
      fundedPositions: [
        buildPosition(
          // a -444,928
          { arrayIndex: -79, offsetIndex: 21 },
          { arrayIndex: -79, offsetIndex: TICK_ARRAY_SIZE - 1 },
          tickSpacing,
          new BN(250)
        ),
      ],
      tokenMintAmount: new BN("95000000000000000"),
    });

    const whirlpoolData = await whirlpool.getData();
    const quote = await swapQuoteByInputToken(
      whirlpool,
      whirlpoolData.tokenMintB,
      new u64(8),
      true,
      slippageTolerance,
      fetcher,
      ctx.program.programId,
      true
    );
    console.log(`quote- ${JSON.stringify(quote, undefined, 2)}`);
    const swapTxId = await (await whirlpool.swap(quote)).buildAndExecute();
    console.log(`swapTxId - ${swapTxId}`);

    const newData = await whirlpool.refreshData();
    console.log(`curr index - start - ${currIndex} end - ${newData.tickCurrentIndex}`);
  });
});
