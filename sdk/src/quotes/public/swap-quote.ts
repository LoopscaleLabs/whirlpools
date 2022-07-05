import { Address, BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { u64 } from "@solana/spl-token";
import invariant from "tiny-invariant";
import { PoolUtil } from "../../utils/public/pool-utils";
import { SwapInput } from "../../instructions";
import { WhirlpoolData, TickArrayData, MIN_SQRT_PRICE, MAX_SQRT_PRICE } from "../../types/public";
import { AddressUtil, Percentage, ZERO } from "@orca-so/common-sdk";
import { TickArrayUtil } from "../../utils/public";
import { Whirlpool } from "../../whirlpool-client";
import { AccountFetcher } from "../../network/public";
import { swapQuoteWithParamsImpl } from "../swap/swap-quote-impl";
import { WhirlpoolsError } from "../../errors/errors";

/**
 * @category Quotes
 */
export type SwapQuoteParam = {
  whirlpoolData: WhirlpoolData;
  tokenAmount: u64;
  otherAmountThreshold: u64;
  sqrtPriceLimit: u64;
  aToB: boolean;
  amountSpecifiedIsInput: boolean;
  slippageTolerance: Percentage;
  tickArrayAddresses: PublicKey[];
  tickArrays: (TickArrayData | null)[];
};

/**
 * @category Quotes
 */
export type SwapQuote = {
  estimatedAmountIn: u64;
  estimatedAmountOut: u64;
} & SwapInput;

export async function swapQuoteByInputToken(
  whirlpool: Whirlpool,
  swapTokenMint: Address,
  tokenAmount: u64,
  amountSpecifiedIsInput: boolean,
  slippageTolerance: Percentage,
  fetcher: AccountFetcher,
  programId: Address,
  refresh: boolean
): Promise<SwapQuote> {
  const whirlpoolData = whirlpool.getData();
  const swapMintKey = AddressUtil.toPubKey(swapTokenMint);
  const swapTokenType = PoolUtil.getTokenType(whirlpoolData, swapMintKey);
  invariant(!!swapTokenType, "swapTokenMint does not match any tokens on this pool");

  const aToB =
    swapMintKey.equals(whirlpoolData.tokenMintA) === amountSpecifiedIsInput ? true : false;

  const tickArrayAddresses = PoolUtil.getTickArrayPublicKeysForSwap(
    whirlpoolData.tickCurrentIndex,
    whirlpoolData.tickSpacing,
    aToB,
    AddressUtil.toPubKey(programId),
    whirlpool.getAddress()
  );
  const tickArrays = await fetcher.listTickArrays(tickArrayAddresses, refresh);

  // Check if all the tick arrays have been initialized.
  const uninitializedIndices = TickArrayUtil.getUninitializedArrays(tickArrays);
  if (uninitializedIndices.length > 0) {
    const uninitializedArrays = uninitializedIndices
      .map((index) => tickArrayAddresses[index].toBase58())
      .join(", ");
    throw new Error(`TickArray addresses - [${uninitializedArrays}] need to be initialized.`);
  }

  return swapQuoteWithParamsImpl({
    whirlpoolData,
    tokenAmount,
    aToB,
    amountSpecifiedIsInput,
    sqrtPriceLimit: getDefaultSqrtPriceLimit(aToB),
    otherAmountThreshold: ZERO,
    slippageTolerance,
    tickArrayAddresses,
    tickArrays,
  });
}

function getDefaultSqrtPriceLimit(aToB: boolean) {
  return aToB ? new u64(MIN_SQRT_PRICE) : new u64(MAX_SQRT_PRICE);
}
