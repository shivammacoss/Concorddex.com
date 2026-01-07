const MasterReferrer = require('../models/MasterReferrer');
const MasterReferral = require('../models/MasterReferral');
const MasterReferralCommissionLog = require('../models/MasterReferralCommissionLog');
const MasterReferralSettings = require('../models/MasterReferralSettings');
const TradeMaster = require('../models/TradeMaster');
const CopyFollower = require('../models/CopyFollower');

class MasterReferralEngine {
  constructor(io) {
    this.io = io;
  }

  // Process referral commission when master earns commission from a copied trade
  async processReferralCommission(masterCommissionData) {
    try {
      const {
        masterId,
        masterUserId,
        followerUserId,
        copyTradeMapId,
        masterTradeId,
        followerTradeId,
        symbol,
        lots,
        masterCommissionAmount
      } = masterCommissionData;

      if (masterCommissionAmount <= 0) {
        return null;
      }

      // Check if system is enabled
      const settings = await MasterReferralSettings.getSettings();
      if (!settings.isEnabled) {
        return null;
      }

      // Find if this follower was referred to this master
      const referral = await MasterReferral.findOne({
        masterId,
        referredUserId: followerUserId,
        status: 'active',
        isFollowing: true
      });

      if (!referral) {
        return null; // Follower was not referred
      }

      // Get the referrer
      const referrer = await MasterReferrer.findOne({
        userId: referral.referrerUserId,
        status: 'active'
      });

      if (!referrer || referrer.commissionFrozen) {
        return null;
      }

      // Get referrer's effective commission percent
      const commissionPercent = await referrer.getEffectiveCommission();
      
      // Calculate referrer commission
      let referrerCommission = masterCommissionAmount * (commissionPercent / 100);
      referrerCommission = Math.round(referrerCommission * 100) / 100;

      if (referrerCommission <= 0) {
        return null;
      }

      // Create commission log
      const commissionLog = await MasterReferralCommissionLog.create({
        referrerId: referrer._id,
        referrerUserId: referrer.userId,
        masterId,
        masterUserId,
        followerUserId,
        masterReferralId: referral._id,
        sourceType: 'copy_trade',
        copyTradeMapId,
        masterTradeId,
        followerTradeId,
        symbol,
        lots,
        masterCommissionAmount,
        referrerCommissionPercent: commissionPercent,
        referrerCommissionAmount: referrerCommission,
        status: 'credited',
        description: `Referral commission for ${symbol} trade (${lots} lots)`
      });

      // Credit referrer wallet
      referrer.wallet.balance += referrerCommission;
      referrer.wallet.totalEarned += referrerCommission;
      referrer.stats.totalTrades += 1;
      referrer.stats.totalVolume += lots;
      await referrer.save();

      // Update referral stats
      referral.stats.totalTrades += 1;
      referral.stats.totalVolume += lots;
      referral.stats.totalMasterCommission += masterCommissionAmount;
      referral.stats.totalReferrerCommission += referrerCommission;
      referral.lastActivityAt = new Date();
      await referral.save();

      // Check for auto-upgrade
      await referrer.checkAutoUpgrade();

      // Emit notification
      if (this.io) {
        this.io.to(`user_${referrer.userId}`).emit('master_referral_commission', {
          amount: referrerCommission,
          symbol,
          masterCommission: masterCommissionAmount,
          type: 'copy_trade'
        });
      }

      console.log(`[MasterReferralEngine] Credited $${referrerCommission} to referrer ${referrer.referrerId}`);
      return commissionLog;

    } catch (error) {
      console.error('[MasterReferralEngine] Process commission error:', error);
      return null;
    }
  }

  // Register new referral when user signs up with master referral link
  async registerReferral(newUser, masterId, referrerId) {
    try {
      // Find the master
      const master = await TradeMaster.findOne({
        $or: [
          { _id: masterId },
          { masterId: masterId }
        ],
        status: 'approved'
      });

      if (!master) {
        console.log(`[MasterReferralEngine] Invalid master: ${masterId}`);
        return null;
      }

      // Find or create the referrer
      let referrer = await MasterReferrer.findOne({
        $or: [
          { referrerId: referrerId },
          { userId: referrerId }
        ]
      });

      // If no referrer found and referrerId looks like a user ID, create new referrer
      if (!referrer && referrerId) {
        const User = require('../models/User');
        const referrerUser = await User.findById(referrerId);
        if (referrerUser) {
          referrer = await MasterReferrer.create({
            userId: referrerUser._id
          });
        }
      }

      if (!referrer) {
        console.log(`[MasterReferralEngine] Invalid referrer: ${referrerId}`);
        return null;
      }

      // Prevent self-referral
      if (referrer.userId.toString() === newUser._id.toString()) {
        console.log(`[MasterReferralEngine] Self-referral blocked`);
        return null;
      }

      // Check if referral already exists
      const existingReferral = await MasterReferral.findOne({
        referredUserId: newUser._id,
        masterId: master._id
      });

      if (existingReferral) {
        console.log(`[MasterReferralEngine] Referral already exists`);
        return existingReferral;
      }

      // Create referral (pending until user follows the master)
      const referral = await MasterReferral.create({
        referrerUserId: referrer.userId,
        masterId: master._id,
        masterUserId: master.userId,
        referredUserId: newUser._id,
        referralCode: `${master.masterId}-${referrer.referrerId}`,
        status: 'pending'
      });

      // Update referrer stats
      referrer.stats.totalReferrals += 1;
      await referrer.save();

      console.log(`[MasterReferralEngine] Registered referral: ${newUser.email} → Master ${master.masterId} by ${referrer.referrerId}`);
      return referral;

    } catch (error) {
      console.error('[MasterReferralEngine] Register referral error:', error);
      return null;
    }
  }

  // Activate referral when user starts following the master
  async activateReferral(follower) {
    try {
      const referral = await MasterReferral.findOne({
        referredUserId: follower.userId,
        masterId: follower.masterId,
        status: 'pending'
      });

      if (!referral) {
        return null;
      }

      referral.status = 'active';
      referral.isFollowing = true;
      referral.followerId = follower._id;
      referral.activatedAt = new Date();
      await referral.save();

      // Update referrer stats
      const referrer = await MasterReferrer.findOne({ userId: referral.referrerUserId });
      if (referrer) {
        referrer.stats.activeReferrals += 1;
        await referrer.save();
        await referrer.checkAutoUpgrade();
      }

      console.log(`[MasterReferralEngine] Activated referral for user ${follower.userId}`);
      return referral;

    } catch (error) {
      console.error('[MasterReferralEngine] Activate referral error:', error);
      return null;
    }
  }

  // Deactivate referral when user stops following
  async deactivateReferral(follower) {
    try {
      const referral = await MasterReferral.findOne({
        referredUserId: follower.userId,
        masterId: follower.masterId,
        status: 'active'
      });

      if (!referral) {
        return null;
      }

      referral.isFollowing = false;
      referral.status = 'inactive';
      await referral.save();

      // Update referrer stats
      const referrer = await MasterReferrer.findOne({ userId: referral.referrerUserId });
      if (referrer && referrer.stats.activeReferrals > 0) {
        referrer.stats.activeReferrals -= 1;
        await referrer.save();
      }

      console.log(`[MasterReferralEngine] Deactivated referral for user ${follower.userId}`);
      return referral;

    } catch (error) {
      console.error('[MasterReferralEngine] Deactivate referral error:', error);
      return null;
    }
  }

  // Get or create referrer profile for a user
  async getOrCreateReferrer(userId) {
    try {
      let referrer = await MasterReferrer.findOne({ userId });
      
      if (!referrer) {
        referrer = await MasterReferrer.create({ userId });
      }
      
      return referrer;
    } catch (error) {
      console.error('[MasterReferralEngine] Get/create referrer error:', error);
      return null;
    }
  }

  // Get referrer dashboard data
  async getReferrerDashboard(userId) {
    try {
      const referrer = await MasterReferrer.findOne({ userId }).populate('userId', 'firstName lastName email');
      
      if (!referrer) {
        return null;
      }

      // Get level info
      const settings = await MasterReferralSettings.getSettings();
      const currentLevel = settings.levels.find(l => l.level === referrer.commissionLevel);
      const nextLevel = await MasterReferralSettings.getNextLevelInfo(
        referrer.commissionLevel,
        referrer.stats.activeReferrals
      );

      // Get referrals grouped by master
      const referrals = await MasterReferral.find({ referrerUserId: userId })
        .populate('masterId', 'masterId displayName avatar stats')
        .populate('referredUserId', 'firstName lastName email');

      // Group by master
      const masterStats = {};
      for (const ref of referrals) {
        const masterId = ref.masterId?._id?.toString();
        if (!masterId) continue;
        
        if (!masterStats[masterId]) {
          masterStats[masterId] = {
            master: ref.masterId,
            referrals: [],
            totalReferrals: 0,
            activeReferrals: 0,
            totalCommission: 0
          };
        }
        
        masterStats[masterId].referrals.push(ref);
        masterStats[masterId].totalReferrals += 1;
        if (ref.status === 'active' && ref.isFollowing) {
          masterStats[masterId].activeReferrals += 1;
        }
        masterStats[masterId].totalCommission += ref.stats.totalReferrerCommission || 0;
      }

      // Get recent commission logs
      const recentCommissions = await MasterReferralCommissionLog.find({
        referrerUserId: userId
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('masterId', 'masterId displayName')
        .populate('followerUserId', 'firstName lastName');

      return {
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
        nextLevel,
        masterStats: Object.values(masterStats),
        recentCommissions,
        settings: {
          minWithdrawal: settings.minWithdrawal,
          levels: settings.levels.filter(l => l.isActive)
        }
      };

    } catch (error) {
      console.error('[MasterReferralEngine] Get dashboard error:', error);
      return null;
    }
  }
}

module.exports = MasterReferralEngine;
