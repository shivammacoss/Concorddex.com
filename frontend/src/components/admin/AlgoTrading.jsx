import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Plus,
  Settings,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const AlgoTrading = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [strategies, setStrategies] = useState([])
  const [positions, setPositions] = useState([])
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [showSecretModal, setShowSecretModal] = useState(null)

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [strategiesRes, positionsRes, historyRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/algo/strategies`, getAuthHeaders()),
        axios.get(`${API_URL}/api/algo/positions`, getAuthHeaders()),
        axios.get(`${API_URL}/api/algo/history?limit=50`, getAuthHeaders()),
        axios.get(`${API_URL}/api/algo/stats`, getAuthHeaders())
      ])

      setStrategies(strategiesRes.data.data || [])
      setPositions(positionsRes.data.data || [])
      setHistory(historyRes.data.data || [])
      setStats(statsRes.data.data || null)
    } catch (error) {
      console.error('Error fetching algo data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)

    // WebSocket for real-time updates
    const socket = io(API_URL)
    
    socket.on('algo:trade:opened', (data) => {
      setPositions(prev => [data.trade, ...prev])
      fetchData()
    })
    
    socket.on('algo:trade:closed', (data) => {
      setPositions(prev => prev.filter(p => p._id !== data.trade._id))
      setHistory(prev => [data.trade, ...prev.slice(0, 49)])
      fetchData()
    })
    
    socket.on('algo:trade:updated', (data) => {
      setPositions(prev => prev.map(p => p._id === data.trade._id ? data.trade : p))
    })

    return () => {
      clearInterval(interval)
      socket.disconnect()
    }
  }, [fetchData])

  const createStrategy = async (formData) => {
    try {
      await axios.post(`${API_URL}/api/algo/strategies`, formData, getAuthHeaders())
      setShowCreateModal(false)
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create strategy')
    }
  }

  const updateStrategyStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/api/algo/strategies/${id}`, { status }, getAuthHeaders())
      fetchData()
    } catch (error) {
      console.error('Error updating strategy:', error)
    }
  }

  const deleteStrategy = async (id) => {
    if (!confirm('Delete this strategy and all its trades?')) return
    try {
      await axios.delete(`${API_URL}/api/algo/strategies/${id}`, getAuthHeaders())
      fetchData()
    } catch (error) {
      console.error('Error deleting strategy:', error)
    }
  }

  const regenerateSecret = async (id) => {
    try {
      const res = await axios.post(`${API_URL}/api/algo/strategies/${id}/regenerate-secret`, {}, getAuthHeaders())
      setShowSecretModal({ id, secret: res.data.data.webhookSecret })
      fetchData()
    } catch (error) {
      console.error('Error regenerating secret:', error)
    }
  }

  const closeTrade = async (tradeId, exitPrice) => {
    try {
      await axios.post(`${API_URL}/api/algo/trades/${tradeId}/close`, { exitPrice }, getAuthHeaders())
      fetchData()
    } catch (error) {
      console.error('Error closing trade:', error)
    }
  }

  const formatPnL = (value) => {
    const num = parseFloat(value) || 0
    const color = num >= 0 ? 'text-green-500' : 'text-red-500'
    return <span className={color}>${num.toFixed(2)}</span>
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#d4af37' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8" style={{ color: '#d4af37' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Algo Trading
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              TradingView Webhook Monitoring
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
            style={{ backgroundColor: '#d4af37', color: '#000' }}
          >
            <Plus size={18} />
            New Strategy
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Active Strategies"
            value={stats.activeStrategies}
            icon={<Bot size={20} />}
            color="#d4af37"
          />
          <StatCard
            title="Open Positions"
            value={stats.openPositions}
            icon={<Activity size={20} />}
            color="#3b82f6"
          />
          <StatCard
            title="Today's P&L"
            value={`$${(stats.todayPnL || 0).toFixed(2)}`}
            icon={<DollarSign size={20} />}
            color={stats.todayPnL >= 0 ? '#22c55e' : '#ef4444'}
          />
          <StatCard
            title="Total P&L"
            value={`$${(stats.totalPnL || 0).toFixed(2)}`}
            icon={<TrendingUp size={20} />}
            color={stats.totalPnL >= 0 ? '#22c55e' : '#ef4444'}
          />
          <StatCard
            title="Win Rate"
            value={`${stats.winRate}%`}
            icon={<Target size={20} />}
            color="#8b5cf6"
          />
          <StatCard
            title="Total Trades"
            value={stats.closedTrades}
            icon={<BarChart3 size={20} />}
            color="#f59e0b"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {['overview', 'strategies', 'positions', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab ? 'border-b-2' : ''
            }`}
            style={{
              color: activeTab === tab ? '#d4af37' : 'var(--text-secondary)',
              borderColor: activeTab === tab ? '#d4af37' : 'transparent'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab stats={stats} positions={positions} strategies={strategies} />
      )}
      {activeTab === 'strategies' && (
        <StrategiesTab
          strategies={strategies}
          onStatusChange={updateStrategyStatus}
          onDelete={deleteStrategy}
          onRegenerateSecret={regenerateSecret}
          onEdit={setSelectedStrategy}
        />
      )}
      {activeTab === 'positions' && (
        <PositionsTab positions={positions} onClose={closeTrade} />
      )}
      {activeTab === 'history' && (
        <HistoryTab history={history} />
      )}

      {/* Create Strategy Modal */}
      {showCreateModal && (
        <CreateStrategyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createStrategy}
        />
      )}

      {/* Secret Modal */}
      {showSecretModal && (
        <SecretModal
          secret={showSecretModal.secret}
          onClose={() => setShowSecretModal(null)}
        />
      )}
    </div>
  )
}

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => (
  <div
    className="p-4 rounded-xl"
    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
  >
    <div className="flex items-center justify-between mb-2">
      <span style={{ color }}>{icon}</span>
    </div>
    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{title}</p>
  </div>
)

// Overview Tab
const OverviewTab = ({ stats, positions, strategies }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Strategy Performance */}
    <div
      className="p-4 rounded-xl"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Strategy Performance
      </h3>
      <div className="space-y-3">
        {stats?.strategyPnL?.map((s, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {s.trades} trades | {s.trades > 0 ? ((s.winners / s.trades) * 100).toFixed(1) : 0}% win rate
              </p>
            </div>
            <span className={`text-lg font-bold ${s.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${s.pnl.toFixed(2)}
            </span>
          </div>
        )) || <p style={{ color: 'var(--text-muted)' }}>No strategy data yet</p>}
      </div>
    </div>

    {/* Recent Activity */}
    <div
      className="p-4 rounded-xl"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Open Positions
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {positions.length > 0 ? positions.slice(0, 5).map(p => (
          <div key={p._id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-3">
              {p.side === 'BUY' ? (
                <TrendingUp className="text-green-500" size={18} />
              ) : (
                <TrendingDown className="text-red-500" size={18} />
              )}
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.symbol}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.strategyName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.quantity}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>@ {p.entryPrice}</p>
            </div>
          </div>
        )) : (
          <p style={{ color: 'var(--text-muted)' }}>No open positions</p>
        )}
      </div>
    </div>

    {/* Webhook Info */}
    <div
      className="p-4 rounded-xl lg:col-span-2"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        TradingView Webhook Setup
      </h3>
      <div className="space-y-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Webhook URL:
          </p>
          <code className="text-sm p-2 rounded block" style={{ backgroundColor: 'var(--bg-primary)', color: '#d4af37' }}>
            {window.location.origin.replace(':5173', ':5000').replace(':5174', ':5000')}/api/tradingview/webhook
          </code>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Sample Alert JSON (Entry):
          </p>
          <pre className="text-xs p-2 rounded overflow-x-auto" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
{`{
  "secret": "YOUR_STRATEGY_SECRET",
  "action": "open",
  "symbol": "{{ticker}}",
  "side": "{{strategy.order.action}}",
  "price": {{close}},
  "quantity": 0.01
}`}
          </pre>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Sample Alert JSON (Exit):
          </p>
          <pre className="text-xs p-2 rounded overflow-x-auto" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
{`{
  "secret": "YOUR_STRATEGY_SECRET",
  "action": "close",
  "symbol": "{{ticker}}",
  "price": {{close}},
  "close_all": true
}`}
          </pre>
        </div>
      </div>
    </div>
  </div>
)

// Strategies Tab
const StrategiesTab = ({ strategies, onStatusChange, onDelete, onRegenerateSecret, onEdit }) => (
  <div className="space-y-4">
    {strategies.length === 0 ? (
      <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
        No strategies created yet. Click "New Strategy" to get started.
      </div>
    ) : (
      strategies.map(s => (
        <div
          key={s._id}
          className="p-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {s.name}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.status === 'active' ? 'bg-green-500/20 text-green-500' :
                    s.status === 'paused' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-red-500/20 text-red-500'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                {s.symbol} | {s.timeframe} | {s.description || 'No description'}
              </p>
              <div className="flex gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span>Trades: {s.stats?.totalTrades || 0}</span>
                <span>Win Rate: {(s.stats?.winRate || 0).toFixed(1)}%</span>
                <span className={s.stats?.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                  P&L: ${(s.stats?.totalPnL || 0).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {s.status === 'active' ? (
                <button
                  onClick={() => onStatusChange(s._id, 'paused')}
                  className="p-2 rounded-lg text-yellow-500 hover:bg-yellow-500/20"
                  title="Pause"
                >
                  <Pause size={18} />
                </button>
              ) : (
                <button
                  onClick={() => onStatusChange(s._id, 'active')}
                  className="p-2 rounded-lg text-green-500 hover:bg-green-500/20"
                  title="Activate"
                >
                  <Play size={18} />
                </button>
              )}
              <button
                onClick={() => onRegenerateSecret(s._id)}
                className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-500"
                title="Regenerate Secret"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={() => onDelete(s._id)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-500/20"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
)

// Positions Tab
const PositionsTab = ({ positions, onClose }) => {
  const [closePrices, setClosePrices] = useState({})

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Symbol</th>
            <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Strategy</th>
            <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Side</th>
            <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Qty</th>
            <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Entry</th>
            <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>SL</th>
            <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>TP</th>
            <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Opened</th>
            <th className="text-center p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {positions.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                No open positions
              </td>
            </tr>
          ) : (
            positions.map(p => (
              <tr key={p._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td className="p-3 font-medium" style={{ color: 'var(--text-primary)' }}>{p.symbol}</td>
                <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{p.strategyName}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    p.side === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {p.side}
                  </span>
                </td>
                <td className="p-3 text-right" style={{ color: 'var(--text-primary)' }}>{p.quantity}</td>
                <td className="p-3 text-right" style={{ color: 'var(--text-primary)' }}>{p.entryPrice}</td>
                <td className="p-3 text-right" style={{ color: 'var(--text-secondary)' }}>{p.stopLoss || '-'}</td>
                <td className="p-3 text-right" style={{ color: 'var(--text-secondary)' }}>{p.takeProfit || '-'}</td>
                <td className="p-3 text-right text-sm" style={{ color: 'var(--text-muted)' }}>
                  {new Date(p.openedAt).toLocaleString()}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="Exit Price"
                      className="w-24 px-2 py-1 rounded text-sm"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      value={closePrices[p._id] || ''}
                      onChange={(e) => setClosePrices({...closePrices, [p._id]: e.target.value})}
                    />
                    <button
                      onClick={() => closePrices[p._id] && onClose(p._id, closePrices[p._id])}
                      className="px-3 py-1 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                    >
                      Close
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// History Tab
const HistoryTab = ({ history }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
          <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Trade ID</th>
          <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Symbol</th>
          <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Strategy</th>
          <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Side</th>
          <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Qty</th>
          <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Entry</th>
          <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Exit</th>
          <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>P&L</th>
          <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Closed</th>
        </tr>
      </thead>
      <tbody>
        {history.length === 0 ? (
          <tr>
            <td colSpan={9} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No closed trades yet
            </td>
          </tr>
        ) : (
          history.map(t => (
            <tr key={t._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td className="p-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{t.tradeId}</td>
              <td className="p-3 font-medium" style={{ color: 'var(--text-primary)' }}>{t.symbol}</td>
              <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{t.strategyName}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  t.side === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                }`}>
                  {t.side}
                </span>
              </td>
              <td className="p-3 text-right" style={{ color: 'var(--text-primary)' }}>{t.quantity}</td>
              <td className="p-3 text-right" style={{ color: 'var(--text-primary)' }}>{t.entryPrice}</td>
              <td className="p-3 text-right" style={{ color: 'var(--text-primary)' }}>{t.exitPrice}</td>
              <td className={`p-3 text-right font-medium ${t.realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${(t.realizedPnL || 0).toFixed(2)}
              </td>
              <td className="p-3 text-right text-sm" style={{ color: 'var(--text-muted)' }}>
                {new Date(t.closedAt).toLocaleString()}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)

// Create Strategy Modal
const CreateStrategyModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    symbol: 'XAUUSD',
    timeframe: '1H',
    settings: {
      pyramiding: 1,
      maxPositions: 5,
      defaultQuantity: 0.01
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="w-full max-w-md p-6 rounded-xl"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Create New Strategy
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Strategy Name
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                Symbol
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                Timeframe
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                value={formData.timeframe}
                onChange={(e) => setFormData({...formData, timeframe: e.target.value})}
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1H">1H</option>
                <option value="4H">4H</option>
                <option value="1D">1D</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Default Quantity
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              value={formData.settings.defaultQuantity}
              onChange={(e) => setFormData({
                ...formData,
                settings: {...formData.settings, defaultQuantity: parseFloat(e.target.value)}
              })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: '#d4af37', color: '#000' }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Secret Modal
const SecretModal = ({ secret, onClose }) => {
  const [copied, setCopied] = useState(false)

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="w-full max-w-lg p-6 rounded-xl"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Webhook Secret
        </h2>
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Use this secret in your TradingView alert JSON:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 rounded text-sm break-all" style={{ backgroundColor: 'var(--bg-primary)', color: '#d4af37' }}>
              {secret}
            </code>
            <button
              onClick={copySecret}
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'var(--bg-hover)' }}
            >
              {copied ? <CheckCircle className="text-green-500" size={18} /> : <Copy size={18} style={{ color: 'var(--text-secondary)' }} />}
            </button>
          </div>
        </div>
        <div className="p-3 rounded-lg mb-4 bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-sm text-yellow-500 flex items-center gap-2">
            <AlertTriangle size={16} />
            Save this secret now! It won't be shown again.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg font-medium"
          style={{ backgroundColor: '#d4af37', color: '#000' }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

export default AlgoTrading
