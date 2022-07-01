import { MathUtil, U64_MAX, ZERO } from "@orca-so/common-sdk";
import { BN } from "@project-serum/anchor";
import { u64 } from "@solana/spl-token";
import { MathErrorCode, TokenErrorCode, WhirlpoolsError } from "../../errors/errors";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "../../types/public";
import { BitMath } from "./bit-math";

export function getAmountDeltaA(
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  currLiquidity: BN,
  roundUp: boolean
): BN {
  let [sqrtPriceLower, sqrtPriceUpper] = toIncreasingPriceOrder(currSqrtPrice, targetSqrtPrice);
  let sqrtPriceDiff = sqrtPriceUpper.sub(sqrtPriceLower);

  let numerator = MathUtil.toX64_BN(currLiquidity.mul(sqrtPriceDiff));
  let denominator = sqrtPriceLower.mul(sqrtPriceUpper);

  let quotient = numerator.div(denominator);
  let remainder = numerator.mod(denominator);

  let result = roundUp && !remainder.eq(ZERO) ? quotient.add(new BN(1)) : quotient;

  if (result.gt(U64_MAX)) {
    throw new WhirlpoolsError("Results larger than U64", TokenErrorCode.TokenMaxExceeded);
  }

  return result;
}

export function getAmountDeltaB(
  currSqrtPrice: BN,
  targetSqrtPrice: BN,
  currLiquidity: BN,
  roundUp: boolean
): BN {
  let [sqrtPriceLower, sqrtPriceUpper] = toIncreasingPriceOrder(currSqrtPrice, targetSqrtPrice);
  let sqrtPriceDiff = sqrtPriceUpper.sub(sqrtPriceLower);
  return BitMath.checked_mul_shift_right_round_up_if(currLiquidity, sqrtPriceDiff, roundUp, 128);
}

export function getNextSqrtPrice(
  sqrtPrice: BN,
  currLiquidity: BN,
  amount: u64,
  amountSpecifiedIsInput: boolean,
  aToB: boolean
) {
  if (amountSpecifiedIsInput === aToB) {
    return getNextSqrtPriceFromARoundUp(sqrtPrice, currLiquidity, amount, amountSpecifiedIsInput);
  } else {
    return getNextSqrtPriceFromBRoundDown(sqrtPrice, currLiquidity, amount, amountSpecifiedIsInput);
  }
}

function toIncreasingPriceOrder(sqrtPrice0: BN, sqrtPrice1: BN) {
  if (sqrtPrice0.gt(sqrtPrice1)) {
    return [sqrtPrice1, sqrtPrice0];
  } else {
    return [sqrtPrice0, sqrtPrice1];
  }
}

function getNextSqrtPriceFromARoundUp(
  sqrtPrice: BN,
  currLiquidity: BN,
  amount: u64,
  amountSpecifiedIsInput: boolean
) {
  if (amount.eq(ZERO)) {
    return sqrtPrice;
  }

  let p = sqrtPrice.mul(amount);
  let numerator = MathUtil.toX64_BN(currLiquidity.mul(sqrtPrice));
  if (BitMath.isOverLimit(numerator, 256)) {
    throw new WhirlpoolsError(
      "getNextSqrtPriceFromARoundUp - numerator overflow u256",
      MathErrorCode.MultiplicationOverflow
    );
  }

  let currLiquidityShiftLeft = MathUtil.toX64_BN(currLiquidity);
  if (!amountSpecifiedIsInput && currLiquidityShiftLeft.lte(p)) {
    throw new WhirlpoolsError(
      "getNextSqrtPriceFromARoundUp - Unable to divide currLiquidityX64 by product",
      MathErrorCode.DivideByZero
    );
  }

  let denominator = amountSpecifiedIsInput
    ? currLiquidityShiftLeft.add(p)
    : currLiquidityShiftLeft.sub(p);

  let price = BitMath.divRoundUp(numerator, denominator);

  if (price.lt(new BN(MIN_SQRT_PRICE))) {
    throw new WhirlpoolsError(
      "getNextSqrtPriceFromARoundUp - price less than min sqrt price",
      TokenErrorCode.TokenMinSubceeded
    );
  } else if (price.gt(new BN(MAX_SQRT_PRICE))) {
    throw new WhirlpoolsError(
      "getNextSqrtPriceFromARoundUp - price less than max sqrt price",
      TokenErrorCode.TokenMaxExceeded
    );
  }

  return price;
}

function getNextSqrtPriceFromBRoundDown(
  sqrtPrice: BN,
  currLiquidity: BN,
  amount: u64,
  amountSpecifiedIsInput: boolean
) {
  let amountX64 = MathUtil.toX64_BN(amount);
  let delta = BitMath.divRoundUpIf(amountX64, currLiquidity, !amountSpecifiedIsInput);

  // TODO: overflow check
  if (amountSpecifiedIsInput) {
    sqrtPrice.add(delta);
  } else {
    sqrtPrice.sub(delta);
  }

  return sqrtPrice;
}
