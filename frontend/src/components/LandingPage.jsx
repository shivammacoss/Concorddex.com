import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Globe, 
  Users, 
  BarChart3, 
  ArrowRight,
  CheckCircle,
  Star,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const LandingPage = () => {
  const { isDark, toggleTheme } = useTheme()
  const [currentStat, setCurrentStat] = useState(0)

  const stats = [
    { value: '$2.5B+', label: 'Trading Volume' },
    { value: '50K+', label: 'Active Traders' },
    { value: '99.9%', label: 'Uptime' },
    { value: '150+', label: 'Countries' }
  ]

  const features = [
    {
      icon: TrendingUp,
      title: 'Advanced Trading',
      description: 'Access professional-grade trading tools with real-time charts, technical indicators, and instant execution.'
    },
    {
      icon: Shield,
      title: 'Secure & Regulated',
      description: 'Your funds are protected with bank-level security, cold storage, and regulatory compliance.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Execute trades in milliseconds with our high-performance trading engine and low latency infrastructure.'
    },
    {
      icon: Globe,
      title: 'Global Markets',
      description: 'Trade Forex, Crypto, Commodities, and Indices from a single unified platform.'
    },
    {
      icon: Users,
      title: 'Copy Trading',
      description: 'Follow and copy successful traders automatically. Learn from the best while you earn.'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Get detailed performance analytics, risk metrics, and AI-powered market insights.'
    }
  ]

  const testimonials = [
    {
      name: 'Michael Chen',
      role: 'Professional Trader',
      content: 'Concorddex has transformed my trading experience. The execution speed and tools are unmatched.',
      rating: 5
    },
    {
      name: 'Sarah Williams',
      role: 'Crypto Investor',
      content: 'Finally a platform that combines traditional forex with crypto seamlessly. Highly recommended!',
      rating: 5
    },
    {
      name: 'David Kumar',
      role: 'Day Trader',
      content: 'The copy trading feature helped me learn from experts while building my portfolio. Amazing platform!',
      rating: 5
    }
  ]

  useEffect(() => {
    // Add landing-page class to body for proper scrolling
    document.body.classList.add('landing-page')
    return () => document.body.classList.remove('landing-page')
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      className="min-h-screen overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minWidth: '320px' }}
    >
      {/* Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4"
        style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/logo.jpeg" alt="Concorddex" className="h-8 sm:h-10" />
          </div>
          
          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium transition-colors hover:text-yellow-500" style={{ color: 'var(--text-secondary)' }}>Features</a>
            <a href="#markets" className="text-sm font-medium transition-colors hover:text-yellow-500" style={{ color: 'var(--text-secondary)' }}>Markets</a>
            <a href="#testimonials" className="text-sm font-medium transition-colors hover:text-yellow-500" style={{ color: 'var(--text-secondary)' }}>Testimonials</a>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              to="/login" 
              className="hidden sm:block px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
              style={{ color: '#d4af37', borderColor: '#d4af37' }}
            >
              Login
            </Link>
            <Link 
              to="/signup" 
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg text-black transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#d4af37' }}></span>
                <span className="text-xs sm:text-sm font-medium" style={{ color: '#d4af37' }}>Live Trading Available 24/7</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
                Trade Smarter,<br />
                <span style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Grow Faster
                </span>
              </h1>
              
              <p className="text-base sm:text-lg mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0" style={{ color: 'var(--text-secondary)' }}>
                Join thousands of traders worldwide on the most advanced trading platform. 
                Access global markets, copy successful traders, and build your wealth with Concorddex.
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-12 justify-center lg:justify-start">
                <Link 
                  to="/signup" 
                  className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl text-black font-semibold transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)', boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3)' }}
                >
                  Start Trading Now
                  <ArrowRight size={18} />
                </Link>
                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-semibold transition-all border"
                  style={{ borderColor: '#d4af37', color: '#d4af37' }}
                >
                  View Demo
                </Link>
              </div>
              
              <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-6 flex-wrap">
                {stats.map((stat, index) => (
                  <div 
                    key={index}
                    className={`transition-opacity duration-500 ${index === currentStat ? 'opacity-100' : 'opacity-30'}`}
                  >
                    <div className="text-xl sm:text-2xl font-bold" style={{ color: '#d4af37' }}>{stat.value}</div>
                    <div className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative mt-8 lg:mt-0">
              <div className="absolute inset-0 rounded-3xl blur-3xl" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, transparent 50%, rgba(212, 175, 55, 0.1) 100%)' }}></div>
              <div 
                className="relative rounded-2xl p-4 sm:p-6 overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                {/* Trading Chart Preview */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-base sm:text-lg font-bold" style={{ color: '#d4af37' }}>XAUUSD</span>
                    <span className="text-xs sm:text-sm font-medium" style={{ color: '#22c55e' }}>+2.34%</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold">$2,645.80</span>
                </div>
                
                <svg viewBox="0 0 400 150" className="w-full h-32 sm:h-40">
                  <defs>
                    <linearGradient id="heroGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#d4af37" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path 
                    d="M 0 120 Q 50 100 100 90 T 200 70 T 300 50 T 400 30 L 400 150 L 0 150 Z" 
                    fill="url(#heroGradient)"
                  />
                  <path 
                    d="M 0 120 Q 50 100 100 90 T 200 70 T 300 50 T 400 30" 
                    fill="none" 
                    stroke="#d4af37" 
                    strokeWidth="3"
                  />
                  <circle cx="400" cy="30" r="6" fill="#d4af37">
                    <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
                  </circle>
                </svg>
                
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
                  <div className="text-center p-2 sm:p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>24h High</div>
                    <div className="text-sm sm:text-base font-semibold">$2,658.40</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>24h Low</div>
                    <div className="text-sm sm:text-base font-semibold">$2,612.20</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Volume</div>
                    <div className="text-sm sm:text-base font-semibold">$1.2B</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-20 px-4 sm:px-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Why Choose <span style={{ color: '#d4af37' }}>Concorddex</span>?</h2>
            <p className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4" style={{ color: 'var(--text-secondary)' }}>
              Experience the next generation of trading with our powerful features designed for both beginners and professionals.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-4 sm:p-6 rounded-2xl transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4"
                  style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)' }}
                >
                  <feature.icon size={20} className="sm:hidden" style={{ color: '#d4af37' }} />
                  <feature.icon size={24} className="hidden sm:block" style={{ color: '#d4af37' }} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets Section */}
      <section id="markets" className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Trade <span style={{ color: '#d4af37' }}>Global Markets</span></h2>
            <p className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4" style={{ color: 'var(--text-secondary)' }}>
              Access a wide range of financial instruments from one unified platform.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { name: 'Forex', pairs: '50+ Pairs', icon: '💱' },
              { name: 'Crypto', pairs: '30+ Coins', icon: '₿' },
              { name: 'Commodities', pairs: '15+ Assets', icon: '🥇' },
              { name: 'Indices', pairs: '10+ Markets', icon: '📈' }
            ].map((market, index) => (
              <div 
                key={index}
                className="p-4 sm:p-6 rounded-2xl text-center transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{market.icon}</div>
                <h3 className="text-base sm:text-xl font-bold mb-1">{market.name}</h3>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>{market.pairs}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-12 sm:py-20 px-4 sm:px-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Trusted by <span style={{ color: '#d4af37' }}>Traders Worldwide</span></h2>
            <p className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4" style={{ color: 'var(--text-secondary)' }}>
              See what our community has to say about their trading experience.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="p-4 sm:p-6 rounded-2xl"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex gap-1 mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={14} className="sm:w-4 sm:h-4" style={{ color: '#d4af37', fill: '#d4af37' }} />
                  ))}
                </div>
                <p className="mb-3 sm:mb-4 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-sm sm:text-base">{testimonial.name}</div>
                  <div className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Ready to <span style={{ color: '#d4af37' }}>Start Trading</span>?</h2>
          <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 px-4" style={{ color: 'var(--text-secondary)' }}>
            Join thousands of successful traders on Concorddex. Create your free account in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-black font-semibold transition-all hover:opacity-90 text-base sm:text-lg"
              style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)', boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3)' }}
            >
              Create Free Account
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-8">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} style={{ color: '#d4af37' }} />
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>No minimum deposit</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} style={{ color: '#d4af37' }} />
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Free demo account</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} style={{ color: '#d4af37' }} />
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-black font-bold text-sm sm:text-base" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)' }}>
                  CDX
                </div>
                <span className="text-lg sm:text-xl font-bold" style={{ color: '#d4af37' }}>Concorddex</span>
              </div>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Your trusted partner for global trading. Trade with confidence.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base" style={{ color: '#d4af37' }}>Products</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#" className="transition-colors" style={{ ':hover': { color: '#d4af37' } }}>Forex Trading</a></li>
                <li><a href="#" className="transition-colors">Crypto Trading</a></li>
                <li><a href="#" className="transition-colors">Copy Trading</a></li>
                <li><a href="#" className="transition-colors">IB Program</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base" style={{ color: '#d4af37' }}>Company</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#" className="transition-colors">About Us</a></li>
                <li><a href="#" className="transition-colors">Careers</a></li>
                <li><a href="#" className="transition-colors">Press</a></li>
                <li><a href="#" className="transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base" style={{ color: '#d4af37' }}>Legal</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#" className="transition-colors">Terms of Service</a></li>
                <li><a href="#" className="transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="transition-colors">Risk Disclosure</a></li>
                <li><a href="#" className="transition-colors">AML Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-center md:text-left" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
              © 2024 Concorddex.com. All rights reserved.
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Trading involves significant risk. Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
