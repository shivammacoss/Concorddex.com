const express = require('express');
const router = express.Router();
const { protectAdmin } = require('./adminAuth');
const MasterReferrer = require('../models/MasterReferrer');
const MasterReferral = require('../models/MasterReferral');
const MasterReferralCommissionLog = require('../models/MasterReferralCommissionLog');
const MasterReferralSettings = require('../models/MasterReferralSettings');

// @route   GET /api/admin/master-referral/settings
// @desc    Get master referral settings
// @access  Admin
router.get('/settings', protectAdmin, async (req, res) => {
  try {
    const settings = await MasterReferralSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/master-referral/settings
// @desc    Update master referral settings
// @access  Admin
router.put('/settings', protectAdmin, async (req, res) => {
  try {
    const settings = await MasterReferralSettings.getSettings();
    
    const {
      defaultCommissionPercent,
      minWithdrawal,
      requireWithdrawalApproval,
      autoUpgradeEnabled,
      isEnabled
    } = req.body;
    
    if (defaultCommissionPercent !== undefined) settings.defaultCommissionPercent = defaultCommissionPercent;
    if (minWithdrawal !== undefined) settings.minWithdrawal = minWithdrawal;
    if (requireWithdrawalApproval !== undefined) settings.requireWithdrawalApproval = requireWithdrawalApproval;
    if (autoUpgradeEnabled !== undefined) settings.autoUpgradeEnabled = autoUpgradeEnabled;
    if (isEnabled !== undefined) settings.isEnabled = isEnabled;
    
    settings.updatedBy = req.admin._id;
    await settings.save();
    
    res.json({ success: true, data: settings, message: 'Settings updated' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/master-referral/levels
// @desc    Get all referral levels
// @access  Admin
router.get('/levels', protectAdmin, async (req, res) => {
  try {
    const settings = await MasterReferralSettings.getSettings();
    res.json({ success: true, data: settings.levels });
  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/master-referral/levels
// @desc    Add new referral level
// @access  Admin
router.post('/levels', protectAdmin, async (req, res) => {
  try {
    const settings = await MasterReferralSettings.getSettings();
    
    const { name, level, commissionPercent, description, minReferrals, color } = req.body;
    
    // Check if level number already exists
    if (settings.levels.some(l => l.level === level)) {
      return res.status(400).json({ success: false, message: 'Level number already exists' });
    }
    
    settings.levels.push({
      name,
      level,
      commissionPercent,
      description: description || '',
      minReferrals: minReferrals || 0,
      color: color || '#3b82f6',
      isActive: true
    });
    
    // Sort levels by level number
    settings.levels.sort((a, b) => a.level - b.level);
    settings.updatedBy = req.admin._id;
    await settings.save();
    
    res.json({ success: true, data: settings.levels, message: 'Level added' });
  } catch (error) {
    console.error('Add level error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/master-referral/levels/:levelId
// @desc    Update referral level
// @access  Admin
router.put('/levels/:levelId', protectAdmin, async (req, res) => {
  try {
    const settings = await MasterReferralSettings.getSettings();
    
    const levelIndex = settings.levels.findIndex(l => l._id.toString() === req.params.levelId);
    if (levelIndex === -1) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }
    
    const { name, commissionPercent, description, minReferrals, color, isActive } = req.body;
    
    if (name !== undefined) settings.levels[levelIndex].name = name;
    if (commissionPercent !== undefined) settings.levels[levelIndex].commissionPercent = commissionPercent;
    if (description !== undefined) settings.levels[levelIndex].description = description;
    if (minReferrals !== undefined) settings.levels[levelIndex].minReferrals = minReferrals;
    if (color !== undefined) settings.levels[levelIndex].color = color;
    if (isActive !== undefined) settings.levels[levelIndex].isActive = isActive;
    
    settings.updatedBy = req.admin._id;
    await settings.save();
    
    res.json({ success: true, data: settings.levels, message: 'Level updated' });
  } catch (error) {
    console.error('Update level error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/master-referral/levels/:levelId
// @desc    Delete referral level
// @access  Admin
router.delete('/levels/:levelId', protectAdmin, async (req, res) => {
  try {
    const settings = await MasterReferralSettings.getSettings();
    
    const levelIndex = settings.levels.findIndex(l => l._id.toString() === req.params.levelId);
    if (levelIndex === -1) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }
    
    // Don't allow deleting level 1 (default)
    if (settings.levels[levelIndex].level === 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete default level' });
    }
    
    settings.levels.splice(levelIndex, 1);
    settings.updatedBy = req.admin._id;
    await settings.save();
    
    res.json({ success: true, data: settings.levels, message: 'Level deleted' });
  } catch (error) {
    console.error('Delete level error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/master-referral/referrers
// @desc    Get all referrers
// @access  Admin
router.get('/referrers', protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    
    const query = {};
    if (status) query.status = status;
    
    let referrers = await MasterReferrer.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // If search, filter by user name/email
    if (search) {
      referrers = referrers.filter(r => 
        r.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.userId?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        r.userId?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        r.referrerId?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    const total = await MasterReferrer.countDocuments(query);
    
    // Get level info for each referrer
    const settings = await MasterReferralSettings.getSettings();
    const referrersWithLevel = referrers.map(r => {
      const level = settings.levels.find(l => l.level === r.commissionLevel);
      return {
        ...r.toObject(),
        levelName: level?.name || 'Standard',
        levelColor: level?.color || '#6b7280',
        commissionPercent: level?.commissionPercent || 5
      };
    });
    
    res.json({
      success: true,
      data: referrersWithLevel,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get referrers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/master-referral/referrers/:id
// @desc    Update referrer (level, status, custom commission)
// @access  Admin
router.put('/referrers/:id', protectAdmin, async (req, res) => {
  try {
    const referrer = await MasterReferrer.findById(req.params.id);
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Referrer not found' });
    }
    
    const { status, commissionLevel, customCommission, commissionFrozen, adminNote } = req.body;
    
    if (status !== undefined) referrer.status = status;
    if (commissionLevel !== undefined) referrer.commissionLevel = commissionLevel;
    if (customCommission !== undefined) referrer.customCommission = customCommission;
    if (commissionFrozen !== undefined) referrer.commissionFrozen = commissionFrozen;
    if (adminNote !== undefined) referrer.adminNote = adminNote;
    
    await referrer.save();
    
    res.json({ success: true, data: referrer, message: 'Referrer updated' });
  } catch (error) {
    console.error('Update referrer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/master-referral/referrals
// @desc    Get all referrals
// @access  Admin
router.get('/referrals', protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, masterId, referrerId } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (masterId) query.masterId = masterId;
    if (referrerId) query.referrerUserId = referrerId;
    
    const referrals = await MasterReferral.find(query)
      .populate('referrerUserId', 'firstName lastName email')
      .populate('masterId', 'masterId displayName')
      .populate('referredUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await MasterReferral.countDocuments(query);
    
    res.json({
      success: true,
      data: referrals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/master-referral/commissions
// @desc    Get all commission logs
// @access  Admin
router.get('/commissions', protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, referrerId, masterId } = req.query;
    
    const query = {};
    if (referrerId) query.referrerUserId = referrerId;
    if (masterId) query.masterId = masterId;
    
    const commissions = await MasterReferralCommissionLog.find(query)
      .populate('referrerUserId', 'firstName lastName email')
      .populate('masterId', 'masterId displayName')
      .populate('followerUserId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await MasterReferralCommissionLog.countDocuments(query);
    
    // Calculate totals
    const totals = await MasterReferralCommissionLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalMasterCommission: { $sum: '$masterCommissionAmount' },
          totalReferrerCommission: { $sum: '$referrerCommissionAmount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: commissions,
      totals: totals[0] || { totalMasterCommission: 0, totalReferrerCommission: 0 },
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

// @route   GET /api/admin/master-referral/stats
// @desc    Get overall referral stats
// @access  Admin
router.get('/stats', protectAdmin, async (req, res) => {
  try {
    const totalReferrers = await MasterReferrer.countDocuments();
    const activeReferrers = await MasterReferrer.countDocuments({ status: 'active' });
    const totalReferrals = await MasterReferral.countDocuments();
    const activeReferrals = await MasterReferral.countDocuments({ status: 'active', isFollowing: true });
    
    const commissionStats = await MasterReferralCommissionLog.aggregate([
      {
        $group: {
          _id: null,
          totalCommissionPaid: { $sum: '$referrerCommissionAmount' },
          totalMasterCommission: { $sum: '$masterCommissionAmount' }
        }
      }
    ]);
    
    const walletStats = await MasterReferrer.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$wallet.balance' },
          totalEarned: { $sum: '$wallet.totalEarned' },
          totalWithdrawn: { $sum: '$wallet.totalWithdrawn' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        referrers: {
          total: totalReferrers,
          active: activeReferrers
        },
        referrals: {
          total: totalReferrals,
          active: activeReferrals
        },
        commissions: commissionStats[0] || { totalCommissionPaid: 0, totalMasterCommission: 0 },
        wallets: walletStats[0] || { totalBalance: 0, totalEarned: 0, totalWithdrawn: 0 }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
