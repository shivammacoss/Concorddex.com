import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Wallet,
  Users2,
  Receipt,
  Copy,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  LogOut,
  Settings,
  Moon,
  Sun,
  Building2,
  Headphones,
  Layers,
  Shield,
  Menu,
  X,
  BookOpen,
  BookMarked,
  Image,
  Bot
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const AdminLayout = ({ children, activeSection, setActiveSection }) => {
  const { isDark, toggleTheme } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Auto-collapse sidebar on mobile
      if (mobile) {
        setSidebarCollapsed(true)
        setMobileMenuOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    handleResize() // Initial check
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('admin')
    navigate('/admin/login')
  }

  const menuItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard, path: '/admin/overview' },
    { id: 'users', label: 'User Management', icon: Users, path: '/admin/users' },
    { id: 'trades', label: 'Trade Management', icon: TrendingUp, path: '/admin/trades' },
    { id: 'algotrading', label: 'Algo Trading', icon: Bot, path: '/admin/algo-trading' },
    { id: 'bookmanagement', label: 'Book Management', icon: BookOpen, path: '/admin/book-management' },
    { id: 'abookorders', label: 'A Book Orders', icon: BookMarked, path: '/admin/a-book-orders' },
    { id: 'funds', label: 'Fund Management', icon: Wallet, path: '/admin/funds' },
    { id: 'bank', label: 'Bank Settings', icon: Building2, path: '/admin/bank' },
    { id: 'tradingsettings', label: 'Trading Settings', icon: Settings, path: '/admin/tradingsettings' },
    { id: 'ib', label: 'IB Management', icon: Users2, path: '/admin/ib' },
    { id: 'charges', label: 'Charges Management', icon: Receipt, path: '/admin/charges' },
    { id: 'copytrade', label: 'Copy Trade Management', icon: Copy, path: '/admin/copytrade' },
    { id: 'accounttypes', label: 'Account Types', icon: Layers, path: '/admin/accounttypes' },
    { id: 'kyc', label: 'KYC Verification', icon: Shield, path: '/admin/kyc' },
    { id: 'support', label: 'Support Tickets', icon: Headphones, path: '/admin/support' },
  ]

  const handleNavigation = (item) => {
    setActiveSection(item.id)
    navigate(item.path)
    // Close mobile menu after navigation
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }

  // Sidebar content (reusable for both desktop and mobile)
  const SidebarContent = ({ isOverlay = false }) => (
    <>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {(!sidebarCollapsed || isOverlay) && (
          <div className="flex items-center gap-2">
            <img src="/assets/logo.png" alt="Concorddex" className="h-8" />
            <span className="font-bold" style={{ color: '#d4af37' }}>Admin</span>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg transition-colors hover:bg-opacity-80"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
        {isOverlay && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg transition-colors hover:bg-opacity-80"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              (sidebarCollapsed && !isOverlay) ? 'justify-center' : ''
            }`}
            style={{
              backgroundColor: activeSection === item.id ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeSection === item.id ? '#d4af37' : 'var(--text-secondary)'
            }}
            title={(sidebarCollapsed && !isOverlay) ? item.label : ''}
          >
            <item.icon size={20} />
            {(!sidebarCollapsed || isOverlay) && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            (sidebarCollapsed && !isOverlay) ? 'justify-center' : ''
          }`}
          style={{ color: 'var(--text-secondary)' }}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          {(!sidebarCollapsed || isOverlay) && <span className="text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            (sidebarCollapsed && !isOverlay) ? 'justify-center' : ''
          }`}
          style={{ color: 'var(--text-secondary)' }}
        >
          <Settings size={20} />
          {(!sidebarCollapsed || isOverlay) && <span className="text-sm">Settings</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:text-red-500 ${
            (sidebarCollapsed && !isOverlay) ? 'justify-center' : ''
          }`}
          style={{ color: 'var(--text-secondary)' }}
        >
          <LogOut size={20} />
          {(!sidebarCollapsed || isOverlay) && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-out Menu */}
          <div 
            className="fixed left-0 top-0 bottom-0 w-72 z-50 flex flex-col"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <SidebarContent isOverlay={true} />
          </div>
        </>
      )}

      {/* Desktop Sidebar - Hidden on mobile */}
      {!isMobile && (
        <div 
          className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex flex-col transition-all duration-300 flex-shrink-0`}
          style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
        >
          <SidebarContent />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header 
          className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-lg flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-base md:text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {/* Search - Hidden on mobile */}
            <div className="relative hidden md:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 rounded-xl text-sm w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Mobile Search Button */}
            {isMobile && (
              <button 
                className="p-2 rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
              >
                <Search size={18} />
              </button>
            )}

            {/* Notifications */}
            <button 
              className="relative p-2 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Admin Profile */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                A
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Admin</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
