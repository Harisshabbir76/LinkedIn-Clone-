// routes/notifications.js

const express = require('express');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// @route   GET /api/notifications
// @desc    Get all notifications for logged-in user
// @access  Private (User)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { unreadOnly = false, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Query notifications by email OR by userId (for contact form submissions)
    // This allows users to see notifications even if email doesn't match exactly
    const query = {
      $or: [
        { userEmail: req.user.email.toLowerCase() },
        { userId: req.user._id }
      ]
    };
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('relatedMessage', 'subject status')
        .select('-__v'),
      Notification.countDocuments(query)
    ]);

    res.json({
      success: true,
      notifications,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private (User)
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      $or: [
        { userEmail: req.user.email.toLowerCase() },
        { userId: req.user._id }
      ],
      isRead: false
    });

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      message: error.message
    });
  }
});

// @route   GET /api/notifications/:id
// @desc    Get single notification by ID
// @access  Private (User)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      $or: [
        { userEmail: req.user.email.toLowerCase() },
        { userId: req.user._id }
      ]
    })
    .populate('relatedMessage', 'subject status email')
    .select('-__v');

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Mark as read if not already
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Get notification error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification',
      message: error.message
    });
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private (User)
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      $or: [
        { userEmail: req.user.email.toLowerCase() },
        { userId: req.user._id }
      ]
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

// @route   PATCH /api/notifications/read-all
// @desc    Mark all notifications as read for user
// @access  Private (User)
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        $or: [
          { userEmail: req.user.email.toLowerCase() },
          { userId: req.user._id }
        ],
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updated: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private (User)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Notification.deleteOne({
      _id: id,
      $or: [
        { userEmail: req.user.email.toLowerCase() },
        { userId: req.user._id }
      ]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

// @route   DELETE /api/notifications/delete-all
// @desc    Delete all notifications for user
// @access  Private (User)
router.delete('/delete-all', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      $or: [
        { userEmail: req.user.email.toLowerCase() },
        { userId: req.user._id }
      ]
    });

    res.json({
      success: true,
      message: 'All notifications deleted',
      deleted: result.deletedCount
    });

  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all notifications',
      message: error.message
    });
  }
});

module.exports = router;
