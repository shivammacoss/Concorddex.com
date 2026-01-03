import React, { useState, useEffect } from 'react'
import {
  Settings,
  Save,
  Loader2,
  Layers,
  DollarSign,
  Percent,
  TrendingUp,
  CreditCard,
  RefreshCw,
  CheckCircle
} from 'lucide-react'
import axios from 'axios'

const TradingSettings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    minLotSize: 0.01,
    maxLotSize: 100,
    lotSizeStep: 0.01,
    defaultLeverage: 100,
    maxLeverage: 500,
    bankDepositCharge: 0,
    bankWithdrawCharge: 0,
    upiDepositCharge: 0,
    upiWithdrawCharge: 0,
    defaultSpread: 2,
    spreadMultiplier: 1
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/settings/trading', getAuthHeader())
      if (res.data.success) {
        setSettings(prev => ({ ...prev, ...res.data.data }))
      }
    } catch (err) {
      console.error('Failed to fetch trading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await axios.put('/api/admin/settings/trading', settings, getAuthHeader())
      if (res.data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
            <Settings size={24} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Trading Settings</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Configure lot sizes, charges, and spreads</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            className="p-2 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white disabled:opacity-50"
            style={{ background: saved ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lot Size Settings */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <Layers size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Lot Size Settings</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Configure trading lot parameters</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Minimum Lot Size</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={settings.minLotSize}
                onChange={(e) => handleChange('minLotSize', e.target.value)}
                className="w-full px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Smallest lot size users can trade</p>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Maximum Lot Size</label>
              <input
                type="number"
                step="1"
                min="1"
                value={settings.maxLotSize}
                onChange={(e) => handleChange('maxLotSize', e.target.value)}
                className="w-full px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Maximum lot size per trade</p>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Lot Size Step</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={settings.lotSizeStep}
                onChange={(e) => handleChange('lotSizeStep', e.target.value)}
                className="w-full px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Increment step for lot size</p>
            </div>
          </div>
        </div>

        {/* Leverage Settings */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
              <TrendingUp size={20} style={{ color: '#fbbf24' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Leverage Settings</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Configure leverage limits</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Default Leverage</label>
              <input
                type="number"
                step="1"
                min="1"
                value={settings.defaultLeverage}
                onChange={(e) => handleChange('defaultLeverage', e.target.value)}
                className="w-full px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Default leverage for new accounts</p>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Maximum Leverage</label>
              <input
                type="number"
                step="1"
                min="1"
                value={settings.maxLeverage}
                onChange={(e) => handleChange('maxLeverage', e.target.value)}
                className="w-full px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Maximum allowed leverage</p>
            </div>
          </div>
        </div>

        {/* Bank Charges */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <CreditCard size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Bank Charges (%)</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Configure deposit/withdrawal fees</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Bank Deposit (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.bankDepositCharge}
                  onChange={(e) => handleChange('bankDepositCharge', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Bank Withdraw (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.bankWithdrawCharge}
                  onChange={(e) => handleChange('bankWithdrawCharge', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>UPI Deposit (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.upiDepositCharge}
                  onChange={(e) => handleChange('upiDepositCharge', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>UPI Withdraw (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.upiWithdrawCharge}
                  onChange={(e) => handleChange('upiWithdrawCharge', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Spread Settings */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <Percent size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Spread Settings</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Configure default spread values</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Default Spread (pips)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={settings.defaultSpread}
                onChange={(e) => handleChange('defaultSpread', e.target.value)}
                className="w-full px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Default spread applied to all instruments</p>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Spread Multiplier</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={settings.spreadMultiplier}
                onChange={(e) => handleChange('spreadMultiplier', e.target.value)}
                className="w-full px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Multiplier applied to base spread (1 = no change)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#3b82f6' }}>Note:</strong> Changes to these settings will apply to all new trades. 
          Existing open positions will not be affected. Bank charges are calculated as a percentage of the transaction amount.
        </p>
      </div>
    </div>
  )
}

export default TradingSettings
