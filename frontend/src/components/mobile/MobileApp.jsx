import React, { useState } from 'react'
import { Home, TrendingUp, Wallet, Menu, X, ArrowLeft, Users } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import MobileHome from './MobileHome'
import MobileTrade from './MobileTrade'
import MobileWallet from './MobileWallet'
import MobileMore from './MobileMore'
import MobileIB from './MobileIB'
import MobileCopyTrade from './MobileCopyTrade'
import MobileSupport from './MobileSupport'
import MobileProfile from './MobileProfile'
import MobileAccounts from './MobileAccounts'

const MobileApp = () => {
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('home')
  const [showMore, setShowMore] = useState(false)

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'accounts', label: 'Account', icon: Users },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'more', label: 'More', icon: Menu },
  ]

  const morePages = ['ib', 'copy', 'support', 'profile']

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <MobileHome />
      case 'accounts':
        return <MobileAccounts onOpenTrading={(account) => {
          localStorage.setItem('activeTradingAccount', JSON.stringify(account))
          setActiveTab('trade')
        }} />
      case 'trade':
        return <MobileTrade onBack={() => setActiveTab('accounts')} />
      case 'wallet':
        return <MobileWallet />
      case 'ib':
        return <MobileIB onBack={() => setActiveTab('home')} />
      case 'copy':
        return <MobileCopyTrade onBack={() => setActiveTab('home')} />
      case 'support':
        return <MobileSupport onBack={() => setActiveTab('home')} />
      case 'profile':
        return <MobileProfile onBack={() => setActiveTab('home')} />
      default:
        return <MobileHome />
    }
  }

  const showBottomNav = !['trade', 'ib', 'copy', 'support', 'profile'].includes(activeTab)

  return (
    <div 
      className="fixed inset-0 flex flex-col" 
      style={{ backgroundColor: isDark ? '#000000' : '#f5f5f7' }}
    >
      {/* Main Content */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ paddingBottom: showBottomNav ? '60px' : '0' }}
      >
        {renderContent()}
      </div>

      {/* Bottom Navigation - Hidden when in Trade view or More pages */}
      {showBottomNav && (
        <nav 
          className="fixed bottom-0 left-0 right-0 flex items-center justify-around z-50"
          style={{ 
            backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
            borderTop: `1px solid ${isDark ? '#2c2c2e' : '#e5e5ea'}`,
            paddingTop: '8px',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            minHeight: '60px'
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'more') {
                  setShowMore(true)
                } else {
                  setActiveTab(tab.id)
                }
              }}
              className="flex flex-col items-center flex-1 py-2"
            >
              <tab.icon 
                size={22} 
                color={activeTab === tab.id ? '#3b82f6' : (isDark ? '#8e8e93' : '#6b6b6b')}
              />
              <span 
                className="text-[11px] mt-1 font-medium"
                style={{ color: activeTab === tab.id ? '#3b82f6' : (isDark ? '#8e8e93' : '#6b6b6b') }}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      )}

      {/* More Menu Overlay */}
      {showMore && (
        <MobileMore onClose={() => setShowMore(false)} onNavigate={(view) => {
          setShowMore(false)
          setActiveTab(view)
        }} />
      )}
    </div>
  )
}

export default MobileApp
