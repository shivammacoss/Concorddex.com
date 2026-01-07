import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  Plus, TrendingUp, ArrowRightLeft, ExternalLink, 
  Star, Zap, Crown, Diamond, User, GraduationCap, 
  ChevronLeft, AlertCircle, Check, X, RefreshCw,
  MoreHorizontal, Building, Minus
} from 'lucide-react'

const TradingAccounts = ({ onOpenTrading }) => {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [accountTypes, setAccountTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('real')
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedAccountType, setSelectedAccountType] = useState(null)
  const [user, setUser] = useState(null)
  const [creating, setCreating] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [transferForm, setTransferForm] = useState({
    fromType: 'wallet',
    fromAccountId: '',
    toType: 'trading_account',
    toAccountId: '',
    amount: ''
  })
  const [newAccountForm, setNewAccountForm] = useState({
    leverage: 100,
    currency: 'USD'
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [accountsRes, typesRes, userRes] = await Promise.all([
        axios.get('/api/trading-accounts', getAuthHeader()),
        axios.get('/api/account-types'),
        axios.get('/api/auth/me', getAuthHeader())
      ])
      
      if (accountsRes.data.success) setAccounts(accountsRes.data.data)
      if (typesRes.data.success) setAccountTypes(typesRes.data.data)
      if (userRes.data.success) setUser(userRes.data.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getIconComponent = (color) => {
    const icons = {
      '#6b7280': GraduationCap,
      '#3b82f6': Building,
      '#8b5cf6': TrendingUp,
      '#ec4899': Zap,
      '#f59e0b': Crown,
      '#10b981': Diamond
    }
    return icons[color] || Star
  }

  const handleCreateAccount = async () => {
    if (!selectedAccountType) return
    
    try {
      setCreating(true)
      const res = await axios.post('/api/trading-accounts', {
        accountTypeId: selectedAccountType._id,
        leverage: newAccountForm.leverage,
        currency: newAccountForm.currency,
        isDemo: false
      }, getAuthHeader())
      
      if (res.data.success) {
        alert(res.data.message)
        setShowNewAccountModal(false)
        setSelectedAccountType(null)
        fetchData()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating account')
    } finally {
      setCreating(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferForm.amount || parseFloat(transferForm.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    
    try {
      setTransferring(true)
      const res = await axios.post('/api/trading-accounts/transfer', {
        fromType: transferForm.fromType,
        fromAccountId: transferForm.fromAccountId,
        toType: transferForm.toType,
        toAccountId: transferForm.toAccountId,
        amount: parseFloat(transferForm.amount)
      }, getAuthHeader())
      
      if (res.data.success) {
        alert(res.data.message)
        setShowTransferModal(false)
        setTransferForm({
          fromType: 'wallet',
          fromAccountId: '',
          toType: 'trading_account',
          toAccountId: '',
          amount: ''
        })
        fetchData()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Transfer failed')
    } finally {
      setTransferring(false)
    }
  }

  // Filter accounts by tab (only live accounts, no demo)
  const liveAccountTypes = accountTypes.filter(t => !t.isDemo)
  
  const filteredAccounts = accounts.filter(acc => {
    if (activeTab === 'real') return !acc.isDemo && acc.status === 'active'
    if (activeTab === 'archived') return acc.status !== 'active'
    return true
  })

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Accounts</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={() => setShowNewAccountModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <Plus size={18} />
              Open Account
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg w-fit" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {[
            { id: 'real', label: 'Live Accounts' },
            { id: 'archived', label: 'Archived' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab !== tab.id ? { color: 'var(--text-secondary)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Account Cards */}
        {filteredAccounts.length === 0 ? (
          <div 
            className="text-center py-16 rounded-2xl border-2 border-dashed"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <TrendingUp size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              No {activeTab === 'real' ? 'live' : 'archived'} accounts yet
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {activeTab === 'real' 
                ? 'Open your first live trading account to start trading'
                : 'No archived accounts'}
            </p>
            {activeTab !== 'archived' && (
              <button
                onClick={() => setShowNewAccountModal(true)}
                className="text-blue-500 hover:text-blue-600 font-medium text-sm"
              >
                Open your first live account →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts.map((account) => {
              const IconComponent = getIconComponent(account.accountType?.color)
              return (
                <div
                  key={account._id}
                  className="rounded-2xl border-2 overflow-hidden transition-all hover:border-blue-400"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                >
                  {/* Card Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${account.accountType?.color || '#3b82f6'}15` }}
                        >
                          <IconComponent size={20} style={{ color: account.accountType?.color || '#3b82f6' }} />
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {account.accountNumber}
                          </p>
                          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                            {account.accountType?.name || 'Standard'}
                          </p>
                        </div>
                      </div>
                      <button className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                        <MoreHorizontal size={18} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-1.5 mb-4">
                      <div className={`w-2 h-2 rounded-full ${account.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-xs font-medium" style={{ color: account.status === 'active' ? '#22c55e' : 'var(--text-muted)' }}>
                        {account.isDemo ? 'Demo' : 'Live'}
                      </span>
                    </div>

                    {/* Equity & Balance */}
                    <div className="text-center py-3">
                      {/* Cent Account Badge */}
                      {account.isCentAccount && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}>
                          ¢ Cent Account
                        </div>
                      )}
                      <p className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {account.isCentAccount ? '¢' : '$'}{(account.isCentAccount ? account.displayEquity : (account.equity || account.balance))?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                        {account.isCentAccount ? 'Equity (Cents)' : 'Equity'}
                      </p>
                      
                      {/* Balance breakdown */}
                      <div className="flex justify-center gap-4 text-xs">
                        <div>
                          <p style={{ color: 'var(--text-muted)' }}>Balance</p>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {account.isCentAccount ? '¢' : '$'}{(account.isCentAccount ? account.displayBalance : (account.walletBalance || account.balance))?.toFixed(2)}
                          </p>
                        </div>
                        {(account.creditBalance || 0) > 0 && (
                          <div>
                            <p style={{ color: 'var(--text-muted)' }}>Credit</p>
                            <p className="font-semibold" style={{ color: '#f59e0b' }}>
                              {account.isCentAccount ? '¢' : '$'}{(account.isCentAccount ? account.displayCreditBalance : account.creditBalance)?.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {account.floatingPnL !== undefined && account.floatingPnL !== 0 && (
                          <div>
                            <p style={{ color: 'var(--text-muted)' }}>Floating P/L</p>
                            <p className="font-semibold" style={{ color: account.floatingPnL >= 0 ? '#22c55e' : '#d4af37' }}>
                              {account.floatingPnL >= 0 ? '+' : ''}{account.isCentAccount ? '¢' : '$'}{(account.isCentAccount ? account.displayFloatingPnL : account.floatingPnL)?.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Margin info */}
                      {account.marginLevel && (
                        <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          Margin Level: <span className={account.marginLevel < 100 ? 'text-red-500' : 'text-green-500'}>{account.marginLevel.toFixed(0)}%</span>
                          {account.freeMargin !== undefined && ` • Free: $${account.freeMargin.toFixed(2)}`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                      onClick={() => {
                        localStorage.setItem('activeTradingAccount', JSON.stringify(account))
                        navigate('/trade')
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
                    >
                      <TrendingUp size={16} />
                      Trade
                    </button>
                    {!account.isDemo && (
                      <>
                        <button
                          onClick={() => {
                            setTransferForm({
                              fromType: 'wallet',
                              fromAccountId: '',
                              toType: 'trading_account',
                              toAccountId: account._id,
                              amount: ''
                            })
                            setShowTransferModal(true)
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-l"
                          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                        >
                          <Plus size={14} />
                          Deposit
                        </button>
                        <button
                          onClick={() => {
                            setTransferForm({
                              fromType: 'trading_account',
                              fromAccountId: account._id,
                              toType: 'wallet',
                              toAccountId: '',
                              amount: ''
                            })
                            setShowTransferModal(true)
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-l"
                          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                        >
                          <Minus size={14} />
                          Withdraw
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Open Account Modal */}
      {showNewAccountModal && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {/* Header */}
          <div 
            className="flex-shrink-0 px-6 py-4 border-b flex items-center gap-4"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
          >
            <button
              onClick={() => { 
                setShowNewAccountModal(false)
                setSelectedAccountType(null) 
              }}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Open account
            </h1>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
                Available accounts
              </h2>

              {/* Account Type Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Live Account Types */}
                {liveAccountTypes.map((type) => {
                  const IconComponent = getIconComponent(type.color)
                  const isSelected = selectedAccountType?._id === type._id
                  return (
                    <button
                      key={type._id}
                      onClick={() => {
                        setSelectedAccountType(type)
                        setNewAccountForm({ ...newAccountForm, leverage: type.maxLeverage })
                      }}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/5' 
                          : 'hover:border-gray-400'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        borderColor: isSelected ? '#3b82f6' : 'var(--border-color)' 
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${type.color}15` }}
                        >
                          <IconComponent size={24} style={{ color: type.color }} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                            {type.name.toUpperCase()}
                          </span>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                          }`}>
                            {isSelected && <Check size={10} className="text-white" />}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                        {type.description || 'Professional trading account with competitive spreads.'}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Min deposit</p>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>${type.minDeposit} USD</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Min spread</p>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{type.spreadMarkup} pips</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Max leverage</p>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>1:{type.maxLeverage}</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Commission</p>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {type.commission > 0 ? `$${type.commission}/lot` : 'NO COMM'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Continue Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleCreateAccount}
                  disabled={!selectedAccountType || creating}
                  className="px-12 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw size={18} className="animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-md rounded-2xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div 
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {transferForm.fromType === 'wallet' ? 'Deposit to Account' : 'Withdraw to Wallet'}
              </h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* From */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  From
                </label>
                <select
                  value={transferForm.fromType === 'wallet' ? 'wallet' : transferForm.fromAccountId}
                  onChange={(e) => {
                    if (e.target.value === 'wallet') {
                      setTransferForm({ ...transferForm, fromType: 'wallet', fromAccountId: '' })
                    } else {
                      setTransferForm({ ...transferForm, fromType: 'trading_account', fromAccountId: e.target.value })
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="wallet">Wallet (${user?.balance?.toFixed(2)})</option>
                  {accounts.filter(a => a.status === 'active' && !a.isDemo).map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountNumber} (${acc.balance?.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* To */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  To
                </label>
                <select
                  value={transferForm.toType === 'wallet' ? 'wallet' : transferForm.toAccountId}
                  onChange={(e) => {
                    if (e.target.value === 'wallet') {
                      setTransferForm({ ...transferForm, toType: 'wallet', toAccountId: '' })
                    } else {
                      setTransferForm({ ...transferForm, toType: 'trading_account', toAccountId: e.target.value })
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="wallet">Wallet</option>
                  {accounts.filter(a => a.status === 'active' && !a.isDemo).map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountNumber} (${acc.balance?.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Amount (USD)
                </label>
                <input
                  type="number"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:border-blue-500"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Transfer Button */}
              <button
                onClick={handleTransfer}
                disabled={transferring || !transferForm.amount}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {transferring ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <ArrowRightLeft size={18} />
                )}
                {transferring ? 'Processing...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TradingAccounts
