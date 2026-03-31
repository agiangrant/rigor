import { paginate } from "./fix";

// Test data: 25 items, matching the bug report scenario
const items = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`);

// --- Regression test: hasPrev must be false on page 1 ---

function testHasPrevIsFalseOnPage1() {
  const result = paginate(items, 1, 10);
  if (result.hasPrev !== false) {
    throw new Error(
      `FAIL: hasPrev should be false on page 1, got ${result.hasPrev}`
    );
  }
  console.log("PASS: hasPrev is false on page 1");
}

// --- hasPrev must be true on page 2 and beyond ---

function testHasPrevIsTrueOnPage2() {
  const result = paginate(items, 2, 10);
  if (result.hasPrev !== true) {
    throw new Error(
      `FAIL: hasPrev should be true on page 2, got ${result.hasPrev}`
    );
  }
  console.log("PASS: hasPrev is true on page 2");
}

function testHasPrevIsTrueOnLastPage() {
  const result = paginate(items, 3, 10);
  if (result.hasPrev !== true) {
    throw new Error(
      `FAIL: hasPrev should be true on page 3, got ${result.hasPrev}`
    );
  }
  console.log("PASS: hasPrev is true on page 3 (last page)");
}

// --- hasNext correctness (ensure we didn't break it) ---

function testHasNextIsTrueOnPage1() {
  const result = paginate(items, 1, 10);
  if (result.hasNext !== true) {
    throw new Error(
      `FAIL: hasNext should be true on page 1, got ${result.hasNext}`
    );
  }
  console.log("PASS: hasNext is true on page 1");
}

function testHasNextIsFalseOnLastPage() {
  const result = paginate(items, 3, 10);
  if (result.hasNext !== false) {
    throw new Error(
      `FAIL: hasNext should be false on last page, got ${result.hasNext}`
    );
  }
  console.log("PASS: hasNext is false on last page");
}

// --- Items correctness ---

function testPage1ReturnsCorrectItems() {
  const result = paginate(items, 1, 10);
  if (result.items.length !== 10 || result.items[0] !== "item-1") {
    throw new Error(`FAIL: page 1 items incorrect`);
  }
  console.log("PASS: page 1 returns correct items");
}

function testLastPageReturnsRemainingItems() {
  const result = paginate(items, 3, 10);
  if (result.items.length !== 5 || result.items[0] !== "item-21") {
    throw new Error(`FAIL: last page items incorrect`);
  }
  console.log("PASS: last page returns remaining 5 items");
}

// --- Run all tests ---

testHasPrevIsFalseOnPage1();
testHasPrevIsTrueOnPage2();
testHasPrevIsTrueOnLastPage();
testHasNextIsTrueOnPage1();
testHasNextIsFalseOnLastPage();
testPage1ReturnsCorrectItems();
testLastPageReturnsRemainingItems();

console.log("\nAll tests passed.");
