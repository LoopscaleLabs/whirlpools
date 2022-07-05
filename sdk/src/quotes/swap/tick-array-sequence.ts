import { SwapErrorCode, WhirlpoolsError } from "../../errors/errors";
import { TickArrayData, TickData, TICK_ARRAY_SIZE } from "../../types/public";
import { TickArrayIndex } from "./helper-types";

/**
 * Expectation:
 * currArrayIndex = 0
 * aToB -> [0, -1, -2]
 * bToA -> [0, 1, 2]
 */
// TODO: implement this class
export class TickArraySequence {
  private touchedArrays: number[];
  private startArrayIndex: number;

  constructor(
    readonly tickArrays: (TickArrayData | null)[],
    readonly tickSpacing: number,
    readonly aToB: boolean
  ) {
    if (!tickArrays[0]) {
      throw new Error("TickArray index 0 must be initialized");
    }

    this.touchedArrays = [...Array<number>(tickArrays.length).fill(0)];
    this.startArrayIndex = TickArrayIndex.fromTickIndex(
      tickArrays[0].startTickIndex,
      this.tickSpacing
    ).arrayIndex;
  }

  getNumOfTouchedArrays() {
    return this.touchedArrays.filter((val) => val > 0).length;
  }

  getTick(index: number): TickData {
    const targetTaIndex = TickArrayIndex.fromTickIndex(index, this.tickSpacing);

    if (!this.isArrayIndexInBounds(targetTaIndex)) {
      throw new Error("shits out of bounds yo");
    }

    const localArrayIndex = targetTaIndex.arrayIndex - this.startArrayIndex;
    const tickArray = this.tickArrays[localArrayIndex];

    this.touchedArrays[localArrayIndex] = 1;

    if (!tickArray) {
      throw new WhirlpoolsError(
        `TickArray at index ${localArrayIndex} is not initialized.`,
        SwapErrorCode.TickArrayIndexNotInitialized
      );
    }

    if (this.checkIfIndexIsInTickArrayRange(tickArray.startTickIndex, index)) {
      throw new WhirlpoolsError(
        `TickArray at index ${localArrayIndex} is not a sequential tick array`,
        SwapErrorCode.InvalidTickArraySequence
      );
    }

    return tickArray.ticks[targetTaIndex.offsetIndex];
  }
  /**
   * if a->b, currIndex is included in the search
   * if b->a, currIndex is always ignored
   * @param currIndex
   * @returns
   */
  findNextInitializedTickIndex(currIndex: number) {
    const searchIndex = this.aToB ? currIndex : currIndex + this.tickSpacing;
    let currTaIndex = TickArrayIndex.fromTickIndex(searchIndex, this.tickSpacing);

    while (this.isArrayIndexInBounds(currTaIndex)) {
      const currTickData = this.getTick(currTaIndex.toTickIndex());
      if (currTickData.initialized) {
        return { nextIndex: currTaIndex.toTickIndex(), nextTickData: currTickData };
      }
      currTaIndex = this.aToB
        ? currTaIndex.toPrevInitializableTickIndex()
        : currTaIndex.toNextInitializableTickIndex();
    }

    const lastIndexInArray = this.aToB
      ? currTaIndex.toTickIndex() + this.tickSpacing
      : currTaIndex.toTickIndex() - 1;
    return { nextIndex: lastIndexInArray, nextTickData: null };
  }

  /**
   * Check whether the array index potentially exists in this sequence.
   * Note: assumes the sequence of tick-arrays are sequential
   * @param index
   */
  isArrayIndexInBounds(index: TickArrayIndex) {
    // a+0...a+n-1 array index is ok
    const localArrayIndex = index.arrayIndex - this.startArrayIndex;
    const seqLength = this.tickArrays.length;
    return localArrayIndex >= 0 && localArrayIndex < seqLength;
  }

  private checkIfIndexIsInTickArrayRange(startTick: number, tickIndex: number) {
    const upperBound = startTick + this.tickSpacing * TICK_ARRAY_SIZE;
    return tickIndex < startTick || tickIndex > upperBound;
  }
}
