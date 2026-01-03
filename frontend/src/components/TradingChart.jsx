import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, CandlestickSeries, CrosshairMode } from 'lightweight-charts'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../context/SocketContext'
import socketService from '../services/socket'

// Timeframe definitions (in seconds)
const TIMEFRAMES = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '1H', seconds: 3600 },
  { label: '2H', seconds: 7200 },
  { label: '3H', seconds: 10800 },
  { label: '4H', seconds: 14400 },
  { label: '1D', seconds: 86400 },
  { label: '1W', seconds: 604800 },
  { label: '1M', seconds: 2592000 },
]

// Helper to get/set chart history from localStorage
const CHART_HISTORY_KEY = 'chartHistory'
const MAX_CANDLES = 500 // Keep last 500 candles

const getStoredCandles = (sym, tf) => {
  try {
    const stored = localStorage.getItem(`${CHART_HISTORY_KEY}_${sym}_${tf}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {}
  return []
}

const saveCandles = (sym, tf, candles) => {
  try {
    // Keep only last MAX_CANDLES
    const toSave = candles.slice(-MAX_CANDLES)
    localStorage.setItem(`${CHART_HISTORY_KEY}_${sym}_${tf}`, JSON.stringify(toSave))
  } catch (e) {}
}

const getStoredTimeframe = () => {
  try {
    const stored = localStorage.getItem('chartTimeframe')
    if (stored) return parseInt(stored, 10)
  } catch (e) {}
  return 60 // Default 1 minute
}

const saveTimeframe = (tf) => {
  try {
    localStorage.setItem('chartTimeframe', tf.toString())
  } catch (e) {}
}

const TradingChart = ({ symbol }) => {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const currentCandleRef = useRef(null)
  const candlesRef = useRef([]) // Store all candles for persistence
  const resizeObserverRef = useRef(null)
  const [timeframe, setTimeframe] = useState(getStoredTimeframe)
  const timeframeRef = useRef(timeframe)
  const { isDark } = useTheme()
  const { isConnected, subscribe } = useSocket()

  // Keep timeframeRef in sync
  useEffect(() => {
    timeframeRef.current = timeframe
  }, [timeframe])

  const chartOptions = useMemo(() => {
    const bg = isDark ? '#000000' : '#ffffff'
    const text = isDark ? '#9ca3af' : '#495057'
    const grid = isDark ? '#1a1a1a' : '#e9ecef'
    return {
      layout: { background: { color: bg }, textColor: text },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid }
      },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal }
    }
  }, [isDark])

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      ...chartOptions,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444'
    })

    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      })
      chartRef.current.timeScale().fitContent()
    })
    ro.observe(containerRef.current)
    resizeObserverRef.current = ro

    return () => {
      currentCandleRef.current = null
      try {
        resizeObserverRef.current?.disconnect()
      } catch (e) {}
      resizeObserverRef.current = null
      try {
        chart.remove()
      } catch (e) {}
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions(chartOptions)
    }
  }, [chartOptions])

  useEffect(() => {
    // Map timeframe seconds to API interval string
    const getIntervalString = (tfSec) => {
      const map = {
        60: '1min', 300: '5min', 900: '15min', 1800: '30min',
        3600: '1hour', 7200: '2hour', 10800: '3hour', 14400: '4hour',
        86400: '1day', 604800: '1week', 2592000: '1month'
      }
      return map[tfSec] || '1min'
    }

    // Fetch historical kline data from backend
    const fetchKlineData = async () => {
      try {
        const interval = getIntervalString(timeframe)
        const res = await fetch(`/api/market/kline?symbol=${symbol}&interval=${interval}&limit=500`)
        const json = await res.json()
        
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          candlesRef.current = json.data
          currentCandleRef.current = json.data[json.data.length - 1]
          
          if (seriesRef.current) {
            seriesRef.current.setData(json.data)
            chartRef.current?.timeScale().scrollToRealTime()
          }
          // Save to localStorage
          saveCandles(symbol, timeframe, json.data)
          return
        }
      } catch (err) {
        console.log('[Chart] Kline fetch error:', err.message)
      }

      // Fallback: Load stored candles from localStorage
      const storedCandles = getStoredCandles(symbol, timeframe)
      candlesRef.current = storedCandles
      currentCandleRef.current = storedCandles.length > 0 ? storedCandles[storedCandles.length - 1] : null
      
      if (seriesRef.current) {
        if (storedCandles.length > 0) {
          seriesRef.current.setData(storedCandles)
          chartRef.current?.timeScale().scrollToRealTime()
        } else {
          seriesRef.current.setData([])
        }
      }
    }

    fetchKlineData()
  }, [symbol, timeframe])

  // Handle timeframe change
  const handleTimeframeChange = (newTf) => {
    setTimeframe(newTf)
    saveTimeframe(newTf)
  }

  useEffect(() => {
    if (isConnected && symbol) {
      subscribe([symbol])
    }
  }, [isConnected, symbol, subscribe])

  useEffect(() => {
    const unsub = socketService.on('tick', (data) => {
      const tfSec = timeframeRef.current
      if (!seriesRef.current) return
      if (!data || data.symbol !== symbol) return

      const bid = Number(data.bid)
      const ask = Number(data.ask)
      if (!Number.isFinite(bid) || !Number.isFinite(ask)) return

      const price = (bid + ask) / 2
      const tsMs = Number(data.timestamp) || Date.now()
      const tsSec = Math.floor(tsMs / 1000)
      const bucket = Math.floor(tsSec / tfSec) * tfSec

      const cur = currentCandleRef.current
      if (!cur || bucket > cur.time) {
        const next = {
          time: bucket,
          open: price,
          high: price,
          low: price,
          close: price
        }
        currentCandleRef.current = next
        // Add new candle to history
        candlesRef.current = [...candlesRef.current.filter(c => c.time !== bucket), next]
        seriesRef.current.update(next)
        // Save to localStorage periodically (every new candle)
        saveCandles(symbol, tfSec, candlesRef.current)
        return
      }

      const updated = {
        ...cur,
        high: Math.max(cur.high, price),
        low: Math.min(cur.low, price),
        close: price
      }
      currentCandleRef.current = updated
      // Update candle in history
      candlesRef.current = candlesRef.current.map(c => c.time === updated.time ? updated : c)
      seriesRef.current.update(updated)
      // Save to localStorage (throttled - only on close update every 5 seconds)
      if (Date.now() % 5000 < 500) {
        saveCandles(symbol, tfSec, candlesRef.current)
      }
    })

    return () => {
      try {
        unsub()
      } catch (e) {}
    }
  }, [symbol])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Timeframe buttons */}
      <div 
        className="flex items-center gap-1 px-2 py-1 overflow-x-auto"
        style={{ 
          backgroundColor: isDark ? '#111' : '#f8f9fa',
          borderBottom: `1px solid ${isDark ? '#222' : '#dee2e6'}`
        }}
      >
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.seconds}
            onClick={() => handleTimeframeChange(tf.seconds)}
            className="px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap"
            style={{
              backgroundColor: timeframe === tf.seconds 
                ? (isDark ? '#3b82f6' : '#2563eb') 
                : (isDark ? '#1a1a1a' : '#e9ecef'),
              color: timeframe === tf.seconds 
                ? '#fff' 
                : (isDark ? '#9ca3af' : '#495057'),
              border: `1px solid ${timeframe === tf.seconds ? 'transparent' : (isDark ? '#333' : '#ced4da')}`
            }}
          >
            {tf.label}
          </button>
        ))}
      </div>
      {/* Chart container */}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  )
}

export default TradingChart
