const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'concorddex-admin-secret-key-2024';

/**
 * Helper: Get client IP address from request
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
};

// Generate admin token
const generateAdminToken = (id) => {
  return jwt.sign({ id, isAdmin: true }, JWT_SECRET, { expiresIn: '7d' });
};

// Admin auth middleware
const protectAdmin = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(401).json({ success: false, message: 'Not authorized as admin' });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Admin not found or inactive' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// @route   POST /api/admin/auth/login
// @desc    Admin login
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateAdminToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          username: admin.username,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          permissions: admin.permissions
        },
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/auth/me
// @desc    Get current admin
// @access  Private
router.get('/me', protectAdmin, async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.admin._id,
      email: req.admin.email,
      username: req.admin.username,
      firstName: req.admin.firstName,
      lastName: req.admin.lastName,
      role: req.admin.role,
      permissions: req.admin.permissions
    }
  });
});

// @route   POST /api/admin/auth/setup
// @desc    Create initial superadmin (only works if no admins exist)
// @access  Public
router.post('/setup', async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }

    const admin = await Admin.create({
      email: 'admin@concorddex.com',
      password: 'Admin@123',
      username: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'superadmin'
    });

    res.status(201).json({
      success: true,
      message: 'Superadmin created successfully',
      data: {
        email: admin.email,
        username: admin.username,
        defaultPassword: 'Admin@123'
      }
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== ADMIN MANAGEMENT (Superadmin Only) ===============

// Middleware to check if user is superadmin
const requireSuperadmin = (req, res, next) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Superadmin access required' });
  }
  next();
};

// @route   GET /api/admin/auth/admins
// @desc    Get all admins (superadmin only)
// @access  Superadmin
router.get('/admins', protectAdmin, requireSuperadmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/auth/admins
// @desc    Create new admin (superadmin only)
// @access  Superadmin
router.post('/admins', protectAdmin, requireSuperadmin, [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username').notEmpty().withMessage('Username required'),
  body('firstName').notEmpty().withMessage('First name required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, username, firstName, lastName, role, permissions } = req.body;

    // Check if email or username already exists
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Email or username already exists' });
    }

    const admin = await Admin.create({
      email,
      password,
      username,
      firstName,
      lastName: lastName || '',
      role: role || 'admin',
      permissions: permissions || {
        users: true,
        trades: true,
        funds: true,
        ib: true,
        charges: true,
        copyTrade: true
      },
      createdBy: req.admin._id
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/auth/admins/:id
// @desc    Update admin (superadmin only)
// @access  Superadmin
router.put('/admins/:id', protectAdmin, requireSuperadmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Prevent modifying own superadmin role
    if (admin._id.toString() === req.admin._id.toString() && req.body.role && req.body.role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Cannot change your own superadmin role' });
    }

    const { email, username, firstName, lastName, role, permissions, isActive, password } = req.body;

    if (email) admin.email = email;
    if (username) admin.username = username;
    if (firstName) admin.firstName = firstName;
    if (lastName !== undefined) admin.lastName = lastName;
    if (role) admin.role = role;
    if (permissions) admin.permissions = permissions;
    if (isActive !== undefined) admin.isActive = isActive;
    if (password) admin.password = password; // Will be hashed by pre-save hook

    await admin.save();

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/auth/admins/:id
// @desc    Delete admin (superadmin only)
// @access  Superadmin
router.delete('/admins/:id', protectAdmin, requireSuperadmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Prevent deleting yourself
    if (admin._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    await Admin.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== IMPERSONATION FEATURE (Superadmin Only) ===============

/**
 * @route   POST /api/admin/auth/impersonate/:userId
 * @desc    Login as a user (impersonation) - Superadmin only
 * @access  Superadmin
 * 
 * SECURITY NOTES:
 * - Only superadmin can use this feature
 * - Creates a special impersonation token with admin reference
 * - All actions are fully logged for audit
 * - User password is NEVER exposed or used
 */
router.post('/impersonate/:userId', protectAdmin, requireSuperadmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the target user
    const user = await User.findById(userId).select('-password');
    if (!user) {
      // Log failed attempt
      await AuditLog.logAction({
        adminId: req.admin._id,
        userId: userId,
        action: 'ADMIN_LOGIN_AS_USER',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        status: 'failed',
        errorMessage: 'User not found'
      });
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user is active
    if (!user.isActive) {
      await AuditLog.logAction({
        adminId: req.admin._id,
        userId: user._id,
        action: 'ADMIN_LOGIN_AS_USER',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        status: 'failed',
        errorMessage: 'User account is inactive'
      });
      return res.status(400).json({ success: false, message: 'Cannot impersonate inactive user' });
    }
    
    /**
     * Create impersonation token
     * This token includes:
     * - userId: The user being impersonated
     * - impersonated: Flag to identify this is an impersonation session
     * - adminId: The admin who initiated impersonation (for audit trail)
     * - originalAdminToken: NOT included for security - admin must re-authenticate
     */
    const impersonationToken = jwt.sign(
      { 
        id: user._id,
        impersonated: true,
        adminId: req.admin._id.toString(),
        adminEmail: req.admin.email
      }, 
      JWT_SECRET, 
      { expiresIn: '2h' } // Short expiry for security
    );
    
    // Log successful impersonation
    await AuditLog.logAction({
      adminId: req.admin._id,
      userId: user._id,
      action: 'ADMIN_LOGIN_AS_USER',
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'],
      status: 'success',
      details: {
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        adminEmail: req.admin.email,
        adminRole: req.admin.role
      }
    });
    
    res.json({
      success: true,
      message: `Now logged in as ${user.firstName} ${user.lastName}`,
      data: {
        token: impersonationToken,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance,
          isVerified: user.isVerified
        },
        impersonation: {
          active: true,
          adminId: req.admin._id,
          adminEmail: req.admin.email,
          expiresIn: '2 hours'
        }
      }
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    
    // Log error
    await AuditLog.logAction({
      adminId: req.admin._id,
      userId: req.params.userId,
      action: 'ADMIN_LOGIN_AS_USER',
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'],
      status: 'failed',
      errorMessage: error.message
    });
    
    res.status(500).json({ success: false, message: 'Server error during impersonation' });
  }
});

/**
 * @route   POST /api/admin/auth/exit-impersonation
 * @desc    Exit impersonation mode and return to admin
 * @access  Impersonated session
 * 
 * SECURITY NOTES:
 * - Validates the impersonation token
 * - Logs the exit action
 * - Admin must re-login to admin panel (token not preserved for security)
 */
router.post('/exit-impersonation', async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    // Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if this is an impersonation token
    if (!decoded.impersonated || !decoded.adminId) {
      return res.status(400).json({ success: false, message: 'Not in impersonation mode' });
    }
    
    // Log the exit
    await AuditLog.logAction({
      adminId: decoded.adminId,
      userId: decoded.id,
      action: 'ADMIN_EXIT_IMPERSONATION',
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'],
      status: 'success',
      details: {
        adminEmail: decoded.adminEmail
      }
    });
    
    res.json({
      success: true,
      message: 'Exited impersonation mode. Please login to admin panel.',
      data: {
        adminId: decoded.adminId,
        redirectTo: '/admin/login'
      }
    });
  } catch (error) {
    console.error('Exit impersonation error:', error);
    res.status(500).json({ success: false, message: 'Error exiting impersonation' });
  }
});

/**
 * @route   GET /api/admin/auth/check-impersonation
 * @desc    Check if current session is an impersonation
 * @access  Any authenticated user
 */
router.get('/check-impersonation', async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.json({ success: true, data: { impersonated: false } });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.impersonated && decoded.adminId) {
      // Get admin info for display
      const admin = await Admin.findById(decoded.adminId).select('email firstName lastName');
      
      return res.json({
        success: true,
        data: {
          impersonated: true,
          adminId: decoded.adminId,
          adminEmail: decoded.adminEmail || admin?.email,
          adminName: admin ? `${admin.firstName} ${admin.lastName}` : 'Admin'
        }
      });
    }
    
    res.json({ success: true, data: { impersonated: false } });
  } catch (error) {
    res.json({ success: true, data: { impersonated: false } });
  }
});

/**
 * @route   GET /api/admin/auth/audit-logs
 * @desc    Get audit logs (superadmin only)
 * @access  Superadmin
 */
router.get('/audit-logs', protectAdmin, requireSuperadmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, adminId, userId } = req.query;
    
    let query = {};
    if (action) query.action = action;
    if (adminId) query.adminId = adminId;
    if (userId) query.userId = userId;
    
    const logs = await AuditLog.find(query)
      .populate('adminId', 'email firstName lastName')
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = { router, protectAdmin, requireSuperadmin, getClientIP };
