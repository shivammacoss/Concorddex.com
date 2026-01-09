import React, { useState, useEffect, useRef } from 'react'
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  Newspaper, 
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Zap,
  Brain,
  Target,
  Shield,
  BarChart3,
  PieChart,
  Flame,
  Star,
  Trophy,
  Rocket,
  Image,
  Receipt
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import axios from 'axios'
import { Search } from 'lucide-react'

const Dashboard = () => {
  const { isDark } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Real-time data states
  const [marketNews, setMarketNews] = useState([])
  const [allDayNews, setAllDayNews] = useState([]) // Keep all news for the day
  const [economicEvents, setEconomicEvents] = useState([])
  const [allDayEvents, setAllDayEvents] = useState([]) // Keep all events for the day
  const [newsLoading, setNewsLoading] = useState(true)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [lastNewsUpdate, setLastNewsUpdate] = useState(null)
  const [lastCalendarUpdate, setLastCalendarUpdate] = useState(null)
  const newsCache = useRef(new Map()) // Cache news to prevent duplicates
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Real user data from API
  const [userData, setUserData] = useState({
    name: 'Trader',
    walletBalance: 0.00,
    totalPnL: 0,
    totalCharges: 0,
    totalTrades: 0,
    todayPnL: 0,
    weekPnL: 0,
    monthPnL: 0
  })
  const [activeAccount, setActiveAccount] = useState(null)
  const [isCentAccount, setIsCentAccount] = useState(false)
  const [userStats, setUserStats] = useState({
    totalTrades: 0,
    winRate: 0,
    avgProfit: 0,
    avgLoss: 0
  })

  // Real PnL data by date - will be populated from API
  const [pnlByDate, setPnlByDate] = useState({})

  // Fetch user profile and stats
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        // Fetch user profile
        const profileRes = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        // Check for active trading account
        const savedAccount = localStorage.getItem('activeTradingAccount')
        let accountBalance = 0
        let isCent = false
        let account = null
        
        if (savedAccount) {
          const accountData = JSON.parse(savedAccount)
          try {
            const accountRes = await axios.get(`/api/trading-accounts/${accountData._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (accountRes.data.success && accountRes.data.data) {
              account = accountRes.data.data
              isCent = account.isCentAccount || false
              // For cent accounts, show balance in cents (multiply by 100)
              accountBalance = isCent ? (account.balance || 0) * 100 : (account.balance || 0)
              setActiveAccount(account)
              setIsCentAccount(isCent)
            }
          } catch (e) {
            console.log('Failed to fetch trading account:', e)
          }
        }
        
        if (profileRes.data.success) {
          const user = profileRes.data.data
          setUserData(prev => ({
            ...prev,
            name: user.firstName || 'Trader',
            // Use trading account balance if available, otherwise user wallet balance
            walletBalance: account ? accountBalance : (user.balance || 0)
          }))
        }

        // Fetch user trades for stats - use correct endpoint
        try {
          const tradesRes = await axios.get('/api/trades', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (tradesRes.data.success) {
            const tradesData = tradesRes.data.data?.trades || tradesRes.data.data || []
            const trades = Array.isArray(tradesData) ? tradesData : []
            const closedTrades = trades.filter(t => t.status === 'closed')
            const winningTrades = closedTrades.filter(t => (t.profit || 0) > 0)
            const losingTrades = closedTrades.filter(t => (t.profit || 0) < 0)
            
            const totalPnL = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
            const totalCharges = trades.reduce((sum, t) => sum + (t.tradingCharge || 0) + (t.commission || 0) + (t.spreadCost || 0), 0)
            const winRate = closedTrades.length > 0 ? Math.round((winningTrades.length / closedTrades.length) * 100) : 0
            const avgProfit = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / winningTrades.length : 0
            const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / losingTrades.length) : 0

            // Calculate P&L by time periods
            const now = new Date()
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

            const todayTrades = closedTrades.filter(t => new Date(t.closedAt || t.updatedAt) >= todayStart)
            const weekTrades = closedTrades.filter(t => new Date(t.closedAt || t.updatedAt) >= weekStart)
            const monthTrades = closedTrades.filter(t => new Date(t.closedAt || t.updatedAt) >= monthStart)

            const todayPnL = todayTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
            const weekPnL = weekTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
            const monthPnL = monthTrades.reduce((sum, t) => sum + (t.profit || 0), 0)

            // Build PnL by date for calendar
            const pnlData = {}
            closedTrades.forEach(trade => {
              const tradeDate = new Date(trade.closedAt || trade.updatedAt)
              const dateKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}-${String(tradeDate.getDate()).padStart(2, '0')}`
              
              if (!pnlData[dateKey]) {
                pnlData[dateKey] = { pnl: 0, trades: 0, wins: 0 }
              }
              pnlData[dateKey].pnl += (trade.profit || 0)
              pnlData[dateKey].trades += 1
              if ((trade.profit || 0) > 0) pnlData[dateKey].wins += 1
            })

            // Calculate win rate for each day
            Object.keys(pnlData).forEach(key => {
              pnlData[key].winRate = pnlData[key].trades > 0 
                ? Math.round((pnlData[key].wins / pnlData[key].trades) * 100) 
                : 0
            })

            setPnlByDate(pnlData)

            setUserStats({
              totalTrades: trades.length,
              winRate,
              avgProfit,
              avgLoss
            })
            setUserData(prev => ({ 
              ...prev, 
              totalPnL,
              totalCharges,
              totalTrades: trades.length,
              todayPnL,
              weekPnL,
              monthPnL
            }))
          }
        } catch (e) {
          console.log('Trades fetch error:', e)
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }

    fetchUserData()
    // Refresh every 10 seconds
    const interval = setInterval(fetchUserData, 10000)
    return () => clearInterval(interval)
  }, [])

  // Get PnL for selected date
  const getSelectedDatePnL = () => {
    const dateKey = selectedDate.toISOString().split('T')[0]
    return pnlByDate[dateKey] || { pnl: 0, trades: 0, winRate: 0 }
  }

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay }
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth)

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const selectDate = (day) => {
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
  }

  // Fetch market news - keeps old news and adds new ones
  const fetchMarketNews = async () => {
    setNewsLoading(true)
    try {
      const response = await axios.get('/api/market/news?limit=50')
      if (response.data.success) {
        const newNews = response.data.data || []
        
        // Merge with existing news, avoiding duplicates
        setAllDayNews(prevNews => {
          const existingIds = new Set(prevNews.map(n => n.id || n.title))
          const uniqueNewNews = newNews.filter(n => !existingIds.has(n.id || n.title))
          const merged = [...uniqueNewNews, ...prevNews]
          // Keep max 100 news items for the day
          return merged.slice(0, 100)
        })
        
        setMarketNews(newNews)
        setLastNewsUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch news:', error)
      // Enhanced fallback with images
      const fallbackNews = [
        { id: 1, title: 'Fed Signals Potential Rate Cuts in 2025', source: 'Reuters', time: new Date().toISOString(), impact: 'high', category: 'Central Banks', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=60&fit=crop' },
        { id: 2, title: 'Gold Prices Surge Amid Global Uncertainty', source: 'Bloomberg', time: new Date(Date.now() - 3600000).toISOString(), impact: 'high', category: 'Commodities', image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=100&h=60&fit=crop' },
        { id: 3, title: 'EUR/USD Breaks Key Resistance Level', source: 'FXStreet', time: new Date(Date.now() - 7200000).toISOString(), impact: 'medium', category: 'Forex', image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=100&h=60&fit=crop' },
        { id: 4, title: 'Bitcoin Hits New Monthly High', source: 'CoinDesk', time: new Date(Date.now() - 10800000).toISOString(), impact: 'high', category: 'Crypto', image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=100&h=60&fit=crop' },
        { id: 5, title: 'Oil Prices Drop on Supply Concerns', source: 'CNBC', time: new Date(Date.now() - 14400000).toISOString(), impact: 'medium', category: 'Commodities', image: 'https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?w=100&h=60&fit=crop' },
      ]
      setMarketNews(fallbackNews)
      setAllDayNews(prev => [...fallbackNews, ...prev].slice(0, 100))
    }
    setNewsLoading(false)
  }

  // Fetch economic calendar - keeps all events for the day
  const fetchEconomicCalendar = async () => {
    setCalendarLoading(true)
    try {
      const response = await axios.get('/api/market/calendar?fullDay=true')
      if (response.data.success) {
        const events = response.data.todayEvents || response.data.data || []
        
        // Merge with existing events
        setAllDayEvents(prevEvents => {
          const existingIds = new Set(prevEvents.map(e => e.id || e.event))
          const uniqueEvents = events.filter(e => !existingIds.has(e.id || e.event))
          return [...uniqueEvents, ...prevEvents].slice(0, 50)
        })
        
        setEconomicEvents(events)
        setLastCalendarUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error)
      // Enhanced fallback with full day events
      const fallbackEvents = [
        { id: 1, time: new Date().setHours(6, 0), currency: 'JPY', event: 'BoJ Interest Rate Decision', impact: 'high', actual: '0.25%', forecast: '0.25%', previous: '0.25%' },
        { id: 2, time: new Date().setHours(8, 30), currency: 'USD', event: 'Initial Jobless Claims', impact: 'high', actual: '-', forecast: '225K', previous: '218K' },
        { id: 3, time: new Date().setHours(10, 0), currency: 'USD', event: 'New Home Sales', impact: 'medium', actual: '-', forecast: '740K', previous: '738K' },
        { id: 4, time: new Date().setHours(11, 0), currency: 'EUR', event: 'ECB Economic Bulletin', impact: 'medium', actual: '-', forecast: '-', previous: '-' },
        { id: 5, time: new Date().setHours(13, 30), currency: 'USD', event: 'Crude Oil Inventories', impact: 'medium', actual: '-', forecast: '-2.1M', previous: '-1.8M' },
        { id: 6, time: new Date().setHours(14, 0), currency: 'GBP', event: 'BoE Gov Bailey Speaks', impact: 'high', actual: '-', forecast: '-', previous: '-' },
        { id: 7, time: new Date().setHours(15, 0), currency: 'USD', event: 'FOMC Member Speaks', impact: 'medium', actual: '-', forecast: '-', previous: '-' },
        { id: 8, time: new Date().setHours(18, 0), currency: 'AUD', event: 'Employment Change', impact: 'high', actual: '-', forecast: '25.0K', previous: '23.0K' },
      ]
      setEconomicEvents(fallbackEvents)
      setAllDayEvents(fallbackEvents)
    }
    setCalendarLoading(false)
  }

  // Format time ago
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return time.toLocaleDateString()
  }

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchMarketNews()
    fetchEconomicCalendar()
    
    // Auto-refresh every 5 minutes
    const newsInterval = setInterval(fetchMarketNews, 5 * 60 * 1000)
    const calendarInterval = setInterval(fetchEconomicCalendar, 10 * 60 * 1000)
    
    return () => {
      clearInterval(newsInterval)
      clearInterval(calendarInterval)
    }
  }, [])

  const selectedPnL = getSelectedDatePnL()

  return (
    <div 
      className="flex-1 overflow-y-auto p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Top Section - Logo, Greeting & Time */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src="/assets/logo.png" alt="Concorddex" className="h-40" />
          <div>
            <h1 
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {getGreeting()}, {userData.name}! 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Here's your trading overview
            </p>
          </div>
        </div>
        <div 
          className="flex items-center gap-4 px-4 py-2 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ color: 'var(--text-primary)' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="w-px h-6" style={{ backgroundColor: 'var(--border-color)' }}></div>
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: 'var(--accent-green)' }} />
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards Row - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Wallet Card */}
        <div 
          className="rounded-xl sm:rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-transform hover:scale-[1.02]"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(212, 175, 55, 0.3)'
          }}
        >
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 opacity-10">
            <Sparkles size={80} className="sm:hidden" style={{ color: '#d4af37' }} />
            <Sparkles size={128} className="hidden sm:block" style={{ color: '#d4af37' }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)' }}
              >
                <Wallet size={20} className="sm:hidden" style={{ color: '#000' }} />
                <Wallet size={24} className="hidden sm:block" style={{ color: '#000' }} />
              </div>
              <button 
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)', color: '#000' }}
              >
                Deposit
              </button>
            </div>
            <p className="text-xs sm:text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              {activeAccount ? (isCentAccount ? 'Account Balance (Cents)' : 'Account Balance') : 'Wallet Balance'}
            </p>
            <p className="text-lg sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {isCentAccount ? '¢' : '$'}{userData.walletBalance.toFixed(2)}
            </p>
            {isCentAccount && (
              <p className="text-xs mt-1" style={{ color: '#eab308' }}>¢ Cent Account</p>
            )}
          </div>
        </div>

        {/* Total P&L */}
        <div 
          className="rounded-xl sm:rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-transform hover:scale-[1.02]"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            border: `1px solid ${userData.totalPnL >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}
        >
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 opacity-10">
            <TrendingUp size={80} className="sm:hidden" style={{ color: userData.totalPnL >= 0 ? '#22c55e' : '#ef4444' }} />
            <TrendingUp size={128} className="hidden sm:block" style={{ color: userData.totalPnL >= 0 ? '#22c55e' : '#ef4444' }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center"
                style={{ background: userData.totalPnL >= 0 ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
              >
                {userData.totalPnL >= 0 ? 
                  <TrendingUp size={20} className="sm:hidden" style={{ color: '#fff' }} /> :
                  <TrendingDown size={20} className="sm:hidden" style={{ color: '#fff' }} />
                }
                {userData.totalPnL >= 0 ? 
                  <TrendingUp size={24} className="hidden sm:block" style={{ color: '#fff' }} /> :
                  <TrendingDown size={24} className="hidden sm:block" style={{ color: '#fff' }} />
                }
              </div>
              <span 
                className="text-xs px-2 py-1 rounded-full hidden sm:flex items-center gap-1"
                style={{ 
                  background: userData.totalPnL >= 0 ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff'
                }}
              >
                <Zap size={12} /> All Time
              </span>
            </div>
            <p className="text-xs sm:text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Total P&L</p>
            <p 
              className="text-lg sm:text-2xl font-bold"
              style={{ color: userData.totalPnL >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {userData.totalPnL >= 0 ? '+' : ''}${userData.totalPnL.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Total Charges */}
        <div 
          className="rounded-xl sm:rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-transform hover:scale-[1.02]"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(212, 175, 55, 0.4)'
          }}
        >
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 opacity-10">
            <Receipt size={80} className="sm:hidden" style={{ color: '#d4af37' }} />
            <Receipt size={128} className="hidden sm:block" style={{ color: '#d4af37' }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8960c 100%)' }}
              >
                <Receipt size={20} className="sm:hidden" style={{ color: '#000' }} />
                <Receipt size={24} className="hidden sm:block" style={{ color: '#000' }} />
              </div>
              <span 
                className="text-xs px-2 py-1 rounded-full hidden sm:flex items-center gap-1"
                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8960c 100%)', color: '#000' }}
              >
                <DollarSign size={12} /> Fees
              </span>
            </div>
            <p className="text-xs sm:text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Total Charges</p>
            <p 
              className="text-lg sm:text-2xl font-bold"
              style={{ color: '#d4af37' }}
            >
              ${userData.totalCharges.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Total Trades */}
        <div 
          className="rounded-xl sm:rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-transform hover:scale-[1.02]"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(212, 175, 55, 0.5)'
          }}
        >
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 opacity-10">
            <BarChart3 size={80} className="sm:hidden" style={{ color: '#d4af37' }} />
            <BarChart3 size={128} className="hidden sm:block" style={{ color: '#d4af37' }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)' }}
              >
                <BarChart3 size={20} className="sm:hidden" style={{ color: '#000' }} />
                <BarChart3 size={24} className="hidden sm:block" style={{ color: '#000' }} />
              </div>
              <span 
                className="text-xs px-2 py-1 rounded-full hidden sm:flex items-center gap-1"
                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)', color: '#000' }}
              >
                <Activity size={12} /> Count
              </span>
            </div>
            <p className="text-xs sm:text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Total Trades</p>
            <p 
              className="text-lg sm:text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {userData.totalTrades}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section - TradingView News & Heat Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* TradingView Timeline/News Widget */}
        <div 
          className="rounded-xl sm:rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(212, 175, 55, 0.3)'
          }}
        >
          <div 
            className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--bg-hover)',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <Newspaper size={16} className="sm:hidden" style={{ color: '#d4af37' }} />
            <Newspaper size={18} className="hidden sm:block" style={{ color: '#d4af37' }} />
            <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#d4af37' }}>Market News</h3>
          </div>
          <div className="h-64 sm:h-80 lg:h-[350px]">
            <iframe
              src="https://www.tradingview-widget.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22all_symbols%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%2C%22utm_source%22%3A%22www.tradingview.com%22%2C%22utm_medium%22%3A%22widget_new%22%2C%22utm_campaign%22%3A%22timeline-widget%22%7D"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="TradingView News"
              loading="lazy"
            />
          </div>
        </div>

        {/* TradingView Forex Heat Map Widget */}
        <div 
          className="rounded-xl sm:rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(212, 175, 55, 0.3)'
          }}
        >
          <div 
            className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--bg-hover)',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <BarChart3 size={16} className="sm:hidden" style={{ color: '#d4af37' }} />
            <BarChart3 size={18} className="hidden sm:block" style={{ color: '#d4af37' }} />
            <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#d4af37' }}>Forex Heat Map</h3>
          </div>
          <div className="h-64 sm:h-80 lg:h-[350px]">
            <iframe
              src="https://www.tradingview-widget.com/embed-widget/forex-heat-map/?locale=en#%7B%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22currencies%22%3A%5B%22EUR%22%2C%22USD%22%2C%22JPY%22%2C%22GBP%22%2C%22CHF%22%2C%22AUD%22%2C%22CAD%22%2C%22NZD%22%5D%2C%22isTransparent%22%3Atrue%2C%22colorTheme%22%3A%22dark%22%2C%22utm_source%22%3A%22www.tradingview.com%22%2C%22utm_medium%22%3A%22widget_new%22%2C%22utm_campaign%22%3A%22forex-heat-map%22%7D"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="TradingView Heat Map"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - TradingView Screener & Economic Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* TradingView Forex Screener Widget */}
        <div 
          className="rounded-xl sm:rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(212, 175, 55, 0.3)'
          }}
        >
          <div 
            className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--bg-hover)',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <Search size={16} className="sm:hidden" style={{ color: '#d4af37' }} />
            <Search size={18} className="hidden sm:block" style={{ color: '#d4af37' }} />
            <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#d4af37' }}>Forex Screener</h3>
          </div>
          <div className="h-64 sm:h-80 lg:h-[350px]">
            <iframe
              src="https://www.tradingview-widget.com/embed-widget/screener/?locale=en#%7B%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22defaultColumn%22%3A%22overview%22%2C%22defaultScreen%22%3A%22general%22%2C%22market%22%3A%22forex%22%2C%22showToolbar%22%3Atrue%2C%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%2C%22utm_source%22%3A%22www.tradingview.com%22%2C%22utm_medium%22%3A%22widget_new%22%2C%22utm_campaign%22%3A%22screener%22%7D"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="TradingView Forex Screener"
              loading="lazy"
            />
          </div>
        </div>

        {/* TradingView Economic Calendar Widget */}
        <div 
          className="rounded-xl sm:rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(212, 175, 55, 0.3)'
          }}
        >
          <div 
            className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--bg-hover)',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <Globe size={16} className="sm:hidden" style={{ color: '#d4af37' }} />
            <Globe size={18} className="hidden sm:block" style={{ color: '#d4af37' }} />
            <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#d4af37' }}>Economic Calendar</h3>
          </div>
          <div className="h-64 sm:h-80 lg:h-[350px]">
            <iframe
              src="https://www.tradingview-widget.com/embed-widget/events/?locale=en#%7B%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22importanceFilter%22%3A%22-1%2C0%2C1%22%2C%22countryFilter%22%3A%22us%2Ceu%2Cgb%2Cjp%2Cau%2Cca%2Cch%2Cnz%22%2C%22utm_source%22%3A%22www.tradingview.com%22%2C%22utm_medium%22%3A%22widget_new%22%2C%22utm_campaign%22%3A%22events%22%7D"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="TradingView Economic Calendar"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
