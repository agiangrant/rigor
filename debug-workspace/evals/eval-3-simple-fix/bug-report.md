# Bug Report

**Title**: Pagination shows "Previous" button on page 1

**Steps to reproduce**:
1. Load a paginated list (e.g., 25 items, page size 10)
2. You're on page 1
3. The "Previous" button is enabled (hasPrev is true)
4. Clicking it navigates to page 0 which shows an empty list

**Expected**: hasPrev should be false on page 1.
