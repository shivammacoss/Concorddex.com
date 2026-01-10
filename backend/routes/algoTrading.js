const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const AlgoTrade = require('../models/AlgoTrade');
const AlgoStrategy = require('../models/AlgoStrategy');
const { protectAdmin } = require('./adminAuth');

// Generate webhook secret
const generateWebhookSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Validate webhook signature
const validateWebhook = async (req, res, next) => {
  try {
    const { secret, strategy_name } = req.body;
    
    if (!secret) {
      return res.status(401).json({ success: false, message: 'Missing webhook secret' });
    }
    
    const strategy = await AlgoStrategy.findOne({ 
      $or: [
        { webhookSecret: secret },
        { name: strategy_name, webhookSecret: secret }
      ]
    });
    
    if (!strategy) {
      return res.status(401).json({ success: false, message: 'Invalid webhook secret' });
    }
    
    if (strategy.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Strategy is not active' });
    }
    
    req.strategy = strategy;
    next();
  } catch (error) {
    console.error('[AlgoTrading] Webhook validation error:', error);
    res.status(500).json({ success: false, message: 'Webhook validation failed' });
  }
};

// ==================== WEBHOOK ENDPOINT ====================
// POST /api/tradingview/webhook - Receive TradingView alerts
router.post('/webhook', validateWebhook, async (req, res) => {
  try {
    const strategy = req.strategy;
    const {
      action,
      symbol,
      side,
      price,
      quantity,
      order_type = 'MARKET',
      stop_loss,
      take_profit,
      trade_id,
      close_all,
      grid_level,
      pyramid_level,
      signal_data
    } = req.body;
    
    console.log(`[AlgoTrading] Webhook received: ${action} ${symbol} ${side} @ ${price}`);
    
    // Get socket.io instance for real-time updates
    const io = req.app.get('io');
    
    // Handle different actions
    if (action === 'open' || action === 'entry') {
      // Open new position
      const newTrade = new AlgoTrade({
        tradeId: trade_id || AlgoTrade.generateTradeId(),
        strategy: strategy._id,
        strategyName: strategy.name,
        symbol: symbol || strategy.symbol,
        side: side.toUpperCase(),
        entryPrice: parseFloat(price),
        quantity: parseFloat(quantity) || strategy.settings.defaultQuantity,
        orderType: order_type.toUpperCase(),
        stopLoss: stop_loss ? parseFloat(stop_loss) : null,
        takeProfit: take_profit ? parseFloat(take_profit) : null,
        gridLevel: grid_level || null,
        pyramidLevel: pyramid_level || 1,
        signalData: signal_data || {},
        positionSize: parseFloat(price) * (parseFloat(quantity) || strategy.settings.defaultQuantity)
      });
      
      await newTrade.save();
      
      // Emit real-time update
      if (io) {
        io.emit('algo:trade:opened', {
          trade: newTrade,
          strategy: strategy.name
        });
      }
      
      return res.json({
        success: true,
        message: 'Trade opened',
        trade_id: newTrade.tradeId
      });
    }
    
    if (action === 'close' || action === 'exit') {
      // Close specific position or all positions
      let trades;
      
      if (close_all) {
        trades = await AlgoTrade.find({
          strategy: strategy._id,
          symbol: symbol || strategy.symbol,
          status: 'OPEN'
        });
      } else if (trade_id) {
        const trade = await AlgoTrade.findOne({ tradeId: trade_id, status: 'OPEN' });
        trades = trade ? [trade] : [];
      } else {
        // Close oldest open trade for this symbol/side
        trades = await AlgoTrade.find({
          strategy: strategy._id,
          symbol: symbol || strategy.symbol,
          side: side ? side.toUpperCase() : { $exists: true },
          status: 'OPEN'
        }).sort({ openedAt: 1 }).limit(1);
      }
      
      const closedTrades = [];
      for (const trade of trades) {
        await trade.closeTrade(parseFloat(price));
        closedTrades.push(trade);
        
        // Emit real-time update
        if (io) {
          io.emit('algo:trade:closed', {
            trade: trade,
            strategy: strategy.name
          });
        }
      }
      
      return res.json({
        success: true,
        message: `Closed ${closedTrades.length} trade(s)`,
        closed_trades: closedTrades.map(t => t.tradeId)
      });
    }
    
    if (action === 'update') {
      // Update SL/TP
      const trade = await AlgoTrade.findOne({ 
        tradeId: trade_id || { $exists: true },
        strategy: strategy._id,
        status: 'OPEN'
      });
      
      if (!trade) {
        return res.status(404).json({ success: false, message: 'No open trade found' });
      }
      
      if (stop_loss) trade.stopLoss = parseFloat(stop_loss);
      if (take_profit) trade.takeProfit = parseFloat(take_profit);
      await trade.save();
      
      if (io) {
        io.emit('algo:trade:updated', { trade, strategy: strategy.name });
      }
      
      return res.json({ success: true, message: 'Trade updated', trade_id: trade.tradeId });
    }
    
    res.status(400).json({ success: false, message: 'Unknown action' });
  } catch (error) {
    console.error('[AlgoTrading] Webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// GET /api/algo/strategies - Get all strategies
router.get('/strategies', protectAdmin, async (req, res) => {
  try {
    const strategies = await AlgoStrategy.find().sort({ createdAt: -1 });
    res.json({ success: true, data: strategies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/algo/strategies - Create new strategy
router.post('/strategies', protectAdmin, async (req, res) => {
  try {
    const { name, description, symbol, timeframe, settings } = req.body;
    
    const existing = await AlgoStrategy.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Strategy name already exists' });
    }
    
    const strategy = new AlgoStrategy({
      name,
      description,
      symbol,
      timeframe,
      settings,
      webhookSecret: generateWebhookSecret()
    });
    
    await strategy.save();
    res.json({ success: true, data: strategy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/algo/strategies/:id - Update strategy
router.put('/strategies/:id', protectAdmin, async (req, res) => {
  try {
    const { name, description, symbol, timeframe, status, settings } = req.body;
    
    const strategy = await AlgoStrategy.findByIdAndUpdate(
      req.params.id,
      { name, description, symbol, timeframe, status, settings },
      { new: true }
    );
    
    if (!strategy) {
      return res.status(404).json({ success: false, message: 'Strategy not found' });
    }
    
    res.json({ success: true, data: strategy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/algo/strategies/:id - Delete strategy
router.delete('/strategies/:id', protectAdmin, async (req, res) => {
  try {
    await AlgoStrategy.findByIdAndDelete(req.params.id);
    await AlgoTrade.deleteMany({ strategy: req.params.id });
    res.json({ success: true, message: 'Strategy deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/algo/strategies/:id/regenerate-secret - Regenerate webhook secret
router.post('/strategies/:id/regenerate-secret', protectAdmin, async (req, res) => {
  try {
    const strategy = await AlgoStrategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ success: false, message: 'Strategy not found' });
    }
    
    strategy.webhookSecret = generateWebhookSecret();
    await strategy.save();
    
    res.json({ success: true, data: { webhookSecret: strategy.webhookSecret } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/algo/trades - Get all trades
router.get('/trades', protectAdmin, async (req, res) => {
  try {
    const { strategy, status, symbol, limit = 100, page = 1 } = req.query;
    
    const filter = {};
    if (strategy) filter.strategy = strategy;
    if (status) filter.status = status;
    if (symbol) filter.symbol = symbol;
    
    const trades = await AlgoTrade.find(filter)
      .populate('strategy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await AlgoTrade.countDocuments(filter);
    
    res.json({
      success: true,
      data: trades,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/algo/positions - Get open positions
router.get('/positions', protectAdmin, async (req, res) => {
  try {
    const positions = await AlgoTrade.find({ status: 'OPEN' })
      .populate('strategy', 'name')
      .sort({ openedAt: -1 });
    
    res.json({ success: true, data: positions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/algo/history - Get closed trades history
router.get('/history', protectAdmin, async (req, res) => {
  try {
    const { strategy, symbol, from, to, limit = 100, page = 1 } = req.query;
    
    const filter = { status: 'CLOSED' };
    if (strategy) filter.strategy = strategy;
    if (symbol) filter.symbol = symbol;
    if (from || to) {
      filter.closedAt = {};
      if (from) filter.closedAt.$gte = new Date(from);
      if (to) filter.closedAt.$lte = new Date(to);
    }
    
    const trades = await AlgoTrade.find(filter)
      .populate('strategy', 'name')
      .sort({ closedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await AlgoTrade.countDocuments(filter);
    
    res.json({
      success: true,
      data: trades,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/algo/stats - Get overall stats
router.get('/stats', protectAdmin, async (req, res) => {
  try {
    const [strategies, openPositions, closedTrades] = await Promise.all([
      AlgoStrategy.find({ isActive: true }),
      AlgoTrade.find({ status: 'OPEN' }),
      AlgoTrade.find({ status: 'CLOSED' })
    ]);
    
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    const openPnL = openPositions.reduce((sum, t) => sum + (t.openPnL || 0), 0);
    const winners = closedTrades.filter(t => t.realizedPnL > 0).length;
    const winRate = closedTrades.length > 0 ? (winners / closedTrades.length) * 100 : 0;
    
    // Strategy-wise PnL
    const strategyPnL = {};
    for (const trade of closedTrades) {
      const name = trade.strategyName;
      if (!strategyPnL[name]) {
        strategyPnL[name] = { name, trades: 0, pnl: 0, winners: 0 };
      }
      strategyPnL[name].trades++;
      strategyPnL[name].pnl += trade.realizedPnL || 0;
      if (trade.realizedPnL > 0) strategyPnL[name].winners++;
    }
    
    res.json({
      success: true,
      data: {
        activeStrategies: strategies.filter(s => s.status === 'active').length,
        totalStrategies: strategies.length,
        openPositions: openPositions.length,
        closedTrades: closedTrades.length,
        totalPnL,
        openPnL,
        winRate: winRate.toFixed(2),
        todayPnL: closedTrades
          .filter(t => new Date(t.closedAt).toDateString() === new Date().toDateString())
          .reduce((sum, t) => sum + (t.realizedPnL || 0), 0),
        strategyPnL: Object.values(strategyPnL)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/algo/trades/:id/close - Manually close a trade
router.post('/trades/:id/close', protectAdmin, async (req, res) => {
  try {
    const { exitPrice } = req.body;
    const trade = await AlgoTrade.findById(req.params.id);
    
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }
    
    if (trade.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'Trade is not open' });
    }
    
    await trade.closeTrade(parseFloat(exitPrice));
    
    const io = req.app.get('io');
    if (io) {
      io.emit('algo:trade:closed', { trade, strategy: trade.strategyName });
    }
    
    res.json({ success: true, data: trade });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
