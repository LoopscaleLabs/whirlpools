import { ZERO } from "@orca-so/common-sdk";
import { TickArrayData, TickData } from "../types/public";

/**
 * Expectation:
 * currArrayIndex = 0
 * aToB -> [0, -1, -2]
 * bToA -> [0, 1, 2]
 */
export class TickArraySequence {
  constructor(
    readonly tickArrays: (TickArrayData | null)[],
    readonly tickSpacing: number,
    readonly aToB: boolean
  ) {}

  getTick(index: number): TickData {
    return {
      feeGrowthOutsideA: ZERO,
      feeGrowthOutsideB: ZERO,
      initialized: true,
      liquidityGross: ZERO,
      liquidityNet: ZERO,
      rewardGrowthsOutside: [ZERO],
    };
  }

  findNextInitializedTickIndex(currIndex: number, aToB: boolean) {
    /**
     * While
     *  - get next based on aToB, arrayIndex
     *  - handle max
     */
    return 0;
  }
}
