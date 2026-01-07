const mongoose = require('mongoose');

const masterReferralCommissionLogSchema = new mongoose.Schema({
  // Referrer who earned the commission
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterReferrer',
    required: true
  },
  referrerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Master whose trade generated the commission
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
  
  // Follower (referred user) whose trade generated commission
  followerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Referral record
  masterReferralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterReferral',
    required: true
  },
  
  // Source Type
  sourceType: {
    type: String,
    enum: ['copy_trade', 'subscription', 'manual_adjustment'],
    default: 'copy_trade'
  },
  
  // Trade Reference
  copyTradeMapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CopyTradeMap'
  },
  masterTradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade'
  },
  followerTradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade'
  },
  symbol: String,
  lots: Number,
  
  // Commission Details
  masterCommissionAmount: {
    type: Number,
    required: true // How much master earned
  },
  referrerCommissionPercent: {
    type: Number,
    required: true // Referrer's level percent
  },
  referrerCommissionAmount: {
    type: Number,
    required: true // How much referrer earned
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'credited', 'cancelled', 'reversed'],
    default: 'credited'
  },
  
  // Description
  description: {
    type: String,
    default: ''
  },
  
  // Admin Override
  isManualAdjustment: {
    type: Boolean,
    default: false
  },
  adjustedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Indexes
masterReferralCommissionLogSchema.index({ referrerId: 1, createdAt: -1 });
masterReferralCommissionLogSchema.index({ referrerUserId: 1 });
masterReferralCommissionLogSchema.index({ masterId: 1 });
masterReferralCommissionLogSchema.index({ followerUserId: 1 });
masterReferralCommissionLogSchema.index({ masterReferralId: 1 });
masterReferralCommissionLogSchema.index({ status: 1 });

module.exports = mongoose.model('MasterReferralCommissionLog', masterReferralCommissionLogSchema);
