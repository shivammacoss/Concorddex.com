import React from 'react'

const QuickTrade = ({ symbol, onOpenOrder, showOrderPanel }) => {
  return (
    <div className="absolute top-4 right-4 z-20">
      <button 
        onClick={onOpenOrder}
        className="px-6 py-2 rounded-lg font-semibold transition-colors"
        style={{ 
          background: showOrderPanel ? 'var(--bg-hover)' : 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)',
          color: showOrderPanel ? 'var(--text-primary)' : '#000'
        }}
      >
        Trade
      </button>
    </div>
  )
}

export default QuickTrade
