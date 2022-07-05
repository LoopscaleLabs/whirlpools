import { TICK_ARRAY_SIZE } from "../../../../src";
import * as assert from "assert";
import { TickArraySequence } from "../../../../src/quotes/swap/tick-array-sequence";
import { buildTickArrayData } from "../../../utils/testDataTypes";
import { TickArrayIndex } from "../../../../src/quotes/swap/helper-types";

describe("TickArray Sequence tests", () => {
  describe.only("findNextInitializedTickIndex tests", () => {
    const ts64 = 64;
    const ts128 = 128;

    it("a->b, on initializable index, ts = 64", async () => {
      const ta0 = buildTickArrayData(0, [0, 32, 63]);
      const ta1 = buildTickArrayData(-ts64 * TICK_ARRAY_SIZE, [0, 50]);
      const ta2 = buildTickArrayData(-ts64 * TICK_ARRAY_SIZE * 2, [25, 50]);
      const seq = new TickArraySequence([ta2, ta1, ta0], ts64, true);
      let i = 0;
      let searchIndex = new TickArrayIndex(0, 32, ts64).toTickIndex();
      const expectedIndicies = [
        new TickArrayIndex(0, 32, ts64).toTickIndex(),
        new TickArrayIndex(0, 0, ts64).toTickIndex(),
        new TickArrayIndex(-1, 50, ts64).toTickIndex(),
        new TickArrayIndex(-1, 0, ts64).toTickIndex(),
        new TickArrayIndex(-2, 50, ts64).toTickIndex(),
        new TickArrayIndex(-2, 25, ts64).toTickIndex(),
        ta2.startTickIndex, // Last index in array 3
      ];

      expectedIndicies.forEach((expectedIndex, expectedResultIndex) => {
        const { nextIndex, nextTickData } = seq.findNextInitializedTickIndex(searchIndex)!;
        if (expectedResultIndex === expectedIndicies.length - 1) {
          assert.equal(nextIndex, expectedIndex);
          assert.ok(nextTickData === null);
        } else {
          assert.equal(nextIndex, expectedIndex);
          assert.ok(nextTickData!.initialized);
        }
        searchIndex = nextIndex - 1;
      });
    });

    it("a->b, on initializable index, ts = 64", async () => {
      const ta0 = buildTickArrayData(0, [0, 32, 63]);
      const ta1 = buildTickArrayData(-ts64 * TICK_ARRAY_SIZE, [0, 50]);
      const ta2 = buildTickArrayData(-ts64 * TICK_ARRAY_SIZE * 2, [25, 50]);
      const seq = new TickArraySequence([ta2, ta1, ta0], ts64, true);
      let i = 0;
      let searchIndex = new TickArrayIndex(0, 32, ts64).toTickIndex();
      const expectedIndicies = [
        new TickArrayIndex(0, 32, ts64).toTickIndex(),
        new TickArrayIndex(0, 0, ts64).toTickIndex(),
        new TickArrayIndex(-1, 50, ts64).toTickIndex(),
        new TickArrayIndex(-1, 0, ts64).toTickIndex(),
        new TickArrayIndex(-2, 50, ts64).toTickIndex(),
        new TickArrayIndex(-2, 25, ts64).toTickIndex(),
        ta2.startTickIndex, // Last index in array 3
      ];

      expectedIndicies.forEach((expectedIndex, expectedResultIndex) => {
        const { nextIndex, nextTickData } = seq.findNextInitializedTickIndex(searchIndex)!;
        if (expectedResultIndex === expectedIndicies.length - 1) {
          assert.equal(nextIndex, expectedIndex);
          assert.ok(nextTickData === null);
        } else {
          assert.equal(nextIndex, expectedIndex);
          assert.ok(nextTickData!.initialized);
        }
        searchIndex = nextIndex - 1;
      });
    });

    it("b->a, not on initializable index, ts = 128", async () => {
      const ta0 = buildTickArrayData(0, [0, 32, 63]);
      const ta1 = buildTickArrayData(ts128 * TICK_ARRAY_SIZE, [0, 50]);
      const ta2 = buildTickArrayData(ts128 * TICK_ARRAY_SIZE * 2, [25, 50]);
      const seq = new TickArraySequence([ta0, ta1, ta2], ts128, false);
      let i = 0;
      let searchIndex = new TickArrayIndex(0, 25, ts128).toTickIndex() + 64;
      const expectedIndicies = [
        new TickArrayIndex(0, 32, ts128).toTickIndex(),
        new TickArrayIndex(0, 63, ts128).toTickIndex(),
        new TickArrayIndex(1, 0, ts128).toTickIndex(),
        new TickArrayIndex(1, 50, ts128).toTickIndex(),
        new TickArrayIndex(2, 25, ts128).toTickIndex(),
        new TickArrayIndex(2, 50, ts128).toTickIndex(),
        ta2.startTickIndex + TICK_ARRAY_SIZE * ts128 - 1, // Last index in array 3
      ];

      expectedIndicies.forEach((expectedIndex, expectedResultIndex) => {
        const { nextIndex, nextTickData } = seq.findNextInitializedTickIndex(searchIndex)!;
        if (expectedResultIndex === expectedIndicies.length - 1) {
          assert.equal(nextIndex, expectedIndex);
          assert.ok(nextTickData === null);
        } else {
          assert.equal(nextIndex, expectedIndex);
          assert.ok(nextTickData!.initialized);
        }
        searchIndex = nextIndex;
      });
    });

    it("b->a, on initializable index, ts = 64", async () => {
      const ta0 = buildTickArrayData(0, [0, 32, 63]);
      const ta1 = buildTickArrayData(ts64 * TICK_ARRAY_SIZE, [0, 50]);
      const ta2 = buildTickArrayData(ts64 * TICK_ARRAY_SIZE * 2, [25, 50]);
      const seq = new TickArraySequence([ta0, ta1, ta2], ts64, false);
      let i = 0;
      let searchIndex = new TickArrayIndex(0, 25, ts64).toTickIndex();
      const expectedIndicies = [
        new TickArrayIndex(0, 32, ts64).toTickIndex(),
        new TickArrayIndex(0, 63, ts64).toTickIndex(),
        new TickArrayIndex(1, 0, ts64).toTickIndex(),
        new TickArrayIndex(1, 50, ts64).toTickIndex(),
        new TickArrayIndex(2, 25, ts64).toTickIndex(),
        new TickArrayIndex(2, 50, ts64).toTickIndex(),
        ta2.startTickIndex + TICK_ARRAY_SIZE * ts64 - 1, // Last index in array 3
      ];

      expectedIndicies.forEach((expectedIndex, expectedResultIndex) => {
        const { nextIndex, nextTickData } = seq.findNextInitializedTickIndex(searchIndex)!;
        if (expectedResultIndex === expectedIndicies.length - 1) {
          assert.equal(nextIndex, expectedIndex);
          assert.ok(nextTickData === null);
        } else {
          assert.equal(nextIndex, expectedIndex);
          assert.ok(nextTickData!.initialized);
        }
        searchIndex = nextIndex;
      });
    });
  });
});
