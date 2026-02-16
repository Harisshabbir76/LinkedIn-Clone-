// routes/admin.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Helper function to get admin emails from environment
const getAdminEmails = () => {
  return process.env.ADMIN_EMAILS 
    ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
    : ['admin@example.com'];
};

// Helper function to check if user is admin by email
const isAdminByEmail = (email) => {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email);
};

// Middleware to check if user is super admin (in email list)
const checkSuperAdminByEmail = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Check if user's email is in the admin list
    if (!isAdminByEmail(req.user.email)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Super admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Admin check failed'
    });
  }
};

// @route   GET /api/admin/check
// @desc    Check if current user is admin
// @access  Private
router.get('/check', authMiddleware, async (req, res) => {
  try {
    const isAdmin = isAdminByEmail(req.user.email);
    
    res.json({
      success: true,
      isAdmin,
      userEmail: req.user.email,
      adminEmails: getAdminEmails(),
      message: isAdmin ? 'User is admin' : 'User is not admin'
    });

  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check admin status'
    });
  }
});

// @route   GET /api/admin/emails
// @desc    Get all admin emails
// @access  Private/Super Admin
router.get('/emails', authMiddleware, checkSuperAdminByEmail, async (req, res) => {
  try {
    const adminEmails = getAdminEmails();
    
    res.json({
      success: true,
      data: adminEmails,
      count: adminEmails.length
    });

  } catch (error) {
    console.error('Get admin emails error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin emails',
      message: error.message
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with admin emails
// @access  Private/Super Admin
router.get('/users', authMiddleware, checkSuperAdminByEmail, async (req, res) => {
  try {
    const adminEmails = getAdminEmails();
    
    // Get all users who have admin emails
    const adminUsers = await User.find({
      email: { $in: adminEmails }
    }).select('-password -__v');

    res.json({
      success: true,
      data: adminUsers,
      emailBasedAdmins: adminEmails,
      count: adminUsers.length
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin users',
      message: error.message
    });
  }
});

// @route   POST /api/admin/emails
// @desc    Add email to admin list
// @access  Private/Super Admin
router.post('/emails', 
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  authMiddleware, 
  checkSuperAdminByEmail,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const emailToAdd = email.trim().toLowerCase();

      // Get current admin emails
      let currentAdmins = getAdminEmails();

      // Check if email already exists
      if (currentAdmins.includes(emailToAdd)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email already in admin list' 
        });
      }

      // In a real application, you would update the .env file or database
      // For now, we'll simulate it by returning the updated list
      currentAdmins.push(emailToAdd);
      
      res.json({
        success: true,
        message: 'Email added to admin list',
        data: {
          email: emailToAdd,
          allAdmins: currentAdmins
        },
        note: 'Update the ADMIN_EMAILS environment variable to make this permanent'
      });

    } catch (error) {
      console.error('Add admin email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add admin email',
        message: error.message
      });
    }
  }
);

// @route   DELETE /api/admin/emails/:email
// @desc    Remove email from admin list
// @access  Private/Super Admin
router.delete('/emails/:email', 
  authMiddleware, 
  checkSuperAdminByEmail,
  async (req, res) => {
    try {
      const { email } = req.params;
      const emailToRemove = email.trim().toLowerCase();

      // Get current admin emails
      let currentAdmins = getAdminEmails();

      // Check if email exists
      if (!currentAdmins.includes(emailToRemove)) {
        return res.status(404).json({ 
          success: false, 
          error: 'Email not found in admin list' 
        });
      }

      // Prevent removing yourself
      if (emailToRemove === req.user.email.toLowerCase()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot remove yourself from admin list' 
        });
      }

      // Remove email from list
      const newAdmins = currentAdmins.filter(e => e !== emailToRemove);
      
      res.json({
        success: true,
        message: 'Email removed from admin list',
        data: {
          removedEmail: emailToRemove,
          allAdmins: newAdmins
        },
        note: 'Update the ADMIN_EMAILS environment variable to make this permanent'
      });

    } catch (error) {
      console.error('Remove admin email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove admin email',
        message: error.message
      });
    }
  }
);

// @route   GET /api/admin/stats
// @desc    Get admin statistics
// @access  Private/Super Admin
router.get('/stats', authMiddleware, checkSuperAdminByEmail, async (req, res) => {
  try {
    const adminEmails = getAdminEmails();
    
    // Get user counts
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ email: { $in: adminEmails } });
    
    // Get recent admin activity
    const recentAdmins = await User.find({
      email: { $in: adminEmails },
      lastLogin: { $exists: true }
    })
    .sort({ lastLogin: -1 })
    .limit(5)
    .select('name email lastLogin profileImage');

    res.json({
      success: true,
      data: {
        totalUsers,
        adminUsers,
        adminEmails: adminEmails.length,
        recentAdmins
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics',
      message: error.message
    });
  }
});

// ========== STAFF MANAGEMENT ENDPOINTS ==========

const Staff = require('../models/Staff');

// @route   GET /api/admin/staff
// @desc    Get all staff members
// @access  Admin
router.get('/staff', authMiddleware, checkSuperAdminByEmail, async (req, res) => {
  try {
    const staff = await Staff.find({ isActive: true })
      .select('email name departments createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      staff
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff members',
      message: error.message
    });
  }
});

// @route   POST /api/admin/staff
// @desc    Add new staff member
// @access  Admin
router.post('/staff', 
  authMiddleware,
  checkSuperAdminByEmail,
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('departments').isArray().notEmpty().withMessage('At least one department must be selected')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      let { email, name, departments } = req.body;
      // Normalize email for consistent lookup/storage
      email = (email || '').toString().trim().toLowerCase();

      // Check if staff already exists (including soft-deleted entries)
      const existingStaff = await Staff.findOne({ email });
      if (existingStaff) {
        if (existingStaff.isActive) {
          return res.status(400).json({
            success: false,
            error: 'Staff member with this email already exists'
          });
        }

        // If staff exists but was soft-deleted, reactivate and update their info
        existingStaff.isActive = true;
        existingStaff.name = name;
        existingStaff.departments = departments;
        existingStaff.createdBy = req.user._id;
        await existingStaff.save();

        return res.status(200).json({
          success: true,
          message: 'Staff member reactivated successfully',
          staff: existingStaff
        });
      }

      const newStaff = new Staff({
        email,
        name,
        departments,
        createdBy: req.user._id
      });

      await newStaff.save();

      res.status(201).json({
        success: true,
        message: 'Staff member added successfully',
        staff: newStaff
      });
    } catch (error) {
      console.error('Add staff error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add staff member',
        message: error.message
      });
    }
  }
);

// @route   PUT /api/admin/staff/:id
// @desc    Update staff member
// @access  Admin
router.put('/staff/:id',
  authMiddleware,
  checkSuperAdminByEmail,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('departments').isArray().notEmpty().withMessage('At least one department must be selected')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { name, departments } = req.body;

      const staff = await Staff.findById(req.params.id);
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Staff member not found'
        });
      }

      staff.name = name;
      staff.departments = departments;
      await staff.save();

      res.json({
        success: true,
        message: 'Staff member updated successfully',
        staff
      });
    } catch (error) {
      console.error('Update staff error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update staff member',
        message: error.message
      });
    }
  }
);

// @route   DELETE /api/admin/staff/:id
// @desc    Delete staff member (soft delete)
// @access  Admin
router.delete('/staff/:id', authMiddleware, checkSuperAdminByEmail, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    staff.isActive = false;
    await staff.save();

    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete staff member',
      message: error.message
    });
  }
});

module.exports = router;