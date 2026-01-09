# Settlement Workflow Testing Design

## Overview

End-to-end and integration testing for the auction settlement flow using a hybrid approach: mocked wallet/blockchain for fast E2E browser tests, real Solana devnet for integration tests.

## Settlement Flow Under Test

1. Auction ends → status transitions to `settling`
2. Winner receives payment prompt
3. Winner pays → transaction verified → auction `completed`
4. OR: Winner doesn't pay → cascade to 2nd bidder → repeat
5. All bidders fail → auction `failed`, collateral released

## Test Architecture

| Layer | Tool | Blockchain | Purpose |
|-------|------|------------|---------|
| E2E | Playwright | Mocked | Fast browser tests simulating user clicks through settlement UI |
| Integration | Vitest | Devnet | Verify actual transaction verification, cascade logic, database state transitions |

## Directory Structure

```
tests/
  e2e/
    settlement.spec.ts
  integration/
    settlement.test.ts
  mocks/
    wallet.ts
    transactions.ts
  fixtures/
    settlement-scenarios.ts
    devnet-wallets.json.example
```

## E2E Tests (Playwright)

### 1. Winner Payment Success Flow
- Load auction page in `settling` state
- Mock wallet connected as winner
- Click "Pay Now" button
- Mock successful transaction signature
- Verify UI updates to `completed` state
- Verify success confirmation displayed

### 2. Winner Payment Timeout → Cascade Flow
- Load auction in `settling` state with expired payment window
- Verify UI shows "Payment window expired"
- Verify cascade notification to 2nd place bidder
- Mock 2nd bidder payment
- Verify auction completes with new winner

### 3. All Bidders Fail → Auction Failed
- Simulate all top-3 bidders timing out
- Verify auction shows `failed` state
- Verify collateral release messaging

### Mocking Strategy
- Inject mock wallet adapter via Playwright's `addInitScript`
- Intercept Supabase API calls to seed test auction states
- Mock `@solana/web3.js` transaction confirmation responses

## Integration Tests (Vitest + Devnet)

### 1. Transaction Verification
- Create real devnet transaction with test wallet
- Call `verifyPaymentTransaction()` with actual signature
- Assert correct extraction of: payer, recipient, amount, timestamp

### 2. Settlement State Machine
- Seed auction in Supabase with `settling` status
- Call settlement API with valid devnet transaction signature
- Assert database updates: auction status → `completed`, payment record created

### 3. Cascade Settlement Logic
- Seed auction with 3 bidders, winner's payment window expired
- Trigger cascade handler
- Assert: winner gets strike, 2nd bidder becomes new settlement target
- Repeat cascade through all bidders
- Assert final `failed` state when all exhaust

### 4. Collateral Release
- After auction completes or fails
- Assert losing bidders' collateral unlocked in database
- Verify collateral amounts match original bid locks

### Test Wallet Setup
- Pre-fund 2-3 devnet wallets with SOL
- Store keypairs in `tests/fixtures/devnet-wallets.json` (gitignored)
- CI uses environment variables for wallet secrets

## Dependencies

```json
"devDependencies": {
  "@playwright/test": "^1.40.0"
}
```

## Package Scripts

```json
"test:e2e": "playwright test",
"test:integration": "vitest run tests/integration"
```

## Files to Create

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright config pointing to localhost:3000 |
| `tests/e2e/settlement.spec.ts` | Browser tests for settlement UI flows |
| `tests/integration/settlement.test.ts` | Devnet integration tests |
| `tests/mocks/wallet.ts` | Mock wallet adapter for E2E |
| `tests/mocks/transactions.ts` | Mock transaction verification |
| `tests/fixtures/settlement-scenarios.ts` | Seed data for auction states |
| `tests/fixtures/devnet-wallets.json.example` | Template for devnet wallet config |
