import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { Home, LayoutGrid, X, Wallet as WalletIcon, ArrowRightLeft, ShieldOff, Clock } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import InstrumentsPanel from './components/InstrumentsPanel'
import TradingViewChart from './components/TradingViewChart'
import OrderPanel from './components/OrderPanel'
import PositionsTable from './components/PositionsTable'
import Dashboard from './components/Dashboard'
import Wallet from './components/Wallet'
import CopyTrade from './components/CopyTrade'
import IBDashboard from './components/IBDashboard'
import Orders from './components/Orders'
import Profile from './components/Profile'
import Support from './components/Support'
import TradingAccounts from './components/TradingAccounts'
import TradeNotifications from './components/TradeNotifications'
import MobileApp from './components/mobile/MobileApp'
import Leaderboard from './components/Leaderboard'
import ImpersonationBanner from './components/ImpersonationBanner'

function App({ initialView = 'home' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState(initialView)
  const [showInstruments, setShowInstruments] = useState(true)

  // Sync activeView with URL location
  useEffect(() => {
    const pathToView = {
      '/home': 'home',
      '/trade': 'chart',
      '/terminal': 'terminal',
      '/wallet': 'wallet',
      '/leaderboard': 'leaderboard',
      '/copytrade': 'copy',
      '/ib': 'ib',
      '/orders': 'orders',
      '/profile': 'profile',
      '/support': 'support',
      '/accounts': 'accounts'
    }
    const view = pathToView[location.pathname]
    if (view && view !== activeView) {
      setActiveView(view)
    }
  }, [location.pathname])
  const [showOrderPanel, setShowOrderPanel] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState(() => {
    // Load from localStorage or default to XAUUSD
    return localStorage.getItem('selectedSymbol') || 'XAUUSD'
  })
  const [orderType, setOrderType] = useState('market')
  const [quickLots, setQuickLots] = useState(0.01)
  const [livePrices, setLivePrices] = useState({ bid: 0, ask: 0 })
  const [showKillSwitch, setShowKillSwitch] = useState(false)
  const [killDuration, setKillDuration] = useState('1')
  const [killUnit, setKillUnit] = useState('hours')
  const [tradingLocked, setTradingLocked] = useState(false)
  const [lockEndTime, setLockEndTime] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState('')

  // Get decimals based on symbol (matching instrument settings)
  const getDecimals = (sym) => {
    if (!sym) return 5
    if (sym.includes('JPY')) return 3
    if (sym.includes('BTC')) return 2
    if (sym.includes('ETH')) return 2
    if (sym.includes('XAU')) return 2
    if (sym.includes('XAG')) return 3
    if (sym.includes('US30') || sym.includes('US500') || sym.includes('US100') || sym.includes('DE30') || sym.includes('UK100')) return 1
    if (sym.includes('JP225')) return 0
    if (sym.includes('OIL')) return 2
    if (sym.includes('XNG')) return 3
    if (sym.includes('LTC') || sym.includes('XRP') || sym.includes('DOGE') || sym.includes('SOL')) return 4
    return 5
  }
  const [positionsHeight, setPositionsHeight] = useState(180)
  const [isResizing, setIsResizing] = useState(false)
  // Technical Analysis removed
  const [chartTabs, setChartTabs] = useState([{ id: 1, symbol: 'XAUUSD' }])
  const [activeChartTab, setActiveChartTab] = useState(1)
  
  // Add new chart tab
  const addChartTab = (symbol) => {
    const newId = Math.max(...chartTabs.map(t => t.id)) + 1
    setChartTabs([...chartTabs, { id: newId, symbol }])
    setActiveChartTab(newId)
    setSelectedSymbol(symbol)
  }
  
  // Close chart tab
  const closeChartTab = (tabId) => {
    if (chartTabs.length === 1) return // Keep at least one tab
    const newTabs = chartTabs.filter(t => t.id !== tabId)
    setChartTabs(newTabs)
    if (activeChartTab === tabId) {
      setActiveChartTab(newTabs[0].id)
      setSelectedSymbol(newTabs[0].symbol)
    }
  }
  
  // Switch chart tab
  const switchChartTab = (tabId) => {
    const tab = chartTabs.find(t => t.id === tabId)
    if (tab) {
      setActiveChartTab(tabId)
      setSelectedSymbol(tab.symbol)
    }
  }
  
  // Update current tab symbol when selecting from instruments
  const handleSelectSymbol = (symbol, openInNewTab = false) => {
    if (openInNewTab) {
      addChartTab(symbol)
    } else {
      setSelectedSymbol(symbol)
      setChartTabs(chartTabs.map(t => 
        t.id === activeChartTab ? { ...t, symbol } : t
      ))
    }
  }
  const [activeTradingAccount, setActiveTradingAccount] = useState(() => {
    const saved = localStorage.getItem('activeTradingAccount')
    return saved ? JSON.parse(saved) : null
  })

  // Check if trying to access trade without trading account
  useEffect(() => {
    if (activeView === 'chart' && !activeTradingAccount) {
      setActiveView('accounts')
    }
  }, [activeView, activeTradingAccount])

  // Listen for trading account changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('activeTradingAccount')
      setActiveTradingAccount(saved ? JSON.parse(saved) : null)
    }
    window.addEventListener('storage', handleStorageChange)
    // Also check periodically for same-tab changes
    const interval = setInterval(handleStorageChange, 1000)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Save selected symbol to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedSymbol', selectedSymbol)
  }, [selectedSymbol])

  // Check for existing kill switch lock
  useEffect(() => {
    const savedLockEnd = localStorage.getItem('tradingLockEnd')
    if (savedLockEnd) {
      const endTime = new Date(savedLockEnd)
      if (endTime > new Date()) {
        setTradingLocked(true)
        setLockEndTime(endTime)
      } else {
        localStorage.removeItem('tradingLockEnd')
      }
    }
  }, [])

  // Update time remaining countdown
  useEffect(() => {
    if (!tradingLocked || !lockEndTime) return

    const updateTimer = () => {
      const now = new Date()
      const diff = lockEndTime - now

      if (diff <= 0) {
        setTradingLocked(false)
        setLockEndTime(null)
        localStorage.removeItem('tradingLockEnd')
        setTimeRemaining('')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [tradingLocked, lockEndTime])

  const activateKillSwitch = () => {
    const duration = parseInt(killDuration)
    let milliseconds = 0
    
    switch (killUnit) {
      case 'minutes':
        milliseconds = duration * 60 * 1000
        break
      case 'hours':
        milliseconds = duration * 60 * 60 * 1000
        break
      case 'days':
        milliseconds = duration * 24 * 60 * 60 * 1000
        break
      default:
        milliseconds = duration * 60 * 60 * 1000
    }

    const endTime = new Date(Date.now() + milliseconds)
    localStorage.setItem('tradingLockEnd', endTime.toISOString())
    setLockEndTime(endTime)
    setTradingLocked(true)
    setShowKillSwitch(false)
  }

  // Fetch live prices from backend API (same source as InstrumentsPanel)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        
        const res = await axios.get('/api/trades/prices', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (res.data.success && res.data.data[selectedSymbol]) {
          const priceData = res.data.data[selectedSymbol]
          setLivePrices({
            bid: priceData.bid || priceData.price || 0,
            ask: priceData.ask || priceData.price || 0
          })
        }
      } catch (err) {
        // Silent fail
      }
    }
    
    // Fetch immediately and then every 500ms for real-time updates
    fetchPrices()
    const interval = setInterval(fetchPrices, 500)
    
    return () => clearInterval(interval)
  }, [selectedSymbol])
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [accountStats, setAccountStats] = useState({
    balance: 0,
    equity: 0,
    margin: 0,
    usedMargin: 0,
    leverage: 100,
    freeMargin: 0,
    marginLevel: 0,
    credit: 0
  })
  const [openTrades, setOpenTrades] = useState([])
  const [allPrices, setAllPrices] = useState({})

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch account stats and open trades
  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const savedAccount = localStorage.getItem('activeTradingAccount')
        let balance = 0
        let accountLeverage = 100
        let creditBalance = 0
        let usedMargin = 0
        
        if (savedAccount) {
          const accountData = JSON.parse(savedAccount)
          try {
            // Fetch account data
            const accountRes = await axios.get(`/api/trading-accounts/${accountData._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (accountRes.data.success && accountRes.data.data) {
              const data = accountRes.data.data
              balance = data.walletBalance ?? data.balance ?? 0
              creditBalance = data.creditBalance || 0
              accountLeverage = data.leverage || 100
              usedMargin = data.usedMargin || 0
              
              localStorage.setItem('activeTradingAccount', JSON.stringify(data))
              setActiveTradingAccount(data)
            }
            
            // Fetch open trades for local P/L calculation
            const tradesRes = await axios.get('/api/trades?status=open', {
              headers: { Authorization: `Bearer ${token}` }
            })
            const trades = tradesRes.data.data?.trades || tradesRes.data.data || []
            setOpenTrades(Array.isArray(trades) ? trades : [])
            
          } catch (accErr) {
            balance = accountData.balance || 0
            creditBalance = accountData.creditBalance || 0
          }
        }

        // Store base values - equity will be calculated with real-time prices
        setAccountStats(prev => ({
          ...prev,
          balance,
          usedMargin,
          leverage: accountLeverage,
          credit: creditBalance,
          margin: (balance + creditBalance) * accountLeverage
        }))
      } catch (err) {
        console.error('Failed to fetch account stats')
      }
    }

    fetchStats()
    // Update base stats every 2 seconds
    const interval = setInterval(fetchStats, 2000)
    
    // Also listen for trade events to update immediately
    const handleTradeEvent = () => fetchStats()
    window.addEventListener('tradeCreated', handleTradeEvent)
    window.addEventListener('tradeClosed', handleTradeEvent)
    window.addEventListener('balanceUpdate', handleTradeEvent)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('tradeCreated', handleTradeEvent)
      window.removeEventListener('tradeClosed', handleTradeEvent)
      window.removeEventListener('balanceUpdate', handleTradeEvent)
    }
  }, [])

  // Real-time equity calculation using socket prices
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const getSocketUrl = () => {
      const envUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL
      if (envUrl) return envUrl
      const host = window.location.hostname
      if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5001'
      return `${window.location.protocol}//${window.location.host}`
    }

    const socket = io(getSocketUrl(), { auth: { token } })
    
    socket.on('priceUpdate', (newPrices) => {
      setAllPrices(newPrices)
    })

    socket.on('tick', (tickData) => {
      if (tickData?.symbol) {
        setAllPrices(prev => ({
          ...prev,
          [tickData.symbol]: {
            bid: tickData.bid,
            ask: tickData.ask,
            price: tickData.price || (tickData.bid + tickData.ask) / 2
          }
        }))
      }
    })

    return () => socket.disconnect()
  }, [])

  // Calculate floating P/L and update equity whenever prices or trades change
  useEffect(() => {
    const calculateFloatingPnL = () => {
      let totalPnL = 0
      
      for (const trade of openTrades) {
        const price = allPrices[trade.symbol]
        if (!price) continue
        
        const currentPrice = trade.type === 'buy' ? price.bid : price.ask
        const priceDiff = trade.type === 'buy' 
          ? currentPrice - trade.price 
          : trade.price - currentPrice
        
        // Contract size based on symbol
        let contractSize = 100000
        if (trade.symbol?.includes('XAU')) contractSize = 100
        else if (trade.symbol?.includes('XAG')) contractSize = 5000
        else if (trade.symbol?.includes('BTC') || trade.symbol?.includes('ETH')) contractSize = 1
        
        totalPnL += priceDiff * trade.amount * contractSize
      }
      
      return totalPnL
    }

    const floatingPnL = calculateFloatingPnL()
    const equity = accountStats.balance + accountStats.credit + floatingPnL
    const freeMargin = equity - accountStats.usedMargin
    const marginLevel = accountStats.usedMargin > 0 ? (equity / accountStats.usedMargin) * 100 : 0

    setAccountStats(prev => ({
      ...prev,
      equity,
      freeMargin,
      marginLevel
    }))
  }, [allPrices, openTrades, accountStats.balance, accountStats.credit, accountStats.usedMargin])

  // Render mobile layout
  if (isMobile) {
    return (
      <>
        <ImpersonationBanner />
        <MobileApp />
      </>
    )
  }

  const handleSymbolSelect = (symbol) => {
    setSelectedSymbol(symbol)
    setActiveView('chart')
  }

  const handleOpenOrder = () => {
    setShowOrderPanel(true)
  }

  // Fullscreen Trade Room - When activeView is 'chart'
  if (activeView === 'chart') {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Impersonation Banner */}
        <ImpersonationBanner />
        
        {/* Trade Notifications */}
        <TradeNotifications />
        
        <div className="flex-1 flex overflow-hidden">
        
        {/* Mini Sidebar */}
        <div 
          className="w-12 flex-shrink-0 flex flex-col items-center py-3 gap-2"
          style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
        >
          {/* Home Button */}
          <button
            onClick={() => {
              navigate('/accounts')
              setActiveView('accounts')
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-700"
            style={{ color: 'var(--text-secondary)' }}
            title="Back to CRM"
          >
            <Home size={20} />
          </button>
          
          {/* Instruments Toggle */}
          <button
            onClick={() => setShowInstruments(!showInstruments)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${showInstruments ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
            style={!showInstruments ? { color: 'var(--text-secondary)' } : {}}
            title="Instruments"
          >
            <LayoutGrid size={20} />
          </button>
          
          {/* Wallet */}
          <button
            onClick={() => {
              navigate('/wallet')
              setActiveView('wallet')
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-700"
            style={{ color: 'var(--text-secondary)' }}
            title="Wallet"
          >
            <WalletIcon size={20} />
          </button>
          
          {/* Transfer */}
          <button
            onClick={() => {
              navigate('/accounts')
              setActiveView('accounts')
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-700"
            style={{ color: 'var(--text-secondary)' }}
            title="Transfer Funds"
          >
            <ArrowRightLeft size={20} />
          </button>
          
          {/* Spacer */}
          <div className="flex-1"></div>
          
          {/* New Order Button */}
          <button
            onClick={() => setShowOrderPanel(!showOrderPanel)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${showOrderPanel ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            title={showOrderPanel ? 'Close Order' : 'New Order'}
          >
            {showOrderPanel ? <X size={20} /> : <span className="text-lg font-bold">+</span>}
          </button>
        </div>
        
        {/* Instruments Panel */}
        {showInstruments && (
          <div 
            className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
            style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
          >
            <InstrumentsPanel 
              onClose={() => setShowInstruments(false)}
              onSelectSymbol={handleSelectSymbol}
              selectedSymbol={selectedSymbol}
            />
          </div>
        )}
        
        {/* Main Trading Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Account Bar */}
          <div 
            className="h-10 flex items-center justify-between px-4 flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-6">
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedSymbol}</span>
              {activeTradingAccount && (
                <div className="flex items-center gap-4 text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>
                    Account: <span style={{ color: 'var(--text-primary)' }}>{activeTradingAccount.accountNumber}</span>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Balance: <span style={{ color: 'var(--text-primary)' }}>${accountStats.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Bid/Ask Display */}
              <div className="flex items-center gap-2 text-sm mr-2">
                <span className="px-2 py-1 rounded font-mono font-semibold" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
                  {livePrices.bid.toFixed(getDecimals(selectedSymbol))}
                </span>
                <span className="px-2 py-1 rounded font-mono font-semibold" style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}>
                  {livePrices.ask.toFixed(getDecimals(selectedSymbol))}
                </span>
              </div>
              
              {/* New Order Button */}
              <button
                onClick={() => !tradingLocked && setShowOrderPanel(!showOrderPanel)}
                disabled={tradingLocked}
                className="px-4 py-1.5 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: tradingLocked ? '#4b5563' : '#3b82f6', color: 'white' }}
              >
                {tradingLocked ? 'Locked' : 'New Order'}
              </button>
              
              {/* Kill Switch Button */}
              {tradingLocked ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                  <ShieldOff size={16} className="text-red-400" />
                  <span className="text-xs font-medium text-red-400">{timeRemaining}</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowKillSwitch(true)}
                  className="p-2 rounded-lg hover:bg-orange-500/20 transition-colors"
                  title="Kill Switch - Lock Trading"
                >
                  <ShieldOff size={18} className="text-orange-500" />
                </button>
              )}
            </div>
          </div>
          
          {/* Chart Tabs Bar */}
          <div 
            className="h-8 flex items-center gap-1 px-2 overflow-x-auto flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}
          >
            {chartTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => switchChartTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded cursor-pointer transition-all text-sm ${
                  activeChartTab === tab.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
                }`}
                style={{ 
                  color: activeChartTab === tab.id ? 'white' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span className="font-medium">{tab.symbol}</span>
                {chartTabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeChartTab(tab.id)
                    }}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                    style={{ fontSize: '10px' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addChartTab(selectedSymbol)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-700 transition-colors ml-1"
              style={{ color: 'var(--text-muted)' }}
              title="New Tab"
            >
              +
            </button>
            
          </div>
          
          {/* Chart Area */}
          <div className="flex-1 flex min-h-[200px]">
            {/* Main Chart */}
            <div className="flex-1 relative">
              <TradingViewChart symbol={selectedSymbol} />
            </div>
          </div>
          
          {/* Resizable Divider - Enhanced */}
          <div 
            className={`h-2 cursor-ns-resize flex items-center justify-center transition-all ${isResizing ? 'bg-blue-600' : 'hover:bg-blue-500/30'}`}
            style={{ 
              backgroundColor: isResizing ? '#3b82f6' : 'var(--bg-secondary)', 
              borderTop: '1px solid var(--border-color)'
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              setIsResizing(true)
              const startY = e.clientY
              const startHeight = positionsHeight
              document.body.style.cursor = 'ns-resize'
              document.body.style.userSelect = 'none'
              
              const handleMouseMove = (moveEvent) => {
                const delta = startY - moveEvent.clientY
                setPositionsHeight(Math.max(80, Math.min(800, startHeight + delta)))
              }
              
              const handleMouseUp = () => {
                setIsResizing(false)
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }
              
              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          >
            <div className={`flex items-center gap-1 px-3 py-0.5 rounded-full transition-all ${isResizing ? 'bg-white/20' : 'bg-gray-700/50 hover:bg-gray-600/70'}`}>
              <div className="w-8 h-0.5 rounded-full bg-gray-400"></div>
            </div>
          </div>
          
          {/* Positions Table - Resizable */}
          <div style={{ height: positionsHeight, minHeight: 80 }} className="flex-shrink-0 overflow-hidden">
            <PositionsTable />
          </div>
          
          {/* Bottom Status Bar */}
          <div 
            className="h-7 flex items-center justify-between px-3 text-xs flex-shrink-0"
            style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderTop: '1px solid var(--border-color)',
              color: 'var(--text-secondary)'
            }}
          >
            <div className="flex items-center gap-4">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedSymbol}</span>
              <span>Bal: <span style={{ color: 'var(--text-primary)' }}>${accountStats.balance.toFixed(2)}</span></span>
              {accountStats.credit > 0 && (
                <span>Credit: <span style={{ color: '#a855f7' }}>${accountStats.credit.toFixed(2)}</span></span>
              )}
              <span>Eq: <span style={{ color: accountStats.equity >= (accountStats.balance + accountStats.credit) ? 'var(--accent-green)' : 'var(--accent-red)' }}>${accountStats.equity.toFixed(2)}</span></span>
              <span className="hidden sm:inline">Margin: <span style={{ color: '#fbbf24' }}>${accountStats.margin.toFixed(2)}</span></span>
              <span className="hidden md:inline">Free: <span style={{ color: accountStats.freeMargin >= 0 ? 'var(--text-primary)' : 'var(--accent-red)' }}>${accountStats.freeMargin.toFixed(2)}</span></span>
            </div>
            <div className="flex items-center gap-3">
              {activeTradingAccount && (
                <span style={{ color: 'var(--text-muted)' }}>{activeTradingAccount.accountNumber}</span>
              )}
              <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: activeTradingAccount?.isDemo ? 'var(--bg-hover)' : '#22c55e20', color: activeTradingAccount?.isDemo ? 'var(--text-muted)' : '#22c55e' }}>
                {activeTradingAccount?.isDemo ? 'Demo' : 'Live'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Order Panel */}
        {showOrderPanel && (
          <div 
            className="w-80 flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)' }}
          >
            <OrderPanel 
              symbol={selectedSymbol}
              orderType={orderType}
              setOrderType={setOrderType}
              onClose={() => setShowOrderPanel(false)}
            />
          </div>
        )}

        {/* Kill Switch Modal */}
        {showKillSwitch && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div 
              className="w-full max-w-md rounded-2xl p-6 mx-4"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <ShieldOff size={24} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Kill Switch</h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Trading discipline control</p>
                  </div>
                </div>
                <button onClick={() => setShowKillSwitch(false)} className="p-2 hover:bg-gray-700/50 rounded-lg">
                  <X size={20} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  🛡️ <strong>Emotional Trading Control</strong><br/>
                  Lock yourself out of trading for a set period to maintain discipline and avoid emotional decisions.
                </p>
                <p className="text-xs text-orange-400">
                  ⚠️ This cannot be undone once activated. You will not be able to place any trades until the timer expires.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Lock Duration</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={killDuration}
                    onChange={(e) => setKillDuration(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl text-center text-lg font-bold"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <select
                    value={killUnit}
                    onChange={(e) => setKillUnit(e.target.value)}
                    className="px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowKillSwitch(false)}
                  className="flex-1 py-3 rounded-xl font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={activateKillSwitch}
                  className="flex-1 py-3 rounded-xl font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  Activate Kill Switch
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    )
  }

  // CRM Layout - All non-chart views
  return (
    <div 
      className="h-screen w-screen flex flex-col overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Impersonation Banner */}
      <ImpersonationBanner />
      
      {/* Trade Notifications */}
      <TradeNotifications />
      
      {/* Header */}
      <Header 
        onTradeClick={() => {
          setShowOrderPanel(!showOrderPanel)
          if (activeView === 'home') setActiveView('chart')
        }}
        showOrderPanel={showOrderPanel}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          activeView={activeView}
          setActiveView={setActiveView}
        />
        
        {/* Home Dashboard View */}
        {activeView === 'home' && (
          <Dashboard />
        )}

        {/* Trading Accounts View */}
        {activeView === 'accounts' && (
          <TradingAccounts onOpenTrading={(account) => {
            // Store selected trading account and go to chart
            localStorage.setItem('activeTradingAccount', JSON.stringify(account))
            setActiveView('chart')
          }} />
        )}

        {/* Wallet View */}
        {activeView === 'wallet' && (
          <Wallet />
        )}

        {/* Copy Trade View */}
        {activeView === 'copy' && (
          <CopyTrade />
        )}

        {/* IB Dashboard View */}
        {activeView === 'ib' && (
          <IBDashboard />
        )}

        {/* Orders View */}
        {activeView === 'orders' && (
          <Orders />
        )}

        {/* Profile View */}
        {activeView === 'profile' && (
          <Profile />
        )}

        {/* Support View */}
        {activeView === 'support' && (
          <Support />
        )}

        {/* Leaderboard View */}
        {activeView === 'leaderboard' && (
          <Leaderboard />
        )}

        {/* Terminal View - Same as chart but dedicated */}
        {activeView === 'terminal' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex min-h-[200px]">
              <div className="flex-1 relative">
                <TradingViewChart symbol={selectedSymbol} />
              </div>
            </div>
          </div>
        )}

        {/* Non-chart views only show bottom status bar */}
        {activeView !== 'chart' && null}
      </div>
      
      {/* Bottom Status Bar - Only show in Trade Room (chart view) */}

      {/* Kill Switch Modal */}
      {showKillSwitch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div 
            className="w-full max-w-md rounded-2xl p-6 mx-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <ShieldOff size={24} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Kill Switch</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Trading discipline control</p>
                </div>
              </div>
              <button onClick={() => setShowKillSwitch(false)} className="p-2 hover:bg-gray-700/50 rounded-lg">
                <X size={20} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                🛡️ <strong>Emotional Trading Control</strong><br/>
                Lock yourself out of trading for a set period to maintain discipline and avoid emotional decisions.
              </p>
              <p className="text-xs text-orange-400">
                ⚠️ This cannot be undone once activated. You will not be able to place any trades until the timer expires.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Lock Duration</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={killDuration}
                  onChange={(e) => setKillDuration(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl text-center text-lg font-bold"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
                <select
                  value={killUnit}
                  onChange={(e) => setKillUnit(e.target.value)}
                  className="px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowKillSwitch(false)}
                className="flex-1 py-3 rounded-xl font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                onClick={activateKillSwitch}
                className="flex-1 py-3 rounded-xl font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                Activate Kill Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
