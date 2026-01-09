import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Loader2, TrendingUp, Shield, Zap, ArrowRight } from 'lucide-react'
import axios from '../../config/axios'

const Login = ({ onLogin }) => {
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
      const res = await axios.post('/api/auth/login', formData)
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.data.user))
        if (onLogin) onLogin(res.data.data.user)
        navigate('/home')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#000000' }}>
      {/* Left Side - Modern Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)' }}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)' }}></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl" style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}></div>
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-8 xl:p-12">
          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/logo.png" alt="Concorddex" className="h-10" />
            </div>
            <a href="/" className="flex items-center gap-2 px-4 py-2 rounded-full border text-gray-400 hover:bg-white/5 transition-all text-sm" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}>
              <ArrowRight size={16} className="rotate-180" />
              Back to Home
            </a>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Big Logo */}
            <div className="w-full max-w-md flex items-center justify-center">
              <img src="/assets/logo.png" alt="Concorddex" className="w-64 h-64 object-contain" />
            </div>

            {/* Tagline */}
            <div className="text-center mt-10">
              <h2 className="text-3xl xl:text-4xl font-bold text-white mb-3">
                Welcome Back,<br />
                <span style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Trader</span>
              </h2>
              <p className="text-gray-400 max-w-sm">Access your portfolio and continue your trading journey</p>
            </div>

            {/* Features */}
            <div className="flex items-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-gray-400">
                <Shield size={16} style={{ color: '#d4af37' }} />
                <span className="text-sm">Secure</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Zap size={16} style={{ color: '#d4af37' }} />
                <span className="text-sm">Fast</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingUp size={16} style={{ color: '#d4af37' }} />
                <span className="text-sm">Reliable</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-8 lg:px-16 xl:px-24 py-8" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-md w-full mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/assets/logo.png" alt="Concorddex" className="h-10" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Sign In</h1>
            <p className="text-gray-400">
              New to Concorddex?{' '}
              <Link to="/signup" className="font-medium transition-colors" style={{ color: '#d4af37' }}>
                Create an account
              </Link>
            </p>
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
              <label className="block text-gray-400 text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:bg-gray-900 transition-all text-sm"
                  style={{ '--tw-ring-color': '#d4af37' }}
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-900" style={{ accentColor: '#d4af37' }} />
                <span className="text-gray-400 text-sm">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-medium transition-colors" style={{ color: '#d4af37' }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)', boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-gray-500 text-sm">or continue with</span>
            <div className="flex-1 h-px bg-gray-800"></div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-900/50 border border-gray-800 text-white hover:bg-gray-800 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-medium">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-900/50 border border-gray-800 text-white hover:bg-gray-800 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span className="text-sm font-medium">Apple</span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-500 text-xs mt-8">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
