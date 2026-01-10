import React, { useState } from 'react'
import AdminLayout from './AdminLayout'
import OverviewDashboard from './OverviewDashboard'
import UserManagement from './UserManagement'
import TradeManagement from './TradeManagement'
import FundManagement from './FundManagement'
import IBManagement from './IBManagement'
import ChargesManagement from './ChargesManagement'
import CopyTradeManagement from './CopyTradeManagement'
import BankSettings from './BankSettings'
import SupportManagement from './SupportManagement'
import AccountTypeManagement from './AccountTypeManagement'
import KycManagement from './KycManagement'
import TradingSettings from './TradingSettings'
import BookManagement from './BookManagement'
import ABookOrders from './ABookOrders'
import AlgoTrading from './AlgoTrading'

const AdminPanel = ({ initialSection = 'overview' }) => {
  const [activeSection, setActiveSection] = useState(initialSection)

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewDashboard />
      case 'users':
        return <UserManagement />
      case 'trades':
        return <TradeManagement />
      case 'funds':
        return <FundManagement />
      case 'ib':
        return <IBManagement />
      case 'charges':
        return <ChargesManagement />
      case 'copytrade':
        return <CopyTradeManagement />
      case 'bank':
        return <BankSettings />
      case 'support':
        return <SupportManagement />
      case 'accounttypes':
        return <AccountTypeManagement />
      case 'kyc':
        return <KycManagement />
      case 'tradingsettings':
        return <TradingSettings />
      case 'bookmanagement':
        return <BookManagement />
      case 'abookorders':
        return <ABookOrders />
      case 'algotrading':
        return <AlgoTrading />
      default:
        return <OverviewDashboard />
    }
  }

  return (
    <AdminLayout 
      activeSection={activeSection} 
      setActiveSection={setActiveSection}
    >
      {renderContent()}
    </AdminLayout>
  )
}

export default AdminPanel
