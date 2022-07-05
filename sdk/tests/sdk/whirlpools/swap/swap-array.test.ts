import BN from "bn.js";
import * as anchor from "@project-serum/anchor";
import * as assert from "assert";
import {
  PriceMath,
  AccountFetcher,
  buildWhirlpoolClient,
  WhirlpoolContext,
  TICK_ARRAY_SIZE,
  swapQuoteByInputToken,
  PDAUtil,
  swapQuoteWithParams,
  TickArrayUtil,
} from "../../../../src";
import {
  arrayTickIndexToTickIndex,
  setupSwapTest,
  buildPosition,
} from "../../../utils/swap-test-utils";
import { Percentage } from "@orca-so/common-sdk";
import { TickSpacing } from "../../../utils";
import { u64 } from "@solana/spl-token";

describe("swap arrays test", async () => {
  const provider = anchor.Provider.local();
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.Whirlpool;
  const ctx = WhirlpoolContext.fromWorkspace(provider, program);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx, fetcher);
  const tickSpacing = TickSpacing.SixtyFour;
  const slippageTolerance = Percentage.fromFraction(1, 100);

  /**
   * |-------------c2-----|xxxxxxxxxxxxxxxxx|------c1-----------|
   */
  it("3 sequential arrays, 2nd array not initialized, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 1, offsetIndex: 44 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -2, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: 44 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const missingTickArray = PDAUtil.getTickArray(ctx.program.programId, whirlpool.getAddress(), 0);
    const expectedError = `[${missingTickArray.publicKey.toBase58()}] need to be initialized`;
    await assert.rejects(
      swapQuoteByInputToken(
        whirlpool,
        whirlpoolData.tokenMintA,
        new u64(10000),
        true,
        slippageTolerance,
        fetcher,
        ctx.program.programId,
        true
      ),
      (err: Error) => err.message.indexOf(expectedError) != -1
    );
  });

  /**
   * |-------------c1-----|xxxxxxxxxxxxxxxxx|------c2-----------|
   */
  it("3 sequential arrays, 2nd array not initialized, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: -1, offsetIndex: 44 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -2, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: 44 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const missingTickArray = PDAUtil.getTickArray(ctx.program.programId, whirlpool.getAddress(), 0);
    const expectedError = `[${missingTickArray.publicKey.toBase58()}] need to be initialized`;
    await assert.rejects(
      swapQuoteByInputToken(
        whirlpool,
        whirlpoolData.tokenMintB,
        new u64(10000),
        true,
        slippageTolerance,
        fetcher,
        ctx.program.programId,
        true
      ),
      (err: Error) => err.message.indexOf(expectedError) != -1
    );
  });

  /**
   * // TODO: Fail on curr index not matching tick-array input
   * c1|------------------|-----------------|-------------------|
   */
  it("3 sequential arrays does not contain curr_tick_index, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: -2, offsetIndex: 44 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -2, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: 44 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    await assert.rejects(
      swapQuoteByInputToken(
        whirlpool,
        whirlpoolData.tokenMintA,
        new u64(10000),
        true,
        slippageTolerance,
        fetcher,
        ctx.program.programId,
        true
      ),
      (err) => {
        console.log(`err - ${err}`);
        return true;
      }
    );
  });

  /**
   * // TODO: Fail on curr index not matching tick-array input
   * |--------------------|-----------------|-------------------|c1
   */
  it("3 sequential arrays does not contain curr_tick_index, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 2, offsetIndex: 44 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 5632, 11264],
      fundedPositions: [
        buildPosition(
          // a
          { arrayIndex: -2, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: 44 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });
  });

  /**
   * TODO: Failing on failure to fetch tick-array. Should fail on invalid current index.
   * |--------------------|------c1---------|-------------------|
   */
  it("3 sequential arrays, 2nd array contains curr_tick_index, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 0, offsetIndex: 44 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          { arrayIndex: -2, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: 44 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const aToB = true;
    const tickArrayPdas = await TickArrayUtil.getTickArrayPDAs(
      arrayTickIndexToTickIndex({ arrayIndex: 1, offsetIndex: 10 }, tickSpacing),
      tickSpacing,
      3,
      ctx.program.programId,
      whirlpool.getAddress(),
      aToB
    );
    const tickArrayAddresses = tickArrayPdas.map((pda) => pda.publicKey);
    const tickArrays = await fetcher.listTickArrays(tickArrayAddresses, true);
    swapQuoteWithParams({
      aToB,
      amountSpecifiedIsInput: true,
      slippageTolerance,
      tokenAmount: new u64("10000"),
      whirlpoolData,
      tickArrayAddresses,
      tickArrays,
    });
  });

  /**
   * TODO: Failing on crossing max array. Should fail on invalid start index
   * |--------------------|------c1---------|-------------------|
   */
  it("3 sequential arrays, 2nd array contains curr_tick_index, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 0, offsetIndex: 44 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 0, 5632, 11264, 16896],
      fundedPositions: [
        buildPosition(
          { arrayIndex: -2, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: 44 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const aToB = false;
    const tickArrayPdas = await TickArrayUtil.getTickArrayPDAs(
      arrayTickIndexToTickIndex({ arrayIndex: 1, offsetIndex: 10 }, tickSpacing),
      tickSpacing,
      3,
      ctx.program.programId,
      whirlpool.getAddress(),
      aToB
    );
    const tickArrayAddresses = tickArrayPdas.map((pda) => pda.publicKey);
    const tickArrays = await fetcher.listTickArrays(tickArrayAddresses, true);
    swapQuoteWithParams({
      aToB,
      amountSpecifiedIsInput: true,
      slippageTolerance,
      tokenAmount: new u64("10000"),
      whirlpoolData,
      tickArrayAddresses,
      tickArrays,
    });
  });

  /**
   * TODO: Failing on crossing max array. Need to recognize it's out of sequence
   * |---a-c1--(5632)-----|------(0)--------|---c2--(11264)--a-|
   */
  it("on first array, 2nd array is not sequential, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 0, offsetIndex: 44 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          { arrayIndex: -2, offsetIndex: 44 },
          { arrayIndex: 2, offsetIndex: 44 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const aToB = true;
    const tickArrayPdas = await [5632, 0, 11264].map((value) =>
      PDAUtil.getTickArray(ctx.program.programId, whirlpool.getAddress(), value)
    );
    const tickArrayAddresses = tickArrayPdas.map((pda) => pda.publicKey);
    const tickArrays = await fetcher.listTickArrays(tickArrayAddresses, true);
    swapQuoteWithParams({
      aToB,
      amountSpecifiedIsInput: true,
      slippageTolerance,
      tokenAmount: new u64("10000"),
      whirlpoolData,
      tickArrayAddresses,
      tickArrays,
    });
  });

  /**
   * TODO: Failing to fetch array-index 3
   * |-a--(-11264)---c2---|--------(0)------|----(-5632)---c1--a-|
   */
  it("on first array, 2nd array is not sequential, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: -1, offsetIndex: 44 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [-11264, -5632, 0, 5632, 11264],
      fundedPositions: [
        buildPosition(
          { arrayIndex: -2, offsetIndex: 10 },
          { arrayIndex: -1, offsetIndex: TICK_ARRAY_SIZE - 2 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const aToB = false;
    const tickArrayPdas = await [-11264, 0, -5632].map((value) =>
      PDAUtil.getTickArray(ctx.program.programId, whirlpool.getAddress(), value)
    );
    const tickArrayAddresses = tickArrayPdas.map((pda) => pda.publicKey);
    const tickArrays = await fetcher.listTickArrays(tickArrayAddresses, true);
    swapQuoteWithParams({
      aToB,
      amountSpecifiedIsInput: true,
      slippageTolerance,
      tokenAmount: new u64("10000"),
      whirlpoolData,
      tickArrayAddresses,
      tickArrays,
    });
  });

  /**
   * TODO: Needs to succeed
   * |-------(5632)------|-------(5632)------|---c2--(5632)-c1---|
   */
  it("3 identical arrays, 1st contains curr_tick_index, a->b", async () => {
    const currIndex = arrayTickIndexToTickIndex(
      { arrayIndex: 1, offsetIndex: TICK_ARRAY_SIZE - 4 },
      tickSpacing
    );
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [5632],
      fundedPositions: [
        buildPosition(
          { arrayIndex: 1, offsetIndex: 0 },
          { arrayIndex: 1, offsetIndex: TICK_ARRAY_SIZE - 1 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const aToB = true;
    const tickArrayPdas = await [5632, 5632, 5632].map((value) =>
      PDAUtil.getTickArray(ctx.program.programId, whirlpool.getAddress(), value)
    );
    const tickArrayAddresses = tickArrayPdas.map((pda) => pda.publicKey);
    const tickArrays = await fetcher.listTickArrays(tickArrayAddresses, true);
    swapQuoteWithParams({
      aToB,
      amountSpecifiedIsInput: true,
      slippageTolerance,
      tokenAmount: new u64("10000"),
      whirlpoolData,
      tickArrayAddresses,
      tickArrays,
    });
  });

  /**
   * TODO: Needs to succeed
   * |---c1--(5632)-c2---|-------(5632)------|-------(5632)------|
   */
  it("3 identical arrays, 1st contains curr_tick_index, b->a", async () => {
    const currIndex = arrayTickIndexToTickIndex({ arrayIndex: 1, offsetIndex: 10 }, tickSpacing);
    const whirlpool = await setupSwapTest({
      ctx,
      client,
      tickSpacing,
      initSqrtPrice: PriceMath.tickIndexToSqrtPriceX64(currIndex),
      initArrayStartTicks: [5632],
      fundedPositions: [
        buildPosition(
          { arrayIndex: 1, offsetIndex: 0 },
          { arrayIndex: 1, offsetIndex: TICK_ARRAY_SIZE - 1 },
          tickSpacing,
          new BN(250_000_000)
        ),
      ],
    });

    const whirlpoolData = await whirlpool.getData();
    const aToB = false;
    const tickArrayPdas = await [5632, 5632, 5632].map((value) =>
      PDAUtil.getTickArray(ctx.program.programId, whirlpool.getAddress(), value)
    );
    const tickArrayAddresses = tickArrayPdas.map((pda) => pda.publicKey);
    const tickArrays = await fetcher.listTickArrays(tickArrayAddresses, true);
    swapQuoteWithParams({
      aToB,
      amountSpecifiedIsInput: true,
      slippageTolerance,
      tokenAmount: new u64("10000"),
      whirlpoolData,
      tickArrayAddresses,
      tickArrays,
    });
  });
});
