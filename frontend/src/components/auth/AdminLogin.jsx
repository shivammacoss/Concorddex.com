import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Loader2, Shield, Settings, Users, BarChart3, ArrowRight } from 'lucide-react'
import axios from 'axios'

const AdminLogin = ({ onAdminLogin }) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await axios.post('/api/admin/auth/login', formData)
      if (res.data.success) {
        localStorage.setItem('adminToken', res.data.data.token)
        localStorage.setItem('admin', JSON.stringify(res.data.data.admin))
        if (onAdminLogin) onAdminLogin(res.data.data.admin)
        navigate('/admin')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#000000' }}>
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)' }}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)' }}></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl" style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}></div>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-8 xl:p-12">
          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/logo.jpeg" alt="Concorddex" className="h-10" />
            </div>
            <Link to="/" className="flex items-center gap-2 px-4 py-2 rounded-full border text-gray-400 hover:bg-white/5 transition-all text-sm" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}>
              <ArrowRight size={16} className="rotate-180" />
              Back to Home
            </Link>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Admin Panel Card */}
            <div className="w-full max-w-md">
              <div className="relative rounded-2xl p-8 backdrop-blur-xl" style={{ backgroundColor: 'rgba(20, 20, 20, 0.9)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)', boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3)' }}>
                    <Shield size={40} className="text-black" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Admin Control Center</h3>
                  <p className="text-gray-400 text-sm">Secure access to platform management</p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }}>
                      <Users size={20} style={{ color: '#d4af37' }} />
                    </div>
                    <span className="text-xs text-gray-400">User Management</span>
                  </div>
                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }}>
                      <BarChart3 size={20} style={{ color: '#d4af37' }} />
                    </div>
                    <span className="text-xs text-gray-400">Analytics</span>
                  </div>
                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }}>
                      <Settings size={20} style={{ color: '#d4af37' }} />
                    </div>
                    <span className="text-xs text-gray-400">Settings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 mt-8 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <Shield size={14} style={{ color: '#d4af37' }} />
              <span className="text-gray-400 text-xs">256-bit SSL Encrypted Connection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-8 lg:px-16 xl:px-24 py-8" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-md w-full mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src="/assets/logo.jpeg" alt="Concorddex" className="h-12" />
          </div>

          {/* Heading */}
          <div className="text-center lg:text-left mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <Shield size={14} style={{ color: '#d4af37' }} />
              <span className="text-xs font-medium" style={{ color: '#d4af37' }}>Admin Portal</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to access the admin dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 text-lg">!</span>
              </div>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="email"
                  placeholder="admin@concorddex.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:bg-gray-900 transition-all text-sm"
                  onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                  onBlur={(e) => e.target.style.borderColor = ''}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-4 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:bg-gray-900 transition-all text-sm"
                  onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                  onBlur={(e) => e.target.style.borderColor = ''}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)', boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Access Admin Panel
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-center text-gray-500 text-xs">
              This is a restricted area. Unauthorized access attempts will be logged and reported.
            </p>
          </div>

          {/* Back to User Login */}
          <div className="text-center mt-6">
            <Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">
              ← Back to User Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
