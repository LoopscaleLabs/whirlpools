describe("swap arrays test", async () => {
  /**
   * |-------------c2-----|xxxxxxxxxxxxxxxxx|------c1-----------|
   */
  it("3 sequential arrays, 2nd array not initialized, a->b", () => {});

  /**
   * |-------------c1-----|xxxxxxxxxxxxxxxxx|------c2-----------|
   */
  it("3 sequential arrays, 2nd array not initialized, a->b", () => {});

  /**
   * c1|------------------|-----------------|-------------------|
   */
  it("3 sequential arrays does not contain curr_tick_index, a->b", () => {});

  /**
   * |--------------------|-----------------|-------------------|c1
   */
  it("3 sequential arrays does not contain curr_tick_index, b->a", () => {});

  /**
   * TODO: Ideally should be ok. But will fail for now
   * |--------------------|------c1---------|-------------------|
   */
  it("3 sequential arrays, 2nd array contains curr_tick_index, a->b", () => {});

  /**
   * TODO: Ideally should be ok. But will fail for now
   * |--------------------|------c1---------|-------------------|
   */
  it("3 sequential arrays, 2nd array contains curr_tick_index, b->a", () => {});

  /**
   * |---a-c1--(5528)-----|------(0)--------|---c2--(11,160)--a-|
   */
  it("on first array, 2nd array is not sequential, a->b", () => {});

  /**
   * |-a--(11,160)---c2---|--------(0)------|----(5528)---c1--a-|
   */
  it("on first array, 2nd array is not sequential, b->a", () => {});

  /**
   * |-------(5528)------|-------(5528)------|---c2--(5528)-c1---|
   */
  it("3 identical arrays, 1st contains curr_tick_index, a->b", () => {});

  /**
   * |---c1--(5528)-c2---|-------(5528)------|-------(5528)------|
   */
  it("3 identical arrays, 1st contains curr_tick_index, b->a", () => {});
});
