const mongoose = require('mongoose');

/**
 * AuditLog Model
 * Tracks sensitive admin actions for security and compliance
 * Especially important for impersonation feature
 */
const auditLogSchema = new mongoose.Schema({
  // Admin who performed the action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  
  // Target user (if applicable)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Action type
  action: {
    type: String,
    required: true,
    enum: [
      'ADMIN_LOGIN_AS_USER',      // Impersonation start
      'ADMIN_EXIT_IMPERSONATION', // Impersonation end
      'ADMIN_CREATE_USER',
      'ADMIN_UPDATE_USER',
      'ADMIN_DELETE_USER',
      'ADMIN_BAN_USER',
      'ADMIN_UNBAN_USER',
      'ADMIN_ADD_FUND',
      'ADMIN_DEDUCT_FUND',
      'ADMIN_ADD_CREDIT',
      'ADMIN_REMOVE_CREDIT',
      'ADMIN_CHANGE_PASSWORD',
      'ADMIN_UPDATE_LEVERAGE',
      'ADMIN_LOGIN',
      'ADMIN_LOGOUT'
    ]
  },
  
  // IP address of the request
  ipAddress: {
    type: String,
    required: true
  },
  
  // User agent string
  userAgent: {
    type: String
  },
  
  // Additional details about the action
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Status of the action
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  
  // Error message if failed
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient querying
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to log an action
auditLogSchema.statics.logAction = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break main functionality
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
