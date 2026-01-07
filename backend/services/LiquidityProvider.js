const crypto = require('crypto');
const axios = require('axios');

class LiquidityProvider {
  constructor() {
    this.apiKey = null;
    this.apiSecret = null;
    this.baseUrl = null;
    this.enabled = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    this.apiKey = process.env.LP_API_KEY || '';
    this.apiSecret = process.env.LP_API_SECRET || '';
    this.baseUrl = process.env.LP_BASE_URL || 'http://localhost:3001';
    this.enabled = !!(this.apiKey && this.apiSecret);
    this.initialized = true;
    
    if (this.enabled) {
      console.log('[LiquidityProvider] Initialized - Connected to:', this.baseUrl);
    } else {
      console.log('[LiquidityProvider] Not configured - Set LP_API_KEY and LP_API_SECRET in .env');
    }
  }

  generateSignature(timestamp, method, path, body = '') {
    const message = timestamp + method + path + body;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  getHeaders(method, path, body = '') {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(timestamp, method, path, body);
    
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature
    };
  }

  async openTrade(trade) {
    if (!this.initialized) this.init();
    if (!this.enabled) {
      console.log('[LiquidityProvider] Skipping - not configured');
      return { success: false, error: 'LP not configured' };
    }

    try {
      const path = '/api/trade/open';
      const body = JSON.stringify({
        externalTradeId: trade._id.toString(),
        symbol: trade.symbol,
        side: trade.type, // 'buy' or 'sell'
        volume: trade.amount || trade.volume || 0.01,
        openPrice: trade.price || trade.openPrice
      });

      const headers = this.getHeaders('POST', path, body);
      
      console.log('[LiquidityProvider] Opening trade:', {
        externalTradeId: trade._id.toString(),
        symbol: trade.symbol,
        side: trade.type,
        volume: trade.amount || trade.volume,
        openPrice: trade.price || trade.openPrice
      });

      const response = await axios.post(this.baseUrl + path, body, { headers });
      
      console.log('[LiquidityProvider] Trade opened successfully:', response.data);
      
      return {
        success: true,
        data: response.data,
        lpTradeId: response.data?.tradeId || response.data?.id
      };
    } catch (error) {
      console.error('[LiquidityProvider] Error opening trade:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async closeTrade(trade, closePrice) {
    if (!this.initialized) this.init();
    if (!this.enabled) {
      console.log('[LiquidityProvider] Skipping - not configured');
      return { success: false, error: 'LP not configured' };
    }

    try {
      const path = '/api/trade/close';
      const body = JSON.stringify({
        externalTradeId: trade._id.toString(),
        closePrice: closePrice || trade.closePrice
      });

      const headers = this.getHeaders('POST', path, body);
      
      console.log('[LiquidityProvider] Closing trade:', {
        externalTradeId: trade._id.toString(),
        closePrice: closePrice || trade.closePrice
      });

      const response = await axios.post(this.baseUrl + path, body, { headers });
      
      console.log('[LiquidityProvider] Trade closed successfully:', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('[LiquidityProvider] Error closing trade:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getBalance() {
    if (!this.initialized) this.init();
    if (!this.enabled) {
      return { success: false, error: 'LP not configured' };
    }

    try {
      const path = '/api/wallet/balance';
      const headers = this.getHeaders('GET', path);
      
      const response = await axios.get(this.baseUrl + path, { headers });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('[LiquidityProvider] Error getting balance:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getTrades(status = null, limit = 100, skip = 0) {
    if (!this.enabled) {
      return { success: false, error: 'LP not configured' };
    }

    try {
      let path = `/api/trades?limit=${limit}&skip=${skip}`;
      if (status) path += `&status=${status}`;
      
      const headers = this.getHeaders('GET', path);
      
      const response = await axios.get(this.baseUrl + path, { headers });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('[LiquidityProvider] Error getting trades:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  isEnabled() {
    if (!this.initialized) this.init();
    return this.enabled;
  }

  reload() {
    this.initialized = false;
    this.init();
  }
}

// Singleton instance
const liquidityProvider = new LiquidityProvider();

module.exports = liquidityProvider;
