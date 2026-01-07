const mongoose = require('mongoose');

// Referral Level Schema (tiers for master referrers)
const referralLevelSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Standard", "Bronze", "Silver", "Gold", "Platinum"
  level: { type: Number, required: true, unique: true }, // 1, 2, 3, 4, 5...
  commissionPercent: { type: Number, required: true }, // % of master's commission
  description: { type: String, default: '' },
  minReferrals: { type: Number, default: 0 }, // Minimum active referrals needed
  minVolume: { type: Number, default: 0 }, // Minimum volume needed (for reference)
  isActive: { type: Boolean, default: true },
  color: { type: String, default: '#3b82f6' } // For UI display
}, { _id: true });

const masterReferralSettingsSchema = new mongoose.Schema({
  // Global Default Commission Percent
  defaultCommissionPercent: {
    type: Number,
    default: 5, // 5% of master's commission
    min: 0,
    max: 100
  },
  
  // Commission Levels/Tiers
  levels: {
    type: [referralLevelSchema],
    default: [
      { name: 'Standard', level: 1, commissionPercent: 5, minReferrals: 0, description: 'Default referral level', color: '#6b7280' },
      { name: 'Bronze', level: 2, commissionPercent: 10, minReferrals: 5, description: '5+ active referrals', color: '#cd7f32' },
      { name: 'Silver', level: 3, commissionPercent: 15, minReferrals: 15, description: '15+ active referrals', color: '#c0c0c0' },
      { name: 'Gold', level: 4, commissionPercent: 20, minReferrals: 30, description: '30+ active referrals', color: '#ffd700' },
      { name: 'Platinum', level: 5, commissionPercent: 25, minReferrals: 50, description: '50+ active referrals', color: '#e5e4e2' }
    ]
  },
  
  // Referral Settings
  minWithdrawal: { type: Number, default: 50 },
  requireWithdrawalApproval: { type: Boolean, default: true },
  
  // Auto-upgrade settings
  autoUpgradeEnabled: { type: Boolean, default: true },
  
  // System enabled
  isEnabled: { type: Boolean, default: true },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
masterReferralSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Get commission percent for a specific level
masterReferralSettingsSchema.statics.getCommissionForLevel = async function(levelNumber) {
  const settings = await this.getSettings();
  const level = settings.levels.find(l => l.level === levelNumber && l.isActive);
  return level ? level.commissionPercent : settings.defaultCommissionPercent;
};

// Get all active levels
masterReferralSettingsSchema.statics.getActiveLevels = async function() {
  const settings = await this.getSettings();
  return settings.levels.filter(l => l.isActive).sort((a, b) => a.level - b.level);
};

// Get eligible level based on referral count
masterReferralSettingsSchema.statics.getEligibleLevel = async function(referralCount) {
  const settings = await this.getSettings();
  const activeLevels = settings.levels.filter(l => l.isActive).sort((a, b) => b.level - a.level);
  
  for (const level of activeLevels) {
    if (referralCount >= level.minReferrals) {
      return level.level;
    }
  }
  return 1;
};

// Get level info by level number
masterReferralSettingsSchema.statics.getLevelInfo = async function(levelNumber) {
  const settings = await this.getSettings();
  return settings.levels.find(l => l.level === levelNumber && l.isActive);
};

// Get next level info
masterReferralSettingsSchema.statics.getNextLevelInfo = async function(currentLevel, referralCount) {
  const settings = await this.getSettings();
  const activeLevels = settings.levels.filter(l => l.isActive).sort((a, b) => a.level - b.level);
  
  const currentLevelIndex = activeLevels.findIndex(l => l.level === currentLevel);
  if (currentLevelIndex === -1 || currentLevelIndex >= activeLevels.length - 1) {
    return null;
  }
  
  const nextLevel = activeLevels[currentLevelIndex + 1];
  return {
    level: nextLevel.level,
    name: nextLevel.name,
    commissionPercent: nextLevel.commissionPercent,
    minReferrals: nextLevel.minReferrals,
    referralsNeeded: Math.max(0, nextLevel.minReferrals - referralCount),
    color: nextLevel.color
  };
};

module.exports = mongoose.model('MasterReferralSettings', masterReferralSettingsSchema);
