import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Loader2, UserPlus, TrendingUp, Shield, Zap, ArrowRight, CheckCircle, Gift } from 'lucide-react'
import axios from 'axios'

const Signup = ({ onSignup }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const referralCode = searchParams.get('ref') || ''
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!agreeTerms) {
      setError('Please agree to the Terms & Conditions')
      return
    }

    setLoading(true)

    try {
      const res = await axios.post('/api/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        referralCode: referralCode || undefined
      })
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.data.user))
        if (onSignup) onSignup(res.data.data.user)
        navigate('/home')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    'Access to 100+ trading instruments',
    'Real-time market data & charts',
    'Copy trading from top performers',
    'Secure & regulated platform'
  ]

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#000000' }}>
      {/* Left Side - Modern Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)' }}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-72 h-72 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)' }}></div>
          <div className="absolute bottom-40 left-20 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl" style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}></div>
        </div>

        {/* Grid Pattern Overlay */}
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
            {/* Welcome Card */}
            <div className="w-full max-w-md">
              <div className="relative rounded-2xl p-8 backdrop-blur-xl" style={{ backgroundColor: 'rgba(20, 20, 20, 0.9)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)' }}>
                    <TrendingUp size={32} className="text-black" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Start Your Journey</h3>
                  <p className="text-gray-400 text-sm">Join thousands of successful traders</p>
                </div>

                {/* Benefits List */}
                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }}>
                        <CheckCircle size={14} style={{ color: '#d4af37' }} />
                      </div>
                      <span className="text-gray-300 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-6 pt-6" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
                  <div className="text-center">
                    <div className="text-xl font-bold" style={{ color: '#d4af37' }}>50K+</div>
                    <div className="text-xs text-gray-500">Traders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold" style={{ color: '#d4af37' }}>$2.5B+</div>
                    <div className="text-xs text-gray-500">Volume</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold" style={{ color: '#d4af37' }}>150+</div>
                    <div className="text-xs text-gray-500">Countries</div>
                  </div>
                </div>
              </div>
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
                <Gift size={16} style={{ color: '#d4af37' }} />
                <span className="text-sm">Free Demo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-8 lg:px-12 xl:px-20 py-6 overflow-y-auto" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-md w-full mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <img src="/assets/logo.jpeg" alt="Concorddex" className="h-10" />
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium transition-colors" style={{ color: '#d4af37' }}>
                Sign in
              </Link>
            </p>
          </div>

          {/* Referral Badge */}
          {referralCode && (
            <div className="mb-5 p-4 rounded-xl border flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)', borderColor: 'rgba(212, 175, 55, 0.3)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }}>
                <Gift size={20} style={{ color: '#d4af37' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#d4af37' }}>Referral Applied!</p>
                <p className="text-gray-400 text-xs">Code: {referralCode}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 text-lg">!</span>
              </div>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:bg-gray-900 transition-all text-sm"
                    onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Last Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:bg-gray-900 transition-all text-sm"
                    onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:bg-gray-900 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:bg-gray-900 transition-all text-sm"
                  style={{ borderColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}
                  onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                  onBlur={(e) => e.target.style.borderColor = '#d4af37'}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:bg-gray-900 transition-all text-sm"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-700 bg-gray-900"
                style={{ accentColor: '#d4af37' }}
              />
              <span className="text-gray-400 text-sm">
                I agree to the{' '}
                <Link to="/terms" style={{ color: '#d4af37' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" style={{ color: '#d4af37' }}>Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)', boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-gray-500 text-sm">or continue with</span>
            <div className="flex-1 h-px bg-gray-800"></div>
          </div>

          {/* Social Signup */}
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
        </div>
      </div>
    </div>
  )
}

export default Signup
