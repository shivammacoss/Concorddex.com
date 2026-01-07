const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const MasterReferrer = require('../models/MasterReferrer');
const MasterReferral = require('../models/MasterReferral');
const MasterReferralCommissionLog = require('../models/MasterReferralCommissionLog');
const MasterReferralSettings = require('../models/MasterReferralSettings');
const MasterReferralEngine = require('../services/masterReferralEngine');
const TradeMaster = require('../models/TradeMaster');

// @route   GET /api/master-referral/dashboard
// @desc    Get referrer dashboard data
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const engine = new MasterReferralEngine();
    const dashboard = await engine.getReferrerDashboard(req.user._id);
    
    if (!dashboard) {
      // Create new referrer profile
      const referrer = await engine.getOrCreateReferrer(req.user._id);
      const settings = await MasterReferralSettings.getSettings();
      const level = settings.levels.find(l => l.level === 1);
      
      return res.json({
        success: true,
        data: {
          referrer: {
            referrerId: referrer.referrerId,
            status: referrer.status,
            level: 1,
            levelName: level?.name || 'Standard',
            levelColor: level?.color || '#6b7280',
            commissionPercent: level?.commissionPercent || 5,
            wallet: referrer.wallet,
            stats: referrer.stats
          },
          nextLevel: await MasterReferralSettings.getNextLevelInfo(1, 0),
          masterStats: [],
          recentCommissions: [],
          settings: {
            minWithdrawal: settings.minWithdrawal,
            levels: settings.levels.filter(l => l.isActive)
          }
        }
      });
    }
    
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Get referrer dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/master-referral/profile
// @desc    Get or create referrer profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const engine = new MasterReferralEngine();
    const referrer = await engine.getOrCreateReferrer(req.user._id);
    
    const settings = await MasterReferralSettings.getSettings();
    const currentLevel = settings.levels.find(l => l.level === referrer.commissionLevel);
    const nextLevel = await MasterReferralSettings.getNextLevelInfo(
      referrer.commissionLevel,
      referrer.stats.activeReferrals
    );
    
    res.json({
      success: true,
      data: {
        referrer: {
          referrerId: referrer.referrerId,
          status: referrer.status,
          level: referrer.commissionLevel,
          levelName: currentLevel?.name || 'Standard',
          levelColor: currentLevel?.color || '#6b7280',
          commissionPercent: currentLevel?.commissionPercent || 5,
          wallet: referrer.wallet,
          stats: referrer.stats
        },
        nextLevel
      }
    });
  } catch (error) {
    console.error('Get referrer profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/master-referral/link/:masterId
// @desc    Get referral link for a specific master
// @access  Private
router.get('/link/:masterId', protect, async (req, res) => {
  try {
    const master = await TradeMaster.findOne({
      $or: [
        { _id: req.params.masterId },
        { masterId: req.params.masterId }
      ],
      status: 'approved'
    });
    
    if (!master) {
      return res.status(404).json({ success: false, message: 'Master not found' });
    }
    
    const engine = new MasterReferralEngine();
    const referrer = await engine.getOrCreateReferrer(req.user._id);
    
    const baseUrl = process.env.FRONTEND_URL || 'https://concorddex.com';
    const referralLink = `${baseUrl}/register?masterRef=${master.masterId}&ref=${referrer.referrerId}`;
    
    res.json({
      success: true,
      data: {
        masterId: master.masterId,
        masterName: master.displayName,
        referrerId: referrer.referrerId,
        referralLink,
        referralCode: `${master.masterId}-${referrer.referrerId}`
      }
    });
  } catch (error) {
    console.error('Get referral link error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/master-referral/referrals
// @desc    Get all referrals for the current user
// @access  Private
router.get('/referrals', protect, async (req, res) => {
  try {
    const { masterId, status } = req.query;
    
    const query = { referrerUserId: req.user._id };
    if (masterId) query.masterId = masterId;
    if (status) query.status = status;
    
    const referrals = await MasterReferral.find(query)
      .populate('masterId', 'masterId displayName avatar')
      .populate('referredUserId', 'firstName lastName email createdAt')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: referrals });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/master-referral/commissions
// @desc    Get commission history
// @access  Private
router.get('/commissions', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, masterId } = req.query;
    
    const query = { referrerUserId: req.user._id };
    if (masterId) query.masterId = masterId;
    
    const commissions = await MasterReferralCommissionLog.find(query)
      .populate('masterId', 'masterId displayName')
      .populate('followerUserId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await MasterReferralCommissionLog.countDocuments(query);
    
    res.json({
      success: true,
      data: commissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/master-referral/withdraw
// @desc    Request withdrawal from referral wallet
// @access  Private
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    
    const referrer = await MasterReferrer.findOne({ userId: req.user._id });
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Referrer profile not found' });
    }
    
    const settings = await MasterReferralSettings.getSettings();
    
    if (amount < settings.minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is $${settings.minWithdrawal}`
      });
    }
    
    if (amount > referrer.wallet.balance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Deduct from wallet
    referrer.wallet.balance -= amount;
    referrer.wallet.pendingBalance += amount;
    await referrer.save();
    
    // Create withdrawal request (you can integrate with your existing withdrawal system)
    // For now, just return success
    
    res.json({
      success: true,
      message: 'Withdrawal request submitted',
      data: {
        amount,
        newBalance: referrer.wallet.balance,
        pendingBalance: referrer.wallet.pendingBalance
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/master-referral/my-referrer-id
// @desc    Get current user's referrer ID
// @access  Private
router.get('/my-referrer-id', protect, async (req, res) => {
  try {
    const engine = new MasterReferralEngine();
    const referrer = await engine.getOrCreateReferrer(req.user._id);
    
    res.json({
      success: true,
      data: {
        referrerId: referrer.referrerId
      }
    });
  } catch (error) {
    console.error('Get referrer ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/master-referral/settings
// @desc    Get referral settings (levels, etc.)
// @access  Private
router.get('/settings', protect, async (req, res) => {
  try {
    const settings = await MasterReferralSettings.getSettings();
    
    res.json({
      success: true,
      data: {
        isEnabled: settings.isEnabled,
        levels: settings.levels.filter(l => l.isActive),
        minWithdrawal: settings.minWithdrawal
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
