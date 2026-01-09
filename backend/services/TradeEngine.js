/**
 * Trade Engine - Handles order execution, SL/TP monitoring, margin calls
 * 
 * MT4/MT5-Style Trading Logic:
 * - Equity = Wallet Balance + Credit Balance + Floating P/L
 * - Buying Power = Equity × Leverage (up to 1000x)
 * - Global margin system (shared equity pool per account)
 * - Loss deduction: ONLY from Wallet (Balance) - Credit is NEVER touched
 * - Profit: Added ONLY to Wallet (never Credit)
 * - Stop-out: Close worst losing trade first (not all at once)
 * 
 * Data provider to be configured separately
 */

const Trade = require('../models/Trade');
const User = require('../models/User');
const TradingAccount = require('../models/TradingAccount');
const Transaction = require('../models/Transaction');
const TradingCharge = require('../models/TradingCharge');
const liquidityProvider = require('./LiquidityProvider');

// In-memory price storage (to be fed by external data provider)
const prices = {};

class TradeEngine {
  constructor(io) {
    this.io = io;
    this.isRunning = false;
    this.checkInterval = null;
    this.userSockets = new Map();
    this.prices = prices;
  }

  /**
   * Update price from external source
   */
  updatePrice(symbol, priceData) {
    const isNew = !this.prices[symbol];
    this.prices[symbol] = {
      ...priceData,
      timestamp: Date.now()
    };
    // Log first few price updates
    if (isNew && Object.keys(this.prices).length <= 5) {
      console.log(`[TradeEngine] Price stored: ${symbol} ${priceData.bid}/${priceData.ask}`);
    }
  }

  /**
   * Start the trade engine
   */
  start() {
    if (this.isRunning) return;

    // Check orders every 100ms for fast SL/TP execution
    this.checkInterval = setInterval(() => {
      this.checkPendingOrders();
      this.checkOpenPositions();
    }, 100);

    this.isRunning = true;
    console.log('[TradeEngine] Started - checking SL/TP every 100ms');
  }

  /**
   * Stop the trade engine
   */
  stop() {
    if (!this.isRunning) return;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;
    console.log('[TradeEngine] Stopped');
  }

  /**
   * Set Socket.IO instance
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Register user socket
   */
  registerUserSocket(userId, socketId) {
    this.userSockets.set(userId.toString(), socketId);
  }

  /**
   * Unregister user socket
   */
  unregisterUserSocket(userId) {
    this.userSockets.delete(userId.toString());
  }

  /**
   * Handle price updates - broadcast to clients
   */
  onPriceUpdate(prices) {
    if (this.io) {
      this.io.emit('priceUpdate', prices);
    }
  }

  /**
   * Get current price for symbol
   */
  getPrice(symbol) {
    return this.prices[symbol] || null;
  }

  /**
   * Get all prices
   */
  getAllPrices() {
    return this.prices;
  }

  /**
   * Check if market is open for a symbol
   */
  checkMarketHours(symbol) {
    const now = new Date();
    const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const utcHour = now.getUTCHours();
    
    // Crypto markets (BTC, ETH, etc.) - 24/7
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('LTC') || 
        symbol.includes('XRP') || symbol.includes('USDT') || symbol.includes('DOGE') ||
        symbol.includes('ADA') || symbol.includes('SOL') || symbol.includes('LINK')) {
      return { isOpen: true, message: 'Crypto markets are open 24/7' };
    }
    
    // Forex markets - Sunday 5PM EST to Friday 5PM EST (22:00 UTC Sunday to 22:00 UTC Friday)
    // Closed on weekends
    if (utcDay === 0 && utcHour < 22) {
      return { isOpen: false, message: 'Forex market opens Sunday 10:00 PM UTC' };
    }
    if (utcDay === 6) {
      return { isOpen: false, message: 'Forex market closed on Saturday. Opens Sunday 10:00 PM UTC' };
    }
    if (utcDay === 5 && utcHour >= 22) {
      return { isOpen: false, message: 'Forex market closed for weekend. Opens Sunday 10:00 PM UTC' };
    }
    
    // All other times forex is open
    return { isOpen: true, message: 'Market is open' };
  }

  /**
   * Execute market order
   */
  async executeMarketOrder(userId, orderData) {
    const { symbol, type, amount, stopLoss, takeProfit, tradingAccountId, leverage: requestedLeverage } = orderData;
    
    // Check if market is open
    const marketStatus = this.checkMarketHours(symbol);
    if (!marketStatus.isOpen) {
      throw new Error(`Market closed for ${symbol}. ${marketStatus.message}`);
    }
    
    const price = this.getPrice(symbol);
    if (!price) {
      throw new Error(`Invalid symbol: ${symbol}. Market may be closed.`);
    }

    // Get user and their active trading account FIRST to get accountTypeId for charges
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    // Find trading account - use provided ID or find most recent active one
    let tradingAccount;
    if (tradingAccountId) {
      tradingAccount = await TradingAccount.findOne({ 
        _id: tradingAccountId,
        user: userId, 
        status: 'active'
      }).populate('accountType').select('+leverage');
    }
    if (!tradingAccount) {
      tradingAccount = await TradingAccount.findOne({ 
        user: userId, 
        status: 'active',
        isDemo: false 
      }).populate('accountType').select('+leverage').sort({ createdAt: -1 });
    }
    
    console.log(`[TradeEngine] Trading Account: ${tradingAccount?._id}, Balance: ${tradingAccount?.balance}, DB Leverage: ${tradingAccount?.leverage}`);
    
    // Get accountTypeId for charges lookup
    const accountTypeId = tradingAccount?.accountType?._id || null;

    // Get charges for this trade (pass accountTypeId for proper lookup)
    const charges = await this.getChargesForTrade(symbol, userId, accountTypeId);
    
    console.log(`[TradeEngine] Charges for ${symbol}: spreadPips=${charges.spreadPips}, commissionPerLot=${charges.commissionPerLot}, source=${charges.source}`);
    
    // Get execution price (ask for buy, bid for sell)
    // Apply admin spread markup to the price (spread in pips added to entry)
    const basePrice = type === 'buy' ? price.ask : price.bid;
    const pipSize = this.getPipSize(symbol);
    const spreadMarkup = (charges.spreadPips || 0) * pipSize;
    // For buy: add spread to price (worse for user), For sell: subtract spread (worse for user)
    const executionPrice = type === 'buy' ? basePrice + spreadMarkup : basePrice - spreadMarkup;
    
    // User selects their leverage - use it directly
    const parsedRequestedLeverage = requestedLeverage ? parseInt(requestedLeverage) : 100;
    // Allow up to 2000x leverage (safety cap)
    const tradeLeverage = Math.min(Math.max(parsedRequestedLeverage, 1), 2000);
    const usesTradingAccount = !!tradingAccount;
    
    // Calculate EQUITY for margin validation (Wallet + Credit + Floating P/L)
    let equity, walletBalance, creditBalance, floatingPnL;
    
    if (usesTradingAccount) {
      walletBalance = tradingAccount.balance;
      creditBalance = tradingAccount.creditBalance || 0;
      // Get current floating P/L from open trades
      floatingPnL = await this.getAccountFloatingPnL(tradingAccount._id);
      equity = walletBalance + creditBalance + floatingPnL;
    } else {
      walletBalance = user.balance;
      creditBalance = 0; // User wallet has no credit system
      floatingPnL = 0;
      equity = walletBalance;
    }
    
    console.log(`[TradeEngine] Leverage: requested=${requestedLeverage}, using=${tradeLeverage}`);
    console.log(`[TradeEngine] Equity Calculation: Wallet=$${walletBalance.toFixed(2)} + Credit=$${creditBalance.toFixed(2)} + FloatingPnL=$${floatingPnL.toFixed(2)} = Equity=$${equity.toFixed(2)}`);
    
    // BUYING POWER = Equity × Leverage (based on total equity, not just wallet)
    const buyingPower = equity * tradeLeverage;
    
    // Position value = lots × price × contract size
    const contractSize = this.getContractSize(symbol);
    const positionValue = amount * executionPrice * contractSize;
    
    // Margin required = position value / leverage
    const margin = positionValue / tradeLeverage;
    
    // SIMPLIFIED: Only commission per lot (no percentage fees)
    const commissionPerLot = charges.commissionPerLot || 0;
    const commission = amount * commissionPerLot; // lots × $/lot
    const tradingCharge = Math.round(commission * 100) / 100;
    
    // Spread cost for reference (spread is applied to execution price, not deducted separately)
    const spreadCost = this.calculateSpreadCost(symbol, amount, charges.spreadPips);
    
    // Calculate current used margin and free margin
    const currentUsedMargin = usesTradingAccount ? (tradingAccount.margin || 0) : 0;
    const freeMargin = equity - currentUsedMargin;
    
    // User needs: margin + charges to open the trade (from FREE MARGIN)
    const totalRequired = margin + tradingCharge;
    
    console.log(`[TradeEngine] Equity: $${equity.toFixed(2)}, Used Margin: $${currentUsedMargin.toFixed(2)}, Free Margin: $${freeMargin.toFixed(2)}`);
    console.log(`[TradeEngine] Buying Power: $${buyingPower.toFixed(2)}, Position Value: $${positionValue.toFixed(2)}`);
    console.log(`[TradeEngine] Margin Required: $${margin.toFixed(2)}, Charges: $${tradingCharge.toFixed(2)}, Total: $${totalRequired.toFixed(2)}`);
    
    // VALIDATION FOR TRADING ACCOUNTS (MT4/MT5 style):
    // - Margin is NOT deducted from wallet, it's just a "hold" on equity
    // - Only trading charges are deducted from wallet
    // - Free Margin must be >= margin required for the trade
    
    if (usesTradingAccount) {
      // Check 1: Free Margin must cover the new margin requirement
      if (freeMargin < margin) {
        throw new Error(`Insufficient free margin. Required: $${margin.toFixed(2)}, Available Free Margin: $${freeMargin.toFixed(2)} (Equity: $${equity.toFixed(2)}, Used Margin: $${currentUsedMargin.toFixed(2)})`);
      }
      
      // Check 2: Wallet must have enough for trading charges only (not margin)
      if (tradingCharge > 0 && walletBalance < tradingCharge) {
        throw new Error(`Insufficient wallet balance for trading charges. Required: $${tradingCharge.toFixed(2)}, Wallet: $${walletBalance.toFixed(2)}`);
      }
      
      // Check 3: Opening this trade should not immediately trigger margin call
      const newUsedMargin = currentUsedMargin + margin;
      const newEquity = equity - tradingCharge; // Equity after charges
      const projectedMarginLevel = newUsedMargin > 0 ? (newEquity / newUsedMargin) * 100 : Infinity;
      const marginCallLevel = tradingAccount.marginCallLevel || 50;
      
      if (projectedMarginLevel <= marginCallLevel) {
        throw new Error(`Trade would trigger margin call. Projected margin level: ${projectedMarginLevel.toFixed(2)}% (threshold: ${marginCallLevel}%)`);
      }
    } else {
      // USER WALLET (legacy mode): Margin IS deducted from balance
      if (walletBalance < totalRequired) {
        throw new Error(`Insufficient balance. Required: $${totalRequired.toFixed(2)}, Available: $${walletBalance.toFixed(2)}`);
      }
    }

    // Validate SL/TP
    if (stopLoss) {
      if (type === 'buy' && stopLoss >= executionPrice) {
        throw new Error('Stop Loss must be below entry price for buy orders');
      }
      if (type === 'sell' && stopLoss <= executionPrice) {
        throw new Error('Stop Loss must be above entry price for sell orders');
      }
    }
    if (takeProfit) {
      if (type === 'buy' && takeProfit <= executionPrice) {
        throw new Error('Take Profit must be above entry price for buy orders');
      }
      if (type === 'sell' && takeProfit >= executionPrice) {
        throw new Error('Take Profit must be below entry price for sell orders');
      }
    }

    // Generate client ID
    const clientId = usesTradingAccount 
      ? tradingAccount.accountNumber 
      : `${user.firstName?.substring(0,2) || 'US'}${user._id.toString().slice(-6)}`.toUpperCase();

    console.log(`[TradeEngine] Creating trade for user ${userId}: ${type} ${amount} ${symbol} @ ${executionPrice}`);
    console.log(`[TradeEngine] Using ${usesTradingAccount ? 'Trading Account' : 'User Balance'}: Equity=$${equity.toFixed(2)}, Required: $${totalRequired.toFixed(2)}`);
    console.log(`[TradeEngine] Charges: Commission $${commission.toFixed(2)} (${amount} lots × $${commissionPerLot}/lot), Spread: ${charges.spreadPips} pips`);

    // Create trade with charges recorded
    const trade = await Trade.create({
      user: userId,
      tradingAccount: usesTradingAccount ? tradingAccount._id : null,
      clientId,
      tradeSource: 'manual',
      symbol: symbol.toUpperCase(),
      type,
      orderType: 'market',
      amount,
      price: executionPrice,
      leverage: tradeLeverage,
      stopLoss,
      takeProfit,
      margin,
      spread: charges.spreadPips,
      spreadCost,
      commission,                    // Per-lot commission
      tradingCharge,                 // Total charge (commission only now)
      status: 'open'
    });

    console.log(`[TradeEngine] Trade created: ${trade._id}`);

    // Forward to Liquidity Provider if user is A Book
    if (user.bookType === 'A' && liquidityProvider.isEnabled()) {
      console.log(`[TradeEngine] A Book user - forwarding trade to Liquidity Provider`);
      const lpResult = await liquidityProvider.openTrade(trade);
      if (lpResult.success) {
        trade.lpTradeId = lpResult.lpTradeId;
        trade.lpStatus = 'sent';
        await trade.save();
        console.log(`[TradeEngine] Trade sent to LP successfully, LP Trade ID: ${lpResult.lpTradeId}`);
      } else {
        trade.lpStatus = 'failed';
        trade.lpError = lpResult.error;
        await trade.save();
        console.error(`[TradeEngine] Failed to send trade to LP: ${lpResult.error}`);
      }
    }

    // Handle margin and charges
    // CRITICAL: For trading accounts, margin is NOT deducted from wallet
    // Margin is just a "hold" on equity - it reduces FREE MARGIN, not wallet balance
    // Only trading charges (commission) are deducted from wallet
    
    const balanceBefore = usesTradingAccount ? tradingAccount.balance : user.balance;
    
    if (usesTradingAccount) {
      // TRADING ACCOUNT:
      // - Margin is NOT deducted from wallet (it's just tracked as usedMargin)
      // - Only trading charges are deducted from wallet
      // - Used Margin increases (reducing free margin)
      
      // Deduct only trading charges from wallet (NOT margin)
      if (tradingCharge > 0) {
        tradingAccount.balance -= tradingCharge;
      }
      
      // Track used margin (this is NOT a balance deduction)
      tradingAccount.margin = (tradingAccount.margin || 0) + margin;
      tradingAccount.totalTrades = (tradingAccount.totalTrades || 0) + 1;
      await tradingAccount.save();
      
      console.log(`[TradeEngine] Trading Account: Charges deducted=$${tradingCharge.toFixed(2)}, Used Margin increased by $${margin.toFixed(2)}`);
      console.log(`[TradeEngine] New balances: Wallet=$${tradingAccount.balance.toFixed(2)}, Used Margin=$${tradingAccount.margin.toFixed(2)}`);
      
      // Create transaction record for charges only (margin is not a transaction)
      if (tradingCharge > 0) {
        await Transaction.create({
          user: userId,
          type: 'commission',
          amount: -tradingCharge,
          description: `${type.toUpperCase()} ${amount} lots ${symbol} @ ${executionPrice.toFixed(5)} | Commission: $${tradingCharge.toFixed(2)}`,
          balanceBefore,
          balanceAfter: tradingAccount.balance,
          status: 'completed',
          reference: `${trade._id}_open_${Date.now()}`,
          metadata: {
            tradeId: trade._id,
            marginRequired: margin,
            usedMarginAfter: tradingAccount.margin
          }
        });
      }
    } else {
      // USER WALLET (legacy mode - no trading account):
      // For user wallet, we DO deduct margin from balance (simpler model)
      user.balance -= totalRequired;
      await user.save();
      
      console.log(`[TradeEngine] User Wallet: Deducted $${totalRequired.toFixed(2)} (Margin: $${margin.toFixed(2)} + Charges: $${tradingCharge.toFixed(2)})`);
      
      // Create transaction record
      await Transaction.create({
        user: userId,
        type: 'margin_deduction',
        amount: -totalRequired,
        description: `${type.toUpperCase()} ${amount} lots ${symbol} @ ${executionPrice.toFixed(5)} | Margin: $${margin.toFixed(2)} + Charges: $${tradingCharge.toFixed(2)}`,
        balanceBefore,
        balanceAfter: user.balance,
        status: 'completed',
        reference: `${trade._id}_open_${Date.now()}`
      });
    }

    // Notify user
    this.notifyUser(userId, 'orderExecuted', {
      trade,
      message: `${type.toUpperCase()} order executed: ${amount} ${symbol} @ ${executionPrice}`
    });

    return trade;
  }

  /**
   * Execute pending order (limit/stop)
   */
  async executePendingOrder(userId, orderData) {
    const { symbol, type, orderType, amount, price: targetPrice, leverage = 1, stopLoss, takeProfit } = orderData;
    
    const currentPrice = this.getPrice(symbol);
    if (!currentPrice) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }

    // Calculate margin required (reserve it)
    const margin = this.calculateMargin(symbol, amount, targetPrice, leverage);
    const fee = margin * 0.001;
    const totalRequired = margin + fee;

    // Check user balance
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.balance < totalRequired) {
      throw new Error(`Insufficient balance. Required: $${totalRequired.toFixed(2)}`);
    }

    // Generate client ID
    const clientId = `${user.firstName?.substring(0,2) || 'US'}${user._id.toString().slice(-6)}`.toUpperCase();

    // Create pending trade
    const trade = await Trade.create({
      user: userId,
      clientId,
      tradeSource: 'manual',
      symbol: symbol.toUpperCase(),
      type,
      orderType,
      amount,
      price: targetPrice,
      leverage,
      stopLoss,
      takeProfit,
      fee,
      margin,
      status: 'pending'
    });

    // Reserve margin
    const balanceBefore = user.balance;
    user.balance -= totalRequired;
    await user.save();

    // Create transaction record
    await Transaction.create({
      user: userId,
      type: 'margin_reserved',
      amount: -totalRequired,
      description: `Margin reserved for pending ${orderType} order: ${symbol}`,
      balanceBefore,
      balanceAfter: user.balance,
      status: 'completed',
      reference: trade._id
    });

    // Notify user
    this.notifyUser(userId, 'orderPlaced', {
      trade,
      message: `Pending ${orderType} order placed: ${amount} ${symbol} @ ${targetPrice}`
    });

    return trade;
  }

  /**
   * Check and execute pending orders
   */
  async checkPendingOrders() {
    try {
      const pendingTrades = await Trade.find({ status: 'pending' });
      
      for (const trade of pendingTrades) {
        const price = this.getPrice(trade.symbol);
        if (!price) continue;

        let shouldExecute = false;
        let executionPrice = null;

        if (trade.orderType === 'limit') {
          // Limit buy: execute when ask <= target price
          // Limit sell: execute when bid >= target price
          if (trade.type === 'buy' && price.ask <= trade.price) {
            shouldExecute = true;
            executionPrice = price.ask;
          } else if (trade.type === 'sell' && price.bid >= trade.price) {
            shouldExecute = true;
            executionPrice = price.bid;
          }
        } else if (trade.orderType === 'stop') {
          // Stop buy: execute when ask >= target price
          // Stop sell: execute when bid <= target price
          if (trade.type === 'buy' && price.ask >= trade.price) {
            shouldExecute = true;
            executionPrice = price.ask;
          } else if (trade.type === 'sell' && price.bid <= trade.price) {
            shouldExecute = true;
            executionPrice = price.bid;
          }
        }

        if (shouldExecute) {
          await this.activatePendingOrder(trade, executionPrice);
        }
      }
    } catch (err) {
      console.error('[TradeEngine] Error checking pending orders:', err);
    }
  }

  /**
   * Activate a pending order
   */
  async activatePendingOrder(trade, executionPrice) {
    trade.price = executionPrice;
    trade.status = 'open';
    trade.activatedAt = new Date();
    await trade.save();

    this.notifyUser(trade.user, 'pendingOrderActivated', {
      trade,
      message: `Pending order activated: ${trade.type.toUpperCase()} ${trade.amount} ${trade.symbol} @ ${executionPrice}`
    });

    console.log(`[TradeEngine] Pending order activated: ${trade._id}`);
  }

  /**
   * Check open positions for SL/TP and margin calls
   */
  async checkOpenPositions() {
    // Prevent concurrent checks
    if (this.isCheckingPositions) return;
    this.isCheckingPositions = true;
    
    try {
      const openTrades = await Trade.find({ status: 'open' });
      const userPositions = new Map(); // Group by user for margin check

      for (const trade of openTrades) {
        const price = this.getPrice(trade.symbol);
        if (!price) continue;

        const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
        const pnl = this.calculatePnL(trade, currentPrice);

        // Check Stop Loss - close at SL price when current price hits or crosses it
        if (trade.stopLoss && trade.stopLoss > 0) {
          const slHit = (trade.type === 'buy' && currentPrice <= trade.stopLoss) ||
                       (trade.type === 'sell' && currentPrice >= trade.stopLoss);
          if (slHit) {
            console.log(`[TradeEngine] SL triggered for ${trade.symbol}: Current ${currentPrice}, SL ${trade.stopLoss}`);
            await this.closeTrade(trade, trade.stopLoss, 'stop_loss');
            continue;
          }
        }

        // Check Take Profit - close at TP price when current price hits or crosses it
        if (trade.takeProfit && trade.takeProfit > 0) {
          const tpHit = (trade.type === 'buy' && currentPrice >= trade.takeProfit) ||
                       (trade.type === 'sell' && currentPrice <= trade.takeProfit);
          if (tpHit) {
            console.log(`[TradeEngine] TP triggered for ${trade.symbol}: Current ${currentPrice}, TP ${trade.takeProfit}`);
            await this.closeTrade(trade, trade.takeProfit, 'take_profit');
            continue;
          }
        }

        // Track user positions for margin check
        const userId = trade.user.toString();
        if (!userPositions.has(userId)) {
          userPositions.set(userId, { trades: [], totalPnL: 0, totalMargin: 0 });
        }
        const userPos = userPositions.get(userId);
        userPos.trades.push(trade);
        userPos.totalPnL += pnl;
        userPos.totalMargin += trade.margin || 0;
      }

      // Check margin levels for each user - Auto stop-out when equity reaches 0
      for (const [userId, positions] of userPositions) {
        await this.checkMarginLevel(userId, positions);
      }
    } catch (err) {
      console.error('[TradeEngine] Error checking open positions:', err);
    } finally {
      this.isCheckingPositions = false;
    }
  }

  /**
   * Check margin level and trigger stop-out if needed
   * MT5-Style: Uses Equity (Wallet + Credit + FloatingPnL) for margin calculations
   * Stop-out closes WORST LOSING trade first, not all at once
   */
  async checkMarginLevel(userId, positions) {
    try {
      // Group trades by trading account
      const accountTrades = new Map();
      for (const trade of positions.trades) {
        const accId = trade.tradingAccount?.toString() || 'wallet';
        if (!accountTrades.has(accId)) {
          accountTrades.set(accId, { trades: [], totalPnL: 0, totalMargin: 0 });
        }
        const accPos = accountTrades.get(accId);
        accPos.trades.push(trade);
        accPos.totalMargin += trade.margin || 0;
        const price = this.getPrice(trade.symbol);
        if (price) {
          const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
          accPos.totalPnL += this.calculatePnL(trade, currentPrice);
        }
      }

      // Check each trading account separately
      for (const [accId, accPositions] of accountTrades) {
        if (accId === 'wallet') {
          // User wallet - simple balance check
          const user = await User.findById(userId);
          const balance = user?.balance || 0;
          const equity = balance + accPositions.totalPnL;
          const stopOutLevel = balance * 0.1;
          if (equity <= stopOutLevel && accPositions.trades.length > 0) {
            await this.executeStopOut(userId, accId, accPositions.trades);
          }
        } else {
          // Trading account - use proper equity calculation with credit
          const tradingAccount = await TradingAccount.findById(accId);
          if (!tradingAccount) continue;
          
          const walletBalance = tradingAccount.balance;
          const creditBalance = tradingAccount.creditBalance || 0;
          const floatingPnL = accPositions.totalPnL;
          const usedMargin = accPositions.totalMargin;
          
          // Equity = Wallet + Credit + Floating P/L
          const equity = walletBalance + creditBalance + floatingPnL;
          
          // Margin Level = (Equity / Used Margin) × 100
          const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : Infinity;
          const stopOutThreshold = tradingAccount.stopOutLevel || 20; // Default 20%
          const marginCallThreshold = tradingAccount.marginCallLevel || 50; // Default 50%
          
          // Margin Call Warning (50% default)
          if (marginLevel <= marginCallThreshold && marginLevel > stopOutThreshold) {
            this.notifyUser(userId, 'marginCall', {
              accountId: accId,
              marginLevel: marginLevel.toFixed(2),
              equity: equity.toFixed(2),
              usedMargin: usedMargin.toFixed(2),
              message: `⚠️ MARGIN CALL: Margin level at ${marginLevel.toFixed(2)}%. Deposit funds or close positions.`
            });
          }
          
          // Stop-Out (20% default) - Close worst losing trade first
          if (marginLevel <= stopOutThreshold && accPositions.trades.length > 0) {
            console.log(`[TradeEngine] STOP-OUT triggered for account ${accId}. Margin Level: ${marginLevel.toFixed(2)}%, Threshold: ${stopOutThreshold}%`);
            console.log(`[TradeEngine] Equity: $${equity.toFixed(2)} (Wallet: $${walletBalance.toFixed(2)} + Credit: $${creditBalance.toFixed(2)} + PnL: $${floatingPnL.toFixed(2)})`);
            await this.executeStopOut(userId, accId, accPositions.trades);
          }
        }
      }
    } catch (err) {
      console.error('[TradeEngine] Error checking margin level:', err);
    }
  }

  /**
   * Execute stop-out: Close WORST LOSING trade first, then recalculate
   * Repeat until margin level is safe or no trades remain
   * DO NOT close all trades at once
   */
  async executeStopOut(userId, accountId, trades) {
    const closedTrades = [];
    let remainingTrades = [...trades];
    
    while (remainingTrades.length > 0) {
      // Find worst losing trade (most negative P/L)
      let worstTrade = null;
      let worstPnL = Infinity;
      
      for (const trade of remainingTrades) {
        const price = this.getPrice(trade.symbol);
        if (!price) continue;
        const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
        const pnl = this.calculatePnL(trade, currentPrice);
        if (pnl < worstPnL) {
          worstPnL = pnl;
          worstTrade = trade;
        }
      }
      
      if (!worstTrade) break;
      
      console.log(`[TradeEngine] Closing worst losing trade: ${worstTrade._id}, P/L: $${worstPnL.toFixed(2)}`);
      
      // Close the worst trade
      const price = this.getPrice(worstTrade.symbol);
      const closePrice = worstTrade.type === 'buy' ? price.bid : price.ask;
      const result = await this.closeTrade(worstTrade, closePrice, 'stop_out');
      
      if (result) {
        closedTrades.push(result);
      }
      
      // Remove from remaining trades
      remainingTrades = remainingTrades.filter(t => t._id.toString() !== worstTrade._id.toString());
      
      // Recalculate margin level
      if (accountId !== 'wallet' && remainingTrades.length > 0) {
        const tradingAccount = await TradingAccount.findById(accountId);
        if (tradingAccount) {
          let newFloatingPnL = 0;
          let newUsedMargin = 0;
          
          for (const trade of remainingTrades) {
            const price = this.getPrice(trade.symbol);
            if (price) {
              const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
              newFloatingPnL += this.calculatePnL(trade, currentPrice);
            }
            newUsedMargin += trade.margin || 0;
          }
          
          const newEquity = tradingAccount.balance + (tradingAccount.creditBalance || 0) + newFloatingPnL;
          const newMarginLevel = newUsedMargin > 0 ? (newEquity / newUsedMargin) * 100 : Infinity;
          const stopOutThreshold = tradingAccount.stopOutLevel || 20;
          
          console.log(`[TradeEngine] After closing trade - New Margin Level: ${newMarginLevel.toFixed(2)}%`);
          
          // If margin level is now safe, stop closing trades
          if (newMarginLevel > stopOutThreshold) {
            console.log(`[TradeEngine] Margin level restored above ${stopOutThreshold}%. Stopping stop-out process.`);
            break;
          }
        }
      } else {
        // For wallet, just close one trade at a time
        break;
      }
    }
    
    // Notify user about stop-out
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    this.notifyUser(userId, 'stopOut', {
      closedTrades,
      totalClosed: closedTrades.length,
      totalPnL,
      message: `🛑 STOP-OUT: ${closedTrades.length} position(s) closed due to insufficient margin. Total P/L: $${totalPnL.toFixed(2)}`
    });
    
    return closedTrades;
  }

  /**
   * Close a trade with proper P/L settlement
   * CRITICAL: Losses deduct ONLY from Wallet (Balance) - Credit is NEVER touched
   * CRITICAL: Profits add ONLY to Wallet (never Credit)
   */
  async closeTrade(trade, closePrice, reason = 'manual') {
    try {
      // Prevent double closing
      if (trade.status === 'closed') {
        console.log(`[TradeEngine] Trade ${trade._id} already closed, skipping`);
        return trade;
      }
      
      const rawPnl = this.calculatePnL(trade, closePrice);
      const pnl = rawPnl; // Charges already paid on open
      
      console.log(`[TradeEngine] Closing trade ${trade._id}: ${trade.symbol} @ ${closePrice}, P/L: $${pnl.toFixed(2)}, reason: ${reason}`);

      // Forward close to Liquidity Provider if this was an A Book trade
      if (trade.lpStatus === 'sent' && liquidityProvider.isEnabled()) {
        console.log(`[TradeEngine] A Book trade - forwarding close to Liquidity Provider`);
        const lpResult = await liquidityProvider.closeTrade(trade, closePrice);
        if (lpResult.success) {
          trade.lpCloseStatus = 'sent';
          console.log(`[TradeEngine] Trade close sent to LP successfully`);
        } else {
          trade.lpCloseStatus = 'failed';
          trade.lpCloseError = lpResult.error;
          console.error(`[TradeEngine] Failed to send trade close to LP: ${lpResult.error}`);
        }
      }
      
      // Update trade record
      trade.closePrice = closePrice;
      trade.profit = pnl;
      trade.rawProfit = rawPnl;
      trade.status = 'closed';
      trade.closedAt = new Date();
      trade.closeReason = reason;
      await trade.save();

      // Get user and trading account
      const user = await User.findById(trade.user);
      let tradingAccount = null;
      if (trade.tradingAccount) {
        tradingAccount = await TradingAccount.findById(trade.tradingAccount);
      }
      
      const usesTradingAccount = !!tradingAccount;
      const marginReturn = trade.margin || 0;
      let settlement = null;
      
      if (usesTradingAccount) {
        // ========== TRADING ACCOUNT SETTLEMENT ==========
        // CRITICAL: Margin is NOT money - it's just a tracking value
        // On trade close:
        //   - Used Margin DECREASES (releases the margin)
        //   - Free Margin INCREASES (as a result of equity calculation)
        //   - Wallet changes ONLY by realized P/L
        //   - Credit changes ONLY if loss is absorbed
        
        const balancesBefore = {
          wallet: tradingAccount.balance,
          credit: tradingAccount.creditBalance || 0,
          usedMargin: tradingAccount.margin || 0
        };
        
        // Release margin (decrease used margin - margin is NOT added to wallet)
        // Margin is just a "hold" on equity, not actual money movement
        tradingAccount.margin = Math.max(0, (tradingAccount.margin || 0) - marginReturn);
        
        // Apply P/L with proper priority using the model method
        // LOSS: ONLY from Wallet (Balance) - Credit is NEVER touched
        // PROFIT: Wallet only (never Credit)
        settlement = tradingAccount.applyRealizedPnL(pnl);
        
        // Update trade statistics
        if (pnl >= 0) {
          tradingAccount.winningTrades = (tradingAccount.winningTrades || 0) + 1;
          tradingAccount.totalProfit = (tradingAccount.totalProfit || 0) + pnl;
        } else {
          tradingAccount.losingTrades = (tradingAccount.losingTrades || 0) + 1;
          tradingAccount.totalLoss = (tradingAccount.totalLoss || 0) + Math.abs(pnl);
        }
        
        await tradingAccount.save();
        
        // Build detailed description
        let description = `Closed ${trade.type.toUpperCase()} ${trade.amount} ${trade.symbol} @ ${closePrice.toFixed(5)} (${reason})`;
        if (settlement.creditDeducted > 0) {
          description += ` | Credit absorbed: $${settlement.creditDeducted.toFixed(2)}`;
        }
        if (settlement.walletDeducted > 0) {
          description += ` | Wallet deducted: $${settlement.walletDeducted.toFixed(2)}`;
        }
        if (settlement.walletAdded > 0) {
          description += ` | Profit to wallet: $${settlement.walletAdded.toFixed(2)}`;
        }
        
        // Create transaction record
        // NOTE: Amount is ONLY the P/L, not margin (margin is not money)
        await Transaction.create({
          user: trade.user,
          type: pnl >= 0 ? 'trade_profit' : 'trade_loss',
          amount: pnl, // Only P/L affects balance, not margin
          description,
          balanceBefore: balancesBefore.wallet,
          balanceAfter: tradingAccount.balance,
          status: 'completed',
          reference: `${trade._id}_close_${Date.now()}`,
          metadata: {
            tradeId: trade._id,
            symbol: trade.symbol,
            closeReason: reason,
            rawPnL: rawPnl,
            finalPnL: pnl,
            marginReleased: marginReturn, // Margin released (not returned as money)
            usedMarginBefore: balancesBefore.usedMargin,
            usedMarginAfter: tradingAccount.margin,
            settlement: {
              creditDeducted: settlement.creditDeducted,
              walletDeducted: settlement.walletDeducted,
              walletAdded: settlement.walletAdded,
              creditBefore: balancesBefore.credit,
              creditAfter: tradingAccount.creditBalance
            }
          }
        });
        
        console.log(`[TradeEngine] Settlement: Credit deducted=$${settlement.creditDeducted.toFixed(2)}, Wallet deducted=$${settlement.walletDeducted.toFixed(2)}, Wallet added=$${settlement.walletAdded.toFixed(2)}`);
        console.log(`[TradeEngine] Margin released: $${marginReturn.toFixed(2)} (Used Margin: $${balancesBefore.usedMargin.toFixed(2)} → $${tradingAccount.margin.toFixed(2)})`);
        console.log(`[TradeEngine] Final balances: Wallet=$${tradingAccount.balance.toFixed(2)}, Credit=$${(tradingAccount.creditBalance || 0).toFixed(2)}`);
        
      } else if (user) {
        // ========== USER WALLET SETTLEMENT (no credit system) ==========
        // For user wallet (not trading account), margin was deducted on open
        // So we need to return it here. This is different from trading accounts.
        const balanceBefore = user.balance;
        
        // Return margin (for user wallet, margin WAS deducted from balance on open)
        user.balance += marginReturn;
        
        // Apply P/L
        if (pnl >= 0) {
          user.balance += pnl;
        } else {
          user.balance = Math.max(0, user.balance + pnl);
        }
        
        await user.save();

        await Transaction.create({
          user: trade.user,
          type: pnl >= 0 ? 'trade_profit' : 'trade_loss',
          amount: marginReturn + pnl, // For user wallet, margin was deducted so return it
          description: `Closed ${trade.type.toUpperCase()} ${trade.amount} ${trade.symbol} @ ${closePrice.toFixed(5)} (${reason})`,
          balanceBefore,
          balanceAfter: user.balance,
          status: 'completed',
          reference: `${trade._id}_close_${Date.now()}`
        });
      }
      
      if (user) {
        // Notify user
        const emoji = pnl >= 0 ? '✅' : '❌';
        let message = `${emoji} Trade closed (${reason}): ${trade.symbol} P/L: $${pnl.toFixed(2)}`;
        if (settlement && settlement.creditDeducted > 0) {
          message += ` (Credit absorbed $${settlement.creditDeducted.toFixed(2)} of loss)`;
        }
        
        this.notifyUser(trade.user, 'tradeClosed', {
          trade,
          reason,
          pnl,
          settlement,
          message
        });

        // Process IB commission
        try {
          const IBCommissionEngine = require('./ibCommissionEngine');
          const ibEngine = new IBCommissionEngine(this.io);
          await ibEngine.processTradeCommission(trade, user, trade.tradingCharge || 0);
        } catch (ibErr) {
          console.error('[TradeEngine] IB commission error:', ibErr);
        }

        // Close follower trades if this is a master trade
        if (!trade.isCopiedTrade && trade.tradeSource !== 'copy') {
          const TradeMaster = require('../models/TradeMaster');
          const tradeMaster = await TradeMaster.findOne({ userId: trade.user, status: 'approved' });
          if (tradeMaster) {
            console.log(`[TradeEngine] Master trade closed - closing follower trades`);
            const CopyTradeEngine = require('./copyTradeEngine');
            const copyEngine = new CopyTradeEngine(this.io);
            try {
              await copyEngine.closeFollowerTrades(trade, user);
            } catch (err) {
              console.error('[TradeEngine] Error closing follower trades:', err);
            }
          }
        }
      }

      return trade;
    } catch (err) {
      console.error('[TradeEngine] Error closing trade:', err);
      return null;
    }
  }

  /**
   * Calculate P&L for a trade
   * P&L is based on actual position size, NOT leveraged
   * Loss is limited to account balance (stop-out protection)
   */
  calculatePnL(trade, currentPrice) {
    const priceDiff = trade.type === 'buy' 
      ? currentPrice - trade.price 
      : trade.price - currentPrice;
    
    // P&L = price difference × lots × contract size (NO leverage)
    // Leverage only affects margin required to open, not P&L
    let contractSize = 100000; // Standard forex
    if (trade.symbol.includes('XAU')) contractSize = 100;
    else if (trade.symbol.includes('XAG')) contractSize = 5000;
    else if (trade.symbol.includes('BTC') || trade.symbol.includes('ETH')) contractSize = 1;
    
    return priceDiff * trade.amount * contractSize;
  }

  /**
   * Calculate margin required
   */
  calculateMargin(symbol, lotSize, price, leverage) {
    let contractSize = 100000;
    if (symbol.includes('XAU')) contractSize = 100;
    else if (symbol.includes('XAG')) contractSize = 5000;
    else if (symbol.includes('BTC') || symbol.includes('ETH')) contractSize = 1;
    
    return (price * contractSize * lotSize) / leverage;
  }

  /**
   * Get floating P&L for a user
   */
  async getFloatingPnL(userId) {
    const trades = await Trade.find({ user: userId, status: 'open' });
    let totalPnL = 0;
    const positions = [];

    for (const trade of trades) {
      const price = this.getPrice(trade.symbol);
      if (!price) continue;

      const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
      const pnl = this.calculatePnL(trade, currentPrice);
      totalPnL += pnl;

      positions.push({
        ...trade.toObject(),
        currentPrice,
        floatingPnL: pnl
      });
    }

    return { totalPnL, positions };
  }

  /**
   * Get floating P&L for a specific trading account
   * Used for equity calculations
   */
  async getAccountFloatingPnL(accountId) {
    const trades = await Trade.find({ 
      tradingAccount: accountId, 
      status: 'open' 
    });
    
    let totalPnL = 0;
    for (const trade of trades) {
      const price = this.getPrice(trade.symbol);
      if (!price) continue;
      
      const currentPrice = trade.type === 'buy' ? price.bid : price.ask;
      totalPnL += this.calculatePnL(trade, currentPrice);
    }
    
    return totalPnL;
  }

  /**
   * Get complete account status with equity, margin, and credit info
   * @param {string} accountId - Trading account ID
   * @returns {Promise<Object>} Complete account status
   */
  async getAccountStatus(accountId) {
    const tradingAccount = await TradingAccount.findById(accountId);
    if (!tradingAccount) throw new Error('Account not found');

    const floatingPnL = await this.getAccountFloatingPnL(accountId);
    
    const walletBalance = tradingAccount.balance;
    const creditBalance = tradingAccount.creditBalance || 0;
    const equity = walletBalance + creditBalance + floatingPnL;
    const usedMargin = tradingAccount.margin || 0;
    const freeMargin = equity - usedMargin;
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : Infinity;
    const buyingPower = equity * tradingAccount.leverage;
    const withdrawable = Math.max(0, walletBalance);

    return {
      accountId: tradingAccount._id,
      accountNumber: tradingAccount.accountNumber,
      walletBalance,
      creditBalance,
      equity,
      floatingPnL,
      usedMargin,
      freeMargin,
      marginLevel: marginLevel === Infinity ? null : marginLevel,
      leverage: tradingAccount.leverage,
      buyingPower,
      withdrawable,
      stopOutLevel: tradingAccount.stopOutLevel || 20,
      marginCallLevel: tradingAccount.marginCallLevel || 50,
      isMarginCall: marginLevel <= (tradingAccount.marginCallLevel || 50),
      isStopOut: marginLevel <= (tradingAccount.stopOutLevel || 20)
    };
  }

  /**
   * Modify trade SL/TP
   */
  async modifyTrade(tradeId, userId, { stopLoss, takeProfit }) {
    const trade = await Trade.findOne({ _id: tradeId, user: userId, status: 'open' });
    if (!trade) throw new Error('Trade not found');

    const price = this.getPrice(trade.symbol);
    if (!price) throw new Error('Unable to get current price');

    const currentPrice = trade.type === 'buy' ? price.bid : price.ask;

    // Validate new SL
    if (stopLoss !== undefined) {
      if (stopLoss !== null) {
        if (trade.type === 'buy' && stopLoss >= currentPrice) {
          throw new Error('Stop Loss must be below current price for buy orders');
        }
        if (trade.type === 'sell' && stopLoss <= currentPrice) {
          throw new Error('Stop Loss must be above current price for sell orders');
        }
      }
      trade.stopLoss = stopLoss;
    }

    // Validate new TP
    if (takeProfit !== undefined) {
      if (takeProfit !== null) {
        if (trade.type === 'buy' && takeProfit <= currentPrice) {
          throw new Error('Take Profit must be above current price for buy orders');
        }
        if (trade.type === 'sell' && takeProfit >= currentPrice) {
          throw new Error('Take Profit must be below current price for sell orders');
        }
      }
      trade.takeProfit = takeProfit;
    }

    await trade.save();
    return trade;
  }

  /**
   * Cancel pending order
   */
  async cancelPendingOrder(tradeId, userId) {
    const trade = await Trade.findOne({ _id: tradeId, user: userId, status: 'pending' });
    if (!trade) throw new Error('Pending order not found');

    trade.status = 'cancelled';
    trade.closedAt = new Date();
    await trade.save();

    // Return reserved margin
    const user = await User.findById(userId);
    if (user) {
      const margin = trade.margin || 0;
      const fee = trade.fee || 0;
      const refund = margin + fee;
      
      const balanceBefore = user.balance;
      user.balance += refund;
      await user.save();

      await Transaction.create({
        user: userId,
        type: 'margin_refund',
        amount: refund,
        description: `Margin refunded for cancelled ${trade.orderType} order: ${trade.symbol}`,
        balanceBefore,
        balanceAfter: user.balance,
        status: 'completed',
        reference: trade._id
      });
    }

    this.notifyUser(userId, 'orderCancelled', {
      trade,
      message: `Pending order cancelled: ${trade.symbol}`
    });

    return trade;
  }

  /**
   * Notify user via socket - ONLY sends to the specific user, NOT broadcast to all
   */
  notifyUser(userId, event, data) {
    if (this.io) {
      console.log(`[TradeEngine] Emitting ${event} to user ${userId} only`);
      
      const socketId = this.userSockets.get(userId.toString());
      if (socketId) {
        this.io.to(socketId).emit(event, data);
      }
      // Send to user's room only - NOT to all clients
      this.io.to(`user_${userId}`).emit(event, data);
      
      // REMOVED: Do NOT broadcast to all clients - this was causing all users to see all trades
      // this.io.emit(event, { ...data, userId });
    }
  }

  /**
   * Get charges for a trade (from database or defaults)
   * Now accepts accountTypeId to properly look up account type specific charges
   */
  async getChargesForTrade(symbol, userId, accountTypeId = null) {
    try {
      const charges = await TradingCharge.getChargesForTrade(symbol, userId, accountTypeId);
      return charges;
    } catch (err) {
      console.error('[TradeEngine] Error getting charges:', err);
      // Return default charges
      return {
        spreadPips: this.getDefaultSpread(symbol),
        commissionPerLot: 0,
        source: 'default'
      };
    }
  }

  /**
   * Calculate spread cost in USD
   */
  calculateSpreadCost(symbol, lotSize, spreadPips) {
    const pipSize = this.getPipSize(symbol);
    
    // Contract size varies by instrument
    let contractSize = 100000; // Standard forex
    if (symbol.includes('XAU')) contractSize = 100;
    else if (symbol.includes('XAG')) contractSize = 5000;
    else if (symbol.includes('BTC') || symbol.includes('ETH')) contractSize = 1;
    
    // Spread cost = spread in pips * pip value * lot size
    const pipValue = contractSize * pipSize;
    return spreadPips * pipValue * lotSize;
  }

  /**
   * Get pip size for symbol
   */
  getPipSize(symbol) {
    const pipSizes = {
      'EURUSD': 0.0001, 'GBPUSD': 0.0001, 'AUDUSD': 0.0001,
      'NZDUSD': 0.0001, 'USDCHF': 0.0001, 'USDCAD': 0.0001,
      'EURGBP': 0.0001, 'EURCHF': 0.0001,
      'USDJPY': 0.01, 'EURJPY': 0.01,
      'XAUUSD': 0.01, 'XAGUSD': 0.001,
      'BTCUSD': 1, 'ETHUSD': 0.01
    };
    return pipSizes[symbol] || 0.0001;
  }

  /**
   * Get contract size for symbol (value of 1 lot)
   */
  getContractSize(symbol) {
    const upperSymbol = symbol.toUpperCase();
    
    // Metals
    if (upperSymbol.includes('XAU')) return 100;      // 100 oz gold
    if (upperSymbol.includes('XAG')) return 5000;     // 5000 oz silver
    
    // Crypto
    if (upperSymbol.includes('BTC')) return 1;        // 1 BTC
    if (upperSymbol.includes('ETH')) return 1;        // 1 ETH
    if (upperSymbol.includes('SOL')) return 1;
    if (upperSymbol.includes('XRP')) return 1;
    
    // Indices
    if (['US30', 'US500', 'NAS100', 'UK100', 'GER40'].includes(upperSymbol)) return 1;
    
    // Forex (standard lot = 100,000 units)
    return 100000;
  }

  /**
   * Get default spread for symbol
   */
  getDefaultSpread(symbol) {
    const spreads = {
      'EURUSD': 1, 'GBPUSD': 1.5, 'USDJPY': 1,
      'USDCHF': 1.5, 'AUDUSD': 1.2, 'NZDUSD': 1.5,
      'USDCAD': 1.5, 'EURGBP': 1.5, 'EURJPY': 1.5,
      'EURCHF': 2, 'XAUUSD': 30, 'XAGUSD': 3,
      'BTCUSD': 50, 'ETHUSD': 5
    };
    return spreads[symbol] || 2;
  }
}

// Singleton instance
const tradeEngine = new TradeEngine();

module.exports = tradeEngine;
