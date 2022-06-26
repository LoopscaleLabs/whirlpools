import { ZERO } from "@orca-so/common-sdk";
import { SwapQuoteParam, SwapQuote } from "./public";
import { PublicKey } from "@solana/web3.js";

export function swapQuoteWithParamsImpl(param: SwapQuoteParam): SwapQuote {
  return {
    estimatedAmountIn: ZERO,
    estimatedAmountOut: ZERO,
    amount: ZERO,
    amountSpecifiedIsInput: true,
    aToB: true,
    otherAmountThreshold: ZERO,
    sqrtPriceLimit: ZERO,
    tickArray0: PublicKey.default,
    tickArray1: PublicKey.default,
    tickArray2: PublicKey.default,
  };
}
