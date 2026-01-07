import React, { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Ban,
  CheckCircle,
  Download,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  X,
  Loader2,
  Key,
  CreditCard,
  PlusCircle,
  MinusCircle,
  LogIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const UserManagement = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, verifiedUsers: 0, inactiveUsers: 0 })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  })
  
  // Admin info for impersonation check
  const [adminInfo, setAdminInfo] = useState(null)
  const [impersonating, setImpersonating] = useState(false)
  
  // Handle responsive
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showAccountsModal, setShowAccountsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', country: '', balance: 0, isVerified: false
  })
  const [newPassword, setNewPassword] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [tradingAccounts, setTradingAccounts] = useState([])
  const [editingAccount, setEditingAccount] = useState(null)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditForm, setCreditForm] = useState({ amount: '', type: 'add', reason: '', balanceType: 'fund', tradingAccountId: '' })
  const [userTradingAccounts, setUserTradingAccounts] = useState([])

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  // Fetch users with pagination
  const fetchUsers = async (page = pagination.page) => {
    try {
      setLoading(true)
      const res = await axios.get(
        `/api/admin/users?search=${searchTerm}&status=${filterStatus}&page=${page}&limit=${pagination.limit}`, 
        getAuthHeader()
      )
      if (res.data.success) {
        setUsers(res.data.data.users)
        // Update pagination from server response
        if (res.data.data.pagination) {
          setPagination(prev => ({
            ...prev,
            page: res.data.data.pagination.page,
            total: res.data.data.pagination.total,
            pages: res.data.data.pagination.pages
          }))
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/users/stats/summary', getAuthHeader())
      if (res.data.success) {
        setStats(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }
  
  // Fetch admin info to check role
  const fetchAdminInfo = async () => {
    try {
      const res = await axios.get('/api/admin/auth/me', getAuthHeader())
      if (res.data.success) {
        setAdminInfo(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching admin info:', err)
    }
  }

  useEffect(() => {
    fetchUsers(1) // Reset to page 1 when filters change
    fetchStats()
  }, [searchTerm, filterStatus])
  
  useEffect(() => {
    fetchAdminInfo()
  }, [])
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }))
      fetchUsers(newPage)
    }
  }
  
  // Login as user (impersonation) - Superadmin only
  const handleLoginAsUser = async (user) => {
    if (!adminInfo || adminInfo.role !== 'superadmin') {
      alert('Only Superadmin can use this feature')
      return
    }
    
    if (!confirm(`Are you sure you want to login as ${user.firstName} ${user.lastName}? This action will be logged.`)) {
      return
    }
    
    try {
      setActionLoading(true)
      const res = await axios.post(`/api/admin/auth/impersonate/${user._id}`, {}, getAuthHeader())
      
      if (res.data.success) {
        // Store impersonation data
        localStorage.setItem('token', res.data.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.data.user))
        localStorage.setItem('impersonation', JSON.stringify(res.data.data.impersonation))
        
        // Redirect to user dashboard
        window.location.href = '/home'
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to login as user')
    } finally {
      setActionLoading(false)
    }
  }

  // Create user
  const handleCreateUser = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await axios.post('/api/admin/users', formData, getAuthHeader())
      if (res.data.success) {
        setShowCreateModal(false)
        setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '', country: '', balance: 0, isVerified: false })
        fetchUsers()
        fetchStats()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating user')
    } finally {
      setActionLoading(false)
    }
  }

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await axios.put(`/api/admin/users/${selectedUser._id}`, formData, getAuthHeader())
      if (res.data.success) {
        setShowEditModal(false)
        setSelectedUser(null)
        fetchUsers()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating user')
    } finally {
      setActionLoading(false)
    }
  }

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await axios.put(`/api/admin/users/${selectedUser._id}/password`, { newPassword }, getAuthHeader())
      if (res.data.success) {
        setShowPasswordModal(false)
        setSelectedUser(null)
        setNewPassword('')
        alert('Password changed successfully')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error changing password')
    } finally {
      setActionLoading(false)
    }
  }

  // Ban/Unban user
  const handleToggleBan = async (user) => {
    if (!confirm(`Are you sure you want to ${user.isActive ? 'ban' : 'unban'} this user?`)) return
    try {
      const res = await axios.put(`/api/admin/users/${user._id}/ban`, {}, getAuthHeader())
      if (res.data.success) {
        fetchUsers()
        fetchStats()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error')
    }
  }

  // Delete user
  const handleDeleteUser = async (user) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    try {
      const res = await axios.delete(`/api/admin/users/${user._id}`, getAuthHeader())
      if (res.data.success) {
        fetchUsers()
        fetchStats()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting user')
    }
  }

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      country: user.country || '',
      balance: user.balance || 0,
      isVerified: user.isVerified
    })
    setShowEditModal(true)
  }

  // Fetch trading accounts for a user
  const fetchTradingAccounts = async (userId) => {
    try {
      const res = await axios.get(`/api/admin/users/${userId}/trading-accounts`, getAuthHeader())
      if (res.data.success) {
        setTradingAccounts(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching trading accounts:', err)
    }
  }

  // Open accounts modal
  const openAccountsModal = (user) => {
    setSelectedUser(user)
    fetchTradingAccounts(user._id)
    setShowAccountsModal(true)
  }

  // Open credit modal
  const openCreditModal = async (user) => {
    setSelectedUser(user)
    setCreditForm({ amount: '', type: 'add', reason: '', balanceType: 'fund', tradingAccountId: '' })
    // Fetch user's trading accounts for credit option
    try {
      const res = await axios.get(`/api/admin/users/${user._id}/trading-accounts`, getAuthHeader())
      if (res.data.success) {
        setUserTradingAccounts(res.data.data || [])
      }
    } catch (err) {
      setUserTradingAccounts([])
    }
    setShowCreditModal(true)
  }

  // Handle credit/fund adjustment
  const handleCreditAdjustment = async () => {
    if (!creditForm.amount || parseFloat(creditForm.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    
    // If credit type, must select a trading account
    if (creditForm.balanceType === 'credit' && !creditForm.tradingAccountId) {
      alert('Please select a trading account for credit adjustment')
      return
    }
    
    try {
      setActionLoading(true)
      
      let endpoint, payload
      
      if (creditForm.balanceType === 'fund') {
        // Fund goes to user's wallet balance
        endpoint = `/api/admin/users/${selectedUser._id}/fund`
        payload = {
          amount: parseFloat(creditForm.amount),
          type: creditForm.type,
          reason: creditForm.reason || (creditForm.type === 'add' ? 'Admin fund deposit' : 'Admin fund deduction')
        }
      } else {
        // Credit goes to trading account's creditBalance (equity)
        endpoint = `/api/admin/credit/${creditForm.type === 'add' ? 'add' : 'remove'}`
        payload = {
          accountId: creditForm.tradingAccountId,
          amount: parseFloat(creditForm.amount),
          reason: creditForm.reason || (creditForm.type === 'add' ? 'Admin credit bonus' : 'Admin credit removal')
        }
      }
      
      const res = await axios.post(endpoint, payload, getAuthHeader())
      
      if (res.data.success) {
        alert(res.data.message || 'Operation successful')
        setShowCreditModal(false)
        fetchUsers()
        fetchStats()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request')
    } finally {
      setActionLoading(false)
    }
  }

  // Update trading account leverage
  const handleUpdateAccount = async (accountId, updates) => {
    try {
      setActionLoading(true)
      const res = await axios.put(
        `/api/admin/users/${selectedUser._id}/trading-accounts/${accountId}`,
        updates,
        getAuthHeader()
      )
      if (res.data.success) {
        fetchTradingAccounts(selectedUser._id)
        setEditingAccount(null)
        alert('Account updated successfully')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating account')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = users

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }
      case 'Pending': return { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }
      case 'Suspended': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#d4af37' }
      case 'Inactive': return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
      default: return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Download size={16} />
            Export
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Users</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{stats.totalUsers}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active Users</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#22c55e' }}>{stats.activeUsers}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Verified Users</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#fbbf24' }}>{stats.verifiedUsers}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Inactive</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#d4af37' }}>{stats.inactiveUsers}</p>
        </div>
      </div>

      {/* Users Table */}
      <div 
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        {/* Mobile Card View */}
        {isMobile ? (
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="animate-spin mx-auto" size={24} style={{ color: 'var(--text-muted)' }} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No users found
              </div>
            ) : filteredUsers.map((user) => {
              const status = user.isActive ? 'Active' : 'Inactive'
              const statusStyle = getStatusColor(status)
              const kycStyle = getStatusColor(user.isVerified ? 'Active' : 'Pending')
              return (
                <div key={user._id} className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {/* User Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.firstName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      </div>
                    </div>
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                    >
                      {status}
                    </span>
                  </div>
                  
                  {/* User Info Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Balance</p>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>${(user.balance || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>KYC</p>
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: kycStyle.bg, color: kycStyle.color }}
                      >
                        {user.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Joined</p>
                      <p style={{ color: 'var(--text-primary)' }}>{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {adminInfo?.role === 'superadmin' && (
                      <button 
                        onClick={() => handleLoginAsUser(user)} 
                        className="p-2 rounded-lg" 
                        style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }} 
                        title="Login as User"
                      >
                        <LogIn size={16} style={{ color: '#a855f7' }} />
                      </button>
                    )}
                    <button onClick={() => openEditModal(user)} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }} title="Edit">
                      <Edit size={16} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button onClick={() => openAccountsModal(user)} className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} title="Accounts">
                      <DollarSign size={16} style={{ color: '#3b82f6' }} />
                    </button>
                    <button onClick={() => openCreditModal(user)} className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }} title="Credits">
                      <CreditCard size={16} style={{ color: '#22c55e' }} />
                    </button>
                    <button onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }} title="Password">
                      <Key size={16} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button onClick={() => handleToggleBan(user)} className="p-2 rounded-lg" style={{ backgroundColor: user.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }} title={user.isActive ? 'Ban' : 'Unban'}>
                      <Ban size={16} style={{ color: user.isActive ? '#d4af37' : '#22c55e' }} />
                    </button>
                    <button onClick={() => handleDeleteUser(user)} className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }} title="Delete">
                      <Trash2 size={16} style={{ color: '#d4af37' }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Contact</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Balance</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Country</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>KYC</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Joined</th>
                  <th className="text-left py-4 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center">
                      <Loader2 className="animate-spin mx-auto" size={24} style={{ color: 'var(--text-muted)' }} />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No users found
                    </td>
                  </tr>
                ) : filteredUsers.map((user) => {
                  const status = user.isActive ? 'Active' : 'Inactive'
                  const statusStyle = getStatusColor(status)
                  const kycStyle = getStatusColor(user.isVerified ? 'Active' : 'Pending')
                  return (
                    <tr key={user._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user.firstName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ID: {user._id?.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                          <Mail size={12} /> {user.email}
                        </div>
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Phone size={12} /> {user.phone || 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>${(user.balance || 0).toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{user.country || 'N/A'}</td>
                      <td className="py-4 px-4">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: kycStyle.bg, color: kycStyle.color }}
                        >
                          {user.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Login as User - Superadmin Only */}
                          {adminInfo?.role === 'superadmin' && (
                            <button 
                              onClick={() => handleLoginAsUser(user)} 
                              className="p-2 rounded-lg hover:bg-opacity-80" 
                              style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }} 
                              title="Login as User"
                            >
                              <LogIn size={16} style={{ color: '#a855f7' }} />
                            </button>
                          )}
                          <button onClick={() => openEditModal(user)} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: 'var(--bg-hover)' }} title="Edit">
                            <Edit size={16} style={{ color: 'var(--text-secondary)' }} />
                          </button>
                          <button onClick={() => openAccountsModal(user)} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} title="Trading Accounts & Leverage">
                            <DollarSign size={16} style={{ color: '#3b82f6' }} />
                          </button>
                          <button onClick={() => openCreditModal(user)} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }} title="Add/Deduct Credits">
                            <CreditCard size={16} style={{ color: '#22c55e' }} />
                          </button>
                          <button onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: 'var(--bg-hover)' }} title="Change Password">
                            <Key size={16} style={{ color: 'var(--text-secondary)' }} />
                          </button>
                          <button onClick={() => handleToggleBan(user)} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: user.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }} title={user.isActive ? 'Ban' : 'Unban'}>
                            <Ban size={16} style={{ color: user.isActive ? '#d4af37' : '#22c55e' }} />
                          </button>
                          <button onClick={() => handleDeleteUser(user)} className="p-2 rounded-lg hover:bg-opacity-80" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }} title="Delete">
                            <Trash2 size={16} style={{ color: '#d4af37' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination - Server-side */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          <p className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>
            Showing {users.length} of {pagination.total} users (Page {pagination.page} of {pagination.pages})
          </p>
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button 
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed" 
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            
            {/* Page Numbers */}
            {(() => {
              const pages = [];
              const totalPages = pagination.pages;
              const currentPage = pagination.page;
              
              // Always show first page
              if (totalPages > 0) {
                pages.push(1);
              }
              
              // Show ellipsis if needed
              if (currentPage > 3) {
                pages.push('...');
              }
              
              // Show pages around current page
              for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                if (!pages.includes(i)) {
                  pages.push(i);
                }
              }
              
              // Show ellipsis if needed
              if (currentPage < totalPages - 2) {
                pages.push('...');
              }
              
              // Always show last page
              if (totalPages > 1 && !pages.includes(totalPages)) {
                pages.push(totalPages);
              }
              
              return pages.map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-sm" style={{ color: 'var(--text-muted)' }}>...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      page === currentPage ? 'bg-blue-500 text-white' : ''
                    }`}
                    style={page !== currentPage ? { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' } : {}}
                  >
                    {page}
                  </button>
                )
              ));
            })()}
            
            {/* Next Button */}
            <button 
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed" 
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Create New User</h3>
              <button onClick={() => setShowCreateModal(false)}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                <input type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required minLength={6} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Country" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="number" placeholder="Initial Balance" value={formData.balance} onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={formData.isVerified} onChange={(e) => setFormData({...formData, isVerified: e.target.checked})} />
                Mark as Verified
              </label>
              <button type="submit" disabled={actionLoading} className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50">
                {actionLoading ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Edit User</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                <input type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Country" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="number" placeholder="Balance" value={formData.balance} onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={formData.isVerified} onChange={(e) => setFormData({...formData, isVerified: e.target.checked})} />
                Verified
              </label>
              <button type="submit" disabled={actionLoading} className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50">
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Change Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setSelectedUser(null); setNewPassword(''); }}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Change password for: {selectedUser.firstName} {selectedUser.lastName}</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input type="password" placeholder="New Password (min 6 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="w-full px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <button type="submit" disabled={actionLoading} className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50">
                {actionLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Trading Accounts Modal */}
      {showAccountsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Trading Accounts - {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <button onClick={() => { setShowAccountsModal(false); setSelectedUser(null); setEditingAccount(null); }}>
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            
            {tradingAccounts.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No trading accounts found</p>
            ) : (
              <div className="space-y-4">
                {tradingAccounts.map(account => (
                  <div key={account._id} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{account.accountNumber}</span>
                        <span className="ml-2 text-xs px-2 py-1 rounded" style={{ backgroundColor: account.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: account.status === 'active' ? '#22c55e' : '#d4af37' }}>
                          {account.status}
                        </span>
                      </div>
                      <button 
                        onClick={() => setEditingAccount(editingAccount === account._id ? null : account._id)}
                        className="text-xs px-3 py-1 rounded-lg bg-blue-500 text-white"
                      >
                        {editingAccount === account._id ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Type: </span>
                        <span style={{ color: 'var(--text-primary)' }}>{account.accountType?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Balance: </span>
                        <span style={{ color: 'var(--text-primary)' }}>${account.balance?.toFixed(2)}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Leverage: </span>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>1:{account.leverage}</span>
                      </div>
                    </div>
                    
                    {editingAccount === account._id && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Leverage (1-2000)</label>
                            <input 
                              type="number" 
                              defaultValue={account.leverage}
                              min="1" 
                              max="2000"
                              id={`leverage-${account._id}`}
                              className="w-full px-3 py-2 rounded-lg text-sm"
                              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Balance</label>
                            <input 
                              type="number" 
                              defaultValue={account.balance}
                              step="0.01"
                              id={`balance-${account._id}`}
                              className="w-full px-3 py-2 rounded-lg text-sm"
                              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newLeverage = parseInt(document.getElementById(`leverage-${account._id}`).value)
                            const newBalance = parseFloat(document.getElementById(`balance-${account._id}`).value)
                            handleUpdateAccount(account._id, { leverage: newLeverage, balance: newBalance })
                          }}
                          disabled={actionLoading}
                          className="w-full py-2 rounded-lg bg-green-500 text-white font-medium text-sm disabled:opacity-50"
                        >
                          {actionLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fund/Credit Adjustment Modal */}
      {showCreditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: creditForm.balanceType === 'fund' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)' }}>
                  {creditForm.balanceType === 'fund' ? <DollarSign size={20} style={{ color: '#3b82f6' }} /> : <CreditCard size={20} style={{ color: '#f59e0b' }} />}
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Fund & Credit Management</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
              </div>
              <button onClick={() => setShowCreditModal(false)} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <X size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Current Balance Info */}
            <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>User Wallet Balance</p>
              <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>${selectedUser.balance?.toFixed(2) || '0.00'}</p>
            </div>

            <div className="space-y-4">
              {/* Balance Type: Fund vs Credit */}
              <div>
                <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Balance Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreditForm({ ...creditForm, balanceType: 'fund', tradingAccountId: '' })}
                    className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl font-medium transition-all"
                    style={{ 
                      backgroundColor: creditForm.balanceType === 'fund' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-hover)',
                      border: creditForm.balanceType === 'fund' ? '2px solid #3b82f6' : '2px solid transparent',
                      color: creditForm.balanceType === 'fund' ? '#3b82f6' : 'var(--text-secondary)'
                    }}
                  >
                    <DollarSign size={20} />
                    <span className="text-sm">Fund</span>
                    <span className="text-[10px] opacity-70">→ Wallet Balance</span>
                  </button>
                  <button
                    onClick={() => setCreditForm({ ...creditForm, balanceType: 'credit' })}
                    className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl font-medium transition-all"
                    style={{ 
                      backgroundColor: creditForm.balanceType === 'credit' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-hover)',
                      border: creditForm.balanceType === 'credit' ? '2px solid #f59e0b' : '2px solid transparent',
                      color: creditForm.balanceType === 'credit' ? '#f59e0b' : 'var(--text-secondary)'
                    }}
                  >
                    <CreditCard size={20} />
                    <span className="text-sm">Credit</span>
                    <span className="text-[10px] opacity-70">→ Trading Equity</span>
                  </button>
                </div>
              </div>

              {/* Trading Account Selector (only for Credit) */}
              {creditForm.balanceType === 'credit' && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Select Trading Account</label>
                  {userTradingAccounts.length === 0 ? (
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                      <p className="text-sm" style={{ color: '#d4af37' }}>No trading accounts found for this user</p>
                    </div>
                  ) : (
                    <select
                      value={creditForm.tradingAccountId}
                      onChange={(e) => setCreditForm({ ...creditForm, tradingAccountId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="">-- Select Account --</option>
                      {userTradingAccounts.filter(acc => !acc.isDemo).map(acc => (
                        <option key={acc._id} value={acc._id}>
                          {acc.accountNumber} - ${acc.balance?.toFixed(2)} {acc.creditBalance > 0 ? `(Credit: $${acc.creditBalance.toFixed(2)})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Credit adds to equity but cannot be withdrawn
                  </p>
                </div>
              )}

              {/* Action Type: Add vs Deduct */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Action</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreditForm({ ...creditForm, type: 'add' })}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all"
                    style={{ 
                      backgroundColor: creditForm.type === 'add' ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-hover)',
                      border: creditForm.type === 'add' ? '2px solid #22c55e' : '2px solid transparent',
                      color: creditForm.type === 'add' ? '#22c55e' : 'var(--text-secondary)'
                    }}
                  >
                    <PlusCircle size={18} /> Add
                  </button>
                  <button
                    onClick={() => setCreditForm({ ...creditForm, type: 'deduct' })}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all"
                    style={{ 
                      backgroundColor: creditForm.type === 'deduct' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-hover)',
                      border: creditForm.type === 'deduct' ? '2px solid #d4af37' : '2px solid transparent',
                      color: creditForm.type === 'deduct' ? '#d4af37' : 'var(--text-secondary)'
                    }}
                  >
                    <MinusCircle size={18} /> Deduct
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Amount ($)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={creditForm.amount}
                  onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-lg font-bold"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Reason (optional)</label>
                <input
                  type="text"
                  value={creditForm.reason}
                  onChange={(e) => setCreditForm({ ...creditForm, reason: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="e.g., Bonus, Refund, Correction"
                />
              </div>

              {/* Preview */}
              {creditForm.amount && creditForm.balanceType === 'fund' && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: creditForm.type === 'add' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    New Wallet Balance: <span className="font-bold" style={{ color: creditForm.type === 'add' ? '#22c55e' : '#d4af37' }}>
                      ${(creditForm.type === 'add' 
                        ? (selectedUser.balance || 0) + parseFloat(creditForm.amount || 0)
                        : (selectedUser.balance || 0) - parseFloat(creditForm.amount || 0)
                      ).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              {creditForm.amount && creditForm.balanceType === 'credit' && creditForm.tradingAccountId && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {creditForm.type === 'add' ? 'Adding' : 'Removing'} <span className="font-bold" style={{ color: '#f59e0b' }}>${creditForm.amount}</span> credit {creditForm.type === 'add' ? 'to' : 'from'} trading account equity
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleCreditAdjustment}
                disabled={actionLoading || !creditForm.amount || (creditForm.balanceType === 'credit' && !creditForm.tradingAccountId)}
                className="w-full py-3 rounded-xl font-medium text-white disabled:opacity-50"
                style={{ 
                  background: creditForm.type === 'add' 
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                    : 'linear-gradient(135deg, #d4af37 0%, #dc2626 100%)' 
                }}
              >
                {actionLoading ? 'Processing...' : `${creditForm.type === 'add' ? 'Add' : 'Deduct'} $${creditForm.amount || '0.00'} ${creditForm.balanceType === 'fund' ? 'to Wallet' : 'Credit'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
