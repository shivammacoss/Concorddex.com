const mongoose = require('mongoose');

const masterReferrerSchema = new mongoose.Schema({
  // User who is a referrer
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Referrer Identity
  referrerId: {
    type: String,
    unique: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  // Commission Level
  commissionLevel: {
    type: Number,
    default: 1
  },
  
  // Custom Commission Override
  customCommission: {
    enabled: { type: Boolean, default: false },
    percent: { type: Number, default: 0 }
  },
  
  // Wallet
  wallet: {
    balance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 }
  },
  
  // Stats
  stats: {
    totalReferrals: { type: Number, default: 0 },
    activeReferrals: { type: Number, default: 0 },
    totalTrades: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 }
  },
  
  // Settings
  minWithdrawal: {
    type: Number,
    default: 50
  },
  
  // Admin Controls
  commissionFrozen: {
    type: Boolean,
    default: false
  },
  adminNote: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Generate unique referrer ID before saving
masterReferrerSchema.pre('save', async function(next) {
  if (!this.referrerId) {
    const count = await this.constructor.countDocuments();
    this.referrerId = `MR${String(count + 1001).padStart(4, '0')}`;
  }
  next();
});

// Generate referral link for a specific master
masterReferrerSchema.methods.getReferralLink = function(masterId, baseUrl = 'https://concorddex.com') {
  return `${baseUrl}/register?masterRef=${masterId}&ref=${this.referrerId}`;
};

// Get effective commission percent
masterReferrerSchema.methods.getEffectiveCommission = async function() {
  if (this.customCommission?.enabled && this.customCommission?.percent > 0) {
    return this.customCommission.percent;
  }
  const MasterReferralSettings = require('./MasterReferralSettings');
  return await MasterReferralSettings.getCommissionForLevel(this.commissionLevel);
};

// Check and auto-upgrade based on referral count
masterReferrerSchema.methods.checkAutoUpgrade = async function() {
  const MasterReferralSettings = require('./MasterReferralSettings');
  const settings = await MasterReferralSettings.getSettings();
  
  if (!settings.autoUpgradeEnabled) {
    return false;
  }
  
  const referralCount = this.stats?.activeReferrals || 0;
  const eligibleLevel = await MasterReferralSettings.getEligibleLevel(referralCount);
  
  if (eligibleLevel > this.commissionLevel) {
    this.commissionLevel = eligibleLevel;
    await this.save();
    return true;
  }
  return false;
};

module.exports = mongoose.model('MasterReferrer', masterReferrerSchema);
