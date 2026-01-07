import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Users, 
  BookOpen, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  Check,
  X,
  AlertCircle
} from 'lucide-react'

const BookManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ aBookCount: 0, bBookCount: 0, total: 0 })
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ bookType: '', search: '' })
  const [selectedUsers, setSelectedUsers] = useState([])
  const [switching, setSwitching] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        ...(filters.bookType && { bookType: filters.bookType }),
        ...(filters.search && { search: filters.search })
      })
      
      const res = await axios.get(`/api/admin/book-management/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.data.success) {
        setUsers(res.data.data.users)
        setPagination(res.data.data.pagination)
        setStats(res.data.data.stats)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, filters.bookType])

  const handleSearch = (e) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchUsers()
  }

  const switchBookType = async (userId, newBookType) => {
    setSwitching(userId)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.put(`/api/admin/book-management/users/${userId}/book-type`, 
        { bookType: newBookType },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.data.success) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error switching book type:', error)
      alert(error.response?.data?.message || 'Failed to switch book type')
    } finally {
      setSwitching(null)
    }
  }

  const bulkSwitch = async (bookType) => {
    if (selectedUsers.length === 0) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.put('/api/admin/book-management/users/bulk-switch',
        { userIds: selectedUsers, bookType },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.data.success) {
        setSelectedUsers([])
        fetchUsers()
      }
    } catch (error) {
      console.error('Error bulk switching:', error)
      alert(error.response?.data?.message || 'Failed to bulk switch')
    }
  }

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u._id))
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Book Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage A Book and B Book users</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#d4af37' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <BookOpen size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <p className="text-sm text-gray-400">A Book Users</p>
              <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{stats.aBookCount}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <BookOpen size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <p className="text-sm text-gray-400">B Book Users</p>
              <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{stats.bBookCount}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)' }}>
              <Users size={20} style={{ color: '#d4af37' }} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Users</p>
              <p className="text-2xl font-bold" style={{ color: '#d4af37' }}>{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
        <AlertCircle size={20} style={{ color: '#d4af37' }} className="flex-shrink-0 mt-0.5" />
        <div className="text-sm" style={{ color: '#d4af37' }}>
          <p className="font-semibold mb-1">A Book vs B Book</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li><strong>A Book:</strong> Trades go to liquidity provider. Admin cannot modify trades. Only charges are deducted.</li>
            <li><strong>B Book:</strong> Trades are managed internally. Admin has full control over trades, P&L, and modifications.</li>
          </ul>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
          </div>
        </form>
        
        <select
          value={filters.bookType}
          onChange={(e) => setFilters(prev => ({ ...prev, bookType: e.target.value }))}
          className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-yellow-500"
        >
          <option value="">All Books</option>
          <option value="A">A Book Only</option>
          <option value="B">B Book Only</option>
        </select>

        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{selectedUsers.length} selected</span>
            <button
              onClick={() => bulkSwitch('A')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
            >
              Move to A Book
            </button>
            <button
              onClick={() => bulkSwitch('B')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}
            >
              Move to B Book
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                  style={{ accentColor: '#d4af37' }}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Email</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Current Book</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Changed At</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => toggleSelectUser(user._id)}
                      className="rounded"
                      style={{ accentColor: '#d4af37' }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{user.firstName} {user.lastName}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ 
                        backgroundColor: user.bookType === 'A' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: user.bookType === 'A' ? '#22c55e' : '#3b82f6'
                      }}
                    >
                      {user.bookType || 'B'} Book
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {user.bookTypeChangedAt 
                      ? new Date(user.bookTypeChangedAt).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{ 
                        backgroundColor: user.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: user.isActive ? '#22c55e' : '#ef4444'
                      }}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {switching === user._id ? (
                        <RefreshCw size={16} className="animate-spin text-gray-400" />
                      ) : (
                        <>
                          <button
                            onClick={() => switchBookType(user._id, 'A')}
                            disabled={user.bookType === 'A'}
                            className="px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-30"
                            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                            title="Switch to A Book"
                          >
                            A Book
                          </button>
                          <button
                            onClick={() => switchBookType(user._id, 'B')}
                            disabled={user.bookType === 'B' || !user.bookType}
                            className="px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-30"
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}
                            title="Switch to B Book"
                          >
                            B Book
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total}
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

export default BookManagement
