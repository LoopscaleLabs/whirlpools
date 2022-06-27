import { ZERO } from "@orca-so/common-sdk";
import { SwapQuoteParam, SwapQuote, SwapErrorCode } from "../public";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { u64 } from "@solana/spl-token";
import { TickArraySequence } from "./tick-array-sequence";
import { simulateSwap } from "./swap-manager";
import { Err, Ok, Result } from "ts-results";
import { MAX_SQRT_PRICE, MAX_TICK_ARRAY_CROSSINGS, MIN_SQRT_PRICE } from "../../types/public";

/**
 * Figure out the quote parameters needed to successfully complete this trade on chain
 * @param param
 * @returns
 * @exceptions
 */
export function swapQuoteWithParamsImpl(params: SwapQuoteParam): Result<SwapQuote, SwapErrorCode> {
  const {
    aToB,
    whirlpoolData,
    tickArrays,
    tokenAmount,
    sqrtPriceLimit,
    otherAmountThreshold,
    amountSpecifiedIsInput,
  } = params;

  if (sqrtPriceLimit.gt(new u64(MAX_SQRT_PRICE) || sqrtPriceLimit.lt(new u64(MIN_SQRT_PRICE)))) {
    return new Err(SwapErrorCode.SqrtPriceOutOfBounds);
  }

  if (
    (aToB && sqrtPriceLimit.gt(whirlpoolData.sqrtPrice)) ||
    (!aToB && sqrtPriceLimit.lt(whirlpoolData.sqrtPrice))
  ) {
    return new Err(SwapErrorCode.InvalidSqrtPriceLimitDirection);
  }

  if (tokenAmount.eq(ZERO)) {
    return new Err(SwapErrorCode.ZeroTradableAmount);
  }

  const tickSequence = new TickArraySequence(tickArrays, whirlpoolData.tickSpacing, aToB);

  const swapResults = simulateSwap(
    whirlpoolData,
    tickSequence,
    tokenAmount,
    sqrtPriceLimit,
    amountSpecifiedIsInput,
    aToB
  );

  if (amountSpecifiedIsInput) {
    if (
      (aToB && otherAmountThreshold.gt(swapResults.amountB)) ||
      (!aToB && otherAmountThreshold.gt(swapResults.amountA))
    ) {
      return new Err(SwapErrorCode.AmountOutBelowMinimum);
    }
  } else {
    if (
      (aToB && otherAmountThreshold.lt(swapResults.amountA)) ||
      (!aToB && otherAmountThreshold.lt(swapResults.amountA))
    ) {
      return new Err(SwapErrorCode.AmountInAboveMaximum);
    }
  }

  const { estimatedAmountIn, estimatedAmountOut } = remapTokens(
    swapResults.amountA,
    swapResults.amountB,
    aToB
  );

  // TODO: determine tick-array used?
  if (tickSequence.getNumOfTouchedArrays() > MAX_TICK_ARRAY_CROSSINGS) {
    return new Err(SwapErrorCode.TickArrayCrossingAboveMax);
  }

  return new Ok({
    estimatedAmountIn,
    estimatedAmountOut,
    amount: tokenAmount,
    amountSpecifiedIsInput,
    aToB,
    otherAmountThreshold,
    sqrtPriceLimit,
    tickArray0: PublicKey.default,
    tickArray1: PublicKey.default,
    tickArray2: PublicKey.default,
  });
}

function remapTokens(amountA: BN, amountB: BN, aToB: boolean) {
  const estimatedAmountIn = aToB ? amountA : amountB;
  const estimatedAmountOut = aToB ? amountB : amountA;
  return {
    estimatedAmountIn,
    estimatedAmountOut,
  };
}
