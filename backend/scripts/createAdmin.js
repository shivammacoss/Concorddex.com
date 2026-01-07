const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/concorddex_trading');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@concorddex.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists:');
      console.log('Email: admin@concorddex.com');
      console.log('(Password unchanged)');
    } else {
      // Create new admin
      const admin = new Admin({
        email: 'admin@concorddex.com',
        password: 'Admin@123',
        username: 'admin',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'superadmin',
        isActive: true
      });

      await admin.save();
      console.log('Admin created successfully!');
      console.log('Email: admin@concorddex.com');
      console.log('Password: Admin@123');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
