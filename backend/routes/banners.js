const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { protectAdmin } = require('./adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/banners');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for banner uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// PUBLIC: Get active banners (for user dashboard)
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    
    const banners = await Banner.find({
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $gte: now } }
      ]
    })
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      data: banners
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN: Get all banners
router.get('/', protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    
    let query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const banners = await Banner.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('createdBy', 'username email');

    const total = await Banner.countDocuments(query);

    res.json({
      success: true,
      data: {
        banners,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN: Create banner
router.post('/', protectAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, linkUrl, isActive, displayOrder, startDate, endDate } = req.body;
    
    let imageUrl = req.body.imageUrl;
    
    // If file uploaded, use that
    if (req.file) {
      imageUrl = `/uploads/banners/${req.file.filename}`;
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image URL or file is required' });
    }

    const banner = await Banner.create({
      title,
      description,
      imageUrl,
      linkUrl,
      isActive: isActive !== 'false',
      displayOrder: parseInt(displayOrder) || 0,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: req.admin._id
    });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN: Update banner
router.put('/:id', protectAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, linkUrl, isActive, displayOrder, startDate, endDate } = req.body;
    
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    // Update fields
    if (title !== undefined) banner.title = title;
    if (description !== undefined) banner.description = description;
    if (linkUrl !== undefined) banner.linkUrl = linkUrl;
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;
    if (displayOrder !== undefined) banner.displayOrder = parseInt(displayOrder);
    if (startDate !== undefined) banner.startDate = startDate || null;
    if (endDate !== undefined) banner.endDate = endDate || null;

    // If new image uploaded
    if (req.file) {
      // Delete old image if it's a local file
      if (banner.imageUrl && banner.imageUrl.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', banner.imageUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      banner.imageUrl = `/uploads/banners/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      banner.imageUrl = req.body.imageUrl;
    }

    await banner.save();

    res.json({
      success: true,
      message: 'Banner updated successfully',
      data: banner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN: Delete banner
router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    // Delete image file if local
    if (banner.imageUrl && banner.imageUrl.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '..', banner.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await banner.deleteOne();

    res.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN: Toggle banner active status
router.patch('/:id/toggle', protectAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    res.json({
      success: true,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
      data: banner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN: Reorder banners
router.post('/reorder', protectAdmin, async (req, res) => {
  try {
    const { bannerIds } = req.body;
    
    if (!Array.isArray(bannerIds)) {
      return res.status(400).json({ success: false, message: 'bannerIds array is required' });
    }

    // Update display order for each banner
    const updates = bannerIds.map((id, index) => 
      Banner.findByIdAndUpdate(id, { displayOrder: index })
    );
    
    await Promise.all(updates);

    res.json({
      success: true,
      message: 'Banners reordered successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
