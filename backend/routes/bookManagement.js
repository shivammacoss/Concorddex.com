const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Trade = require('../models/Trade');
const TradingAccount = require('../models/TradingAccount');
const { protectAdmin } = require('./adminAuth');
const liquidityProvider = require('../services/LiquidityProvider');

// Get all users with their book type
router.get('/users', protectAdmin, async (req, res) => {
  try {
    const { bookType, search, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    if (bookType && ['A', 'B'].includes(bookType)) {
      query.bookType = bookType;
    }
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('email firstName lastName bookType bookTypeChangedAt isActive createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    const aBookCount = await User.countDocuments({ bookType: 'A' });
    const bBookCount = await User.countDocuments({ bookType: 'B' });
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          aBookCount,
          bBookCount,
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Switch user book type
router.put('/users/:userId/book-type', protectAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { bookType } = req.body;
    
    if (!['A', 'B'].includes(bookType)) {
      return res.status(400).json({ success: false, message: 'Invalid book type. Must be A or B.' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const previousBookType = user.bookType;
    
    user.bookType = bookType;
    user.bookTypeChangedAt = new Date();
    user.bookTypeChangedBy = req.admin._id;
    await user.save();
    
    res.json({
      success: true,
      message: `User switched from ${previousBookType} Book to ${bookType} Book`,
      data: {
        userId: user._id,
        email: user.email,
        previousBookType,
        newBookType: bookType,
        changedAt: user.bookTypeChangedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get A Book trades (open positions)
router.get('/a-book/positions', protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    // Get all A Book users
    const aBookUsers = await User.find({ bookType: 'A' }).select('_id');
    const aBookUserIds = aBookUsers.map(u => u._id);
    
    // Get trading accounts for A Book users
    const tradingAccounts = await TradingAccount.find({ user: { $in: aBookUserIds } }).select('_id user');
    const accountIds = tradingAccounts.map(a => a._id);
    
    // Get open trades for A Book accounts
    const trades = await Trade.find({
      tradingAccount: { $in: accountIds },
      status: 'open'
    })
      .populate({
        path: 'tradingAccount',
        select: 'accountNumber accountType user',
        populate: {
          path: 'user',
          select: 'email firstName lastName'
        }
      })
      .sort({ openTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Trade.countDocuments({
      tradingAccount: { $in: accountIds },
      status: 'open'
    });
    
    // Calculate totals
    let totalVolume = 0;
    let totalProfit = 0;
    
    trades.forEach(trade => {
      totalVolume += trade.volume || 0;
      totalProfit += trade.profit || 0;
    });
    
    res.json({
      success: true,
      data: {
        trades,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalTrades: total,
          totalVolume: totalVolume.toFixed(2),
          totalProfit: totalProfit.toFixed(2)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get A Book closed trades (history)
router.get('/a-book/history', protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    
    // Get all A Book users
    const aBookUsers = await User.find({ bookType: 'A' }).select('_id');
    const aBookUserIds = aBookUsers.map(u => u._id);
    
    // Get trading accounts for A Book users
    const tradingAccounts = await TradingAccount.find({ user: { $in: aBookUserIds } }).select('_id');
    const accountIds = tradingAccounts.map(a => a._id);
    
    let query = {
      tradingAccount: { $in: accountIds },
      status: 'closed'
    };
    
    if (startDate || endDate) {
      query.closeTime = {};
      if (startDate) query.closeTime.$gte = new Date(startDate);
      if (endDate) query.closeTime.$lte = new Date(endDate);
    }
    
    const trades = await Trade.find(query)
      .populate({
        path: 'tradingAccount',
        select: 'accountNumber accountType user',
        populate: {
          path: 'user',
          select: 'email firstName lastName'
        }
      })
      .sort({ closeTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Trade.countDocuments(query);
    
    // Calculate totals
    let totalVolume = 0;
    let totalProfit = 0;
    let totalCommission = 0;
    let totalSwap = 0;
    
    // Get all closed trades for summary (not just paginated)
    const allClosedTrades = await Trade.find(query).select('volume profit commission swap');
    allClosedTrades.forEach(trade => {
      totalVolume += trade.volume || 0;
      totalProfit += trade.profit || 0;
      totalCommission += trade.commission || 0;
      totalSwap += trade.swap || 0;
    });
    
    res.json({
      success: true,
      data: {
        trades,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalTrades: total,
          totalVolume: totalVolume.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          totalCommission: totalCommission.toFixed(2),
          totalSwap: totalSwap.toFixed(2)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get A Book summary/stats
router.get('/a-book/stats', protectAdmin, async (req, res) => {
  try {
    // Get all A Book users
    const aBookUsers = await User.find({ bookType: 'A' }).select('_id');
    const aBookUserIds = aBookUsers.map(u => u._id);
    
    // Get trading accounts for A Book users
    const tradingAccounts = await TradingAccount.find({ user: { $in: aBookUserIds } });
    const accountIds = tradingAccounts.map(a => a._id);
    
    // Get trade stats
    const openTrades = await Trade.countDocuments({
      tradingAccount: { $in: accountIds },
      status: 'open'
    });
    
    const closedTrades = await Trade.countDocuments({
      tradingAccount: { $in: accountIds },
      status: 'closed'
    });
    
    // Calculate total equity and balance
    let totalBalance = 0;
    let totalEquity = 0;
    tradingAccounts.forEach(acc => {
      totalBalance += acc.balance || 0;
      totalEquity += acc.equity || acc.balance || 0;
    });
    
    // Get profit/loss from closed trades
    const profitAgg = await Trade.aggregate([
      {
        $match: {
          tradingAccount: { $in: accountIds },
          status: 'closed'
        }
      },
      {
        $group: {
          _id: null,
          totalProfit: { $sum: '$profit' },
          totalCommission: { $sum: '$commission' },
          totalSwap: { $sum: '$swap' },
          totalVolume: { $sum: '$volume' }
        }
      }
    ]);
    
    const profitStats = profitAgg[0] || {
      totalProfit: 0,
      totalCommission: 0,
      totalSwap: 0,
      totalVolume: 0
    };
    
    res.json({
      success: true,
      data: {
        userCount: aBookUsers.length,
        accountCount: tradingAccounts.length,
        openTrades,
        closedTrades,
        totalBalance: totalBalance.toFixed(2),
        totalEquity: totalEquity.toFixed(2),
        totalProfit: profitStats.totalProfit.toFixed(2),
        totalCommission: profitStats.totalCommission.toFixed(2),
        totalSwap: profitStats.totalSwap.toFixed(2),
        totalVolume: profitStats.totalVolume.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk switch users to A or B book
router.put('/users/bulk-switch', protectAdmin, async (req, res) => {
  try {
    const { userIds, bookType } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'User IDs array is required' });
    }
    
    if (!['A', 'B'].includes(bookType)) {
      return res.status(400).json({ success: false, message: 'Invalid book type. Must be A or B.' });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      {
        $set: {
          bookType,
          bookTypeChangedAt: new Date(),
          bookTypeChangedBy: req.admin._id
        }
      }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} users switched to ${bookType} Book`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get LP connection status
router.get('/lp-status', protectAdmin, async (req, res) => {
  try {
    const isEnabled = liquidityProvider.isEnabled();
    
    let balanceCheck = null;
    if (isEnabled) {
      balanceCheck = await liquidityProvider.getBalance();
    }
    
    res.json({
      success: true,
      data: {
        configured: isEnabled,
        baseUrl: isEnabled ? liquidityProvider.baseUrl : null,
        connectionTest: balanceCheck
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
