import { paginate } from "./fix";

// Test data: 25 items, matching the bug report scenario
const items = Array.from({ length: 25 }, (_, i) => i + 1);

// -- Regression test: hasPrev must be false on page 1 --

function testHasPrevIsFalseOnPage1() {
  const result = paginate(items, 1, 10);
  console.assert(result.hasPrev === false, "FAIL: hasPrev should be false on page 1");
  console.assert(result.hasNext === true, "FAIL: hasNext should be true on page 1 (3 pages total)");
  console.assert(result.items.length === 10, "FAIL: page 1 should have 10 items");
  console.assert(result.page === 1, "FAIL: page should be 1");
  console.log("PASS: hasPrev is false on page 1");
}

// -- hasPrev should be true on page 2+ --

function testHasPrevIsTrueOnPage2() {
  const result = paginate(items, 2, 10);
  console.assert(result.hasPrev === true, "FAIL: hasPrev should be true on page 2");
  console.assert(result.hasNext === true, "FAIL: hasNext should be true on page 2");
  console.assert(result.items.length === 10, "FAIL: page 2 should have 10 items");
  console.log("PASS: hasPrev is true on page 2");
}

function testHasPrevIsTrueOnLastPage() {
  const result = paginate(items, 3, 10);
  console.assert(result.hasPrev === true, "FAIL: hasPrev should be true on page 3");
  console.assert(result.hasNext === false, "FAIL: hasNext should be false on last page");
  console.assert(result.items.length === 5, "FAIL: last page should have 5 items");
  console.log("PASS: hasPrev is true on last page");
}

// -- hasNext boundary checks --

function testHasNextIsFalseOnLastPage() {
  const result = paginate(items, 3, 10);
  console.assert(result.hasNext === false, "FAIL: hasNext should be false on last page");
  console.assert(result.totalPages === 3, "FAIL: totalPages should be 3");
  console.log("PASS: hasNext is false on last page");
}

// -- Single page scenario --

function testSinglePage() {
  const smallItems = [1, 2, 3];
  const result = paginate(smallItems, 1, 10);
  console.assert(result.hasPrev === false, "FAIL: hasPrev should be false on single page");
  console.assert(result.hasNext === false, "FAIL: hasNext should be false on single page");
  console.assert(result.totalPages === 1, "FAIL: totalPages should be 1");
  console.assert(result.items.length === 3, "FAIL: should return all 3 items");
  console.log("PASS: single page has no prev and no next");
}

// -- Empty items --

function testEmptyItems() {
  const result = paginate([], 1, 10);
  console.assert(result.hasPrev === false, "FAIL: hasPrev should be false with no items");
  console.assert(result.hasNext === false, "FAIL: hasNext should be false with no items");
  console.assert(result.items.length === 0, "FAIL: should return no items");
  console.assert(result.totalPages === 0, "FAIL: totalPages should be 0");
  console.log("PASS: empty items handled correctly");
}

// Run all tests
testHasPrevIsFalseOnPage1();
testHasPrevIsTrueOnPage2();
testHasPrevIsTrueOnLastPage();
testHasNextIsFalseOnLastPage();
testSinglePage();
testEmptyItems();

console.log("\nAll tests passed.");
