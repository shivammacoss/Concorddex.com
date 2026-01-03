/**
 * Admin Credit Management Routes
 * 
 * Handles admin operations for trading account credits:
 * - Add credit to accounts (increases equity & trading power)
 * - Remove credit from accounts
 * - View credit history
 * 
 * IMPORTANT RULES:
 * - Credit is NOT withdrawable
 * - ONLY Wallet absorbs losses - Credit is NEVER touched
 * - Profits go ONLY to wallet (never to credit)
 * - Credit cannot be transferred to wallet
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const TradingAccount = require('../models/TradingAccount');
const Transaction = require('../models/Transaction');
const Trade = require('../models/Trade');
const { protectAdmin } = require('./adminAuth');

// All routes require admin authentication
router.use(protectAdmin);

/**
 * @route   GET /api/admin/credit/accounts
 * @desc    Get all trading accounts with credit info
 * @access  Admin
 */
router.get('/accounts', async (req, res) => {
  try {
    const { userId, hasCredit, page = 1, limit = 50 } = req.query;
    
    const query = { status: 'active' };
    if (userId) query.user = userId;
    if (hasCredit === 'true') query.creditBalance = { $gt: 0 };
    
    const accounts = await TradingAccount.find(query)
      .populate('user', 'firstName lastName email')
      .populate('accountType', 'name code')
      .sort({ creditBalance: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Calculate equity for each account
    const accountsWithEquity = await Promise.all(accounts.map(async (account) => {
      const openTrades = await Trade.find({ 
        tradingAccount: account._id, 
        status: 'open' 
      });
      
      let floatingPnL = 0;
      let usedMargin = 0;
      // Note: In production, you'd get real-time prices here
      openTrades.forEach(trade => {
        floatingPnL += trade.profit || 0;
        usedMargin += trade.margin || 0;
      });
      
      const walletBalance = account.balance;
      const creditBalance = account.creditBalance || 0;
      const equity = walletBalance + creditBalance + floatingPnL;
      const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : null;
      
      return {
        ...account.toObject(),
        walletBalance,
        creditBalance,
        equity,
        floatingPnL,
        usedMargin,
        freeMargin: equity - usedMargin,
        marginLevel,
        withdrawable: Math.max(0, walletBalance),
        openTrades: openTrades.length
      };
    }));
    
    const total = await TradingAccount.countDocuments(query);
    const totalCredit = await TradingAccount.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$creditBalance' } } }
    ]);
    
    res.json({
      success: true,
      data: accountsWithEquity,
      stats: {
        totalAccounts: total,
        totalCreditOutstanding: totalCredit[0]?.total || 0
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get credit accounts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/credit/account/:id
 * @desc    Get detailed credit info for a specific account
 * @access  Admin
 */
router.get('/account/:id', async (req, res) => {
  try {
    const account = await TradingAccount.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('accountType', 'name code');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    // Get open trades for equity calculation
    const openTrades = await Trade.find({ 
      tradingAccount: account._id, 
      status: 'open' 
    });
    
    let floatingPnL = 0;
    let usedMargin = 0;
    openTrades.forEach(trade => {
      floatingPnL += trade.profit || 0;
      usedMargin += trade.margin || 0;
    });
    
    const walletBalance = account.balance;
    const creditBalance = account.creditBalance || 0;
    const equity = walletBalance + creditBalance + floatingPnL;
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : null;
    
    // Get credit transaction history
    const creditHistory = await Transaction.find({
      user: account.user._id,
      'metadata.accountId': account._id,
      'metadata.isCredit': true
    }).sort({ createdAt: -1 }).limit(50);
    
    res.json({
      success: true,
      data: {
        account: {
          ...account.toObject(),
          walletBalance,
          creditBalance,
          equity,
          floatingPnL,
          usedMargin,
          freeMargin: equity - usedMargin,
          marginLevel,
          withdrawable: Math.max(0, walletBalance),
          buyingPower: equity * account.leverage
        },
        openTrades: openTrades.length,
        creditHistory
      }
    });
  } catch (error) {
    console.error('Get account credit info error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/credit/add
 * @desc    Add credit to a trading account
 * @access  Admin
 * 
 * Credit Rules:
 * - Increases equity and trading power
 * - Can be used for margin
 * - Absorbs losses first
 * - Is NOT withdrawable
 * - Cannot be transferred to wallet
 */
router.post('/add', [
  body('accountId').isMongoId().withMessage('Valid account ID required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('reason').notEmpty().withMessage('Reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { accountId, amount, reason } = req.body;
    
    const account = await TradingAccount.findById(accountId)
      .populate('user', 'firstName lastName email');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    const creditBefore = account.creditBalance || 0;
    
    // Add credit using the model method
    account.addCredit(amount);
    await account.save();
    
    // Create transaction record
    await Transaction.create({
      user: account.user._id,
      type: 'bonus',
      amount: amount,
      description: `Admin credit added: $${amount.toFixed(2)} - ${reason}`,
      status: 'completed',
      reference: `CREDIT_ADD_${Date.now()}`,
      metadata: {
        accountId: account._id,
        accountNumber: account.accountNumber,
        creditBefore,
        creditAfter: account.creditBalance,
        reason,
        adminId: req.admin._id,
        adminEmail: req.admin.email,
        isCredit: true,
        action: 'add'
      }
    });
    
    console.log(`[AdminCredit] Added $${amount} credit to account ${account.accountNumber} by admin ${req.admin.email}. Reason: ${reason}`);
    
    res.json({
      success: true,
      message: `Successfully added $${amount.toFixed(2)} credit to account ${account.accountNumber}`,
      data: {
        accountId: account._id,
        accountNumber: account.accountNumber,
        creditBefore,
        creditAfter: account.creditBalance,
        walletBalance: account.balance,
        newEquity: account.balance + account.creditBalance
      }
    });
  } catch (error) {
    console.error('Add credit error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

/**
 * @route   POST /api/admin/credit/remove
 * @desc    Remove credit from a trading account
 * @access  Admin
 * 
 * Safety checks:
 * - Cannot remove more credit than available
 * - Cannot remove if it would trigger stop-out with open trades
 */
router.post('/remove', [
  body('accountId').isMongoId().withMessage('Valid account ID required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('reason').notEmpty().withMessage('Reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { accountId, amount, reason, forceRemove } = req.body;
    
    const account = await TradingAccount.findById(accountId)
      .populate('user', 'firstName lastName email');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    const creditBefore = account.creditBalance || 0;
    
    if (amount > creditBefore) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot remove $${amount}. Available credit: $${creditBefore.toFixed(2)}` 
      });
    }
    
    // Check if removing credit would trigger stop-out
    const openTrades = await Trade.find({ 
      tradingAccount: account._id, 
      status: 'open' 
    });
    
    if (openTrades.length > 0 && !forceRemove) {
      let floatingPnL = 0;
      let usedMargin = 0;
      openTrades.forEach(trade => {
        floatingPnL += trade.profit || 0;
        usedMargin += trade.margin || 0;
      });
      
      const currentEquity = account.balance + creditBefore + floatingPnL;
      const newEquity = currentEquity - amount;
      const newMarginLevel = usedMargin > 0 ? (newEquity / usedMargin) * 100 : Infinity;
      const stopOutLevel = account.stopOutLevel || 20;
      
      if (newMarginLevel <= stopOutLevel) {
        return res.status(400).json({
          success: false,
          message: `Cannot remove credit. Would trigger stop-out (margin level would be ${newMarginLevel.toFixed(2)}%). Use forceRemove=true to override.`,
          data: {
            currentMarginLevel: usedMargin > 0 ? (currentEquity / usedMargin) * 100 : null,
            projectedMarginLevel: newMarginLevel,
            stopOutLevel,
            openTrades: openTrades.length
          }
        });
      }
    }
    
    // Remove credit using the model method
    account.removeCredit(amount);
    await account.save();
    
    // Create transaction record
    await Transaction.create({
      user: account.user._id,
      type: 'fee',
      amount: -amount,
      description: `Admin credit removed: $${amount.toFixed(2)} - ${reason}`,
      status: 'completed',
      reference: `CREDIT_REMOVE_${Date.now()}`,
      metadata: {
        accountId: account._id,
        accountNumber: account.accountNumber,
        creditBefore,
        creditAfter: account.creditBalance,
        reason,
        adminId: req.admin._id,
        adminEmail: req.admin.email,
        isCredit: true,
        action: 'remove',
        forceRemove: !!forceRemove
      }
    });
    
    console.log(`[AdminCredit] Removed $${amount} credit from account ${account.accountNumber} by admin ${req.admin.email}. Reason: ${reason}`);
    
    res.json({
      success: true,
      message: `Successfully removed $${amount.toFixed(2)} credit from account ${account.accountNumber}`,
      data: {
        accountId: account._id,
        accountNumber: account.accountNumber,
        creditBefore,
        creditAfter: account.creditBalance,
        walletBalance: account.balance,
        newEquity: account.balance + account.creditBalance
      }
    });
  } catch (error) {
    console.error('Remove credit error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

/**
 * @route   GET /api/admin/credit/history
 * @desc    Get credit transaction history
 * @access  Admin
 */
router.get('/history', async (req, res) => {
  try {
    const { accountId, userId, action, page = 1, limit = 50 } = req.query;
    
    const query = { 'metadata.isCredit': true };
    if (accountId) query['metadata.accountId'] = accountId;
    if (userId) query.user = userId;
    if (action) query['metadata.action'] = action;
    
    const transactions = await Transaction.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments(query);
    
    // Calculate totals
    const totals = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$metadata.action',
          total: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: transactions,
      stats: {
        totalAdded: totals.find(t => t._id === 'add')?.total || 0,
        totalRemoved: totals.find(t => t._id === 'remove')?.total || 0,
        addCount: totals.find(t => t._id === 'add')?.count || 0,
        removeCount: totals.find(t => t._id === 'remove')?.count || 0
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get credit history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/credit/stats
 * @desc    Get overall credit statistics
 * @access  Admin
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalCreditOutstanding,
      accountsWithCredit,
      creditAddedTotal,
      creditRemovedTotal,
      creditAbsorbedByLosses
    ] = await Promise.all([
      // Total credit currently in accounts
      TradingAccount.aggregate([
        { $match: { creditBalance: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$creditBalance' } } }
      ]),
      // Number of accounts with credit
      TradingAccount.countDocuments({ creditBalance: { $gt: 0 } }),
      // Total credit ever added
      Transaction.aggregate([
        { $match: { 'metadata.isCredit': true, 'metadata.action': 'add' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Total credit ever removed
      Transaction.aggregate([
        { $match: { 'metadata.isCredit': true, 'metadata.action': 'remove' } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
      ]),
      // Credit absorbed by losses (from trade settlements)
      Transaction.aggregate([
        { $match: { type: 'trade_loss', 'metadata.settlement.creditDeducted': { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$metadata.settlement.creditDeducted' } } }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        totalCreditOutstanding: totalCreditOutstanding[0]?.total || 0,
        accountsWithCredit,
        totalCreditAdded: creditAddedTotal[0]?.total || 0,
        totalCreditRemoved: creditRemovedTotal[0]?.total || 0,
        totalCreditAbsorbedByLosses: creditAbsorbedByLosses[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get credit stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
