import { paginate } from "./fix";

const items = Array.from({ length: 25 }, (_, i) => i + 1); // [1..25]

// --- hasPrev on page 1 (the reported bug) ---
const page1 = paginate(items, 1, 10);
console.assert(page1.hasPrev === false, "page 1: hasPrev should be false");

// --- hasPrev on page 2 ---
const page2 = paginate(items, 2, 10);
console.assert(page2.hasPrev === true, "page 2: hasPrev should be true");

// --- hasNext on last page ---
const page3 = paginate(items, 3, 10);
console.assert(page3.hasNext === false, "last page: hasNext should be false");
console.assert(page3.hasPrev === true, "last page: hasPrev should be true");

// --- hasNext on first page ---
console.assert(page1.hasNext === true, "page 1: hasNext should be true");

// --- items sliced correctly ---
console.assert(
  JSON.stringify(page1.items) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  "page 1: should contain items 1-10"
);
console.assert(
  JSON.stringify(page3.items) === JSON.stringify([21, 22, 23, 24, 25]),
  "page 3: should contain items 21-25"
);

// --- totalPages ---
console.assert(page1.totalPages === 3, "totalPages should be 3 for 25 items with pageSize 10");

console.log("All tests passed.");
