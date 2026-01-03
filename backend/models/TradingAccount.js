const mongoose = require('mongoose');

const tradingAccountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountType',
    required: true
  },
  nickname: {
    type: String,
    default: ''
  },
  // WALLET BALANCE - Real user money (deposits + realized P/L)
  // This is the ONLY withdrawable balance
  balance: {
    type: Number,
    default: 0
  },
  // CREDIT BALANCE - Admin-provided trading credit
  // NOT withdrawable, used for margin & loss absorption
  // Must NEVER be transferred to wallet or increased by profit
  creditBalance: {
    type: Number,
    default: 0
  },
  // EQUITY is a DERIVED value = balance + creditBalance + floatingPnL
  // This field is for caching/display only, NOT the source of truth
  equity: {
    type: Number,
    default: 0
  },
  margin: {
    type: Number,
    default: 0
  },
  freeMargin: {
    type: Number,
    default: 0
  },
  marginLevel: {
    type: Number,
    default: 0
  },
  // Leverage can be up to 3000x (configurable per account type)
  leverage: {
    type: Number,
    default: 100,
    min: 1,
    max: 3000
  },
  // Stop-out level percentage (default 20%)
  stopOutLevel: {
    type: Number,
    default: 20
  },
  // Margin call level percentage (default 50%)
  marginCallLevel: {
    type: Number,
    default: 50
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR']
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'closed'],
    default: 'active'
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  // Trading statistics
  totalDeposits: {
    type: Number,
    default: 0
  },
  totalWithdrawals: {
    type: Number,
    default: 0
  },
  totalTrades: {
    type: Number,
    default: 0
  },
  winningTrades: {
    type: Number,
    default: 0
  },
  losingTrades: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  totalLoss: {
    type: Number,
    default: 0
  },
  // Server/Platform info (for future MT4/MT5 integration)
  server: {
    type: String,
    default: 'concorddex-Live'
  },
  platform: {
    type: String,
    enum: ['WebTrader', 'MT4', 'MT5'],
    default: 'WebTrader'
  },
  // Timestamps
  lastTradeAt: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate unique account number before saving
tradingAccountSchema.pre('save', async function(next) {
  if (!this.accountNumber) {
    const prefix = this.isDemo ? 'DEMO' : 'concorddex';
    const count = await this.constructor.countDocuments();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.accountNumber = `${prefix}-${randomNum + count}`;
  }
  next();
});

/**
 * Calculate equity (DERIVED VALUE - NOT STORED)
 * Equity = Wallet Balance + Credit Balance + Floating P/L
 * @param {number} floatingPnL - Current floating profit/loss from open trades
 * @returns {number} Current equity value
 */
tradingAccountSchema.methods.calculateEquity = function(floatingPnL = 0) {
  // Equity = Wallet Balance + Credit Balance + Floating P/L
  this.equity = this.balance + (this.creditBalance || 0) + floatingPnL;
  return this.equity;
};

/**
 * Calculate buying power based on equity and leverage
 * Buying Power = Equity × Leverage
 * @param {number} floatingPnL - Current floating P/L
 * @returns {number} Maximum position value user can control
 */
tradingAccountSchema.methods.calculateBuyingPower = function(floatingPnL = 0) {
  const equity = this.calculateEquity(floatingPnL);
  return equity * this.leverage;
};

/**
 * Calculate free margin
 * Free Margin = Equity - Used Margin
 * @param {number} floatingPnL - Current floating P/L
 * @returns {number} Available margin for new trades
 */
tradingAccountSchema.methods.calculateFreeMargin = function(floatingPnL = 0) {
  const equity = this.calculateEquity(floatingPnL);
  return equity - (this.margin || 0);
};

/**
 * Get withdrawable amount (ONLY wallet balance, never credit)
 * @returns {number} Amount user can withdraw
 */
tradingAccountSchema.methods.getWithdrawableAmount = function() {
  // Only wallet balance is withdrawable, credit is NEVER withdrawable
  return Math.max(0, this.balance);
};

/**
 * Apply realized P/L with proper loss deduction
 * CRITICAL: Losses deduct ONLY from Wallet (Balance) - Credit is NEVER touched
 * CRITICAL: Profits add ONLY to Wallet, never to Credit
 * Credit is a fixed bonus from admin that remains constant
 * @param {number} realizedPnL - The realized profit or loss
 * @returns {object} Breakdown of how P/L was applied
 */
tradingAccountSchema.methods.applyRealizedPnL = function(realizedPnL) {
  const result = {
    originalWallet: this.balance,
    originalCredit: this.creditBalance || 0,
    realizedPnL: realizedPnL,
    creditDeducted: 0,
    walletDeducted: 0,
    walletAdded: 0,
    newWallet: this.balance,
    newCredit: this.creditBalance || 0
  };

  if (realizedPnL >= 0) {
    // PROFIT: Add ONLY to Wallet Balance (never to Credit)
    this.balance += realizedPnL;
    result.walletAdded = realizedPnL;
  } else {
    // LOSS: Deduct ONLY from Wallet (Balance) - Credit is NEVER touched
    const loss = Math.abs(realizedPnL);
    result.walletDeducted = Math.min(loss, this.balance);
    this.balance = Math.max(0, this.balance - loss);
    // Credit remains unchanged - admin credit is protected
  }

  result.newWallet = this.balance;
  result.newCredit = this.creditBalance;
  
  return result;
};

/**
 * Add admin credit (increases equity and trading power)
 * @param {number} amount - Credit amount to add
 * @param {string} reason - Reason for credit addition
 */
tradingAccountSchema.methods.addCredit = function(amount) {
  if (amount <= 0) throw new Error('Credit amount must be positive');
  this.creditBalance = (this.creditBalance || 0) + amount;
  return this.creditBalance;
};

/**
 * Remove admin credit
 * @param {number} amount - Credit amount to remove
 */
tradingAccountSchema.methods.removeCredit = function(amount) {
  if (amount <= 0) throw new Error('Credit amount must be positive');
  const currentCredit = this.creditBalance || 0;
  if (amount > currentCredit) throw new Error('Cannot remove more credit than available');
  this.creditBalance = currentCredit - amount;
  return this.creditBalance;
};

/**
 * Calculate margin level percentage
 * Margin Level = (Equity / Used Margin) × 100
 * @param {number} floatingPnL - Current floating P/L
 * @returns {number} Margin level percentage
 */
tradingAccountSchema.methods.calculateMarginLevel = function(floatingPnL = 0) {
  const equity = this.calculateEquity(floatingPnL);
  if (this.margin > 0) {
    this.marginLevel = (equity / this.margin) * 100;
  } else {
    this.marginLevel = Infinity; // No margin used = infinite margin level
  }
  return this.marginLevel;
};

/**
 * Check if account is in margin call state
 * @param {number} floatingPnL - Current floating P/L
 * @returns {boolean} True if margin call triggered
 */
tradingAccountSchema.methods.isMarginCall = function(floatingPnL = 0) {
  const marginLevel = this.calculateMarginLevel(floatingPnL);
  return marginLevel <= (this.marginCallLevel || 50);
};

/**
 * Check if account should be stopped out
 * @param {number} floatingPnL - Current floating P/L
 * @returns {boolean} True if stop-out should be triggered
 */
tradingAccountSchema.methods.shouldStopOut = function(floatingPnL = 0) {
  const marginLevel = this.calculateMarginLevel(floatingPnL);
  return marginLevel <= (this.stopOutLevel || 20);
};

/**
 * Validate withdrawal request
 * @param {number} amount - Requested withdrawal amount
 * @returns {object} Validation result with success flag and message
 */
tradingAccountSchema.methods.validateWithdrawal = function(amount) {
  const withdrawable = this.getWithdrawableAmount();
  
  if (amount <= 0) {
    return { valid: false, message: 'Withdrawal amount must be positive' };
  }
  
  if (amount > withdrawable) {
    return { 
      valid: false, 
      message: `Insufficient withdrawable balance. Available: $${withdrawable.toFixed(2)} (Credit balance of $${(this.creditBalance || 0).toFixed(2)} is not withdrawable)` 
    };
  }
  
  return { valid: true, withdrawable };
};

// Indexes (accountNumber already indexed via unique: true)
tradingAccountSchema.index({ user: 1, status: 1 });
tradingAccountSchema.index({ accountType: 1 });

module.exports = mongoose.model('TradingAccount', tradingAccountSchema);
