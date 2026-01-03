const express = require('express');
const router = express.Router();
const TradingAccount = require('../models/TradingAccount');
const AccountType = require('../models/AccountType');
const User = require('../models/User');
const Trade = require('../models/Trade');
const InternalTransfer = require('../models/InternalTransfer');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// @route   GET /api/trading-accounts
// @desc    Get user's trading accounts with full equity/credit info
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const accounts = await TradingAccount.find({ user: req.user._id })
      .populate('accountType')
      .sort({ createdAt: -1 });
    
    // Calculate equity and margin info for each account
    const accountsWithEquity = [];
    for (let account of accounts) {
      const openTrades = await Trade.find({ 
        user: req.user._id, 
        tradingAccount: account._id,
        status: 'open' 
      });
      
      let floatingPnL = 0;
      let usedMargin = 0;
      openTrades.forEach(trade => {
        floatingPnL += trade.profit || 0;
        usedMargin += trade.margin || 0;
      });
      
      // Core balances (STRICT SEPARATION)
      const walletBalance = account.balance;
      const creditBalance = account.creditBalance || 0;
      
      // Equity = Wallet + Credit + Floating P/L (DERIVED, NOT STORED)
      const equity = walletBalance + creditBalance + floatingPnL;
      const freeMargin = equity - usedMargin;
      const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : null;
      const buyingPower = equity * account.leverage;
      
      // Only wallet balance is withdrawable (credit is NEVER withdrawable)
      const withdrawable = Math.max(0, walletBalance);
      
      accountsWithEquity.push({
        ...account.toObject(),
        // Override with calculated values
        walletBalance,
        creditBalance,
        equity,
        floatingPnL,
        usedMargin,
        freeMargin,
        marginLevel,
        buyingPower,
        withdrawable,
        openTrades: openTrades.length,
        // Risk indicators
        stopOutLevel: account.stopOutLevel || 20,
        marginCallLevel: account.marginCallLevel || 50,
        isMarginCall: marginLevel !== null && marginLevel <= (account.marginCallLevel || 50),
        isStopOut: marginLevel !== null && marginLevel <= (account.stopOutLevel || 20)
      });
    }
    
    res.json({
      success: true,
      data: accountsWithEquity
    });
  } catch (error) {
    console.error('Get trading accounts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trading-accounts/:id
// @desc    Get single trading account with full status
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const account = await TradingAccount.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('accountType');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    // Get open trades for this account
    const openTrades = await Trade.find({ 
      tradingAccount: account._id,
      status: 'open' 
    });
    
    let floatingPnL = 0;
    let usedMargin = 0;
    const positions = [];
    
    openTrades.forEach(trade => {
      floatingPnL += trade.profit || 0;
      usedMargin += trade.margin || 0;
      positions.push({
        tradeId: trade._id,
        symbol: trade.symbol,
        type: trade.type,
        amount: trade.amount,
        entryPrice: trade.price,
        margin: trade.margin,
        floatingPnL: trade.profit || 0
      });
    });
    
    // Core balances (STRICT SEPARATION)
    const walletBalance = account.balance;
    const creditBalance = account.creditBalance || 0;
    
    // Equity = Wallet + Credit + Floating P/L (DERIVED VALUE)
    const equity = walletBalance + creditBalance + floatingPnL;
    const freeMargin = equity - usedMargin;
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : null;
    const buyingPower = equity * account.leverage;
    const withdrawable = Math.max(0, walletBalance);
    
    res.json({
      success: true,
      data: {
        ...account.toObject(),
        // Core balances
        walletBalance,
        creditBalance,
        // Derived values
        equity,
        floatingPnL,
        usedMargin,
        freeMargin,
        marginLevel,
        buyingPower,
        withdrawable,
        // Risk levels
        stopOutLevel: account.stopOutLevel || 20,
        marginCallLevel: account.marginCallLevel || 50,
        isMarginCall: marginLevel !== null && marginLevel <= (account.marginCallLevel || 50),
        isStopOut: marginLevel !== null && marginLevel <= (account.stopOutLevel || 20)
      },
      openTrades: openTrades.length,
      positions
    });
  } catch (error) {
    console.error('Get trading account error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/trading-accounts
// @desc    Create new trading account
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { accountTypeId, leverage, currency, isDemo, nickname } = req.body;
    
    // Get account type
    const accountType = await AccountType.findById(accountTypeId);
    if (!accountType || !accountType.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid account type' });
    }
    
    // Validate leverage
    const selectedLeverage = leverage || accountType.maxLeverage;
    if (selectedLeverage > accountType.maxLeverage) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum leverage for ${accountType.name} is 1:${accountType.maxLeverage}` 
      });
    }
    
    // Create trading account (auto-approved)
    const tradingAccount = await TradingAccount.create({
      user: req.user._id,
      accountType: accountType._id,
      leverage: selectedLeverage,
      currency: currency || 'USD',
      isDemo: isDemo || false,
      nickname: nickname || `${accountType.name} Account`,
      status: 'active',
      balance: isDemo ? 10000 : 0, // Demo accounts get $10,000
      server: isDemo ? 'concorddex-Demo' : 'concorddex-Live'
    });
    
    await tradingAccount.populate('accountType');
    
    res.status(201).json({
      success: true,
      message: `${isDemo ? 'Demo' : 'Live'} trading account created successfully`,
      data: tradingAccount
    });
  } catch (error) {
    console.error('Create trading account error:', error);
    console.error('Request body:', req.body);
    console.error('User ID:', req.user?._id);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/trading-accounts/:id
// @desc    Update trading account (nickname, leverage)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { nickname, leverage } = req.body;
    
    const account = await TradingAccount.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('accountType');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    // Check for open trades before changing leverage
    if (leverage && leverage !== account.leverage) {
      const openTrades = await Trade.countDocuments({ 
        tradingAccount: account._id,
        status: 'open' 
      });
      
      if (openTrades > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot change leverage with open trades' 
        });
      }
      
      if (leverage > account.accountType.maxLeverage) {
        return res.status(400).json({ 
          success: false, 
          message: `Maximum leverage for ${account.accountType.name} is 1:${account.accountType.maxLeverage}` 
        });
      }
      
      account.leverage = leverage;
    }
    
    if (nickname) {
      account.nickname = nickname;
    }
    
    await account.save();
    
    res.json({
      success: true,
      message: 'Account updated successfully',
      data: account
    });
  } catch (error) {
    console.error('Update trading account error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/trading-accounts/transfer
// @desc    Transfer funds (wallet <-> account, account <-> account)
// @access  Private
router.post('/transfer', protect, async (req, res) => {
  try {
    const { fromType, fromAccountId, toType, toAccountId, amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    
    const user = await User.findById(req.user._id);
    let fromAccount = null;
    let toAccount = null;
    
    // Validate source
    if (fromType === 'wallet') {
      if (user.balance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
    } else if (fromType === 'trading_account') {
      fromAccount = await TradingAccount.findOne({ 
        _id: fromAccountId, 
        user: req.user._id,
        status: 'active'
      });
      
      if (!fromAccount) {
        return res.status(404).json({ success: false, message: 'Source account not found' });
      }
      
      // CRITICAL: Only WALLET BALANCE is withdrawable/transferable
      // Credit balance is NEVER withdrawable or transferable
      const walletBalance = fromAccount.balance;
      const creditBalance = fromAccount.creditBalance || 0;
      
      // Check for open trades
      const openTrades = await Trade.find({ 
        tradingAccount: fromAccount._id,
        status: 'open' 
      });
      
      let floatingPnL = 0;
      let usedMargin = 0;
      openTrades.forEach(trade => {
        floatingPnL += trade.profit || 0;
        usedMargin += trade.margin || 0;
      });
      
      // Calculate equity and free margin
      const equity = walletBalance + creditBalance + floatingPnL;
      const freeMargin = equity - usedMargin;
      
      // Withdrawable = wallet balance only (not credit), limited by free margin
      const maxWithdrawable = Math.min(walletBalance, freeMargin);
      
      if (amount > maxWithdrawable) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient withdrawable funds. Available: $${maxWithdrawable.toFixed(2)} (Wallet: $${walletBalance.toFixed(2)}, Credit: $${creditBalance.toFixed(2)} - NOT withdrawable)` 
        });
      }
      
      // Check if transfer would trigger margin call
      if (openTrades.length > 0) {
        const newEquity = equity - amount;
        const newMarginLevel = usedMargin > 0 ? (newEquity / usedMargin) * 100 : Infinity;
        const marginCallLevel = fromAccount.marginCallLevel || 50;
        
        if (newMarginLevel <= marginCallLevel) {
          return res.status(400).json({
            success: false,
            message: `Transfer would trigger margin call. Max transferable: $${this.calculateMaxTransferable(equity, usedMargin, marginCallLevel, walletBalance).toFixed(2)}`
          });
        }
      }
    }
    
    // Validate destination
    if (toType === 'trading_account') {
      toAccount = await TradingAccount.findOne({ 
        _id: toAccountId, 
        user: req.user._id,
        status: 'active'
      });
      
      if (!toAccount) {
        return res.status(404).json({ success: false, message: 'Destination account not found' });
      }
      
      // Check minimum deposit for account type
      if (fromType === 'wallet') {
        await toAccount.populate('accountType');
        const currentBalance = toAccount.balance;
        const newBalance = currentBalance + amount;
        
        if (currentBalance === 0 && amount < toAccount.accountType.minDeposit) {
          return res.status(400).json({ 
            success: false, 
            message: `Minimum deposit for ${toAccount.accountType.name} account is $${toAccount.accountType.minDeposit}` 
          });
        }
      }
    }
    
    // Execute transfer
    if (fromType === 'wallet') {
      user.balance -= amount;
      await user.save();
    } else {
      fromAccount.balance -= amount;
      fromAccount.totalWithdrawals += amount;
      await fromAccount.save();
    }
    
    if (toType === 'wallet') {
      user.balance += amount;
      await user.save();
    } else {
      toAccount.balance += amount;
      toAccount.totalDeposits += amount;
      await toAccount.save();
    }
    
    // Determine transfer type
    let transferType = 'account_to_account';
    if (fromType === 'wallet' && toType === 'trading_account') {
      transferType = 'wallet_to_account';
    } else if (fromType === 'trading_account' && toType === 'wallet') {
      transferType = 'account_to_wallet';
    }
    
    // Create transfer record
    const transfer = await InternalTransfer.create({
      user: req.user._id,
      transferType,
      fromType,
      fromAccount: fromAccount?._id,
      toType,
      toAccount: toAccount?._id,
      amount,
      status: 'completed'
    });
    
    // Create transaction records
    if (fromType === 'wallet') {
      await Transaction.create({
        user: req.user._id,
        type: 'transfer_out',
        amount: -amount,
        description: `Transfer to trading account ${toAccount.accountNumber}`,
        status: 'completed',
        reference: transfer._id
      });
    }
    
    if (toType === 'wallet') {
      await Transaction.create({
        user: req.user._id,
        type: 'transfer_in',
        amount: amount,
        description: `Transfer from trading account ${fromAccount.accountNumber}`,
        status: 'completed',
        reference: transfer._id
      });
    }
    
    res.json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        transfer,
        walletBalance: user.balance,
        fromAccountBalance: fromAccount?.balance,
        toAccountBalance: toAccount?.balance
      }
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trading-accounts/:id/status
// @desc    Get real-time account status with equity, margin, and credit info
// @access  Private
router.get('/:id/status', protect, async (req, res) => {
  try {
    const account = await TradingAccount.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('accountType');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    // Get real-time floating P/L from TradeEngine
    const tradeEngine = require('../services/TradeEngine');
    const openTrades = await Trade.find({ 
      tradingAccount: account._id, 
      status: 'open' 
    });
    
    let floatingPnL = 0;
    let usedMargin = 0;
    const positions = [];
    
    for (const trade of openTrades) {
      const price = tradeEngine.getPrice(trade.symbol);
      let tradePnL = trade.profit || 0;
      
      if (price) {
        const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
        tradePnL = tradeEngine.calculatePnL(trade, currentPrice);
      }
      
      floatingPnL += tradePnL;
      usedMargin += trade.margin || 0;
      
      positions.push({
        tradeId: trade._id,
        symbol: trade.symbol,
        type: trade.type,
        amount: trade.amount,
        entryPrice: trade.price,
        currentPrice: price ? (trade.type === 'buy' ? price.bid : price.ask) : null,
        margin: trade.margin,
        floatingPnL: tradePnL,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit
      });
    }
    
    // Core balances (STRICT SEPARATION)
    const walletBalance = account.balance;
    const creditBalance = account.creditBalance || 0;
    
    // Equity = Wallet + Credit + Floating P/L (DERIVED VALUE - NOT STORED)
    const equity = walletBalance + creditBalance + floatingPnL;
    const freeMargin = equity - usedMargin;
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : null;
    const buyingPower = equity * account.leverage;
    
    // Only wallet balance is withdrawable (credit is NEVER withdrawable)
    const withdrawable = Math.max(0, walletBalance);
    
    // Calculate max withdrawable considering margin requirements
    let maxWithdrawable = withdrawable;
    if (openTrades.length > 0 && usedMargin > 0) {
      const marginCallLevel = account.marginCallLevel || 50;
      const requiredEquity = (usedMargin * marginCallLevel) / 100;
      const excessEquity = equity - requiredEquity;
      maxWithdrawable = Math.max(0, Math.min(withdrawable, excessEquity));
    }
    
    res.json({
      success: true,
      data: {
        accountId: account._id,
        accountNumber: account.accountNumber,
        accountType: account.accountType?.name,
        
        // Core balances (STRICT SEPARATION)
        walletBalance,
        creditBalance,
        
        // Derived values (calculated in real-time)
        equity,
        floatingPnL,
        usedMargin,
        freeMargin,
        marginLevel,
        
        // Trading power
        leverage: account.leverage,
        buyingPower,
        
        // Withdrawal info
        withdrawable,
        maxWithdrawable,
        
        // Risk levels
        stopOutLevel: account.stopOutLevel || 20,
        marginCallLevel: account.marginCallLevel || 50,
        isMarginCall: marginLevel !== null && marginLevel <= (account.marginCallLevel || 50),
        isStopOut: marginLevel !== null && marginLevel <= (account.stopOutLevel || 20),
        
        // Positions
        openTrades: openTrades.length,
        positions
      }
    });
  } catch (error) {
    console.error('Get account status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/trading-accounts/:id/withdraw
// @desc    Withdraw from trading account to wallet (only wallet balance, never credit)
// @access  Private
router.post('/:id/withdraw', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    
    const account = await TradingAccount.findOne({ 
      _id: req.params.id, 
      user: req.user._id,
      status: 'active'
    });
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    // CRITICAL: Validate withdrawal using the model method
    // This ensures credit is NEVER withdrawable
    const validation = account.validateWithdrawal(amount);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }
    
    // Check for open trades and margin requirements
    const openTrades = await Trade.find({ 
      tradingAccount: account._id, 
      status: 'open' 
    });
    
    if (openTrades.length > 0) {
      let floatingPnL = 0;
      let usedMargin = 0;
      
      const tradeEngine = require('../services/TradeEngine');
      for (const trade of openTrades) {
        const price = tradeEngine.getPrice(trade.symbol);
        if (price) {
          const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
          floatingPnL += tradeEngine.calculatePnL(trade, currentPrice);
        }
        usedMargin += trade.margin || 0;
      }
      
      const walletBalance = account.balance;
      const creditBalance = account.creditBalance || 0;
      const equity = walletBalance + creditBalance + floatingPnL;
      const newEquity = equity - amount;
      const newMarginLevel = usedMargin > 0 ? (newEquity / usedMargin) * 100 : Infinity;
      const marginCallLevel = account.marginCallLevel || 50;
      
      if (newMarginLevel <= marginCallLevel) {
        // Calculate max withdrawable
        const requiredEquity = (usedMargin * marginCallLevel) / 100;
        const maxWithdrawable = Math.max(0, Math.min(walletBalance, equity - requiredEquity));
        
        return res.status(400).json({
          success: false,
          message: `Withdrawal would trigger margin call. Max withdrawable: $${maxWithdrawable.toFixed(2)}`,
          data: {
            currentMarginLevel: usedMargin > 0 ? (equity / usedMargin) * 100 : null,
            projectedMarginLevel: newMarginLevel,
            marginCallLevel,
            maxWithdrawable
          }
        });
      }
    }
    
    // Execute withdrawal (transfer to user wallet)
    const user = await User.findById(req.user._id);
    const accountBalanceBefore = account.balance;
    const userBalanceBefore = user.balance;
    
    account.balance -= amount;
    account.totalWithdrawals = (account.totalWithdrawals || 0) + amount;
    await account.save();
    
    user.balance += amount;
    await user.save();
    
    // Create transfer record
    const transfer = await InternalTransfer.create({
      user: req.user._id,
      transferType: 'account_to_wallet',
      fromType: 'trading_account',
      fromAccount: account._id,
      toType: 'wallet',
      toAccount: null,
      amount,
      status: 'completed'
    });
    
    // Create transaction record
    await Transaction.create({
      user: req.user._id,
      type: 'transfer_in',
      amount: amount,
      description: `Withdrawal from trading account ${account.accountNumber} to wallet`,
      balanceBefore: userBalanceBefore,
      balanceAfter: user.balance,
      status: 'completed',
      reference: transfer._id
    });
    
    res.json({
      success: true,
      message: `Successfully withdrew $${amount.toFixed(2)} to wallet`,
      data: {
        accountBalance: account.balance,
        walletBalance: user.balance,
        creditBalance: account.creditBalance || 0,
        withdrawn: amount
      }
    });
  } catch (error) {
    console.error('Account withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trading-accounts/:id/transfers
// @desc    Get transfer history for an account
// @access  Private
router.get('/:id/transfers', protect, async (req, res) => {
  try {
    const account = await TradingAccount.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    const transfers = await InternalTransfer.find({
      user: req.user._id,
      $or: [
        { fromAccount: account._id },
        { toAccount: account._id }
      ]
    })
    .populate('fromAccount', 'accountNumber')
    .populate('toAccount', 'accountNumber')
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/trading-accounts/transfers/all
// @desc    Get all transfer history for user
// @access  Private
router.get('/transfers/all', protect, async (req, res) => {
  try {
    const transfers = await InternalTransfer.find({ user: req.user._id })
      .populate('fromAccount', 'accountNumber nickname')
      .populate('toAccount', 'accountNumber nickname')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    console.error('Get all transfers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
