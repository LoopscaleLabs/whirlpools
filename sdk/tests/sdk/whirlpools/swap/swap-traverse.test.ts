describe("swap traversal test", async () => {
  it("curr_index on the last initializable tick, a->b", () => {});
  it("curr_index on the first initializable tick, b->a", () => {});
  it("curr_index on the 2nd last initialized tick, with the next tick initialized, b->a", () => {});
  it("curr_index on the 2nd initialized tick, with the first tick initialized, a->b", () => {});
  it("on some tick, traverse to the 1st initialized tick in the next tick-array, a->b", () => {});
  it("on some tick, traverse to the 1st initialized tick in the next tick-array, b->a", () => {});
  it("on some tick, traverse to the next tick in the n+2 tick-array, a->b", () => {});
  it("on some tick, traverse to the next tick in the n+2 tick-array, b->a", () => {});
  it("3 arrays, on some initialized tick, no other initialized tick in the sequence, a->b", () => {});
  it("3 arrays, on some initialized tick, no other initialized tick in the sequence, b->a", () => {});
  it("3 arrays, trade amount exceeds liquidity available in array sequence", () => {});
  it("on the last tick-array, traverse to the MAX_TICK_INDEX tick", () => {});
  it("on the first tick-array, traverse to the MIN_TICK_INDEX tick", () => {});
});
