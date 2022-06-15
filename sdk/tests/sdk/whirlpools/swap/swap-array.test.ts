describe("swap arrays test", async () => {
  it("3 sequential arrays, 2nd array not initialized, a->b", () => {});
  it("3 sequential arrays does not contain curr_tick_index, a->b", () => {});
  it("3 sequential arrays does not contain curr_tick_index, b->a", () => {});
  it("3 sequential arrays, 2nd array contains curr_tick_index, a->b", () => {}); // Ideally should be ok. But will fail for now
  it("3 sequential arrays, 2nd array contains curr_tick_index, b->a", () => {}); // Ideally should be ok. But will fail for now
  it("on first array, 2nd array is not sequential, a->b", () => {});
  it("on first array, 2nd array is not sequential, b->a", () => {});
  it("3 identical arrays, 1st contains curr_tick_index, a->b", () => {});
  it("3 identical arrays, 1st contains curr_tick_index, b->a", () => {});
});
