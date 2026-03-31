# Bug Report

**Title**: TypeError: Cannot read properties of null (reading 'tier') in getOrderSummary

**Steps to reproduce**:
1. Call `getOrderSummary("order-abc123")`
2. The order exists in the database
3. Crash: `TypeError: Cannot read properties of null (reading 'tier')`

**Stack trace**:
```
TypeError: Cannot read properties of null (reading 'tier')
    at calculateDiscount (orderService.ts:63)
    at getOrderSummary (orderService.ts:25)
```

**Notes**: This is happening intermittently in production. Not every order triggers it. Customer support has reported 12 tickets this week about failed order lookups.
