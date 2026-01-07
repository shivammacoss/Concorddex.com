import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  DollarSign,
  BarChart3,
  Eye,
  Calendar
} from 'lucide-react'

const ABookOrders = () => {
  const [activeTab, setActiveTab] = useState('positions')
  const [positions, setPositions] = useState([])
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' })

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.get('/api/admin/book-management/a-book/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setStats(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchPositions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.get(`/api/admin/book-management/a-book/positions?page=${pagination.page}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setPositions(res.data.data.trades)
        setPagination(res.data.data.pagination)
      }
    } catch (error) {
      console.error('Error fetching positions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 50,
        ...(dateFilter.startDate && { startDate: dateFilter.startDate }),
        ...(dateFilter.endDate && { endDate: dateFilter.endDate })
      })
      
      const res = await axios.get(`/api/admin/book-management/a-book/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setHistory(res.data.data.trades)
        setPagination(res.data.data.pagination)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'positions') {
      fetchPositions()
    } else {
      fetchHistory()
    }
  }, [activeTab, pagination.page])

  const handleDateFilter = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchHistory()
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString()
  }

  const formatNumber = (num, decimals = 2) => {
    if (num === undefined || num === null) return '-'
    return parseFloat(num).toFixed(decimals)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#22c55e' }}>A Book Orders</h1>
          <p className="text-gray-400 text-sm mt-1">View-only access to A Book trades (Liquidity Provider)</p>
        </div>
        <button
          onClick={() => activeTab === 'positions' ? fetchPositions() : fetchHistory()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs text-gray-400 mb-1">A Book Users</p>
          <p className="text-xl font-bold" style={{ color: '#22c55e' }}>{stats.userCount || 0}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs text-gray-400 mb-1">Open Trades</p>
          <p className="text-xl font-bold text-white">{stats.openTrades || 0}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs text-gray-400 mb-1">Closed Trades</p>
          <p className="text-xl font-bold text-white">{stats.closedTrades || 0}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs text-gray-400 mb-1">Total Volume</p>
          <p className="text-xl font-bold" style={{ color: '#d4af37' }}>{stats.totalVolume || '0.00'}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs text-gray-400 mb-1">Total P&L</p>
          <p className="text-xl font-bold" style={{ color: parseFloat(stats.totalProfit) >= 0 ? '#22c55e' : '#3b82f6' }}>
            ${stats.totalProfit || '0.00'}
          </p>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs text-gray-400 mb-1">Total Commission</p>
          <p className="text-xl font-bold" style={{ color: '#d4af37' }}>${stats.totalCommission || '0.00'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={() => { setActiveTab('positions'); setPagination(prev => ({ ...prev, page: 1 })) }}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'positions' 
              ? 'border-green-500 text-green-500' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} />
            Open Positions
          </div>
        </button>
        <button
          onClick={() => { setActiveTab('history'); setPagination(prev => ({ ...prev, page: 1 })) }}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'history' 
              ? 'border-green-500 text-green-500' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            Trade History
          </div>
        </button>
      </div>

      {/* Date Filter for History */}
      {activeTab === 'history' && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm"
            />
          </div>
          <button
            onClick={handleDateFilter}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
          >
            Apply Filter
          </button>
        </div>
      )}

      {/* Notice */}
      <div className="p-3 rounded-lg flex items-center gap-2 text-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
        <Eye size={16} style={{ color: '#22c55e' }} />
        <span style={{ color: '#22c55e' }}>
          <strong>View Only:</strong> A Book trades cannot be modified. These trades are processed through the liquidity provider.
        </span>
      </div>

      {/* Trades Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Symbol</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Volume</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Entry Price</th>
                {activeTab === 'history' && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Close Price</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Commission</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Swap</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">P&L</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  {activeTab === 'positions' ? 'Open Time' : 'Close Time'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'history' ? 11 : 10} className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : (activeTab === 'positions' ? positions : history).length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'history' ? 11 : 10} className="px-4 py-8 text-center text-gray-500">
                    No {activeTab === 'positions' ? 'open positions' : 'trade history'} found
                  </td>
                </tr>
              ) : (
                (activeTab === 'positions' ? positions : history).map((trade) => (
                  <tr key={trade._id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {trade.tradingAccount?.user?.firstName} {trade.tradingAccount?.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{trade.tradingAccount?.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {trade.tradingAccount?.accountNumber || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ color: '#d4af37' }}>{trade.symbol}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span 
                        className="px-2 py-1 rounded text-xs font-bold"
                        style={{ 
                          backgroundColor: trade.type === 'buy' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: trade.type === 'buy' ? '#3b82f6' : '#22c55e'
                        }}
                      >
                        {trade.type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-white">
                      {formatNumber(trade.volume || trade.amount, 2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-white">
                      {formatNumber(trade.openPrice || trade.price, 5)}
                    </td>
                    {activeTab === 'history' && (
                      <td className="px-4 py-3 text-right text-sm text-white">
                        {formatNumber(trade.closePrice, 5)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-sm" style={{ color: '#d4af37' }}>
                      ${formatNumber(trade.commission, 2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      ${formatNumber(trade.swap, 2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium" style={{ 
                      color: (trade.profit || 0) >= 0 ? '#22c55e' : '#3b82f6' 
                    }}>
                      ${formatNumber(trade.profit, 2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(activeTab === 'positions' ? trade.openTime : trade.closeTime)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {((pagination.page - 1) * 50) + 1} to {Math.min(pagination.page * 50, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ backgroundColor: 'var(--bg-hover)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ backgroundColor: 'var(--bg-hover)' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ABookOrders
