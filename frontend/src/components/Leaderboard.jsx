import React, { useState, useEffect } from 'react'
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Award,
  Crown,
  Target,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCw
} from 'lucide-react'
import axios from 'axios'

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [period, setPeriod] = useState('weekly')
  const [leaderboard, setLeaderboard] = useState([])
  const [userRank, setUserRank] = useState(null)
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [leaderboardRes, competitionsRes] = await Promise.all([
        axios.get(`/api/leaderboard?period=${period}&limit=50`, getAuthHeader()),
        axios.get('/api/leaderboard/competitions', getAuthHeader())
      ])

      if (leaderboardRes.data.success) {
        setLeaderboard(leaderboardRes.data.data.leaderboard)
        setUserRank(leaderboardRes.data.data.userRank)
      }

      if (competitionsRes.data.success) {
        setCompetitions(competitionsRes.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={20} style={{ color: '#fbbf24' }} />
    if (rank === 2) return <Medal size={20} style={{ color: '#9ca3af' }} />
    if (rank === 3) return <Medal size={20} style={{ color: '#cd7f32' }} />
    return <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>#{rank}</span>
  }

  const getRankBg = (rank) => {
    if (rank === 1) return 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)'
    if (rank === 2) return 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(107, 114, 128, 0.1) 100%)'
    if (rank === 3) return 'linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(180, 83, 9, 0.1) 100%)'
    return 'transparent'
  }

  const formatPnL = (pnl) => {
    const formatted = Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return pnl >= 0 ? `+$${formatted}` : `-$${formatted}`
  }

  const getTimeRemaining = (endDate) => {
    const now = new Date()
    const end = new Date(endDate)
    const diff = end - now
    
    if (diff <= 0) return 'Ended'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h left`
    return `${hours}h left`
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}>
            <Trophy size={24} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Leaderboard</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Compete with top traders</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
          style={{ 
            background: activeTab === 'leaderboard' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 'var(--bg-card)', 
            color: activeTab === 'leaderboard' ? '#fff' : 'var(--text-secondary)' 
          }}
        >
          <Trophy size={18} /> Rankings
        </button>
        <button
          onClick={() => setActiveTab('competitions')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
          style={{ 
            background: activeTab === 'competitions' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'var(--bg-card)', 
            color: activeTab === 'competitions' ? '#fff' : 'var(--text-secondary)' 
          }}
        >
          <Award size={18} /> Competitions
        </button>
      </div>

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Period Filter */}
          <div className="flex gap-2">
            {['daily', 'weekly', 'monthly', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
                style={{ 
                  backgroundColor: period === p ? 'var(--accent-blue)' : 'var(--bg-card)',
                  color: period === p ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {p === 'all' ? 'All Time' : p}
              </button>
            ))}
          </div>

          {/* Your Rank Card */}
          {userRank && (
            <div className="rounded-2xl p-5" style={{ 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold" style={{ 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: '#fff'
                  }}>
                    #{userRank.rank}
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your Rank</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {userRank.totalTrades} trades • {userRank.winRate}% win rate
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total P&L</p>
                  <p className={`text-xl font-bold ${userRank.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPnL(userRank.totalPnL)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Top Traders</h2>
            </div>
            
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Target size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No trading data for this period</p>
                </div>
              ) : (
                leaderboard.map((trader) => (
                  <div 
                    key={trader._id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-opacity-50"
                    style={{ background: getRankBg(trader.rank) }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        {getRankIcon(trader.rank)}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{trader.username}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {trader.totalTrades} trades • {trader.winRate}% win
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${trader.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPnL(trader.totalPnL)}
                      </p>
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {trader.totalPnL >= 0 ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
                        <span>{trader.winningTrades}W / {trader.losingTrades}L</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Competitions Tab */}
      {activeTab === 'competitions' && (
        <div className="space-y-4">
          {competitions.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <Award size={48} className="mx-auto mb-3 opacity-50" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No active competitions</p>
            </div>
          ) : (
            competitions.map((comp) => (
              <div 
                key={comp.id}
                className="rounded-2xl p-5 transition-all hover:scale-[1.01]"
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  border: `1px solid ${comp.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}`,
                  background: comp.status === 'active' 
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(22, 163, 74, 0.05) 100%)' 
                    : 'var(--bg-card)'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ 
                      background: comp.status === 'active' 
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                        : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                    }}>
                      <Trophy size={24} style={{ color: '#fff' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{comp.name}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{comp.description}</p>
                    </div>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                    style={{ 
                      backgroundColor: comp.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                      color: comp.status === 'active' ? '#22c55e' : '#6b7280'
                    }}
                  >
                    {comp.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Prize Pool</p>
                    <p className="font-bold text-lg" style={{ color: '#fbbf24' }}>{comp.prize}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Participants</p>
                    <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                      <Users size={16} className="inline mr-1" />{comp.participants}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Time Left</p>
                    <p className="font-bold text-lg" style={{ color: comp.status === 'active' ? '#22c55e' : 'var(--text-primary)' }}>
                      <Clock size={16} className="inline mr-1" />{getTimeRemaining(comp.endDate)}
                    </p>
                  </div>
                </div>

                <button 
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all"
                  style={{ 
                    background: comp.status === 'active' 
                      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                      : 'var(--bg-hover)',
                    color: comp.status === 'active' ? '#fff' : 'var(--text-secondary)'
                  }}
                  disabled={comp.status !== 'active'}
                >
                  {comp.status === 'active' ? 'Join Competition' : 'Coming Soon'}
                  <ChevronRight size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default Leaderboard
