import { paginate } from "./fix";

// Helper: generate an array of numbers 1..n
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("paginate", () => {
  const items = range(25); // 25 items, 3 pages at pageSize 10

  it("hasPrev is false on page 1", () => {
    const result = paginate(items, 1, 10);
    expect(result.hasPrev).toBe(false);
  });

  it("hasPrev is true on page 2", () => {
    const result = paginate(items, 2, 10);
    expect(result.hasPrev).toBe(true);
  });

  it("hasPrev is true on the last page", () => {
    const result = paginate(items, 3, 10);
    expect(result.hasPrev).toBe(true);
  });

  it("hasNext is true on page 1", () => {
    const result = paginate(items, 1, 10);
    expect(result.hasNext).toBe(true);
  });

  it("hasNext is false on the last page", () => {
    const result = paginate(items, 3, 10);
    expect(result.hasNext).toBe(false);
  });

  it("returns correct items for page 1", () => {
    const result = paginate(items, 1, 10);
    expect(result.items).toEqual(range(10));
    expect(result.totalPages).toBe(3);
    expect(result.totalItems).toBe(25);
  });

  it("returns correct items for the last (partial) page", () => {
    const result = paginate(items, 3, 10);
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
  });

  it("handles single-page dataset", () => {
    const result = paginate(range(5), 1, 10);
    expect(result.hasPrev).toBe(false);
    expect(result.hasNext).toBe(false);
    expect(result.totalPages).toBe(1);
  });
});
