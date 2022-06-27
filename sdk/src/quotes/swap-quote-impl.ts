import { ZERO } from "@orca-so/common-sdk";
import { SwapQuoteParam, SwapQuote } from "./public";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { u64 } from "@solana/spl-token";
import { TickArraySequence } from "../utils/tick-array-sequence";
import { simulateSwap } from "./swap-manager";

/**
 * Figure out the quote parameters needed to successfully complete this trade on chain
 * @param param
 * @returns
 * @exceptions
 */
export function swapQuoteWithParamsImpl(params: SwapQuoteParam): Result<SwapQuote, Error> {
  const {
    aToB,
    whirlpoolData,
    tickArrays,
    tokenAmount,
    sqrtPriceLimit,
    otherAmountThreshold,
    amountSpecifiedIsInput,
  } = params;

  /**
   * Pre Checks
   * sqrt-limit (direction & bound)
   * trade amount (zero)
   * tick-array all initialized?
   */

  const tickSequence = new TickArraySequence(tickArrays, whirlpoolData.tickSpacing, aToB);

  const swapResults = simulateSwap(
    whirlpoolData,
    tickSequence,
    tokenAmount,
    sqrtPriceLimit,
    amountSpecifiedIsInput,
    aToB
  );

  // TODO: other threshold check

  const { estimatedAmountIn, estimatedAmountOut } = remapTokens(
    swapResults.amountA,
    swapResults.amountB,
    aToB
  );

  // TODO: determine tick-array used?

  return {
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
  };
}

function remapTokens(amountA: BN, amountB: BN, aToB: boolean) {
  const estimatedAmountIn = aToB ? amountA : amountB;
  const estimatedAmountOut = aToB ? amountB : amountA;
  return {
    estimatedAmountIn,
    estimatedAmountOut,
  };
}
