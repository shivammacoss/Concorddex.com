const mongoose = require('mongoose');

const AlgoTradeSchema = new mongoose.Schema({
  tradeId: {
    type: String,
    required: true,
    unique: true
  },
  strategy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AlgoStrategy',
    required: true
  },
  strategyName: {
    type: String,
    required: true
  },
  accountId: {
    type: String,
    default: 'paper'
  },
  symbol: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  entryPrice: {
    type: Number,
    required: true
  },
  exitPrice: {
    type: Number,
    default: null
  },
  quantity: {
    type: Number,
    required: true
  },
  positionSize: {
    type: Number,
    default: 0
  },
  stopLoss: {
    type: Number,
    default: null
  },
  takeProfit: {
    type: Number,
    default: null
  },
  openPnL: {
    type: Number,
    default: 0
  },
  realizedPnL: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'PARTIAL'],
    default: 'OPEN'
  },
  orderType: {
    type: String,
    enum: ['MARKET', 'LIMIT', 'STOP'],
    default: 'MARKET'
  },
  gridLevel: {
    type: Number,
    default: null
  },
  pyramidLevel: {
    type: Number,
    default: 1
  },
  signalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

AlgoTradeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

AlgoTradeSchema.statics.generateTradeId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ALG-${timestamp}-${random}`.toUpperCase();
};

AlgoTradeSchema.methods.calculatePnL = function(currentPrice) {
  if (this.status === 'CLOSED') return this.realizedPnL;
  
  const priceDiff = this.side === 'BUY' 
    ? currentPrice - this.entryPrice 
    : this.entryPrice - currentPrice;
  
  this.openPnL = priceDiff * this.quantity;
  return this.openPnL;
};

AlgoTradeSchema.methods.closeTrade = async function(exitPrice, commission = 0) {
  const priceDiff = this.side === 'BUY' 
    ? exitPrice - this.entryPrice 
    : this.entryPrice - exitPrice;
  
  this.exitPrice = exitPrice;
  this.realizedPnL = (priceDiff * this.quantity) - commission;
  this.commission = commission;
  this.status = 'CLOSED';
  this.closedAt = new Date();
  this.openPnL = 0;
  
  await this.save();
  
  // Update strategy stats
  const AlgoStrategy = mongoose.model('AlgoStrategy');
  const strategy = await AlgoStrategy.findById(this.strategy);
  if (strategy) {
    await strategy.updateStats();
  }
  
  return this;
};

module.exports = mongoose.model('AlgoTrade', AlgoTradeSchema);
