const mongoose = require('mongoose');

const AlgoStrategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  symbol: {
    type: String,
    required: true
  },
  timeframe: {
    type: String,
    default: '1H'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'stopped'],
    default: 'active'
  },
  webhookSecret: {
    type: String,
    required: true
  },
  settings: {
    pyramiding: { type: Number, default: 1 },
    maxPositions: { type: Number, default: 5 },
    defaultQuantity: { type: Number, default: 0.01 },
    riskPercent: { type: Number, default: 1 },
    useGridLogic: { type: Boolean, default: false },
    gridLevels: { type: Number, default: 5 },
    basketTP: { type: Number, default: 0 },
    basketSL: { type: Number, default: 0 }
  },
  stats: {
    totalTrades: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
    losingTrades: { type: Number, default: 0 },
    totalPnL: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    avgWin: { type: Number, default: 0 },
    avgLoss: { type: Number, default: 0 },
    profitFactor: { type: Number, default: 0 },
    maxDrawdown: { type: Number, default: 0 },
    sharpeRatio: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
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

AlgoStrategySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

AlgoStrategySchema.methods.updateStats = async function() {
  const AlgoTrade = mongoose.model('AlgoTrade');
  const trades = await AlgoTrade.find({ strategy: this._id, status: 'CLOSED' });
  
  if (trades.length === 0) return;
  
  const winners = trades.filter(t => t.realizedPnL > 0);
  const losers = trades.filter(t => t.realizedPnL < 0);
  
  this.stats.totalTrades = trades.length;
  this.stats.winningTrades = winners.length;
  this.stats.losingTrades = losers.length;
  this.stats.totalPnL = trades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
  this.stats.winRate = (winners.length / trades.length) * 100;
  this.stats.avgWin = winners.length > 0 ? winners.reduce((sum, t) => sum + t.realizedPnL, 0) / winners.length : 0;
  this.stats.avgLoss = losers.length > 0 ? Math.abs(losers.reduce((sum, t) => sum + t.realizedPnL, 0) / losers.length) : 0;
  this.stats.profitFactor = this.stats.avgLoss > 0 ? (this.stats.avgWin * winners.length) / (this.stats.avgLoss * losers.length) : 0;
  
  await this.save();
};

module.exports = mongoose.model('AlgoStrategy', AlgoStrategySchema);
