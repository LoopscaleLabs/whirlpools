import { ZERO } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import BN from "bn.js";
import { WhirlpoolData } from "../types/public";
import { PriceMath } from "../utils/public";
import { TickArraySequence } from "../utils/tick-array-sequence";

export function simulateSwap(
  whirlpoolData: WhirlpoolData,
  tickSequence: TickArraySequence,
  tokenAmount: u64,
  sqrtPriceLimit: u64,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  let amountRemaining = tokenAmount;
  let amountCalculated = ZERO;
  let currSqrtPrice = whirlpoolData.sqrtPrice;
  let currLiquidity = whirlpoolData.liquidity;
  let currTickIndex = whirlpoolData.tickCurrentIndex;
  const feeRate = whirlpoolData.feeRate;
  const protocolFeeRate = whirlpoolData.protocolFeeRate;
  let currProtocolFee = new u64(0);
  let currFeeGrowthGlobalInput = aToB
    ? whirlpoolData.feeGrowthGlobalA
    : whirlpoolData.feeGrowthGlobalB;

  while (amountRemaining.gt(ZERO) && sqrtPriceLimit.eq(currSqrtPrice)) {
    let nextTickIndex = tickSequence.findNextInitializedTickIndex(currTickIndex, aToB);
    let { nextTickPrice, nextSqrtPriceLimit: targetSqrtPrice } = getNextSqrtPrices(
      nextTickIndex,
      sqrtPriceLimit,
      aToB
    );

    const swapComputation = computeSwap(
      amountRemaining,
      feeRate,
      currLiquidity,
      currSqrtPrice,
      targetSqrtPrice,
      amountSpecifiedIsInput,
      aToB
    );

    // TODO: overflow check
    if (amountSpecifiedIsInput) {
      amountRemaining = amountRemaining.sub(swapComputation.amountIn);
      amountRemaining = amountRemaining.sub(swapComputation.feeAmount);
      amountCalculated = amountCalculated.add(swapComputation.amountOut);
    } else {
      amountRemaining = amountRemaining.sub(swapComputation.amountOut);
      amountRemaining = amountRemaining.add(swapComputation.amountIn);
      amountCalculated = amountCalculated.add(swapComputation.feeAmount);
    }

    let { nextProtocolFee, nextFeeGrowthGlobalInput } = calculateFees(
      swapComputation.feeAmount,
      protocolFeeRate,
      currLiquidity,
      currProtocolFee,
      currFeeGrowthGlobalInput
    );
    currProtocolFee = nextProtocolFee;
    currFeeGrowthGlobalInput = nextFeeGrowthGlobalInput;

    if (swapComputation.nextPrice.eq(nextTickPrice)) {
      const nextTick = tickSequence.getTick(1);
      if (nextTick.initialized) {
        currLiquidity = calculateNextLiquidity(nextTick.liquidityNet, currLiquidity, aToB);
      }
      currTickIndex = aToB ? nextTickIndex - 1 : nextTickIndex;
    } else {
      currTickIndex = PriceMath.sqrtPriceX64ToTickIndex(swapComputation.nextPrice);
    }

    currSqrtPrice = swapComputation.nextPrice;
  }

  let { amountA, amountB } = calculateEstTokens(
    tokenAmount,
    amountRemaining,
    amountCalculated,
    aToB,
    amountSpecifiedIsInput
  );

  return {
    amountA,
    amountB,
    nextTickIndex: currTickIndex,
    nextSqrtPrice: currSqrtPrice,
  };
}

function getNextSqrtPrices(nextTick: number, sqrtPriceLimit: BN, aToB: boolean) {
  const nextTickPrice = PriceMath.tickIndexToSqrtPriceX64(nextTick);
  const nextSqrtPriceLimit = aToB
    ? BN.max(sqrtPriceLimit, nextTickPrice)
    : BN.min(sqrtPriceLimit, nextTickPrice);
  return { nextTickPrice, nextSqrtPriceLimit };
}

function calculateFees(
  feeAmount: BN,
  protocolFeeRate: number,
  currLiquidity: BN,
  currProtocolFee: BN,
  currFeeGrowthGlobalInput: BN
) {
  return {
    nextProtocolFee: ZERO,
    nextFeeGrowthGlobalInput: ZERO,
  };
}

function calculateEstTokens(
  amount: BN,
  amountRemaining: BN,
  amountCalculated: BN,
  aToB: boolean,
  amountSpecifiedIsInput: boolean
) {
  return {
    amountA: ZERO,
    amountB: ZERO,
  };
}

function calculateNextLiquidity(tickNetLiquidity: BN, currLiquidity: BN, aToB: boolean) {
  // TODO: Handle Overflow?
  return aToB ? currLiquidity.sub(tickNetLiquidity) : currLiquidity.add(tickNetLiquidity);
}

function computeSwap(
  amountRemaining: u64,
  feeRate: number,
  currLiquidity: BN,
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  return {
    amountIn: ZERO,
    amountOut: ZERO,
    nextPrice: ZERO,
    feeAmount: ZERO,
  };
}
/**
 * Compute swap
 */
// function computeSwap() {
//   // lock the user-input
//   // adjust input token if necessary
//   // decide on sqrt-price target
//   // check if it is a maximum swap
//   // calculate the other amount
//   // calculate fee amount
// }
