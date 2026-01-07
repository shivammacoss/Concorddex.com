import React, { useState, useEffect, useCallback } from 'react'
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Bell,
  Target,
  Shield,
  Zap
} from 'lucide-react'
import { io } from 'socket.io-client'

const TradeNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [showDialog, setShowDialog] = useState(false)
  const [dialogData, setDialogData] = useState(null)

  const getSocketUrl = () => {
    const envUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL
    if (envUrl) return envUrl
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5001'
    return `${window.location.protocol}//${window.location.host}`
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io(getSocketUrl(), {
      auth: { token }
    })

    // Join user room
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user._id) {
      socket.emit('join', `user_${user._id}`)
    }

    // Trade executed
    socket.on('orderExecuted', (data) => {
      addNotification({
        type: 'success',
        icon: <CheckCircle size={20} />,
        title: 'Order Executed',
        message: data.message,
        trade: data.trade
      })
    })

    // Pending order placed
    socket.on('orderPlaced', (data) => {
      addNotification({
        type: 'info',
        icon: <Bell size={20} />,
        title: 'Pending Order Placed',
        message: data.message,
        trade: data.trade
      })
    })

    // Pending order activated
    socket.on('pendingOrderActivated', (data) => {
      addNotification({
        type: 'success',
        icon: <Zap size={20} />,
        title: 'Pending Order Activated',
        message: data.message,
        trade: data.trade
      })
    })

    // Trade closed
    socket.on('tradeClosed', (data) => {
      const isProfit = data.pnl >= 0
      addNotification({
        type: isProfit ? 'success' : 'error',
        icon: isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
        title: `Trade Closed (${data.reason})`,
        message: data.message,
        trade: data.trade,
        pnl: data.pnl
      })

      // Show dialog for SL/TP/StopOut
      if (['stop_loss', 'take_profit', 'stop_out'].includes(data.reason)) {
        setDialogData({
          type: data.reason,
          trade: data.trade,
          pnl: data.pnl,
          message: data.message
        })
        setShowDialog(true)
      }
    })

    // Margin call warning - COMPLETELY DISABLED
    // Ignore all marginCall events - do nothing
    socket.on('marginCall', () => {
      // Intentionally empty - ignore margin calls completely
    })

    // Stop out - all trades closed (auto square off)
    // Only show if there are actually closed trades with losses
    socket.on('stopOut', (data) => {
      // Ignore if no trades were actually closed or PnL is 0
      if (!data.closedTrades || data.closedTrades.length === 0) {
        console.log('[TradeNotifications] Ignoring empty stop-out event')
        return
      }
      
      addNotification({
        type: 'error',
        icon: <Shield size={20} />,
        title: '🛑 Stop Out',
        message: data.message,
        persist: false // Don't persist, auto-dismiss after 5 seconds
      })

      setDialogData({
        type: 'stop_out',
        closedTrades: data.closedTrades,
        totalPnL: data.totalPnL,
        equity: data.equity,
        message: data.message
      })
      setShowDialog(true)
    })

    // Order cancelled
    socket.on('orderCancelled', (data) => {
      addNotification({
        type: 'info',
        icon: <XCircle size={20} />,
        title: 'Order Cancelled',
        message: data.message,
        trade: data.trade
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const addNotification = useCallback((notification) => {
    const id = Date.now()
    const notificationKey = `${notification.title}-${notification.trade?._id || ''}`
    
    // Prevent duplicate notifications (same title + trade within 3 seconds)
    setNotifications(prev => {
      const recentDuplicate = prev.find(n => 
        `${n.title}-${n.trade?._id || ''}` === notificationKey && 
        (id - n.id) < 3000
      )
      if (recentDuplicate) return prev // Skip duplicate
      return [...prev, { ...notification, id }]
    })

    // Auto remove after 4 seconds (faster cleanup)
    if (!notification.persist) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, 4000)
    }
  }, [])

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6', iconColor: '#fff' }
      case 'error':
        return { bg: 'rgba(239, 68, 68, 0.95)', border: '#d4af37', iconColor: '#fff' }
      case 'warning':
        return { bg: 'rgba(251, 191, 36, 0.95)', border: '#fbbf24', iconColor: '#000' }
      case 'info':
      default:
        return { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6', iconColor: '#fff' }
    }
  }

  const getDialogIcon = (type) => {
    switch (type) {
      case 'stop_loss':
        return <Shield size={48} style={{ color: '#d4af37' }} />
      case 'take_profit':
        return <Target size={48} style={{ color: '#3b82f6' }} />
      case 'stop_out':
        return <AlertTriangle size={48} style={{ color: '#d4af37' }} />
      case 'margin_call':
        return <AlertTriangle size={48} style={{ color: '#fbbf24' }} />
      default:
        return <Bell size={48} style={{ color: '#3b82f6' }} />
    }
  }

  return (
    <>
      {/* iOS-style Notifications - Top center banner */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2" style={{ width: 'min(90vw, 380px)' }}>
        {notifications.slice(-3).map((notification) => {
          const styles = getTypeStyles(notification.type)
          return (
            <div
              key={notification.id}
              className="ios-notification rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3"
              style={{ 
                background: 'rgba(30, 30, 30, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {/* App Icon */}
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: styles.border }}
              >
                {React.cloneElement(notification.icon, { size: 20, color: '#fff' })}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white text-sm">{notification.title}</p>
                  <span className="text-xs text-gray-500">now</span>
                </div>
                <p className="text-gray-400 text-xs truncate mt-0.5">
                  {notification.message || (notification.trade?.symbol ? `${notification.trade.symbol}` : '')}
                </p>
                {notification.pnl !== undefined && (
                  <span className={`text-sm font-bold ${notification.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {notification.pnl >= 0 ? '+' : ''}${notification.pnl.toFixed(2)}
                  </span>
                )}
              </div>
              
              <button 
                onClick={() => removeNotification(notification.id)}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <X size={12} color="#999" />
              </button>
            </div>
          )
        })}
      </div>

      {/* iOS-style Dialog Modal */}
      {showDialog && dialogData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ios-modal-backdrop">
          <div 
            className="w-full max-w-sm rounded-3xl overflow-hidden ios-modal"
            style={{ 
              background: 'rgba(30, 30, 30, 0.95)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            {/* Header */}
            <div className="pt-8 pb-4 px-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                style={{ 
                  backgroundColor: dialogData.type === 'take_profit' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                }}
              >
                {getDialogIcon(dialogData.type)}
              </div>
              <h2 className="text-xl font-bold text-white">
                {dialogData.type === 'stop_loss' && 'Stop Loss Triggered'}
                {dialogData.type === 'take_profit' && 'Take Profit Hit'}
                {dialogData.type === 'stop_out' && 'Stop Out'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">Your trade has been closed</p>
            </div>

            {/* Content */}
            <div className="px-6 pb-4">
              {dialogData.trade && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="text-gray-500">Symbol</span>
                    <span className="text-white font-medium">{dialogData.trade.symbol}</span>
                  </div>
                  <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="text-gray-500">Type</span>
                    <span className={dialogData.trade.type === 'buy' ? 'text-blue-400' : 'text-red-400'}>
                      {dialogData.trade.type?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="text-gray-500">Entry</span>
                    <span className="text-white">{dialogData.trade.price?.toFixed?.(5) || dialogData.trade.price}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Exit</span>
                    <span className="text-white">{dialogData.trade.closePrice?.toFixed?.(5) || dialogData.trade.closePrice}</span>
                  </div>
                </div>
              )}

              {dialogData.pnl !== undefined && (
                <div 
                  className="py-4 rounded-2xl text-center mb-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Profit / Loss</p>
                  <p className={`text-3xl font-bold ${dialogData.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {dialogData.pnl >= 0 ? '+' : ''}{dialogData.pnl.toFixed(2)}
                    <span className="text-lg ml-1">USD</span>
                  </p>
                </div>
              )}

              {dialogData.type === 'stop_out' && (
                <div className="py-3 px-4 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <p className="text-gray-400 text-sm text-center">
                    {dialogData.closedTrades?.length || 0} trades closed automatically
                  </p>
                  <p className={`text-center font-bold text-lg mt-1 ${dialogData.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {dialogData.totalPnL >= 0 ? '+' : ''}{dialogData.totalPnL?.toFixed(2)} USD
                  </p>
                </div>
              )}
            </div>

            {/* iOS-style Button */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={() => setShowDialog(false)}
                className="w-full py-4 font-semibold text-blue-400 text-lg active:bg-white/5 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ios-slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes ios-scale-in {
          from {
            transform: scale(1.1);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes ios-backdrop {
          from {
            backdrop-filter: blur(0px);
            background: transparent;
          }
          to {
            backdrop-filter: blur(10px);
            background: rgba(0,0,0,0.5);
          }
        }
        .ios-notification {
          animation: ios-slide-down 0.4s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .ios-modal {
          animation: ios-scale-in 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .ios-modal-backdrop {
          animation: ios-backdrop 0.3s ease-out forwards;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
      `}</style>
    </>
  )
}

export default TradeNotifications
