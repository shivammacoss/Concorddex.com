/**
 * MarginEngine - Production-ready Forex/CFD margin and stop-out system
 * 
 * Implements MT4/MT5-style trading logic:
 * - Global margin system (shared equity pool per account)
 * - Credit balance handling (admin-provided, non-withdrawable)
 * - Loss deduction: ONLY from Wallet - Credit is NEVER touched
 * - Profit handling (Wallet only, never Credit)
 * - Stop-out logic (close worst losing trade first)
 * - Real-time equity and margin level calculations
 */

const Trade = require('../models/Trade');
const TradingAccount = require('../models/TradingAccount');
const Transaction = require('../models/Transaction');

class MarginEngine {
  constructor(tradeEngine, io = null) {
    this.tradeEngine = tradeEngine;
    this.io = io;
    this.isProcessing = false;
    this.stopOutQueue = new Map(); // Prevent concurrent stop-outs per account
  }

  /**
   * Set Socket.IO instance for real-time notifications
   */
  setSocketIO(io) {
    this.io = io;
  }

  // ==================== CORE BALANCE CALCULATIONS ====================

  /**
   * Calculate floating P/L for all open trades of an account
   * @param {string} accountId - Trading account ID
   * @returns {Promise<{totalPnL: number, trades: Array}>}
   */
  async calculateFloatingPnL(accountId) {
    const openTrades = await Trade.find({ 
      tradingAccount: accountId, 
      status: 'open' 
    });

    let totalPnL = 0;
    const tradesWithPnL = [];

    for (const trade of openTrades) {
      const price = this.tradeEngine.getPrice(trade.symbol);
      if (!price) continue;

      const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
      const pnl = this.calculateTradePnL(trade, currentPrice);
      
      totalPnL += pnl;
      tradesWithPnL.push({
        trade,
        currentPrice,
        floatingPnL: pnl
      });
    }

    return { totalPnL, trades: tradesWithPnL };
  }

  /**
   * Calculate P/L for a single trade
   * P/L = (currentPrice - entryPrice) × lots × contractSize × direction
   */
  calculateTradePnL(trade, currentPrice) {
    const priceDiff = trade.type === 'buy' 
      ? currentPrice - trade.price 
      : trade.price - currentPrice;
    
    const contractSize = this.getContractSize(trade.symbol);
    return priceDiff * trade.amount * contractSize;
  }

  /**
   * Get contract size for a symbol
   */
  getContractSize(symbol) {
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol.includes('XAU')) return 100;      // 100 oz gold
    if (upperSymbol.includes('XAG')) return 5000;     // 5000 oz silver
    if (upperSymbol.includes('BTC')) return 1;        // 1 BTC
    if (upperSymbol.includes('ETH')) return 1;        // 1 ETH
    if (upperSymbol.includes('SOL')) return 1;
    if (upperSymbol.includes('XRP')) return 1;
    if (['US30', 'US500', 'NAS100', 'UK100', 'GER40'].includes(upperSymbol)) return 1;
    return 100000; // Standard forex lot
  }

  /**
   * Get complete account status with all derived values
   * @param {string} accountId - Trading account ID
   * @returns {Promise<Object>} Complete account status
   */
  async getAccountStatus(accountId) {
    const account = await TradingAccount.findById(accountId);
    if (!account) throw new Error('Account not found');

    const { totalPnL, trades } = await this.calculateFloatingPnL(accountId);
    
    // Calculate all derived values
    const walletBalance = account.balance;
    const creditBalance = account.creditBalance || 0;
    const equity = walletBalance + creditBalance + totalPnL;
    const usedMargin = account.margin || 0;
    const freeMargin = equity - usedMargin;
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : Infinity;
    const buyingPower = equity * account.leverage;
    const withdrawable = Math.max(0, walletBalance); // Only wallet is withdrawable

    return {
      accountId: account._id,
      accountNumber: account.accountNumber,
      
      // Core balances (STRICT SEPARATION)
      walletBalance,        // Real money - withdrawable
      creditBalance,        // Admin credit - NOT withdrawable
      
      // Derived values (NOT STORED)
      equity,               // wallet + credit + floatingPnL
      floatingPnL: totalPnL,
      
      // Margin system
      usedMargin,
      freeMargin,
      marginLevel: marginLevel === Infinity ? null : marginLevel,
      
      // Trading power
      leverage: account.leverage,
      buyingPower,
      
      // Withdrawal
      withdrawable,
      
      // Risk levels
      stopOutLevel: account.stopOutLevel || 20,
      marginCallLevel: account.marginCallLevel || 50,
      isMarginCall: marginLevel <= (account.marginCallLevel || 50),
      isStopOut: marginLevel <= (account.stopOutLevel || 20),
      
      // Open positions
      openTrades: trades.length,
      positions: trades
    };
  }

  // ==================== MARGIN VALIDATION ====================

  /**
   * Validate if a new trade can be opened
   * @param {string} accountId - Trading account ID
   * @param {number} requiredMargin - Margin required for new trade
   * @param {number} tradingCharges - Commission and fees
   * @returns {Promise<{valid: boolean, message: string, accountStatus: Object}>}
   */
  async validateNewTrade(accountId, requiredMargin, tradingCharges = 0) {
    const status = await this.getAccountStatus(accountId);
    const totalRequired = requiredMargin + tradingCharges;

    if (status.freeMargin < totalRequired) {
      return {
        valid: false,
        message: `Insufficient margin. Required: $${totalRequired.toFixed(2)}, Available: $${status.freeMargin.toFixed(2)}`,
        accountStatus: status
      };
    }

    // Check if opening this trade would immediately trigger margin call
    const newEquity = status.equity;
    const newUsedMargin = status.usedMargin + requiredMargin;
    const projectedMarginLevel = (newEquity / newUsedMargin) * 100;

    if (projectedMarginLevel <= status.marginCallLevel) {
      return {
        valid: false,
        message: `Trade would trigger margin call. Projected margin level: ${projectedMarginLevel.toFixed(2)}%`,
        accountStatus: status
      };
    }

    return {
      valid: true,
      message: 'Trade validated',
      accountStatus: status,
      projectedMarginLevel
    };
  }

  // ==================== STOP-OUT LOGIC ====================

  /**
   * Check and execute stop-out for an account
   * CRITICAL: Close worst losing trade first, not all at once
   * @param {string} accountId - Trading account ID
   * @returns {Promise<{triggered: boolean, closedTrades: Array}>}
   */
  async checkAndExecuteStopOut(accountId) {
    // Prevent concurrent stop-out processing for same account
    if (this.stopOutQueue.has(accountId)) {
      return { triggered: false, reason: 'Stop-out already in progress' };
    }

    this.stopOutQueue.set(accountId, true);

    try {
      const status = await this.getAccountStatus(accountId);
      
      // Check if stop-out should be triggered
      if (!status.isStopOut || status.openTrades === 0) {
        return { triggered: false, marginLevel: status.marginLevel };
      }

      console.log(`[MarginEngine] STOP-OUT triggered for account ${accountId}. Margin Level: ${status.marginLevel?.toFixed(2)}%`);

      const closedTrades = [];
      let currentStatus = status;

      // Close trades one by one until margin level is safe or no trades remain
      while (currentStatus.isStopOut && currentStatus.openTrades > 0) {
        // Find the worst losing trade
        const worstTrade = this.findWorstLosingTrade(currentStatus.positions);
        
        if (!worstTrade) {
          console.log('[MarginEngine] No more trades to close');
          break;
        }

        console.log(`[MarginEngine] Closing worst losing trade: ${worstTrade.trade._id}, P/L: $${worstTrade.floatingPnL.toFixed(2)}`);

        // Close the trade
        const closedTrade = await this.closeTradeWithSettlement(
          worstTrade.trade, 
          worstTrade.currentPrice, 
          'stop_out'
        );

        if (closedTrade) {
          closedTrades.push(closedTrade);
        }

        // Recalculate account status
        currentStatus = await this.getAccountStatus(accountId);
        
        console.log(`[MarginEngine] After closing trade - Margin Level: ${currentStatus.marginLevel?.toFixed(2) || 'N/A'}%, Open Trades: ${currentStatus.openTrades}`);
      }

      // Notify user
      if (closedTrades.length > 0) {
        this.notifyUser(status.accountId, 'stopOut', {
          closedTrades,
          totalClosed: closedTrades.length,
          finalMarginLevel: currentStatus.marginLevel,
          message: `🛑 STOP-OUT: ${closedTrades.length} position(s) closed due to insufficient margin`
        });
      }

      return {
        triggered: true,
        closedTrades,
        finalMarginLevel: currentStatus.marginLevel,
        remainingTrades: currentStatus.openTrades
      };

    } finally {
      this.stopOutQueue.delete(accountId);
    }
  }

  /**
   * Find the worst losing trade from a list of positions
   * @param {Array} positions - Array of {trade, floatingPnL} objects
   * @returns {Object|null} The worst losing trade or null
   */
  findWorstLosingTrade(positions) {
    if (!positions || positions.length === 0) return null;

    // Sort by P/L ascending (worst loss first)
    const sorted = [...positions].sort((a, b) => a.floatingPnL - b.floatingPnL);
    
    // Return the worst one (most negative P/L)
    return sorted[0];
  }

  // ==================== TRADE SETTLEMENT ====================

  /**
   * Close a trade and settle P/L with proper credit/wallet handling
   * CRITICAL: Losses deduct ONLY from Wallet (Balance) - Credit is NEVER touched
   * CRITICAL: Profits add ONLY to Wallet
   * @param {Object} trade - Trade document
   * @param {number} closePrice - Price to close at
   * @param {string} reason - Close reason
   * @returns {Promise<Object>} Closed trade with settlement details
   */
  async closeTradeWithSettlement(trade, closePrice, reason = 'manual') {
    // Prevent double closing
    if (trade.status === 'closed') {
      console.log(`[MarginEngine] Trade ${trade._id} already closed`);
      return trade;
    }

    const account = await TradingAccount.findById(trade.tradingAccount);
    if (!account) {
      console.error(`[MarginEngine] Account not found for trade ${trade._id}`);
      return null;
    }

    // Calculate final P/L
    const rawPnL = this.calculateTradePnL(trade, closePrice);
    const tradingCharge = trade.tradingCharge || 0; // Already deducted on open
    const finalPnL = rawPnL; // Charges already paid

    console.log(`[MarginEngine] Closing trade ${trade._id}: ${trade.symbol} @ ${closePrice}`);
    console.log(`[MarginEngine] Raw P/L: $${rawPnL.toFixed(2)}, Final P/L: $${finalPnL.toFixed(2)}`);

    // Record balances before settlement
    const balancesBefore = {
      wallet: account.balance,
      credit: account.creditBalance || 0
    };

    // Apply P/L with proper priority (Credit first for losses, Wallet only for profits)
    const settlement = account.applyRealizedPnL(finalPnL);

    // Return margin to account
    const marginReturn = trade.margin || 0;
    account.balance += marginReturn;
    account.margin = Math.max(0, (account.margin || 0) - marginReturn);

    // Update trade statistics
    if (finalPnL >= 0) {
      account.winningTrades = (account.winningTrades || 0) + 1;
      account.totalProfit = (account.totalProfit || 0) + finalPnL;
    } else {
      account.losingTrades = (account.losingTrades || 0) + 1;
      account.totalLoss = (account.totalLoss || 0) + Math.abs(finalPnL);
    }

    await account.save();

    // Update trade record
    trade.closePrice = closePrice;
    trade.profit = finalPnL;
    trade.rawProfit = rawPnL;
    trade.status = 'closed';
    trade.closedAt = new Date();
    trade.closeReason = reason;
    await trade.save();

    // Create transaction record with detailed breakdown
    await Transaction.create({
      user: trade.user,
      type: finalPnL >= 0 ? 'trade_profit' : 'trade_loss',
      amount: marginReturn + finalPnL,
      description: this.buildSettlementDescription(trade, closePrice, reason, settlement),
      balanceBefore: balancesBefore.wallet,
      balanceAfter: account.balance,
      status: 'completed',
      reference: `${trade._id}_close_${Date.now()}`,
      metadata: {
        tradeId: trade._id,
        symbol: trade.symbol,
        closeReason: reason,
        rawPnL,
        finalPnL,
        marginReturned: marginReturn,
        settlement: {
          creditDeducted: settlement.creditDeducted,
          walletDeducted: settlement.walletDeducted,
          walletAdded: settlement.walletAdded
        }
      }
    });

    console.log(`[MarginEngine] Settlement complete:`, {
      creditDeducted: settlement.creditDeducted,
      walletDeducted: settlement.walletDeducted,
      walletAdded: settlement.walletAdded,
      newWallet: account.balance,
      newCredit: account.creditBalance
    });

    return {
      ...trade.toObject(),
      settlement,
      balancesBefore,
      balancesAfter: {
        wallet: account.balance,
        credit: account.creditBalance
      }
    };
  }

  /**
   * Build description for settlement transaction
   */
  buildSettlementDescription(trade, closePrice, reason, settlement) {
    let desc = `Closed ${trade.type.toUpperCase()} ${trade.amount} ${trade.symbol} @ ${closePrice.toFixed(5)} (${reason})`;
    
    if (settlement.creditDeducted > 0) {
      desc += ` | Credit absorbed: $${settlement.creditDeducted.toFixed(2)}`;
    }
    if (settlement.walletDeducted > 0) {
      desc += ` | Wallet deducted: $${settlement.walletDeducted.toFixed(2)}`;
    }
    if (settlement.walletAdded > 0) {
      desc += ` | Profit to wallet: $${settlement.walletAdded.toFixed(2)}`;
    }
    
    return desc;
  }

  // ==================== ADMIN CREDIT OPERATIONS ====================

  /**
   * Add credit to an account (Admin only)
   * Credit increases equity and trading power but is NOT withdrawable
   * @param {string} accountId - Trading account ID
   * @param {number} amount - Credit amount to add
   * @param {string} reason - Reason for credit
   * @param {string} adminId - Admin who added the credit
   * @returns {Promise<Object>} Updated account status
   */
  async addCredit(accountId, amount, reason, adminId) {
    if (amount <= 0) throw new Error('Credit amount must be positive');

    const account = await TradingAccount.findById(accountId);
    if (!account) throw new Error('Account not found');

    const creditBefore = account.creditBalance || 0;
    account.addCredit(amount);
    await account.save();

    // Create transaction record
    await Transaction.create({
      user: account.user,
      type: 'bonus', // Using 'bonus' type for credit additions
      amount: amount,
      description: `Admin credit added: $${amount.toFixed(2)} - ${reason}`,
      status: 'completed',
      reference: `CREDIT_ADD_${Date.now()}`,
      metadata: {
        accountId: account._id,
        creditBefore,
        creditAfter: account.creditBalance,
        reason,
        adminId,
        isCredit: true // Flag to identify credit transactions
      }
    });

    console.log(`[MarginEngine] Credit added to account ${accountId}: $${amount} (${reason})`);

    return this.getAccountStatus(accountId);
  }

  /**
   * Remove credit from an account (Admin only)
   * @param {string} accountId - Trading account ID
   * @param {number} amount - Credit amount to remove
   * @param {string} reason - Reason for removal
   * @param {string} adminId - Admin who removed the credit
   * @returns {Promise<Object>} Updated account status
   */
  async removeCredit(accountId, amount, reason, adminId) {
    if (amount <= 0) throw new Error('Credit amount must be positive');

    const account = await TradingAccount.findById(accountId);
    if (!account) throw new Error('Account not found');

    const creditBefore = account.creditBalance || 0;
    
    if (amount > creditBefore) {
      throw new Error(`Cannot remove $${amount}. Available credit: $${creditBefore}`);
    }

    // Check if removing credit would trigger stop-out
    const status = await this.getAccountStatus(accountId);
    const newEquity = status.equity - amount;
    const newMarginLevel = status.usedMargin > 0 ? (newEquity / status.usedMargin) * 100 : Infinity;

    if (newMarginLevel <= (account.stopOutLevel || 20) && status.openTrades > 0) {
      throw new Error(`Cannot remove credit. Would trigger stop-out (margin level would be ${newMarginLevel.toFixed(2)}%)`);
    }

    account.removeCredit(amount);
    await account.save();

    // Create transaction record
    await Transaction.create({
      user: account.user,
      type: 'fee', // Using 'fee' type for credit removals
      amount: -amount,
      description: `Admin credit removed: $${amount.toFixed(2)} - ${reason}`,
      status: 'completed',
      reference: `CREDIT_REMOVE_${Date.now()}`,
      metadata: {
        accountId: account._id,
        creditBefore,
        creditAfter: account.creditBalance,
        reason,
        adminId,
        isCredit: true
      }
    });

    console.log(`[MarginEngine] Credit removed from account ${accountId}: $${amount} (${reason})`);

    return this.getAccountStatus(accountId);
  }

  // ==================== WITHDRAWAL VALIDATION ====================

  /**
   * Validate withdrawal request
   * CRITICAL: Only wallet balance is withdrawable, never credit
   * @param {string} accountId - Trading account ID
   * @param {number} amount - Requested withdrawal amount
   * @returns {Promise<{valid: boolean, message: string, withdrawable: number}>}
   */
  async validateWithdrawal(accountId, amount) {
    const status = await this.getAccountStatus(accountId);

    if (amount <= 0) {
      return { valid: false, message: 'Withdrawal amount must be positive' };
    }

    // Only wallet balance is withdrawable
    if (amount > status.withdrawable) {
      return {
        valid: false,
        message: `Insufficient withdrawable balance. Available: $${status.withdrawable.toFixed(2)} (Credit balance of $${status.creditBalance.toFixed(2)} is NOT withdrawable)`,
        withdrawable: status.withdrawable,
        creditBalance: status.creditBalance
      };
    }

    // Check if withdrawal would affect margin requirements
    if (status.openTrades > 0) {
      const newWalletBalance = status.walletBalance - amount;
      const newEquity = newWalletBalance + status.creditBalance + status.floatingPnL;
      const newMarginLevel = status.usedMargin > 0 ? (newEquity / status.usedMargin) * 100 : Infinity;

      if (newMarginLevel <= (status.marginCallLevel || 50)) {
        return {
          valid: false,
          message: `Withdrawal would trigger margin call. Max withdrawable with open trades: $${this.calculateMaxWithdrawable(status).toFixed(2)}`,
          withdrawable: status.withdrawable,
          maxWithOpenTrades: this.calculateMaxWithdrawable(status)
        };
      }
    }

    return {
      valid: true,
      message: 'Withdrawal validated',
      withdrawable: status.withdrawable,
      accountStatus: status
    };
  }

  /**
   * Calculate maximum withdrawable amount considering open positions
   */
  calculateMaxWithdrawable(status) {
    if (status.openTrades === 0) {
      return status.withdrawable;
    }

    // Calculate how much can be withdrawn while maintaining margin call level
    const marginCallLevel = status.marginCallLevel || 50;
    const requiredEquity = (status.usedMargin * marginCallLevel) / 100;
    const excessEquity = status.equity - requiredEquity;
    
    // Can only withdraw from wallet, and only up to excess equity
    return Math.max(0, Math.min(status.withdrawable, excessEquity));
  }

  // ==================== PERIODIC MARGIN CHECK ====================

  /**
   * Check all accounts for margin calls and stop-outs
   * Should be called periodically (e.g., every 100ms)
   */
  async checkAllAccounts() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Get all accounts with open trades
      const accountsWithTrades = await Trade.distinct('tradingAccount', { 
        status: 'open',
        tradingAccount: { $ne: null }
      });

      for (const accountId of accountsWithTrades) {
        try {
          const status = await this.getAccountStatus(accountId);

          // Check for margin call (warning only)
          if (status.isMarginCall && !status.isStopOut) {
            this.notifyUser(accountId, 'marginCall', {
              marginLevel: status.marginLevel,
              message: `⚠️ MARGIN CALL: Your margin level is ${status.marginLevel?.toFixed(2)}%`
            });
          }

          // Check for stop-out
          if (status.isStopOut) {
            await this.checkAndExecuteStopOut(accountId);
          }
        } catch (err) {
          console.error(`[MarginEngine] Error checking account ${accountId}:`, err);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Send notification to user via Socket.IO
   */
  notifyUser(accountId, event, data) {
    if (this.io) {
      // Get user ID from account
      TradingAccount.findById(accountId).then(account => {
        if (account) {
          this.io.to(`user_${account.user}`).emit(event, data);
          this.io.emit(event, { ...data, accountId, userId: account.user });
        }
      }).catch(err => {
        console.error('[MarginEngine] Error sending notification:', err);
      });
    }
  }
}

module.exports = MarginEngine;
