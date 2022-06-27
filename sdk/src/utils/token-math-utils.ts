import { MathUtil, Percentage } from "@orca-so/common-sdk";
import { BN } from "@project-serum/anchor";
import { u64 } from "@solana/spl-token";
import {
  getLowerSqrtPriceFromTokenA,
  getUpperSqrtPriceFromTokenA,
  getUpperSqrtPriceFromTokenB,
  getLowerSqrtPriceFromTokenB,
} from "./swap-utils";

export function getAmountFixedDelta(
  currentSqrtPriceX64: BN,
  targetSqrtPriceX64: BN,
  liquidity: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  if (amountSpecifiedIsInput == aToB) {
    return getTokenAFromLiquidity(
      liquidity,
      currentSqrtPriceX64,
      targetSqrtPriceX64,
      amountSpecifiedIsInput
    );
  } else {
    return getTokenBFromLiquidity(
      liquidity,
      currentSqrtPriceX64,
      targetSqrtPriceX64,
      amountSpecifiedIsInput
    );
  }
}

export function getAmountUnfixedDelta(
  currentSqrtPriceX64: BN,
  targetSqrtPriceX64: BN,
  liquidity: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  if (amountSpecifiedIsInput == aToB) {
    return getTokenBFromLiquidity(
      liquidity,
      currentSqrtPriceX64,
      targetSqrtPriceX64,
      !amountSpecifiedIsInput
    );
  } else {
    return getTokenAFromLiquidity(
      liquidity,
      currentSqrtPriceX64,
      targetSqrtPriceX64,
      !amountSpecifiedIsInput
    );
  }
}

export function getTokenAFromLiquidity(
  liquidity: BN,
  sqrtPrice0X64: BN,
  sqrtPrice1X64: BN,
  roundUp: boolean
) {
  const [sqrtPriceLowerX64, sqrtPriceUpperX64] = orderSqrtPrice(sqrtPrice0X64, sqrtPrice1X64);

  const numerator = liquidity.mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64)).shln(64);
  const denominator = sqrtPriceUpperX64.mul(sqrtPriceLowerX64);
  if (roundUp) {
    return MathUtil.divRoundUp(numerator, denominator);
  } else {
    return numerator.div(denominator);
  }
}

export function getTokenBFromLiquidity(
  liquidity: BN,
  sqrtPrice0X64: BN,
  sqrtPrice1X64: BN,
  roundUp: boolean
) {
  const [sqrtPriceLowerX64, sqrtPriceUpperX64] = orderSqrtPrice(sqrtPrice0X64, sqrtPrice1X64);

  const result = liquidity.mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64));
  if (roundUp) {
    return MathUtil.shiftRightRoundUp(result);
  } else {
    return result.shrn(64);
  }
}

export function getNextSqrtPrice(
  sqrtPriceX64: BN,
  liquidity: BN,
  amount: BN,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  if (amountSpecifiedIsInput && aToB) {
    return getLowerSqrtPriceFromTokenA(amount, liquidity, sqrtPriceX64);
  } else if (!amountSpecifiedIsInput && !aToB) {
    return getUpperSqrtPriceFromTokenA(amount, liquidity, sqrtPriceX64);
  } else if (amountSpecifiedIsInput && !aToB) {
    return getUpperSqrtPriceFromTokenB(amount, liquidity, sqrtPriceX64);
  } else {
    return getLowerSqrtPriceFromTokenB(amount, liquidity, sqrtPriceX64);
  }
}

export function calculateAmountAfterFees(amount: u64, feeRate: Percentage): BN {
  return amount.mul(feeRate.denominator.sub(feeRate.numerator)).div(feeRate.denominator);
}

export function calculateFeesFromAmount(amount: u64, feeRate: Percentage): BN {
  return MathUtil.divRoundUp(
    amount.mul(feeRate.numerator),
    feeRate.denominator.sub(feeRate.numerator)
  );
}

export function resolveTokenAmounts(
  specifiedTokenAmount: BN,
  otherTokenAmount: BN,
  amountSpecifiedIsInput: boolean
): [BN, BN] {
  if (amountSpecifiedIsInput) {
    return [specifiedTokenAmount, otherTokenAmount];
  } else {
    return [otherTokenAmount, specifiedTokenAmount];
  }
}

/** Private */

function orderSqrtPrice(sqrtPrice0X64: BN, sqrtPrice1X64: BN): [BN, BN] {
  if (sqrtPrice0X64.lt(sqrtPrice1X64)) {
    return [sqrtPrice0X64, sqrtPrice1X64];
  } else {
    return [sqrtPrice1X64, sqrtPrice0X64];
  }
}
