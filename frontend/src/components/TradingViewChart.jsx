import React, { useEffect, useRef, memo } from 'react'
import { useTheme } from '../context/ThemeContext'

// Symbol mapping for TradingView
const getTradingViewSymbol = (symbol) => {
  // Forex pairs
  if (['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 
       'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD', 'EURCHF', 'GBPCHF',
       'CADJPY', 'GBPAUD', 'GBPCAD', 'AUDCAD', 'AUDNZD', 'NZDJPY', 'CADCHF',
       'CHFJPY', 'EURCAD', 'EURNZD', 'GBPNZD', 'AUDCHF', 'NZDCAD'].includes(symbol)) {
    return `FX:${symbol}`
  }
  
  // Crypto
  if (symbol.endsWith('USDT') || symbol.endsWith('USD')) {
    if (symbol === 'BTCUSDT') return 'BINANCE:BTCUSDT'
    if (symbol === 'ETHUSDT') return 'BINANCE:ETHUSDT'
    if (symbol === 'DOGEUSDT') return 'BINANCE:DOGEUSDT'
    if (symbol === 'SOLUSDT') return 'BINANCE:SOLUSDT'
    if (symbol === 'XRPUSDT') return 'BINANCE:XRPUSDT'
    if (symbol === 'ADAUSDT') return 'BINANCE:ADAUSDT'
    if (symbol === 'DOTUSDT') return 'BINANCE:DOTUSDT'
    if (symbol === 'LTCUSDT') return 'BINANCE:LTCUSDT'
    if (symbol === 'BNBUSDT') return 'BINANCE:BNBUSDT'
    if (symbol === 'AVAXUSDT') return 'BINANCE:AVAXUSDT'
    if (symbol === 'LINKUSDT') return 'BINANCE:LINKUSDT'
    if (symbol === 'UNIUSDT') return 'BINANCE:UNIUSDT'
    if (symbol === 'ATOMUSDT') return 'BINANCE:ATOMUSDT'
    if (symbol === 'XLMUSDT') return 'BINANCE:XLMUSDT'
    if (symbol === 'FILUSDT') return 'BINANCE:FILUSDT'
    if (symbol === 'TRXUSDT') return 'BINANCE:TRXUSDT'
    if (symbol === 'NEARUSDT') return 'BINANCE:NEARUSDT'
    if (symbol === 'SHIBUSDT') return 'BINANCE:SHIBUSDT'
    if (symbol === 'MANAUSDT') return 'BINANCE:MANAUSDT'
    if (symbol === 'SANDUSDT') return 'BINANCE:SANDUSDT'
    if (symbol.endsWith('USDT')) return `BINANCE:${symbol}`
  }
  
  // Metals
  if (symbol === 'XAUUSD') return 'OANDA:XAUUSD'
  if (symbol === 'XAGUSD') return 'OANDA:XAGUSD'
  if (symbol === 'XPTUSD') return 'OANDA:XPTUSD'
  if (symbol === 'XPDUSD') return 'OANDA:XPDUSD'
  if (symbol === 'COPPER') return 'COMEX:HG1!'
  if (symbol === 'ALUMINUM') return 'LME:ALI1!'
  if (symbol === 'NICKEL') return 'LME:NI1!'
  if (symbol === 'ZINC') return 'LME:ZS1!'
  if (symbol === 'LEAD') return 'LME:PB1!'
  
  // Indices
  if (symbol === 'US30') return 'DJ:DJI'
  if (symbol === 'US500') return 'SP:SPX'
  if (symbol === 'NAS100') return 'NASDAQ:NDX'
  if (symbol === 'UK100') return 'SPREADEX:FTSE'
  if (symbol === 'GER30') return 'XETR:DAX'
  if (symbol === 'JPN225') return 'TVC:NI225'
  if (symbol === 'AUS200') return 'PEPPERSTONE:AUS200'
  if (symbol === 'FRA40') return 'EURONEXT:PX1'
  if (symbol === 'HK50') return 'HSI:HSI'
  
  // Commodities
  if (symbol === 'USOIL') return 'TVC:USOIL'
  if (symbol === 'UKOIL') return 'TVC:UKOIL'
  if (symbol === 'NGAS') return 'NYMEX:NG1!'
  
  // US Stocks
  const stockSymbols = ['AAPL', 'MSFT', 'GOOG', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 
    'LLY', 'UNH', 'XOM', 'TSM', 'V', 'WMT', 'JPM', 'JNJ', 'NVO', 'MA', 'PG', 'AVGO',
    'CVX', 'HD', 'ORCL', 'MRK', 'ABBV', 'TM', 'KO', 'COST', 'PEP', 'ADBE', 'ASML',
    'BABA', 'BAC', 'SHEL', 'CSCO', 'AZN', 'NVS', 'CRM', 'ACN', 'MCD', 'TMO', 'CMCSA',
    'PFE', 'DHR', 'LIN', 'ABT', 'NFLX', 'TMUS', 'SAP', 'TTE', 'HSBC', 'AMD', 'WFC',
    'DIS', 'PM', 'TXN', 'BHP', 'AMGN', 'INTC', 'COP', 'INTU', 'VZ', 'CAT', 'NKE',
    'MS', 'NEE', 'SNY', 'IBM', 'UPS', 'UNP', 'PDD', 'UL', 'HON', 'RY', 'BMY', 'LOW',
    'GE', 'QCOM', 'BA', 'SPGI', 'AMAT', 'NOW', 'AXP', 'BUD', 'TD', 'BP', 'DE', 'HDB',
    'BKNG', 'SYK', 'T', 'GS', 'SBUX', 'MUFG', 'MDT', 'PLD', 'ELV', 'KOF']
  
  if (stockSymbols.includes(symbol)) {
    return `NASDAQ:${symbol}`
  }
  
  // Default - try as forex
  return `FX:${symbol}`
}

const TradingViewChart = memo(({ symbol = 'XAUUSD', onSymbolChange }) => {
  const containerRef = useRef(null)
  const { isDark } = useTheme()
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // Clear previous widget
    containerRef.current.innerHTML = ''
    
    const tvSymbol = getTradingViewSymbol(symbol)
    
    // Create TradingView widget
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": tvSymbol,
      "interval": "60",
      "timezone": "Asia/Kolkata",
      "theme": isDark ? "dark" : "light",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "calendar": false,
      "support_host": "https://www.tradingview.com",
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": true,
      "hide_volume": false,
      "studies": [],
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650"
    })
    
    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container'
    widgetContainer.style.height = '100%'
    widgetContainer.style.width = '100%'
    
    const widgetInner = document.createElement('div')
    widgetInner.className = 'tradingview-widget-container__widget'
    widgetInner.style.height = '100%'
    widgetInner.style.width = '100%'
    
    widgetContainer.appendChild(widgetInner)
    widgetContainer.appendChild(script)
    
    containerRef.current.appendChild(widgetContainer)
    
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [symbol, isDark])
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '400px',
        backgroundColor: isDark ? '#131722' : '#ffffff'
      }} 
    />
  )
})

TradingViewChart.displayName = 'TradingViewChart'

export default TradingViewChart
