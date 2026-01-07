const mongoose = require('mongoose');

const masterReferralSchema = new mongoose.Schema({
  // Referrer (the user who shared the link)
  referrerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Master being promoted
  masterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradeMaster',
    required: true
  },
  masterUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Referred user (new user who signed up)
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Referral Code used
  referralCode: {
    type: String,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'churned'],
    default: 'pending' // Becomes 'active' when referred user follows the master
  },
  
  // Is the referred user currently following the master?
  isFollowing: {
    type: Boolean,
    default: false
  },
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CopyFollower'
  },
  
  // Stats
  stats: {
    totalTrades: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 }, // in lots
    totalMasterCommission: { type: Number, default: 0 }, // Commission master earned from this follower
    totalReferrerCommission: { type: Number, default: 0 } // Commission referrer earned
  },
  
  // Timestamps
  registeredAt: {
    type: Date,
    default: Date.now
  },
  activatedAt: Date, // When referred user started following
  lastActivityAt: Date
}, {
  timestamps: true
});

// Indexes
masterReferralSchema.index({ referrerUserId: 1 });
masterReferralSchema.index({ masterId: 1 });
masterReferralSchema.index({ referredUserId: 1 });
masterReferralSchema.index({ referralCode: 1 });
masterReferralSchema.index({ status: 1 });
// Unique constraint: one referral per referred user per master
masterReferralSchema.index({ referredUserId: 1, masterId: 1 }, { unique: true });

module.exports = mongoose.model('MasterReferral', masterReferralSchema);
