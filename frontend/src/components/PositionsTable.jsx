import React, { useState, useEffect, useCallback } from 'react'
import { Edit2, X, ChevronDown, Loader2, XCircle } from 'lucide-react'
import axios from 'axios'
import { io } from 'socket.io-client'

const PositionsTable = () => {
  const [activeTab, setActiveTab] = useState('positions')
  const [positions, setPositions] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState({})
  const [closingTrade, setClosingTrade] = useState(null)
  const [modifyingTrade, setModifyingTrade] = useState(null)
  const [modifyForm, setModifyForm] = useState({ stopLoss: '', takeProfit: '' })
  const [showCloseDialog, setShowCloseDialog] = useState(null) // Trade to confirm close
  const [showOneClick, setShowOneClick] = useState(false)
  const [quickLots, setQuickLots] = useState(0.01)
  const [quickLeverage, setQuickLeverage] = useState(100)
  const [isCentAccount, setIsCentAccount] = useState(false)
  const [balanceMultiplier, setBalanceMultiplier] = useState(1)

  // Check if trading is locked (kill switch)
  const isTradingLocked = () => {
    const savedLockEnd = localStorage.getItem('tradingLockEnd')
    if (savedLockEnd) {
      const endTime = new Date(savedLockEnd)
      if (endTime > new Date()) return true
      else localStorage.removeItem('tradingLockEnd')
    }
    return false
  }

  // Get decimals based on symbol (matching instrument settings)
  const getDecimals = (symbol) => {
    if (!symbol) return 5
    if (symbol.includes('JPY')) return 3
    if (symbol.includes('BTC')) return 2
    if (symbol.includes('ETH')) return 2
    if (symbol.includes('XAU')) return 2
    if (symbol.includes('XAG')) return 3
    if (symbol.includes('US30') || symbol.includes('US500') || symbol.includes('US100') || symbol.includes('DE30') || symbol.includes('UK100')) return 1
    if (symbol.includes('JP225')) return 0
    if (symbol.includes('OIL')) return 2
    if (symbol.includes('XNG')) return 3
    if (symbol.includes('LTC') || symbol.includes('XRP') || symbol.includes('DOGE') || symbol.includes('SOL')) return 4
    return 5
  }

  const formatPrice = (price, symbol) => {
    if (!price && price !== 0) return '---'
    return price.toFixed(getDecimals(symbol))
  }
  
  const styles = {
    container: { backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' },
    border: { borderColor: 'var(--border-color)' },
    text: { color: 'var(--text-primary)' },
    textSecondary: { color: 'var(--text-secondary)' },
  }

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  const getSocketUrl = () => {
    const envUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL
    if (envUrl) return envUrl
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5001'
    return `${window.location.protocol}//${window.location.host}`
  }

  useEffect(() => {
    fetchPositions()
    fetchPrices()
    
    // Set up socket for real-time price updates
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io(getSocketUrl(), { auth: { token } })
    
    socket.on('priceUpdate', (newPrices) => {
      setPrices(newPrices)
    })

    // Listen for real-time tick updates (AllTick)
    socket.on('tick', (tickData) => {
      if (tickData?.symbol) {
        setPrices(prev => ({
          ...prev,
          [tickData.symbol]: {
            bid: tickData.bid,
            ask: tickData.ask,
            price: tickData.price || (tickData.bid + tickData.ask) / 2,
            timestamp: tickData.timestamp
          }
        }))
      }
    })

    // Join user room for instant updates
    socket.on('connect', () => {
      console.log('[PositionsTable] Socket connected, joining user room')
    })

    // Refresh on trade events - instant updates
    socket.on('tradeClosed', (data) => {
      console.log('[PositionsTable] Trade closed:', data)
      fetchPositions()
    })
    socket.on('orderExecuted', (data) => {
      console.log('[PositionsTable] Order executed:', data)
      fetchPositions()
    })
    socket.on('pendingOrderActivated', (data) => {
      console.log('[PositionsTable] Pending order activated:', data)
      fetchPositions()
    })
    socket.on('orderCancelled', (data) => {
      console.log('[PositionsTable] Order cancelled:', data)
      fetchPositions()
    })
    socket.on('orderPlaced', (data) => {
      console.log('[PositionsTable] Order placed:', data)
      fetchPositions()
    })
    socket.on('stopOut', (data) => {
      console.log('[PositionsTable] Stop out:', data)
      fetchPositions()
    })
    
    // Copy trade events - instant updates for followers
    socket.on('trade_copied', (data) => {
      console.log('[PositionsTable] Copy trade received:', data)
      fetchPositions()
    })
    socket.on('trade_modified', (data) => {
      console.log('[PositionsTable] Copy trade modified:', data)
      fetchPositions()
    })
    socket.on('trade_closed', (data) => {
      console.log('[PositionsTable] Copy trade closed:', data)
      fetchPositions()
    })
    socket.on('balanceUpdate', () => {
      console.log('[PositionsTable] Balance updated')
      fetchPositions()
    })

    // Poll for updates every 3 seconds (WebSocket handles real-time)
    const interval = setInterval(() => {
      fetchPrices()
    }, 3000)

    // Listen for custom trade events from OrderPanel
    const handleTradeCreated = () => {
      console.log('[PositionsTable] Trade created event received')
      fetchPositions()
    }
    window.addEventListener('tradeCreated', handleTradeCreated)

    return () => {
      socket.disconnect()
      clearInterval(interval)
      window.removeEventListener('tradeCreated', handleTradeCreated)
    }
  }, [])

  const fetchPositions = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Get active trading account to filter trades
      const savedAccount = localStorage.getItem('activeTradingAccount')
      let tradingAccountId = null
      
      if (savedAccount) {
        const accountData = JSON.parse(savedAccount)
        tradingAccountId = accountData._id
        
        // Check if it's a cent account
        const accountRes = await axios.get(`/api/trading-accounts/${accountData._id}`, getAuthHeader())
        if (accountRes.data.success && accountRes.data.data) {
          setIsCentAccount(accountRes.data.data.isCentAccount || false)
          setBalanceMultiplier(accountRes.data.data.isCentAccount ? 100 : 1)
        }
      }
      
      // Fetch trades filtered by trading account
      const url = tradingAccountId 
        ? `/api/trades?tradingAccountId=${tradingAccountId}` 
        : '/api/trades'
      const res = await axios.get(url, getAuthHeader())
      
      if (res.data.success) {
        const trades = res.data.data?.trades || res.data.data || []
        setPositions(trades.filter(t => t.status === 'open'))
        setPendingOrders(trades.filter(t => t.status === 'pending'))
        setHistory(trades.filter(t => t.status === 'closed').slice(0, 20))
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err)
      setPositions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPrices = async () => {
    try {
      const res = await axios.get('/api/trades/prices', getAuthHeader())
      if (res.data.success) {
        setPrices(res.data.data)
      }
    } catch (err) {
      // Silent fail for price updates
    }
  }

  const closeTrade = async (tradeId) => {
    try {
      setClosingTrade(tradeId)
      const res = await axios.post(`/api/trades/${tradeId}/close`, {}, getAuthHeader())
      if (res.data.success) {
        fetchPositions()
        window.dispatchEvent(new Event('tradeClosed'))
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close trade')
    } finally {
      setClosingTrade(null)
    }
  }

  const cancelOrder = async (tradeId) => {
    try {
      setClosingTrade(tradeId)
      const res = await axios.put(`/api/trades/${tradeId}/cancel`, {}, getAuthHeader())
      if (res.data.success) {
        fetchPositions()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order')
    } finally {
      setClosingTrade(null)
    }
  }

  const modifyTrade = async (tradeId) => {
    try {
      const res = await axios.put(`/api/trades/${tradeId}/modify`, {
        stopLoss: modifyForm.stopLoss ? parseFloat(modifyForm.stopLoss) : null,
        takeProfit: modifyForm.takeProfit ? parseFloat(modifyForm.takeProfit) : null
      }, getAuthHeader())
      if (res.data.success) {
        setModifyingTrade(null)
        fetchPositions()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to modify trade')
    }
  }

  const calculatePnL = (trade) => {
    const price = prices[trade.symbol]
    if (!price) return trade.profit || 0
    
    const currentPrice = trade.type === 'buy' ? price.bid : price.ask
    const priceDiff = trade.type === 'buy' 
      ? currentPrice - trade.price 
      : trade.price - currentPrice
    
    // Simplified P&L calculation
    let contractSize = 100000
    if (trade.symbol.includes('XAU')) contractSize = 100
    else if (trade.symbol.includes('XAG')) contractSize = 5000
    else if (trade.symbol.includes('BTC') || trade.symbol.includes('ETH')) contractSize = 1
    
    return priceDiff * trade.amount * contractSize
  }

  const getCurrentPrice = (trade) => {
    const price = prices[trade.symbol]
    if (!price) return trade.price
    return trade.type === 'buy' ? price.bid : price.ask
  }
  
  const tabs = [
    { id: 'positions', label: 'Positions', count: positions.length },
    { id: 'pending', label: 'Pending', count: pendingOrders.length },
    { id: 'history', label: 'History 24H', count: history.length },
    { id: 'cancelled', label: 'Cancelled 24H', count: 0 },
  ]

  // Calculate live total P&L
  const totalPnL = positions.reduce((sum, pos) => sum + calculatePnL(pos), 0)

  return (
    <div className="h-full flex flex-col transition-colors" style={styles.container}>
      {/* Tabs Row with One Click Trading */}
      <div 
        className="flex flex-wrap items-center justify-between px-2 sm:px-4 gap-2"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        {/* Left: Tabs */}
        <div className="flex flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
              style={{ 
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent'
              }}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.id === 'positions' ? 'Pos' : tab.id === 'pending' ? 'Pend' : tab.id === 'history' ? 'Hist' : 'Canc'}</span>
              ({tab.count})
            </button>
          ))}
        </div>
        
        {/* Right: One Click Trading Controls & P/L */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* One Click Trading Controls - Inline */}
          {showOneClick && (
            <div className="flex items-center gap-1.5 rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }}>
              {/* Sell Button */}
              <button
                onClick={async () => {
                  if (isTradingLocked()) {
                    alert('Trading is currently locked. Kill switch is active.')
                    return
                  }
                  const symbol = localStorage.getItem('selectedSymbol') || 'XAUUSD'
                  const activeAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || '{}')
                  console.log('[QuickTrade] SELL', symbol, quickLots, 'Leverage:', quickLeverage)
                  try {
                    const token = localStorage.getItem('token')
                    const res = await axios.post('/api/trades', { 
                      symbol, type: 'sell', amount: quickLots, orderType: 'market',
                      tradingAccountId: activeAccount._id,
                      leverage: quickLeverage
                    }, { headers: { Authorization: `Bearer ${token}` }})
                    if (res.data.success) {
                      fetchPositions()
                      window.dispatchEvent(new Event('tradeCreated'))
                    }
                  } catch (err) { 
                    alert(err.response?.data?.message || 'Trade failed')
                  }
                }}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all hover:scale-110"
                style={{ backgroundColor: 'var(--ask-color)', color: 'white' }}
              >S</button>
              
              {/* Lots Input */}
              <input 
                type="number" 
                inputMode="decimal"
                value={quickLots} 
                onChange={(e) => setQuickLots(parseFloat(e.target.value) || 0.01)} 
                onFocus={(e) => e.target.select()}
                step="0.01" 
                min="0.01"
                className="w-10 sm:w-12 text-center text-xs font-semibold rounded px-1 py-0.5" 
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} 
              />
              
              {/* Buy Button */}
              <button
                onClick={async () => {
                  if (isTradingLocked()) {
                    alert('Trading is currently locked. Kill switch is active.')
                    return
                  }
                  const symbol = localStorage.getItem('selectedSymbol') || 'XAUUSD'
                  const activeAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || '{}')
                  console.log('[QuickTrade] BUY', symbol, quickLots, 'Leverage:', quickLeverage)
                  try {
                    const token = localStorage.getItem('token')
                    const res = await axios.post('/api/trades', { 
                      symbol, type: 'buy', amount: quickLots, orderType: 'market',
                      tradingAccountId: activeAccount._id,
                      leverage: quickLeverage
                    }, { headers: { Authorization: `Bearer ${token}` }})
                    if (res.data.success) {
                      fetchPositions()
                      window.dispatchEvent(new Event('tradeCreated'))
                    }
                  } catch (err) { 
                    alert(err.response?.data?.message || 'Trade failed')
                  }
                }}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all hover:scale-110"
                style={{ backgroundColor: 'var(--bid-color)', color: 'white' }}
              >B</button>
              
              {/* Leverage Selector */}
              <select
                value={quickLeverage}
                onChange={(e) => setQuickLeverage(parseInt(e.target.value))}
                className="text-xs font-semibold rounded px-1 py-0.5 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                <option value={1}>1:1</option>
                <option value={10}>1:10</option>
                <option value={25}>1:25</option>
                <option value={50}>1:50</option>
                <option value={100}>1:100</option>
                <option value={200}>1:200</option>
                <option value={500}>1:500</option>
                <option value={1000}>1:1000</option>
              </select>
            </div>
          )}
          
          {/* One Click Trading Toggle */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>1-Click</span>
            <button
              onClick={() => setShowOneClick(!showOneClick)}
              className="relative w-8 sm:w-9 h-4 sm:h-5 rounded-full transition-all flex-shrink-0"
              style={{ backgroundColor: showOneClick ? 'var(--accent-gold)' : 'var(--bg-hover)' }}
              title="Toggle One Click Trading"
            >
              <div 
                className="absolute top-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white transition-all shadow"
                style={{ left: showOneClick ? '16px' : '2px' }}
              />
            </button>
          </div>
          
          {/* Floating P/L */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>P/L:</span>
            <span 
              className="text-xs sm:text-sm font-bold"
              style={{ color: totalPnL >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)' }}
            >
              {totalPnL >= 0 ? '+' : ''}{isCentAccount ? '¢' : '$'}{(totalPnL * balanceMultiplier).toFixed(2)}
            </span>
            {isCentAccount && <span className="text-xs text-yellow-500">¢</span>}
          </div>
        </div>
      </div>
      
      {/* Table Header */}
      <div 
        className="grid grid-cols-12 gap-2 px-4 py-2 text-xs items-center"
        style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
      >
        <div>Time</div>
        <div>Symbol</div>
        <div>Side</div>
        <div>Lots</div>
        <div>Entry</div>
        <div>Current</div>
        <div>SL</div>
        <div>TP</div>
        <div>Charges</div>
        <div>Spread</div>
        <div>P/L</div>
        <div>Action</div>
      </div>
      
      {/* Table Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin" size={20} style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : activeTab === 'positions' && positions.length > 0 ? (
          positions.map(pos => {
            const pnl = calculatePnL(pos)
            const currentPrice = getCurrentPrice(pos)
            return (
              <div 
                key={pos._id}
                className="grid grid-cols-12 gap-2 px-4 py-2 text-sm items-center transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ color: 'var(--text-secondary)' }}>{new Date(pos.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{pos.symbol}</div>
                <div>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                    style={{ 
                      backgroundColor: pos.type === 'buy' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                      color: pos.type === 'buy' ? 'var(--ask-color)' : 'var(--bid-color)'
                    }}
                  >
                    {pos.type}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{(pos.amount || 0).toFixed(2)}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{formatPrice(pos.price, pos.symbol)}</div>
                <div style={{ color: 'var(--text-primary)' }}>{formatPrice(currentPrice, pos.symbol)}</div>
                <div style={{ color: pos.stopLoss ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{pos.stopLoss || '-'}</div>
                <div style={{ color: pos.takeProfit ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{pos.takeProfit || '-'}</div>
                <div style={{ color: 'var(--text-muted)' }}>{isCentAccount ? '¢' : '$'}{((pos.tradingCharge || pos.commission || 0) * balanceMultiplier).toFixed(2)}</div>
                <div style={{ color: '#fbbf24' }}>{pos.spread || 0} pips</div>
                <div 
                  className="font-medium"
                  style={{ color: pnl >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)' }}
                >
                  {pnl >= 0 ? '+' : ''}{isCentAccount ? '¢' : '$'}{(pnl * balanceMultiplier).toFixed(2)}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setModifyingTrade(pos)
                      setModifyForm({ stopLoss: pos.stopLoss || '', takeProfit: pos.takeProfit || '' })
                    }}
                    className="transition-colors hover:opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Modify SL/TP"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => setShowCloseDialog(pos)}
                    disabled={closingTrade === pos._id}
                    className="transition-colors hover:text-red-500"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Close Trade"
                  >
                    {closingTrade === pos._id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>
                </div>
              </div>
            )
          })
        ) : activeTab === 'pending' && pendingOrders.length > 0 ? (
          pendingOrders.map(order => (
            <div 
              key={order._id}
              className="grid grid-cols-12 gap-2 px-4 py-2 text-sm items-center transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ color: 'var(--text-secondary)' }}>{new Date(order.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{order.symbol}</div>
              <div>
                <span 
                  className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                  style={{ 
                    backgroundColor: order.type === 'buy' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: order.type === 'buy' ? 'var(--ask-color)' : 'var(--bid-color)'
                  }}
                >
                  {order.type}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{(order.amount || 0).toFixed(2)}</div>
              <div style={{ color: '#fbbf24' }}>{formatPrice(order.price, order.symbol)} ({order.orderType})</div>
              <div style={{ color: 'var(--text-muted)' }}>-</div>
              <div style={{ color: order.stopLoss ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{order.stopLoss || '-'}</div>
              <div style={{ color: order.takeProfit ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{order.takeProfit || '-'}</div>
              <div style={{ color: 'var(--text-muted)' }}>{isCentAccount ? '¢' : '$'}{((order.tradingCharge || order.commission || 0) * balanceMultiplier).toFixed(2)}</div>
              <div style={{ color: '#fbbf24' }}>{order.spread || 0} pips</div>
              <div style={{ color: 'var(--text-muted)' }}>Pending</div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => cancelOrder(order._id)}
                  disabled={closingTrade === order._id}
                  className="transition-colors hover:text-red-500"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Cancel Order"
                >
                  {closingTrade === order._id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                </button>
              </div>
            </div>
          ))
        ) : activeTab === 'history' && history.length > 0 ? (
          history.map(trade => (
            <div 
              key={trade._id}
              className="grid grid-cols-12 gap-2 px-4 py-2 text-sm items-center transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ color: 'var(--text-secondary)' }}>{new Date(trade.closedAt || trade.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{trade.symbol}</div>
              <div>
                <span 
                  className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                  style={{ 
                    backgroundColor: trade.type === 'buy' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: trade.type === 'buy' ? 'var(--ask-color)' : 'var(--bid-color)'
                  }}
                >
                  {trade.type}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{(trade.amount || 0).toFixed(2)}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{formatPrice(trade.price, trade.symbol)}</div>
              <div style={{ color: 'var(--text-primary)' }}>{formatPrice(trade.closePrice, trade.symbol)}</div>
              <div style={{ color: 'var(--text-muted)' }}>{trade.stopLoss || '-'}</div>
              <div style={{ color: 'var(--text-muted)' }}>{trade.takeProfit || '-'}</div>
              <div style={{ color: 'var(--text-muted)' }}>{isCentAccount ? '¢' : '$'}{((trade.tradingCharge || trade.commission || 0) * balanceMultiplier).toFixed(2)}</div>
              <div style={{ color: '#fbbf24' }}>{trade.spread || 0} pips</div>
              <div 
                className="font-medium"
                style={{ color: (trade.profit || 0) >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)' }}
              >
                {(trade.profit || 0) >= 0 ? '+' : ''}{isCentAccount ? '¢' : '$'}{((trade.profit || 0) * balanceMultiplier).toFixed(2)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {trade.closeReason || 'manual'}
              </div>
            </div>
          ))
        ) : (
          <div 
            className="flex items-center justify-center h-full"
            style={{ color: 'var(--text-muted)' }}
          >
            No {activeTab === 'positions' ? 'open positions' : activeTab === 'pending' ? 'pending orders' : 'history'}
          </div>
        )}
      </div>

      {/* Modify SL/TP Modal */}
      {modifyingTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl p-6 w-80" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Modify {modifyingTrade.symbol}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Stop Loss</label>
                <input
                  type="number"
                  step="0.00001"
                  value={modifyForm.stopLoss}
                  onChange={(e) => setModifyForm({ ...modifyForm, stopLoss: e.target.value })}
                  placeholder="Leave empty to remove"
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Take Profit</label>
                <input
                  type="number"
                  step="0.00001"
                  value={modifyForm.takeProfit}
                  onChange={(e) => setModifyForm({ ...modifyForm, takeProfit: e.target.value })}
                  placeholder="Leave empty to remove"
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModifyingTrade(null)}
                  className="flex-1 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => modifyTrade(modifyingTrade._id)}
                  className="flex-1 py-2 rounded-lg text-white"
                  style={{ background: 'var(--gradient-gold)' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Trade Confirmation Dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Close Trade
            </h3>
            <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Symbol</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{showCloseDialog.symbol}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Type</span>
                <span className="uppercase" style={{ color: showCloseDialog.type === 'buy' ? 'var(--ask-color)' : 'var(--bid-color)' }}>
                  {showCloseDialog.type}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Volume</span>
                <span style={{ color: 'var(--text-primary)' }}>{showCloseDialog.amount?.toFixed(2)} lots</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Entry</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatPrice(showCloseDialog.price, showCloseDialog.symbol)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Floating P/L {isCentAccount && '(Cents)'}</span>
                <span style={{ color: calculatePnL(showCloseDialog) >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)' }}>
                  {calculatePnL(showCloseDialog) >= 0 ? '+' : ''}{isCentAccount ? '¢' : '$'}{(calculatePnL(showCloseDialog) * balanceMultiplier).toFixed(2)}
                </span>
              </div>
            </div>
            
            {/* Close Options */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={async () => {
                  await closeTrade(showCloseDialog._id)
                  setShowCloseDialog(null)
                }}
                disabled={closingTrade === showCloseDialog._id}
                className="py-2.5 rounded-xl font-medium text-white flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600"
              >
                {closingTrade === showCloseDialog._id ? <Loader2 size={14} className="animate-spin" /> : null}
                Close This
              </button>
              <button
                onClick={async () => {
                  setClosingTrade('all')
                  let closed = 0
                  console.log('Closing all trades:', positions.length)
                  for (const trade of positions) {
                    console.log('Closing trade:', trade._id, trade.symbol)
                    try { 
                      const res = await axios.post(`/api/trades/${trade._id}/close`, {}, getAuthHeader())
                      console.log('Close response:', res.data)
                      if (res.data.success) closed++
                    } catch (err) { 
                      console.error('Close error:', err.response?.data || err.message)
                    }
                  }
                  console.log('Closed', closed, 'trades')
                  await fetchPositions()
                  window.dispatchEvent(new Event('tradeClosed'))
                  setClosingTrade(null)
                  setShowCloseDialog(null)
                }}
                className="py-2.5 rounded-xl font-medium text-white bg-gray-600 hover:bg-gray-700 flex items-center justify-center gap-2"
                disabled={closingTrade === 'all'}
              >
                {closingTrade === 'all' && <Loader2 size={14} className="animate-spin" />}
                Close All ({positions.length})
              </button>
              <button
                onClick={async () => {
                  setClosingTrade('profit')
                  const profitTrades = positions.filter(p => calculatePnL(p) > 0)
                  for (const trade of profitTrades) {
                    try { 
                      await axios.post(`/api/trades/${trade._id}/close`, {}, getAuthHeader()) 
                    } catch (err) { console.error('Close error:', err) }
                  }
                  fetchPositions()
                  window.dispatchEvent(new Event('tradeClosed'))
                  setClosingTrade(null)
                  setShowCloseDialog(null)
                }}
                className="py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                disabled={closingTrade === 'profit'}
              >
                {closingTrade === 'profit' && <Loader2 size={14} className="animate-spin" />}
                Close Profit ({positions.filter(p => calculatePnL(p) > 0).length})
              </button>
              <button
                onClick={async () => {
                  setClosingTrade('loss')
                  const lossTrades = positions.filter(p => calculatePnL(p) < 0)
                  for (const trade of lossTrades) {
                    try { 
                      await axios.post(`/api/trades/${trade._id}/close`, {}, getAuthHeader()) 
                    } catch (err) { console.error('Close error:', err) }
                  }
                  fetchPositions()
                  window.dispatchEvent(new Event('tradeClosed'))
                  setClosingTrade(null)
                  setShowCloseDialog(null)
                }}
                className="py-2.5 rounded-xl font-medium text-white bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2"
                disabled={closingTrade === 'loss'}
              >
                {closingTrade === 'loss' && <Loader2 size={14} className="animate-spin" />}
                Close Loss ({positions.filter(p => calculatePnL(p) < 0).length})
              </button>
            </div>
            
            <button
              onClick={() => setShowCloseDialog(null)}
              className="w-full py-2.5 rounded-xl font-medium"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PositionsTable
