import React, { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, BarChart3, ArrowUpRight, Activity, Target, Clock, Newspaper, Calendar, RefreshCw, Globe, Zap, Receipt, DollarSign } from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../../context/ThemeContext'

const MobileHome = () => {
  const { isDark } = useTheme()
  const [userData, setUserData] = useState({
    name: 'Trader',
    walletBalance: 0,
    totalPnL: 0,
    totalCharges: 0,
    totalTrades: 0,
    openTrades: 0,
    winRate: 0,
    todayPnL: 0,
    weekPnL: 0,
    monthPnL: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeAccount, setActiveAccount] = useState(null)
  const [isCentAccount, setIsCentAccount] = useState(false)
  const [news, setNews] = useState([])
  const [events, setEvents] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }
      
      try {
        // Fetch user profile
        const profileRes = await axios.get('/api/auth/me', getAuthHeader())
        let balance = 0
        let name = 'Trader'
        let account = null
        let isCent = false
        
        if (profileRes.data.success) {
          balance = profileRes.data.data.balance || 0
          name = profileRes.data.data.firstName || 'Trader'
        }
        
        // Check for active trading account
        const savedAccount = localStorage.getItem('activeTradingAccount')
        if (savedAccount) {
          const accountData = JSON.parse(savedAccount)
          try {
            const accountRes = await axios.get(`/api/trading-accounts/${accountData._id}`, getAuthHeader())
            if (accountRes.data.success && accountRes.data.data) {
              account = accountRes.data.data
              isCent = account.isCentAccount || false
              // For cent accounts, show balance in cents (multiply by 100)
              balance = isCent ? (account.balance || 0) * 100 : (account.balance || 0)
              setActiveAccount(account)
              setIsCentAccount(isCent)
            }
          } catch (e) {
            console.log('Failed to fetch trading account:', e)
          }
        }

        // Fetch trades for stats
        try {
          const tradesRes = await axios.get('/api/trades', getAuthHeader())
          if (tradesRes.data.success) {
            const tradesData = tradesRes.data.data?.trades || tradesRes.data.data || []
            const trades = Array.isArray(tradesData) ? tradesData : []
            const closedTrades = trades.filter(t => t.status === 'closed')
            const openTrades = trades.filter(t => t.status === 'open')
            const winningTrades = closedTrades.filter(t => (t.profit || 0) > 0)
            
            const winRate = closedTrades.length > 0 ? Math.round((winningTrades.length / closedTrades.length) * 100) : 0

            // Calculate total P&L and charges
            const totalPnL = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
            const totalCharges = trades.reduce((sum, t) => sum + (t.fee || 0) + (t.commission || 0) + (t.spreadCost || 0), 0)

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

            setUserData({
              name,
              walletBalance: balance,
              totalPnL,
              totalCharges,
              totalTrades: trades.length,
              openTrades: openTrades.length,
              winRate,
              todayPnL,
              weekPnL,
              monthPnL
            })
          } else {
            setUserData(prev => ({ ...prev, name, walletBalance: balance }))
          }
        } catch (e) {
          setUserData(prev => ({ ...prev, name, walletBalance: balance }))
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch news and economic calendar
  useEffect(() => {
    const fetchMarketData = async () => {
      setNewsLoading(true)
      try {
        const [newsRes, calendarRes] = await Promise.all([
          axios.get('/api/market/news'),
          axios.get('/api/market/calendar')
        ])
        if (newsRes.data.success) setNews(newsRes.data.data || [])
        if (calendarRes.data.success) setEvents(calendarRes.data.todayEvents || [])
      } catch (err) {
        console.log('Market data fetch error')
      } finally {
        setNewsLoading(false)
      }
    }
    fetchMarketData()
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000) // Refresh every 5 min
    return () => clearInterval(interval)
  }, [])

  const getTimeAgo = (timestamp) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMins = Math.floor((now - time) / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return time.toLocaleDateString()
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Theme colors
  const bgPrimary = isDark ? '#000000' : '#f5f5f7'
  const bgCard = isDark ? '#0d0d0d' : '#ffffff'
  const borderColor = isDark ? '#1a1a1a' : '#e5e5ea'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? '#6b7280' : '#8e8e93'

  return (
    <div className="h-full overflow-y-auto p-4 pb-20" style={{ backgroundColor: bgPrimary }}>
      {/* Header */}
      <div className="mb-4">
        <p className="text-xs" style={{ color: textSecondary }}>{getGreeting()}</p>
        <h1 className="text-lg font-bold" style={{ color: textPrimary }}>{userData.name}! 👋</h1>
      </div>

      {/* Stats Cards - 2x2 Grid matching Dashboard */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Wallet Balance */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: '1px solid rgba(212, 175, 55, 0.3)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)' }}>
              <Wallet size={16} color="#000" />
            </div>
          </div>
          <p className="text-xs mb-0.5" style={{ color: textSecondary }}>
            {activeAccount ? (isCentAccount ? 'Balance (Cents)' : 'Account Balance') : 'Wallet Balance'}
          </p>
          <p className="text-lg font-bold" style={{ color: textPrimary }}>
            {isCentAccount ? '¢' : '$'}{userData.walletBalance?.toFixed(2)}
          </p>
          {isCentAccount && (
            <p className="text-xs" style={{ color: '#eab308' }}>¢ Cent</p>
          )}
        </div>

        {/* Total P&L */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: `1px solid ${userData.totalPnL >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: userData.totalPnL >= 0 ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
              {userData.totalPnL >= 0 ? <TrendingUp size={16} color="#fff" /> : <TrendingDown size={16} color="#fff" />}
            </div>
          </div>
          <p className="text-xs mb-0.5" style={{ color: textSecondary }}>Total P&L</p>
          <p className="text-lg font-bold" style={{ color: userData.totalPnL >= 0 ? '#22c55e' : '#ef4444' }}>
            {userData.totalPnL >= 0 ? '+' : ''}${userData.totalPnL?.toFixed(2)}
          </p>
        </div>

        {/* Total Charges */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: '1px solid rgba(212, 175, 55, 0.4)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8960c 100%)' }}>
              <Receipt size={16} color="#000" />
            </div>
          </div>
          <p className="text-xs mb-0.5" style={{ color: textSecondary }}>Total Charges</p>
          <p className="text-lg font-bold" style={{ color: '#d4af37' }}>
            ${userData.totalCharges?.toFixed(2)}
          </p>
        </div>

        {/* Total Trades */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: bgCard, border: '1px solid rgba(212, 175, 55, 0.5)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)' }}>
              <BarChart3 size={16} color="#000" />
            </div>
          </div>
          <p className="text-xs mb-0.5" style={{ color: textSecondary }}>Total Trades</p>
          <p className="text-lg font-bold" style={{ color: textPrimary }}>
            {userData.totalTrades}
          </p>
        </div>
      </div>

      {/* Open Positions Indicator */}
      {userData.openTrades > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
          <Activity size={14} color="#d4af37" />
          <span className="text-xs font-medium" style={{ color: '#d4af37' }}>
            {userData.openTrades} open position{userData.openTrades > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Economic Calendar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar size={14} color="#fbbf24" />
            <span className="text-sm font-medium" style={{ color: textPrimary }}>Economic Calendar</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#22c55e', color: '#000' }}>Live</span>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
          {events.length === 0 ? (
            <div className="p-4 text-center text-xs" style={{ color: textSecondary }}>No events today</div>
          ) : (
            events.slice(0, 4).map((event, idx) => (
              <div key={event.id || idx} className="p-3 flex items-center justify-between" style={{ borderBottom: idx < 3 ? `1px solid ${borderColor}` : 'none' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: isDark ? '#1a1a1a' : '#e5e5ea', color: '#3b82f6' }}>{event.currency}</span>
                    <span className="text-xs" style={{ color: textSecondary }}>{new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs" style={{ color: textPrimary }}>{event.event}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${event.impact === 'high' ? 'bg-red-500/20 text-red-400' : event.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {event.impact}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Market News */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Newspaper size={14} color="#3b82f6" />
            <span className="text-sm font-medium" style={{ color: textPrimary }}>Market News</span>
          </div>
          {newsLoading && <RefreshCw size={12} className="animate-spin" color={textSecondary} />}
        </div>
        <div className="space-y-2">
          {news.slice(0, 5).map((item, idx) => (
            <a 
              key={item.id || idx}
              href={item.url !== '#' ? item.url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl"
              style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs font-medium line-clamp-2" style={{ color: textPrimary }}>{item.title}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${item.impact === 'high' ? 'bg-red-500/20 text-red-400' : item.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {item.impact}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: textSecondary }}>
                <span style={{ color: '#3b82f6' }}>{item.source}</span>
                <span>•</span>
                <span>{getTimeAgo(item.time)}</span>
                {item.category && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{item.category}</span>
                  </>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MobileHome
