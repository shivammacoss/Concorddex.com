# Concorddex Trading System Architecture

## Overview

This document describes the core trading system architecture implementing MT4/MT5-style forex trading logic with real-time trade execution, margin management, and financial settlements.

---

## 1. Real-Time Trade Execution Logic

### 1.1 Order Types Supported

| Order Type | Description | Execution |
|------------|-------------|-----------|
| **Market Order** | Immediate execution at current price | Executes instantly at ask (buy) or bid (sell) |
| **Limit Order** | Execute when price reaches target | Buy: when ask ≤ target, Sell: when bid ≥ target |
| **Stop Order** | Execute when price breaks level | Buy: when ask ≥ target, Sell: when bid ≤ target |
| **Stop-Loss (SL)** | Auto-close to limit losses | Triggers when price hits SL level |
| **Take-Profit (TP)** | Auto-close to lock profits | Triggers when price hits TP level |

### 1.2 Leverage Application

**Location:** `backend/services/TradeEngine.js` (lines 207-209)

```javascript
// User selects their leverage - use it directly
const parsedRequestedLeverage = requestedLeverage ? parseInt(requestedLeverage) : 100;
// Allow up to 2000x leverage (safety cap)
const tradeLeverage = Math.min(Math.max(parsedRequestedLeverage, 1), 2000);
```

**How it works:**
- Admin defines max leverage per account type (100x to 3000x)
- User with $1,000 and 1000x leverage can control $1,000,000 in positions
- **Buying Power = Equity × Leverage**
- Leverage only affects margin required, NOT P/L calculation

### 1.3 Automated Cost Integration

**Location:** `backend/services/TradeEngine.js` (lines 194-248)

#### Spread Application
```javascript
// Get execution price (ask for buy, bid for sell)
// Apply admin spread markup to the price
const basePrice = type === 'buy' ? price.ask : price.bid;
const pipSize = this.getPipSize(symbol);
const spreadMarkup = (charges.spreadPips || 0) * pipSize;
// For buy: add spread to price (worse for user)
// For sell: subtract spread (worse for user)
const executionPrice = type === 'buy' ? basePrice + spreadMarkup : basePrice - spreadMarkup;
```

#### Commission Calculation
```javascript
// SIMPLIFIED: Only commission per lot (no percentage fees)
const commissionPerLot = charges.commissionPerLot || 0;
const commission = amount * commissionPerLot; // lots × $/lot
const tradingCharge = Math.round(commission * 100) / 100;
```

#### Charges Priority System
**Location:** `backend/models/TradingCharge.js`

Priority (highest to lowest):
1. **User-specific** - Custom charges for individual users
2. **Symbol-specific** - Charges for specific instruments (XAUUSD, EURUSD)
3. **Account Type** - Charges per account type (Standard, VIP, etc.)
4. **Segment** - Charges per market segment (forex, crypto, metals, indices)
5. **Global** - Default platform-wide charges

---

## 2. Margin and Risk Management

### 2.1 Core Formulas

**Location:** `backend/services/TradeEngine.js` and `backend/models/TradingAccount.js`

| Metric | Formula | Description |
|--------|---------|-------------|
| **Equity** | `Wallet Balance + Credit Balance + Floating P/L` | Total account value |
| **Buying Power** | `Equity × Leverage` | Maximum position value controllable |
| **Position Value** | `Lots × Price × Contract Size` | Notional value of trade |
| **Margin Required** | `Position Value / Leverage` | Capital held for position |
| **Free Margin** | `Equity - Used Margin` | Available for new trades |
| **Margin Level** | `(Equity / Used Margin) × 100%` | Account health indicator |

### 2.2 Contract Sizes

**Location:** `backend/services/TradeEngine.js` (lines 1282-1300)

| Instrument | Contract Size | Example |
|------------|---------------|---------|
| Forex (EURUSD, etc.) | 100,000 units | 1 lot = 100,000 EUR |
| Gold (XAUUSD) | 100 oz | 1 lot = 100 ounces |
| Silver (XAGUSD) | 5,000 oz | 1 lot = 5,000 ounces |
| Crypto (BTC, ETH) | 1 unit | 1 lot = 1 BTC |
| Indices | 1 unit | 1 lot = 1 contract |

### 2.3 P/L Calculation

**Location:** `backend/services/TradeEngine.js` (lines 1010-1023)

```javascript
calculatePnL(trade, currentPrice) {
  const priceDiff = trade.type === 'buy' 
    ? currentPrice - trade.price 
    : trade.price - currentPrice;
  
  // P&L = price difference × lots × contract size (NO leverage)
  // Leverage only affects margin required to open, not P&L
  let contractSize = 100000; // Standard forex
  if (trade.symbol.includes('XAU')) contractSize = 100;
  else if (trade.symbol.includes('XAG')) contractSize = 5000;
  else if (trade.symbol.includes('BTC') || trade.symbol.includes('ETH')) contractSize = 1;
  
  return priceDiff * trade.amount * contractSize;
}
```

### 2.4 Margin Validation on Trade Open

**Location:** `backend/services/TradeEngine.js` (lines 260-290)

```javascript
// VALIDATION FOR TRADING ACCOUNTS (MT4/MT5 style):
// - Margin is NOT deducted from wallet, it's just a "hold" on equity
// - Only trading charges are deducted from wallet
// - Free Margin must be >= margin required for the trade

if (usesTradingAccount) {
  // Check 1: Free Margin must cover the new margin requirement
  if (freeMargin < margin) {
    throw new Error(`Insufficient free margin...`);
  }
  
  // Check 2: Wallet must have enough for trading charges only (not margin)
  if (tradingCharge > 0 && walletBalance < tradingCharge) {
    throw new Error(`Insufficient wallet balance for trading charges...`);
  }
  
  // Check 3: Opening this trade should not immediately trigger margin call
  const projectedMarginLevel = newUsedMargin > 0 ? (newEquity / newUsedMargin) * 100 : Infinity;
  if (projectedMarginLevel <= marginCallLevel) {
    throw new Error(`Trade would trigger margin call...`);
  }
}
```

### 2.5 Auto Square-Off (Stop-Out)

**Location:** `backend/services/TradeEngine.js` (lines 630-791)

**Trigger Levels:**
- **Margin Call Warning:** 50% margin level (configurable)
- **Stop-Out:** 20% margin level (configurable)

**Stop-Out Process:**
1. Monitor margin level every 100ms
2. When margin level ≤ stop-out threshold:
   - Find the **worst losing trade** (most negative P/L)
   - Close that single trade
   - Recalculate margin level
   - If still below threshold, repeat
3. Continue until margin level is safe OR no trades remain

```javascript
async executeStopOut(userId, accountId, trades) {
  while (remainingTrades.length > 0) {
    // Find worst losing trade (most negative P/L)
    let worstTrade = null;
    let worstPnL = Infinity;
    
    for (const trade of remainingTrades) {
      const pnl = this.calculatePnL(trade, currentPrice);
      if (pnl < worstPnL) {
        worstPnL = pnl;
        worstTrade = trade;
      }
    }
    
    // Close the worst trade
    await this.closeTrade(worstTrade, closePrice, 'stop_out');
    
    // Recalculate and check if margin level is now safe
    if (newMarginLevel > stopOutThreshold) {
      break; // Margin restored, stop closing
    }
  }
}
```

---

## 3. Financial Settlement and Wallet Management

### 3.1 Balance vs. Equity Architecture

**Location:** `backend/models/TradingAccount.js`

| Field | Type | Description |
|-------|------|-------------|
| `balance` | Stored | **Wallet Balance** - Real money (deposits + realized P/L). ONLY withdrawable. |
| `creditBalance` | Stored | **Credit Balance** - Admin-provided bonus. NOT withdrawable. |
| `equity` | Derived | `balance + creditBalance + floatingPnL` - Calculated in real-time |
| `margin` | Stored | **Used Margin** - Sum of margin held by open positions |
| `freeMargin` | Derived | `equity - margin` - Available for new trades |

### 3.2 Trade Opening Settlement

**Location:** `backend/services/TradeEngine.js` (lines 360-423)

**For Trading Accounts (MT4/MT5 style):**
```javascript
// CRITICAL: Margin is NOT deducted from wallet
// Margin is just a "hold" on equity - it reduces FREE MARGIN, not wallet balance
// Only trading charges (commission) are deducted from wallet

if (tradingCharge > 0) {
  tradingAccount.balance -= tradingCharge;  // Deduct commission only
}

// Track used margin (this is NOT a balance deduction)
tradingAccount.margin = (tradingAccount.margin || 0) + margin;
```

### 3.3 Trade Closing Settlement

**Location:** `backend/services/TradeEngine.js` (lines 798-996)

**Critical Rules:**
- **Losses:** Deduct ONLY from Wallet (Balance) - Credit is NEVER touched
- **Profits:** Add ONLY to Wallet (never to Credit)
- **Margin:** Released (decreases used margin), NOT returned as money

```javascript
// Release margin (decrease used margin - margin is NOT added to wallet)
tradingAccount.margin = Math.max(0, (tradingAccount.margin || 0) - marginReturn);

// Apply P/L with proper priority using the model method
settlement = tradingAccount.applyRealizedPnL(pnl);
```

**applyRealizedPnL Method:**
```javascript
applyRealizedPnL(realizedPnL) {
  if (realizedPnL >= 0) {
    // PROFIT: Add ONLY to Wallet Balance (never to Credit)
    this.balance += realizedPnL;
  } else {
    // LOSS: Deduct ONLY from Wallet - Credit is NEVER touched
    const loss = Math.abs(realizedPnL);
    this.balance = Math.max(0, this.balance - loss);
    // Credit remains unchanged - admin credit is protected
  }
}
```

### 3.4 Withdrawal Validation

**Location:** `backend/models/TradingAccount.js` (lines 299-314)

```javascript
validateWithdrawal(amount) {
  const withdrawable = this.getWithdrawableAmount(); // Only wallet balance
  
  if (amount > withdrawable) {
    return { 
      valid: false, 
      message: `Insufficient withdrawable balance. Available: $${withdrawable.toFixed(2)} 
                (Credit balance of $${creditBalance.toFixed(2)} is not withdrawable)` 
    };
  }
  
  return { valid: true, withdrawable };
}
```

---

## 4. Real-Time Monitoring

### 4.1 Trade Engine Loop

**Location:** `backend/services/TradeEngine.js` (lines 47-57)

```javascript
start() {
  // Check orders every 100ms for fast SL/TP execution
  this.checkInterval = setInterval(() => {
    this.checkPendingOrders();  // Activate limit/stop orders
    this.checkOpenPositions();  // Check SL/TP and margin levels
  }, 100);
}
```

### 4.2 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `priceUpdate` | Server → Client | Batch price updates |
| `tick` | Server → Client | Individual symbol tick |
| `orderExecuted` | Server → Client | Trade opened |
| `tradeClosed` | Server → Client | Trade closed |
| `marginCall` | Server → Client | Margin warning |
| `stopOut` | Server → Client | Stop-out notification |
| `pendingOrderActivated` | Server → Client | Pending order filled |

---

## 5. Key Files Reference

| File | Purpose |
|------|---------|
| `backend/services/TradeEngine.js` | Core trade execution, SL/TP monitoring, stop-out |
| `backend/services/MarginEngine.js` | Advanced margin calculations and stop-out logic |
| `backend/models/Trade.js` | Trade schema with all order fields |
| `backend/models/TradingAccount.js` | Account schema with balance/credit methods |
| `backend/models/TradingCharge.js` | Spread and commission configuration |
| `backend/routes/trades.js` | Trade API endpoints |

---

## 6. Configuration Points

### Admin-Configurable Settings

| Setting | Location | Default | Range |
|---------|----------|---------|-------|
| Max Leverage | Account Type | 100x | 1x - 3000x |
| Stop-Out Level | Trading Account | 20% | 0% - 100% |
| Margin Call Level | Trading Account | 50% | 0% - 100% |
| Spread (pips) | Trading Charge | Varies | 0+ |
| Commission ($/lot) | Trading Charge | 0 | 0+ |

---

## 7. Example Trade Flow

### Opening a Buy Trade

1. **User Request:** Buy 0.1 lots XAUUSD with 500x leverage
2. **Price Fetch:** Get current ask price (e.g., $2650.00)
3. **Spread Application:** Add admin spread (e.g., 30 pips = $0.30) → Entry: $2650.30
4. **Margin Calculation:** 
   - Position Value = 0.1 × $2650.30 × 100 = $26,503
   - Margin Required = $26,503 / 500 = $53.01
5. **Validation:**
   - Check Free Margin ≥ $53.01
   - Check Wallet ≥ Commission
   - Check projected margin level > margin call level
6. **Execution:**
   - Create trade record
   - Deduct commission from wallet
   - Add margin to used margin
7. **Monitoring:** Every 100ms check SL/TP and margin level

### Closing the Trade

1. **Trigger:** Manual close, SL hit, TP hit, or stop-out
2. **P/L Calculation:** (Close Price - Entry Price) × 0.1 × 100
3. **Settlement:**
   - Release margin (decrease used margin)
   - Apply P/L to wallet only
4. **Notification:** Send trade closed event to user

---

*Last Updated: January 2026*
