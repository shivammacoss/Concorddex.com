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
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

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
      name: 'James Rodriguez',
      role: 'Forex Trader',
      country: 'Spain',
      flag: '🇪🇸',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      content: 'I have been trading for 8 years and Concorddex offers the best execution I have ever experienced. The spreads are tight and withdrawals are processed within hours.',
      rating: 5,
      profit: '+$45,230'
    },
    {
      name: 'Aisha Mohammed',
      role: 'Crypto Investor',
      country: 'UAE',
      flag: '🇦🇪',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
      content: 'The seamless integration of crypto and forex trading is exactly what I needed. Customer support is available 24/7 and always helpful.',
      rating: 5,
      profit: '+$28,450'
    },
    {
      name: 'Thomas Mueller',
      role: 'Day Trader',
      country: 'Germany',
      flag: '🇩🇪',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      content: 'Copy trading feature changed my life. I follow top traders and learn their strategies while making consistent profits. Highly recommended!',
      rating: 5,
      profit: '+$67,890'
    },
    {
      name: 'Priya Sharma',
      role: 'Portfolio Manager',
      country: 'India',
      flag: '🇮🇳',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      content: 'Managing multiple client portfolios is so easy with Concorddex. The analytics dashboard gives me all the insights I need.',
      rating: 5,
      profit: '+$156,780'
    },
    {
      name: 'Michael Chen',
      role: 'Swing Trader',
      country: 'Singapore',
      flag: '🇸🇬',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      content: 'The mobile app is fantastic! I can trade on the go and never miss an opportunity. Best trading platform in Asia.',
      rating: 5,
      profit: '+$89,340'
    },
    {
      name: 'Emma Thompson',
      role: 'Commodities Trader',
      country: 'UK',
      flag: '🇬🇧',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      content: 'Trading gold and oil has never been easier. The charting tools are professional-grade and the platform is incredibly stable.',
      rating: 5,
      profit: '+$112,560'
    },
    {
      name: 'Carlos Silva',
      role: 'Scalper',
      country: 'Brazil',
      flag: '🇧🇷',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
      content: 'Ultra-fast execution is crucial for scalping and Concorddex delivers. No slippage, no requotes. Perfect for my trading style.',
      rating: 5,
      profit: '+$34,120'
    },
    {
      name: 'Yuki Tanaka',
      role: 'Algorithmic Trader',
      country: 'Japan',
      flag: '🇯🇵',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
      content: 'The API is well-documented and reliable. I run my trading bots 24/7 without any issues. Great platform for algo trading.',
      rating: 5,
      profit: '+$203,450'
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

  // Auto-slide testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [testimonials.length])

  return (
    <div 
      className="min-h-screen overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minWidth: '320px' }}
    >
      {/* Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4"
        style={{ backgroundColor: 'transparent', borderBottom: 'none' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/logo.png" alt="Concorddex" className="h-20 sm:h-24" />
          </div>
          
          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium transition-colors hover:text-yellow-500" style={{ color: 'var(--text-secondary)' }}>Features</a>
            <a href="#markets" className="text-sm font-medium transition-colors hover:text-yellow-500" style={{ color: 'var(--text-secondary)' }}>Markets</a>
            <a href="#testimonials" className="text-sm font-medium transition-colors hover:text-yellow-500" style={{ color: 'var(--text-secondary)' }}>Testimonials</a>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <a 
              href="/login" 
              className="hidden sm:block px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
              style={{ color: '#d4af37', borderColor: '#d4af37' }}
            >
              Login
            </a>
            <a 
              href="/signup" 
              className="gold-shine-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        >
          <source src="/assets/hero-video.mp4" type="video/mp4" />
        </video>
        
        {/* Dark Overlay */}
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.8) 100%)',
            zIndex: 1 
          }}
        ></div>
        
        {/* Hero Content - Logo Only */}
        <div className="absolute top-24 sm:top-28 md:top-32 left-1/2 transform -translate-x-1/2 z-10 text-center px-4 sm:px-6">
          <img 
            src="/assets/logo.png" 
            alt="Concorddex" 
            className="h-32 sm:h-40 md:h-52 lg:h-64 mx-auto"
          />
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/50 rounded-full animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* CTA & Stats Section - Animated */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #000000 100%)' }}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, #d4af37 0%, transparent 70%)' }}></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, #d4af37 0%, transparent 70%)', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #d4af37 0%, transparent 60%)' }}></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Glowing CTA Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-8 justify-center mb-16">
            <a 
              href="/signup" 
              className="gold-shine-btn group relative inline-flex items-center justify-center gap-3 px-10 sm:px-14 py-5 sm:py-6 rounded-2xl text-xl"
            >
              <span className="relative z-10">Start Trading Now</span>
              <ArrowRight size={24} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="/login" 
              className="group inline-flex items-center justify-center gap-3 px-10 sm:px-14 py-5 sm:py-6 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-110 border-2 backdrop-blur-sm"
              style={{ borderColor: '#d4af37', color: '#d4af37', background: 'rgba(212, 175, 55, 0.05)' }}
            >
              View Demo
              <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          
          {/* Animated Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="group relative p-6 sm:p-8 rounded-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, transparent 100%)' }}></div>
                <div className="relative z-10">
                  <div className="text-3xl sm:text-4xl font-black mb-2 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)' }}>{stat.value}</div>
                  <div className="text-sm sm:text-base font-medium" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Premium Cards */}
      <section id="features" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)' }}>
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(212, 175, 55, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <Zap size={16} style={{ color: '#d4af37' }} />
              <span className="text-sm font-medium gold-shine-text">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">Why Choose <span className="gold-shine-text">Concorddex</span>?</h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Experience the next generation of trading with our powerful features designed for both beginners and professionals.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative p-8 rounded-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-3 cursor-pointer overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.15) 0%, transparent 70%)' }}></div>
                
                {/* Icon with Glow */}
                <div className="relative z-10 mb-6">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
                      boxShadow: '0 0 30px rgba(212, 175, 55, 0.2)'
                    }}
                  >
                    <feature.icon size={28} style={{ color: '#d4af37' }} />
                  </div>
                </div>
                
                <h3 className="relative z-10 text-xl sm:text-2xl font-bold mb-3 group-hover:text-yellow-400 transition-colors">{feature.title}</h3>
                <p className="relative z-10 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
                
                {/* Bottom Accent Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" style={{ background: 'linear-gradient(90deg, #d4af37 0%, #f4d03f 100%)' }}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets Section - Animated Cards */}
      <section id="markets" className="py-20 sm:py-32 px-4 sm:px-6 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)' }}>
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-1 h-1 rounded-full animate-pulse"
              style={{ 
                backgroundColor: '#d4af37',
                opacity: 0.3,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            ></div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <Globe size={16} style={{ color: '#d4af37' }} />
              <span className="text-sm font-medium gold-shine-text">Global Access</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">Trade <span className="gold-shine-text">Global Markets</span></h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Access a wide range of financial instruments from one unified platform.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              { name: 'Forex', pairs: '50+ Pairs', icon: '💱', gradient: 'from-blue-500/20 to-cyan-500/20' },
              { name: 'Crypto', pairs: '30+ Coins', icon: '₿', gradient: 'from-orange-500/20 to-yellow-500/20' },
              { name: 'Commodities', pairs: '15+ Assets', icon: '🥇', gradient: 'from-yellow-500/20 to-amber-500/20' },
              { name: 'Indices', pairs: '10+ Markets', icon: '📈', gradient: 'from-green-500/20 to-emerald-500/20' }
            ].map((market, index) => (
              <div 
                key={index}
                className="group relative p-8 sm:p-10 rounded-3xl text-center transition-all duration-500 hover:scale-110 hover:-translate-y-4 cursor-pointer"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(5, 5, 5, 0.9) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
                }}
              >
                {/* Glow on hover */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: '0 0 80px rgba(212, 175, 55, 0.3)' }}></div>
                
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl mb-4 transform group-hover:scale-125 transition-transform duration-300">{market.icon}</div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 group-hover:text-yellow-400 transition-colors">{market.name}</h3>
                  <p className="text-sm sm:text-base font-medium gold-shine-text">{market.pairs}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Slider with Real Images */}
      <section id="testimonials" className="py-20 sm:py-32 px-4 sm:px-6 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #000000 100%)' }}>
        {/* Background Decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4af37\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <Globe size={16} style={{ color: '#d4af37' }} />
              <span className="text-sm font-medium gold-shine-text">150+ Countries</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">Trusted by <span className="gold-shine-text">Traders Worldwide</span></h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Join our global community of successful traders from every corner of the world.
            </p>
          </div>

          {/* Featured Testimonial - Large Slider */}
          <div className="mb-12">
            <div 
              className="relative max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl overflow-hidden"
              style={{ 
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 20, 0.95) 50%, rgba(212, 175, 55, 0.05) 100%)',
                border: '2px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(212, 175, 55, 0.1)'
              }}
            >
              {/* Quote Background */}
              <div className="absolute top-4 left-8 text-[120px] font-serif opacity-10" style={{ color: '#d4af37' }}>"</div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                {/* User Image */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <img 
                      src={testimonials[currentTestimonial].image}
                      alt={testimonials[currentTestimonial].name}
                      className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 transition-all duration-500"
                      style={{ borderColor: '#d4af37' }}
                    />
                    {/* Country Flag */}
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center text-2xl bg-black border-2" style={{ borderColor: '#d4af37' }}>
                      {testimonials[currentTestimonial].flag}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex gap-1 mb-4 justify-center md:justify-start">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} size={20} style={{ color: '#d4af37', fill: '#d4af37' }} />
                    ))}
                  </div>
                  
                  <p className="text-lg sm:text-xl leading-relaxed mb-6 italic" style={{ color: 'var(--text-primary)' }}>
                    "{testimonials[currentTestimonial].content}"
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                    <div>
                      <div className="font-bold text-xl">{testimonials[currentTestimonial].name}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {testimonials[currentTestimonial].role} • {testimonials[currentTestimonial].country}
                      </div>
                    </div>
                    <div 
                      className="px-4 py-2 rounded-full font-bold text-sm"
                      style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                    >
                      {testimonials[currentTestimonial].profit}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Arrows */}
              <button 
                onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(212, 175, 55, 0.2)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
              >
                <ChevronRight size={20} className="rotate-180" style={{ color: '#d4af37' }} />
              </button>
              <button 
                onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(212, 175, 55, 0.2)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
              >
                <ChevronRight size={20} style={{ color: '#d4af37' }} />
              </button>
            </div>

            {/* Dots Navigation */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className="w-3 h-3 rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: index === currentTestimonial ? '#d4af37' : 'rgba(212, 175, 55, 0.3)',
                    transform: index === currentTestimonial ? 'scale(1.3)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>

          {/* All Testimonials Grid - Smaller Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {testimonials.map((testimonial, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`group relative p-4 rounded-2xl transition-all duration-300 cursor-pointer ${index === currentTestimonial ? 'scale-105 -translate-y-1' : 'hover:scale-105'}`}
                style={{ 
                  background: index === currentTestimonial 
                    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(20, 20, 20, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)',
                  border: `2px solid ${index === currentTestimonial ? '#d4af37' : 'rgba(212, 175, 55, 0.1)'}`,
                  boxShadow: index === currentTestimonial ? '0 10px 40px rgba(212, 175, 55, 0.2)' : 'none'
                }}
              >
                <img 
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-full aspect-square rounded-xl object-cover mb-3"
                />
                <div className="text-2xl mb-1">{testimonial.flag}</div>
                <div className="text-xs font-medium truncate" style={{ color: index === currentTestimonial ? '#d4af37' : 'var(--text-secondary)' }}>
                  {testimonial.name.split(' ')[0]}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {testimonial.country}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Epic Design */}
      <section className="py-24 sm:py-40 px-4 sm:px-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.15) 0%, transparent 50%), linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}></div>
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 60%)' }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <Zap size={16} style={{ color: '#d4af37' }} />
            <span className="text-sm font-medium gold-shine-text">Get Started Today</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6">Ready to <span className="gold-shine-text">Start Trading</span>?</h2>
          <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Join thousands of successful traders on Concorddex. Create your free account in minutes.
          </p>
          
          <a 
            href="/signup" 
            className="gold-shine-btn group inline-flex items-center gap-3 px-12 sm:px-16 py-6 sm:py-7 rounded-2xl text-xl sm:text-2xl"
          >
            Create Free Account
            <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
          </a>
          
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
              </div>
              <span className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>No minimum deposit</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
              </div>
              <span className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Free demo account</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
              </div>
              <span className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Premium Design */}
      <footer className="py-16 sm:py-20 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)', borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <img src="/assets/logo.png" alt="Concorddex" className="h-12" />
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                Your trusted partner for global trading. Trade with confidence on the world's most advanced platform.
              </p>
              <div className="flex gap-4">
                {['Twitter', 'Discord', 'Telegram'].map((social, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <span className="text-xs font-bold" style={{ color: '#d4af37' }}>{social.charAt(0)}</span>
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-base gold-shine-text">Products</h4>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#" className="transition-colors hover:text-yellow-400">Forex Trading</a></li>
                <li><a href="#" className="transition-colors hover:text-yellow-400">Crypto Trading</a></li>
                <li><a href="#" className="transition-colors hover:text-yellow-400">Copy Trading</a></li>
                <li><a href="#" className="transition-colors hover:text-yellow-400">IB Program</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-base gold-shine-text">Company</h4>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#" className="transition-colors hover:text-yellow-400">About Us</a></li>
                <li><a href="#" className="transition-colors hover:text-yellow-400">Careers</a></li>
                <li><a href="#" className="transition-colors hover:text-yellow-400">Press</a></li>
                <li><a href="#" className="transition-colors hover:text-yellow-400">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-base gold-shine-text">Legal</h4>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#" className="transition-colors hover:text-yellow-400">Terms of Service</a></li>
                <li><a href="#" className="transition-colors hover:text-yellow-400">Privacy Policy</a></li>
                <li><a href="#" className="transition-colors hover:text-yellow-400">Risk Disclosure</a></li>
                <li><a href="#" className="transition-colors hover:text-yellow-400">AML Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
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
