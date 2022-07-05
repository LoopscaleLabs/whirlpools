import { ZERO } from "@orca-so/common-sdk";
import { web3 } from "@project-serum/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import { PriceMath, TickArrayData, TickData, TICK_ARRAY_SIZE } from "../../src";

export const testWhirlpoolData = {
  whirlpoolsConfig: Keypair.generate().publicKey,
  whirlpoolBump: [],
  feeRate: 300,
  protocolFeeRate: 1800,
  liquidity: new BN("32523523532"),
  sqrtPrice: new BN("32523523532"),
  tickCurrentIndex: PriceMath.sqrtPriceX64ToTickIndex(new BN("32523523532")),
  protocolFeeOwedA: new BN("2314532532"),
  protocolFeeOwedB: new BN("2314532532"),
  tokenMintA: Keypair.generate().publicKey,
  tokenVaultA: Keypair.generate().publicKey,
  feeGrowthGlobalA: new BN("32532523523523523"),
  tokenMintB: Keypair.generate().publicKey,
  tokenVaultB: Keypair.generate().publicKey,
  feeGrowthGlobalB: new BN("32532523523523523"),
  rewardLastUpdatedTimestamp: new BN("3253252312412523523523"),
  rewardInfos: [],
  tickSpacing: 64,
};

export const testInitializedTickData: TickData = {
  feeGrowthOutsideA: ZERO,
  feeGrowthOutsideB: ZERO,
  initialized: true,
  liquidityGross: ZERO,
  liquidityNet: ZERO,
  rewardGrowthsOutside: [ZERO, ZERO],
};

export const testUninitializedTickData: TickData = {
  feeGrowthOutsideA: ZERO,
  feeGrowthOutsideB: ZERO,
  liquidityGross: ZERO,
  liquidityNet: ZERO,
  initialized: false,
  rewardGrowthsOutside: [ZERO, ZERO],
};

export const testTickArrayData: TickArrayData = {
  startTickIndex: 0,
  ticks: Array(TICK_ARRAY_SIZE).fill(testUninitializedTickData),
  whirlpool: PublicKey.default,
};

export const buildTickArrayData = (
  startTick: number,
  initializedOffsets: number[]
): TickArrayData => {
  const result = {
    ticks: Array(TICK_ARRAY_SIZE).fill(testUninitializedTickData),
    whirlpool: PublicKey.default,
    startTickIndex: startTick,
  };

  const hasInitTick = result.ticks.some((tickData) => tickData.initialized);
  initializedOffsets.forEach((offset) => {
    if (offset >= TICK_ARRAY_SIZE) {
      throw new Error(`Cannot build tick-array with initialized offset - ${offset}`);
    }
    result.ticks[offset] = testInitializedTickData;
  });
  return result;
};
