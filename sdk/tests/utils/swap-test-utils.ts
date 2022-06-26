import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { Percentage } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import { TickSpacing } from ".";
import { WhirlpoolContext, WhirlpoolClient, Whirlpool, TICK_ARRAY_SIZE } from "../../src";
import { FundedPositionParams, initTestPoolWithTokens, fundPositions } from "./init-utils";
import { BN } from "bn.js";

export interface SwapTestPoolParams {
  ctx: WhirlpoolContext;
  client: WhirlpoolClient;
  tickSpacing: TickSpacing;
  initSqrtPrice: anchor.BN;
  initArrayStartTicks: number[];
  fundedPositions: FundedPositionParams[];
  tokenMintAmount?: anchor.BN;
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

export async function setupSwapTest(setup: SwapTestPoolParams) {
  const { poolInitInfo, whirlpoolPda, tokenAccountA, tokenAccountB } = await initTestPoolWithTokens(
    setup.ctx,
    setup.tickSpacing,
    setup.tokenMintAmount,
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

export function arrayTickIndexToTickIndex(index: ArrayTickIndex, tickSpacing: number) {
  return index.arrayIndex * TICK_ARRAY_SIZE * tickSpacing + index.offsetIndex * tickSpacing;
}

export function buildPosition(
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
