import BN from "bn.js";
import * as anchor from "@project-serum/anchor";
import {
  PriceMath,
  AccountFetcher,
  buildWhirlpoolClient,
  WhirlpoolContext,
  TICK_ARRAY_SIZE,
} from "../../../../src";
import {
  arrayTickIndexToTickIndex,
  setupSwapTest,
  buildPosition,
} from "../../../utils/swap-test-utils";
import { Percentage } from "@orca-so/common-sdk";
import { TickSpacing } from "../../../utils";

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
  });

  /**
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
  });

  /**
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
   * TODO: Ideally should be ok. But will fail for now
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
  });

  /**
   * TODO: Ideally should be ok. But will fail for now
   * |--------------------|------c1---------|-------------------|
   */
  it("3 sequential arrays, 2nd array contains curr_tick_index, b->a", async () => {
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
  });

  /**
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
  });

  /**
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
  });

  /**
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
  });

  /**
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
  });
});
