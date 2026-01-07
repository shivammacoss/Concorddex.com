import React, { useState, useEffect } from 'react'
import { Image, Save, Trash2, Plus, Check, ExternalLink } from 'lucide-react'
import axios from 'axios'

const BannerManagement = () => {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.get('/api/banners', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setBanners(response.data.data.banners || [])
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBanners()
  }, [])

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const addBanner = async () => {
    if (!newImageUrl.trim()) {
      showMessage('Please enter an image URL', 'error')
      return
    }
    setSaving(true)
    try {
      const token = localStorage.getItem('adminToken')
      await axios.post('/api/banners', {
        imageUrl: newImageUrl.trim(),
        linkUrl: newLinkUrl.trim(),
        isActive: true,
        displayOrder: banners.length
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewImageUrl('')
      setNewLinkUrl('')
      fetchBanners()
      showMessage('Banner added successfully!')
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to add banner', 'error')
    }
    setSaving(false)
  }

  const deleteBanner = async (id) => {
    if (!window.confirm('Delete this banner?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.delete(`/api/banners/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchBanners()
      showMessage('Banner deleted')
    } catch (error) {
      showMessage('Failed to delete banner', 'error')
    }
  }

  const toggleBanner = async (id) => {
    try {
      const token = localStorage.getItem('adminToken')
      await axios.patch(`/api/banners/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchBanners()
    } catch (error) {
      showMessage('Failed to toggle banner', 'error')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Banner Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Add banners to display on user dashboard</p>
      </div>

      {message.text && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2"
          style={{ 
            backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
            border: `1px solid ${message.type === 'error' ? '#ef4444' : '#22c55e'}`
          }}>
          <Check size={18} style={{ color: message.type === 'error' ? '#ef4444' : '#22c55e' }} />
          <span style={{ color: message.type === 'error' ? '#ef4444' : '#22c55e' }}>{message.text}</span>
        </div>
      )}

      <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #d4af37' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#d4af37' }}>
          <Plus size={20} className="inline mr-2" />Add New Banner
        </h2>
        <div className="space-y-4">
          {/* Drag & Drop Upload Area */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Upload Image *</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer rounded-xl p-8 text-center transition-all"
              style={{ 
                backgroundColor: isDragging ? 'rgba(212, 175, 55, 0.1)' : 'var(--bg-hover)',
                border: `2px dashed ${isDragging ? '#d4af37' : 'var(--border-color)'}`,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <Upload size={40} className="mx-auto mb-3" style={{ color: isDragging ? '#d4af37' : 'var(--text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {isDragging ? 'Drop image here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Preview</label>
              <div className="relative rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                <img src={previewUrl} alt="Preview" className="w-full max-h-48 object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                >
                  <X size={16} color="#fff" />
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{selectedFile?.name}</p>
            </div>
          )}

          {/* Link URL - Optional */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Link URL (Optional)</label>
            <input type="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://example.com/promo" className="w-full px-4 py-3 rounded-lg text-base"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Where users go when they click the banner</p>
          </div>

          <button onClick={addBanner} disabled={saving || !selectedFile}
            className="w-full py-3 rounded-lg font-medium transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8960c 100%)', color: '#000' }}>
            <Upload size={18} />{saving ? 'Uploading...' : 'Upload Banner'}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Current Banners ({banners.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: '#d4af37' }}></div>
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <Image size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No banners yet. Add your first banner above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((banner, index) => (
              <div key={banner._id} className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', border: `2px solid ${banner.isActive ? '#d4af37' : 'var(--border-color)'}`, opacity: banner.isActive ? 1 : 0.6 }}>
                <div className="aspect-video relative overflow-hidden bg-black">
                  <img src={banner.imageUrl} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: banner.isActive ? '#22c55e' : '#6b7280', color: '#fff' }}>
                    {banner.isActive ? '● LIVE' : '○ Hidden'}
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {banner.linkUrl && (
                      <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <ExternalLink size={16} style={{ color: '#d4af37' }} />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleBanner(banner._id)} className="px-3 py-1.5 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: banner.isActive ? 'rgba(107, 114, 128, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: banner.isActive ? '#6b7280' : '#22c55e' }}>
                      {banner.isActive ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => deleteBanner(banner._id)} className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
                      <Trash2 size={16} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BannerManagement
