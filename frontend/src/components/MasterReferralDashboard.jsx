import React, { useState, useEffect } from 'react'
import { 
  Users, DollarSign, TrendingUp, Copy, ExternalLink, 
  ChevronRight, Award, Wallet, History, RefreshCw,
  ArrowUpRight, ArrowDownRight, Link2
} from 'lucide-react'
import axios from 'axios'

const MasterReferralDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/master-referral/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setDashboard(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      setWithdrawing(true)
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/master-referral/withdraw', 
        { amount: parseFloat(withdrawAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data.success) {
        alert('Withdrawal request submitted!')
        setWithdrawAmount('')
        fetchDashboard()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Withdrawal failed')
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-gold)' }} />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
        Failed to load referral dashboard
      </div>
    )
  }

  const { referrer, nextLevel, masterStats, recentCommissions, settings } = dashboard

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Level Card */}
        <div 
          className="p-4 rounded-xl"
          style={{ 
            background: `linear-gradient(135deg, ${referrer.levelColor}20 0%, ${referrer.levelColor}10 100%)`,
            border: `1px solid ${referrer.levelColor}40`
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Award size={20} style={{ color: referrer.levelColor }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Your Level</span>
          </div>
          <p className="text-xl font-bold" style={{ color: referrer.levelColor }}>{referrer.levelName}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{referrer.commissionPercent}% commission</p>
        </div>

        {/* Total Referrals */}
        <div 
          className="p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users size={20} style={{ color: '#3b82f6' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Referrals</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{referrer.stats.totalReferrals}</p>
          <p className="text-sm" style={{ color: '#22c55e' }}>{referrer.stats.activeReferrals} active</p>
        </div>

        {/* Total Earned */}
        <div 
          className="p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} style={{ color: '#22c55e' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Earned</span>
          </div>
          <p className="text-xl font-bold" style={{ color: '#22c55e' }}>${referrer.wallet.totalEarned.toFixed(2)}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{referrer.stats.totalTrades} trades</p>
        </div>

        {/* Available Balance */}
        <div 
          className="p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={20} style={{ color: 'var(--accent-gold)' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Available</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--accent-gold)' }}>${referrer.wallet.balance.toFixed(2)}</p>
          {referrer.wallet.pendingBalance > 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>${referrer.wallet.pendingBalance.toFixed(2)} pending</p>
          )}
        </div>
      </div>

      {/* Level Progress */}
      {nextLevel && (
        <div 
          className="p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Progress to </span>
              <span className="font-semibold" style={{ color: nextLevel.color }}>{nextLevel.name}</span>
              <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>({nextLevel.commissionPercent}% commission)</span>
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {referrer.stats.activeReferrals}/{nextLevel.minReferrals} referrals
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${Math.min(100, (referrer.stats.activeReferrals / nextLevel.minReferrals) * 100)}%`,
                backgroundColor: nextLevel.color
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {nextLevel.referralsNeeded} more active referrals needed
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {['overview', 'masters', 'commissions', 'withdraw'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium capitalize transition-colors"
            style={{ 
              color: activeTab === tab ? 'var(--accent-gold)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--accent-gold)' : '2px solid transparent'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Masters You Promote */}
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Masters You Promote</h3>
          {masterStats.length === 0 ? (
            <div 
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <Link2 size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No masters promoted yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Go to Copy Trade section and get referral links for masters you want to promote
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {masterStats.map((ms, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: 'var(--accent-gold)' }}
                      >
                        {ms.master?.displayName?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {ms.master?.displayName || 'Unknown Master'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {ms.master?.masterId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" style={{ color: '#22c55e' }}>
                        ${ms.totalCommission.toFixed(2)}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {ms.activeReferrals}/{ms.totalReferrals} active
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Commissions */}
          <h3 className="font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>Recent Commissions</h3>
          {recentCommissions.length === 0 ? (
            <div 
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <History size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No commissions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCommissions.slice(0, 5).map((comm, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  <div className="flex items-center gap-3">
                    <ArrowUpRight size={16} style={{ color: '#22c55e' }} />
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {comm.symbol} • {comm.lots} lots
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {comm.masterId?.displayName} • {new Date(comm.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold" style={{ color: '#22c55e' }}>
                    +${comm.referrerCommissionAmount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'masters' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Get referral links for masters from the Copy Trade section. When users sign up using your link and follow the master, you earn commission!
          </p>
          {masterStats.map((ms, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: 'var(--accent-gold)' }}
                  >
                    {ms.master?.displayName?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {ms.master?.displayName}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {ms.master?.masterId} • {ms.master?.stats?.winRate || 0}% win rate
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Referrals</p>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{ms.totalReferrals}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Active</p>
                  <p className="font-semibold" style={{ color: '#22c55e' }}>{ms.activeReferrals}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Commission</p>
                  <p className="font-semibold" style={{ color: 'var(--accent-gold)' }}>${ms.totalCommission.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/register?masterRef=${ms.master?.masterId}&ref=${referrer.referrerId}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent-gold)', color: '#000' }}
                >
                  <Copy size={14} /> Copy Link
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'commissions' && (
        <div className="space-y-2">
          {recentCommissions.length === 0 ? (
            <div 
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <History size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No commission history</p>
            </div>
          ) : (
            recentCommissions.map((comm, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {comm.symbol} • {comm.lots} lots
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Master: {comm.masterId?.displayName} • Follower: {comm.followerUserId?.firstName}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(comm.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: '#22c55e' }}>
                    +${comm.referrerCommissionAmount.toFixed(2)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {comm.referrerCommissionPercent}% of ${comm.masterCommissionAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'withdraw' && (
        <div 
          className="p-6 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Withdraw Funds</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Available Balance</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-gold)' }}>
                ${referrer.wallet.balance.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Minimum Withdrawal</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                ${settings.minWithdrawal}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                Amount to Withdraw
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                min={settings.minWithdrawal}
                max={referrer.wallet.balance}
                className="w-full px-4 py-3 rounded-lg"
                style={{ 
                  backgroundColor: 'var(--bg-hover)', 
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < settings.minWithdrawal || parseFloat(withdrawAmount) > referrer.wallet.balance}
              className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-gold)', color: '#000' }}
            >
              {withdrawing ? 'Processing...' : 'Request Withdrawal'}
            </button>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Withdrawals are processed within 24-48 hours
            </p>
          </div>
        </div>
      )}

      {/* Commission Levels */}
      <div 
        className="p-4 rounded-xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Commission Levels</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {settings.levels.map((level, idx) => (
            <div 
              key={idx}
              className="p-3 rounded-lg text-center"
              style={{ 
                backgroundColor: referrer.level === level.level ? `${level.color}20` : 'var(--bg-hover)',
                border: referrer.level === level.level ? `2px solid ${level.color}` : '1px solid var(--border-color)'
              }}
            >
              <p className="font-semibold" style={{ color: level.color }}>{level.name}</p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{level.commissionPercent}%</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{level.minReferrals}+ referrals</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MasterReferralDashboard
