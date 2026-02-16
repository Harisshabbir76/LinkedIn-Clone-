// models/Notification.js

const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  // User Information
  userEmail: {
    type: String,
    required: [true, "User email is required"],
    trim: true,
    lowercase: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Notification Type & Content
  type: {
    type: String,
    enum: ['message_status_changed', 'message_replied', 'new_message', 'system'],
    default: 'system',
    required: true
  },
  title: {
    type: String,
    required: [true, "Notification title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"]
  },
  message: {
    type: String,
    required: [true, "Notification message is required"],
    trim: true,
    maxlength: [1000, "Message cannot exceed 1000 characters"]
  },

  // Related Resource
  relatedMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContactUs',
    default: null
  },
  relatedData: {
    messageSubject: String,
    previousStatus: String,
    newStatus: String,
    messageEmail: String
  },

  // Notification Category
  // For 'message_status_changed': should only appear in notifications tab, NOT in messages/conversation
  // For 'message_replied': should appear in both notifications AND in messages/conversation
  isConversational: {
    type: Boolean,
    default: false,
    description: 'True if this notification is part of a conversation (reply), false if status-only'
  },

  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },

  // Action URL (for easy navigation)
  actionUrl: {
    type: String,
    default: '/messages'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: true
  }
});

// Index for finding user's notifications
NotificationSchema.index({ userEmail: 1, createdAt: -1 });
NotificationSchema.index({ userEmail: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userEmail: 1, isConversational: 1 });
NotificationSchema.index({ type: 1, isConversational: 1 });

// Method to mark notification as read
NotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create notification
NotificationSchema.statics.createMessageStatusNotification = async function(userEmail, messageId, subject, previousStatus, newStatus) {
  const statusMessages = {
    'new': 'New',
    'in_progress': 'In Progress',
    'resolved': 'Resolved',
    'closed': 'Closed'
  };
  // Try to resolve a registered user by email so notifications can be queried by userId if needed
  let userId = null;
  try {
    const User = require('./User');
    const user = await User.findOne({ email: userEmail }).select('_id');
    if (user) userId = user._id;
  } catch (e) {
    // ignore - user model may not be available in some contexts
  }

  const notification = new this({
    userEmail,
    userId,
    type: 'message_status_changed',
    title: `Support Ticket Status Updated`,
    message: `Your support ticket "${subject}" status has been changed from ${statusMessages[previousStatus] || previousStatus} to ${statusMessages[newStatus] || newStatus}`,
    relatedMessage: messageId,
    relatedData: {
      messageSubject: subject,
      previousStatus,
      newStatus,
      messageEmail: userEmail
    },
    isConversational: false,
    actionUrl: '/notifications'
  });

  return notification.save();
};

// Static method to create reply notification
NotificationSchema.statics.createReplyNotification = async function(userEmail, messageId, subject) {
  let userId = null;
  try {
    const User = require('./User');
    const user = await User.findOne({ email: userEmail }).select('_id');
    if (user) userId = user._id;
  } catch (e) {
    // ignore
  }

  const notification = new this({
    userEmail,
    userId,
    type: 'message_replied',
    title: `New Reply to Your Support Ticket`,
    message: `You have received a new reply on "${subject}"`,
    relatedMessage: messageId,
    relatedData: {
      messageSubject: subject,
      messageEmail: userEmail
    },
    isConversational: true,
    actionUrl: '/messages'
  });

  return notification.save();
};

module.exports = mongoose.model("Notification", NotificationSchema);
