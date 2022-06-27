import { ZERO } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import { BN } from "@project-serum/anchor";

export function computeSwapStep(
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
