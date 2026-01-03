import React, { useState, useEffect } from 'react'
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react'
import axios from 'axios'

/**
 * ImpersonationBanner Component
 * 
 * Displays a warning banner when admin is viewing the app as a user (impersonation mode).
 * Shows admin info and provides a button to exit impersonation and return to admin panel.
 * 
 * SECURITY: This banner is only visible when the session has impersonation flag.
 */
const ImpersonationBanner = () => {
  const [impersonation, setImpersonation] = useState(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Check if we're in impersonation mode
    const checkImpersonation = async () => {
      try {
        // First check localStorage
        const storedImpersonation = localStorage.getItem('impersonation')
        if (storedImpersonation) {
          setImpersonation(JSON.parse(storedImpersonation))
          return
        }
        
        // Also verify with server
        const token = localStorage.getItem('token')
        if (token) {
          const res = await axios.get('/api/admin/auth/check-impersonation', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.data.success && res.data.data.impersonated) {
            setImpersonation({
              active: true,
              adminEmail: res.data.data.adminEmail,
              adminName: res.data.data.adminName
            })
          }
        }
      } catch (err) {
        // Not in impersonation mode or error - that's fine
        console.log('Not in impersonation mode')
      }
    }
    
    checkImpersonation()
  }, [])

  const handleExitImpersonation = async () => {
    if (!confirm('Are you sure you want to exit impersonation and return to admin panel?')) {
      return
    }
    
    setExiting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/admin/auth/exit-impersonation', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Clear user session data
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('impersonation')
      localStorage.removeItem('activeTradingAccount')
      
      // Redirect to admin login
      window.location.href = '/admin/login'
    } catch (err) {
      console.error('Error exiting impersonation:', err)
      // Still clear and redirect even on error
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('impersonation')
      window.location.href = '/admin/login'
    }
  }

  // Don't render if not in impersonation mode
  if (!impersonation?.active) {
    return null
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] px-4 py-2"
      style={{ 
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        boxShadow: '0 2px 10px rgba(168, 85, 247, 0.3)'
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white">
            <Shield size={18} />
            <AlertTriangle size={16} className="text-yellow-300" />
          </div>
          <div className="text-white text-sm">
            <span className="font-semibold">Impersonation Mode</span>
            <span className="mx-2">•</span>
            <span className="opacity-90">
              Viewing as user | Admin: {impersonation.adminEmail || 'Unknown'}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleExitImpersonation}
          disabled={exiting}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          {exiting ? 'Exiting...' : 'Return to Admin Panel'}
        </button>
      </div>
    </div>
  )
}

export default ImpersonationBanner
