import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Home, 
  Users, 
  ClipboardList, 
  Headphones,
  Wallet,
  Sun,
  Moon,
  UserPlus,
  UserCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Monitor
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const Sidebar = ({ activeView, setActiveView }) => {
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(true)

  const handleNavigation = (view, path) => {
    setActiveView(view)
    navigate(path)
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', id: 'home', path: '/home', onClick: () => handleNavigation('home', '/home') },
    { icon: Layers, label: 'Accounts', id: 'accounts', path: '/accounts', onClick: () => handleNavigation('accounts', '/accounts') },
    { icon: Monitor, label: 'Terminal', id: 'terminal', path: '/terminal', onClick: () => handleNavigation('terminal', '/terminal') },
    { icon: ClipboardList, label: 'Orders', id: 'orders', path: '/orders', onClick: () => handleNavigation('orders', '/orders') },
    { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet', onClick: () => handleNavigation('wallet', '/wallet') },
    { icon: Trophy, label: 'Leaderboard', id: 'leaderboard', path: '/leaderboard', onClick: () => handleNavigation('leaderboard', '/leaderboard') },
    { icon: Users, label: 'Copy Trading', id: 'copy', path: '/copytrade', onClick: () => handleNavigation('copy', '/copytrade') },
    { icon: UserPlus, label: 'IB Dashboard', id: 'ib', path: '/ib', onClick: () => handleNavigation('ib', '/ib') },
    { icon: UserCircle, label: 'Profile', id: 'profile', path: '/profile', onClick: () => handleNavigation('profile', '/profile') },
    { icon: Headphones, label: 'Support', id: 'support', path: '/support', onClick: () => handleNavigation('support', '/support') },
  ]

  const isActive = (item) => {
    if (item.path && location.pathname === item.path) return true
    if (item.id === 'home') return activeView === 'home' || location.pathname === '/home'
    if (item.id === 'accounts') return activeView === 'accounts' || location.pathname === '/accounts' || location.pathname === '/trade'
    if (item.id === 'terminal') return activeView === 'terminal' || location.pathname === '/terminal'
    if (item.id === 'wallet') return activeView === 'wallet' || location.pathname === '/wallet'
    if (item.id === 'leaderboard') return activeView === 'leaderboard' || location.pathname === '/leaderboard'
    if (item.id === 'copy') return activeView === 'copy' || location.pathname === '/copytrade'
    if (item.id === 'ib') return activeView === 'ib' || location.pathname === '/ib'
    if (item.id === 'orders') return activeView === 'orders' || location.pathname === '/orders'
    if (item.id === 'profile') return activeView === 'profile' || location.pathname === '/profile'
    if (item.id === 'support') return activeView === 'support' || location.pathname === '/support'
    return false
  }

  return (
    <div 
      className={`${isCollapsed ? 'w-16' : 'w-56'} flex flex-col py-4 transition-all duration-300`}
      style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderRight: '1px solid var(--border-color)' 
      }}
    >
      {/* Logo - Toggle Button */}
      <div className={`mb-6 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`${isCollapsed ? 'w-10 h-10' : 'w-full h-10'} rounded-lg flex items-center justify-center gap-2 transition-all hover:opacity-90`}
        >
          <img src="/assets/logo.jpeg" alt="Concorddex" className={`${isCollapsed ? 'h-8' : 'h-8'}`} />
          {!isCollapsed && (
            <ChevronLeft size={16} className="ml-auto" style={{ color: '#d4af37' }} />
          )}
        </button>
      </div>
      
      {/* Menu Items */}
      <div className={`flex-1 flex flex-col gap-1 ${isCollapsed ? 'px-3' : 'px-3'}`}>
        {menuItems.map((item, index) => {
          const active = isActive(item)
          return (
            <button
              key={index}
              onClick={item.onClick}
              className={`${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-10 px-3 justify-start'} rounded-lg flex items-center gap-3 transition-all`}
              style={{
                backgroundColor: active ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                color: active ? '#d4af37' : 'var(--text-secondary)'
              }}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Bottom Items */}
      <div className={`flex flex-col gap-2 ${isCollapsed ? 'px-3' : 'px-3'}`}>
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className={`${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-10 px-3 justify-start'} rounded-lg flex items-center gap-3 transition-all hover:opacity-80`}
          style={{
            backgroundColor: 'var(--bg-hover)',
            color: isDark ? '#fbbf24' : '#3b82f6'
          }}
          title={isCollapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : ''}
        >
          {isDark ? <Sun size={20} className="flex-shrink-0" /> : <Moon size={20} className="flex-shrink-0" />}
          {!isCollapsed && (
            <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default Sidebar
