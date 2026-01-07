import React, { useState, useEffect } from 'react'
import { 
  Settings, Users, DollarSign, TrendingUp, Plus, Edit2, Trash2, 
  Save, X, Award, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react'
import axios from 'axios'

const MasterReferralManagement = () => {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [levels, setLevels] = useState([])
  const [stats, setStats] = useState(null)
  const [referrers, setReferrers] = useState([])
  const [activeTab, setActiveTab] = useState('levels')
  const [editingLevel, setEditingLevel] = useState(null)
  const [newLevel, setNewLevel] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      const headers = { Authorization: `Bearer ${token}` }

      const [settingsRes, statsRes, referrersRes] = await Promise.all([
        axios.get('/api/admin/master-referral/settings', { headers }),
        axios.get('/api/admin/master-referral/stats', { headers }),
        axios.get('/api/admin/master-referral/referrers', { headers })
      ])

      if (settingsRes.data.success) {
        setSettings(settingsRes.data.data)
        setLevels(settingsRes.data.data.levels || [])
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data)
      }
      if (referrersRes.data.success) {
        setReferrers(referrersRes.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('adminToken')
      await axios.put('/api/admin/master-referral/settings', {
        defaultCommissionPercent: settings.defaultCommissionPercent,
        minWithdrawal: settings.minWithdrawal,
        autoUpgradeEnabled: settings.autoUpgradeEnabled,
        isEnabled: settings.isEnabled
      }, { headers: { Authorization: `Bearer ${token}` } })
      alert('Settings saved!')
    } catch (err) {
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleAddLevel = async () => {
    if (!newLevel?.name || !newLevel?.commissionPercent) {
      alert('Please fill all required fields')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('adminToken')
      const res = await axios.post('/api/admin/master-referral/levels', newLevel, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setLevels(res.data.data)
        setNewLevel(null)
        alert('Level added!')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add level')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateLevel = async (levelId) => {
    try {
      setSaving(true)
      const token = localStorage.getItem('adminToken')
      const res = await axios.put(`/api/admin/master-referral/levels/${levelId}`, editingLevel, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setLevels(res.data.data)
        setEditingLevel(null)
        alert('Level updated!')
      }
    } catch (err) {
      alert('Failed to update level')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLevel = async (levelId) => {
    if (!confirm('Are you sure you want to delete this level?')) return

    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.delete(`/api/admin/master-referral/levels/${levelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setLevels(res.data.data)
        alert('Level deleted!')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete level')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-gold)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Master Referral Management
        </h2>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--bg-hover)' }}
        >
          <RefreshCw size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} style={{ color: '#3b82f6' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Referrers</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats.referrers.total}
            </p>
            <p className="text-sm" style={{ color: '#22c55e' }}>{stats.referrers.active} active</p>
          </div>

          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} style={{ color: '#22c55e' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Referrals</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats.referrals.total}
            </p>
            <p className="text-sm" style={{ color: '#22c55e' }}>{stats.referrals.active} active</p>
          </div>

          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} style={{ color: 'var(--accent-gold)' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Commission Paid</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent-gold)' }}>
              ${stats.commissions.totalCommissionPaid?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Award size={18} style={{ color: '#a855f7' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending Balance</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>
              ${stats.wallets.totalBalance?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {['levels', 'settings', 'referrers'].map(tab => (
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

      {/* Levels Tab */}
      {activeTab === 'levels' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Commission Levels</h3>
            <button
              onClick={() => setNewLevel({ name: '', level: levels.length + 1, commissionPercent: 5, minReferrals: 0, color: '#3b82f6' })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-gold)', color: '#000' }}
            >
              <Plus size={16} /> Add Level
            </button>
          </div>

          {/* New Level Form */}
          {newLevel && (
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--accent-gold)' }}
            >
              <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add New Level</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Level #</label>
                  <input
                    type="number"
                    value={newLevel.level}
                    onChange={(e) => setNewLevel({ ...newLevel, level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
                  <input
                    type="text"
                    value={newLevel.name}
                    onChange={(e) => setNewLevel({ ...newLevel, name: e.target.value })}
                    placeholder="e.g., Diamond"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Commission %</label>
                  <input
                    type="number"
                    value={newLevel.commissionPercent}
                    onChange={(e) => setNewLevel({ ...newLevel, commissionPercent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Min Referrals</label>
                  <input
                    type="number"
                    value={newLevel.minReferrals}
                    onChange={(e) => setNewLevel({ ...newLevel, minReferrals: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Color</label>
                  <input
                    type="color"
                    value={newLevel.color}
                    onChange={(e) => setNewLevel({ ...newLevel, color: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddLevel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#22c55e', color: '#fff' }}
                >
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setNewLevel(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* Levels List */}
          <div className="space-y-3">
            {levels.sort((a, b) => a.level - b.level).map((level) => (
              <div 
                key={level._id}
                className="p-4 rounded-xl"
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  border: `1px solid ${level.color}40`,
                  borderLeft: `4px solid ${level.color}`
                }}
              >
                {editingLevel?._id === level._id ? (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
                      <input
                        type="text"
                        value={editingLevel.name}
                        onChange={(e) => setEditingLevel({ ...editingLevel, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Commission %</label>
                      <input
                        type="number"
                        value={editingLevel.commissionPercent}
                        onChange={(e) => setEditingLevel({ ...editingLevel, commissionPercent: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Min Referrals</label>
                      <input
                        type="number"
                        value={editingLevel.minReferrals}
                        onChange={(e) => setEditingLevel({ ...editingLevel, minReferrals: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Color</label>
                      <input
                        type="color"
                        value={editingLevel.color}
                        onChange={(e) => setEditingLevel({ ...editingLevel, color: e.target.value })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateLevel(level._id)}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg"
                        style={{ backgroundColor: '#22c55e', color: '#fff' }}
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => setEditingLevel(null)}
                        className="px-3 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: level.color }}
                      >
                        {level.level}
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: level.color }}>{level.name}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {level.commissionPercent}% commission • {level.minReferrals}+ referrals
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2 py-1 rounded text-xs"
                        style={{ 
                          backgroundColor: level.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: level.isActive ? '#22c55e' : '#ef4444'
                        }}
                      >
                        {level.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => setEditingLevel({ ...level })}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{ backgroundColor: 'var(--bg-hover)' }}
                      >
                        <Edit2 size={14} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                      {level.level !== 1 && (
                        <button
                          onClick={() => handleDeleteLevel(level._id)}
                          className="p-2 rounded-lg hover:opacity-80"
                          style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                        >
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div 
          className="p-6 rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <h3 className="font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>General Settings</h3>
          
          <div className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Enable Master Referral System</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Allow users to earn commission by referring followers to masters</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, isEnabled: !settings.isEnabled })}
                className="relative w-12 h-6 rounded-full transition-all"
                style={{ backgroundColor: settings.isEnabled ? '#22c55e' : 'var(--bg-hover)' }}
              >
                <div 
                  className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: settings.isEnabled ? '26px' : '4px' }}
                />
              </button>
            </div>

            {/* Auto Upgrade */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Auto-Upgrade Levels</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Automatically upgrade referrers when they meet level requirements</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoUpgradeEnabled: !settings.autoUpgradeEnabled })}
                className="relative w-12 h-6 rounded-full transition-all"
                style={{ backgroundColor: settings.autoUpgradeEnabled ? '#22c55e' : 'var(--bg-hover)' }}
              >
                <div 
                  className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: settings.autoUpgradeEnabled ? '26px' : '4px' }}
                />
              </button>
            </div>

            {/* Default Commission */}
            <div>
              <label className="font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                Default Commission Percent
              </label>
              <input
                type="number"
                value={settings.defaultCommissionPercent}
                onChange={(e) => setSettings({ ...settings, defaultCommissionPercent: parseFloat(e.target.value) })}
                className="w-full md:w-48 px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Applied to new referrers at Level 1</p>
            </div>

            {/* Min Withdrawal */}
            <div>
              <label className="font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                Minimum Withdrawal ($)
              </label>
              <input
                type="number"
                value={settings.minWithdrawal}
                onChange={(e) => setSettings({ ...settings, minWithdrawal: parseFloat(e.target.value) })}
                className="w-full md:w-48 px-4 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2 rounded-lg font-medium"
              style={{ backgroundColor: 'var(--accent-gold)', color: '#000' }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Referrers Tab */}
      {activeTab === 'referrers' && (
        <div className="space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>All Referrers</h3>
          
          {referrers.length === 0 ? (
            <div 
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No referrers yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Referrer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Level</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Referrals</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Earned</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Balance</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrers.map((ref) => (
                    <tr 
                      key={ref._id}
                      className="hover:bg-opacity-50"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {ref.userId?.firstName} {ref.userId?.lastName}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{ref.referrerId}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className="px-2 py-1 rounded text-sm font-medium"
                          style={{ backgroundColor: `${ref.levelColor}20`, color: ref.levelColor }}
                        >
                          {ref.levelName}
                        </span>
                      </td>
                      <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                        {ref.stats.activeReferrals}/{ref.stats.totalReferrals}
                      </td>
                      <td className="py-3 px-4" style={{ color: '#22c55e' }}>
                        ${ref.wallet.totalEarned.toFixed(2)}
                      </td>
                      <td className="py-3 px-4" style={{ color: 'var(--accent-gold)' }}>
                        ${ref.wallet.balance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className="px-2 py-1 rounded text-xs"
                          style={{ 
                            backgroundColor: ref.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: ref.status === 'active' ? '#22c55e' : '#ef4444'
                          }}
                        >
                          {ref.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MasterReferralManagement
