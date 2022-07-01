import { u64 } from "@solana/spl-token";
import { BN } from "@project-serum/anchor";
import { getAmountDeltaA, getAmountDeltaB, getNextSqrtPrice } from "./token-math";

export type SwapStep = {
  amountIn: BN;
  amountOut: BN;
  nextPrice: BN;
  feeAmount: BN;
};

export function computeSwapStep(
  amountRemaining: u64,
  feeRate: number,
  currLiquidity: BN,
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
): SwapStep {
  let amountFixedDelta = getAmountFixedDelta(
    currSqrtPrice,
    targetSqrtPrice,
    currLiquidity,
    amountSpecifiedIsInput,
    aToB
  );

  let amountCalc = amountRemaining;
  if (amountSpecifiedIsInput) {
    amountCalc = amountRemaining.mul(new BN(1000000).sub(new BN(feeRate))).div(new BN(1000000));
  }

  let nextSqrtPrice = amountCalc.gte(amountFixedDelta)
    ? targetSqrtPrice
    : getNextSqrtPrice(currSqrtPrice, currLiquidity, amountCalc, amountSpecifiedIsInput, aToB);

  let isMaxSwap = nextSqrtPrice.eq(targetSqrtPrice);

  let amountUnfixedDelta = getAmountUnfixedDelta(
    currSqrtPrice,
    nextSqrtPrice,
    currLiquidity,
    amountSpecifiedIsInput,
    aToB
  );

  if (!isMaxSwap) {
    amountFixedDelta = getAmountFixedDelta(
      currSqrtPrice,
      nextSqrtPrice,
      currLiquidity,
      amountSpecifiedIsInput,
      aToB
    );
  }

  let amountIn = amountSpecifiedIsInput ? amountFixedDelta : amountUnfixedDelta;
  let amountOut = amountSpecifiedIsInput ? amountUnfixedDelta : amountFixedDelta;

  if (!amountSpecifiedIsInput && amountOut.gt(amountRemaining)) {
    amountOut = amountRemaining;
  }

  let feeAmount: BN;
  if (amountSpecifiedIsInput && !isMaxSwap) {
    feeAmount = amountRemaining.sub(amountIn);
  } else {
    feeAmount = amountIn.mul(new BN(feeRate)).div(new BN(1000000).sub(new BN(feeRate)));
  }

  return {
    amountIn,
    amountOut,
    nextPrice: nextSqrtPrice,
    feeAmount,
  };
}

function getAmountFixedDelta(
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  currLiquidity: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  if (aToB === amountSpecifiedIsInput) {
    return getAmountDeltaA(currSqrtPrice, targetSqrtPrice, currLiquidity, amountSpecifiedIsInput);
  } else {
    return getAmountDeltaB(currSqrtPrice, targetSqrtPrice, currLiquidity, amountSpecifiedIsInput);
  }
}

function getAmountUnfixedDelta(
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  currLiquidity: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  if (aToB === amountSpecifiedIsInput) {
    return getAmountDeltaB(currSqrtPrice, targetSqrtPrice, currLiquidity, amountSpecifiedIsInput);
  } else {
    return getAmountDeltaA(currSqrtPrice, targetSqrtPrice, currLiquidity, amountSpecifiedIsInput);
  }
}
