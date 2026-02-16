// models/ContactUs.js

const mongoose = require("mongoose");

const ContactUsSchema = new mongoose.Schema({
  // User Information
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  // Message Information
  subject: {
    type: String,
    required: [true, "Subject is required"],
    trim: true,
    maxlength: [200, "Subject cannot exceed 200 characters"]
  },
  message: {
    type: String,
    required: [true, "Message is required"],
    trim: true,
    maxlength: [2000, "Message cannot exceed 2000 characters"]
  },

  // Category & Priority
  category: {
    type: String,
    enum: ['Support', 'Technical', 'Feedback', 'Account', 'Partnership', 'Other'],
    default: 'Other'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },

  // Status Tracking
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed'],
    default: 'new'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isReplied: {
    type: Boolean,
    default: false
  },

  // Admin Management
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Company Assignment (for messages sent to companies)
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
    index: true
  },
  companyName: {
    type: String,
    trim: true,
    default: null
  },
  // Sender context for the overall conversation (user/support/company)
  senderContext: {
    type: String,
    enum: ['user', 'support', 'company'],
    default: 'user'
  },
  displaySenderName: {
    type: String,
    trim: true,
    default: null
  },
  // If replies are sent on behalf of a company, store responding company info
  respondingCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  respondingCompanyName: {
    type: String,
    trim: true,
    default: null
  },
  adminNotes: {
    type: String,
    trim: true,
    default: ''
  },
  replies: [{
    content: {
      type: String,
      required: true,
      trim: true
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Context of this specific reply: 'user' | 'support' | 'company'
    senderContext: {
      type: String,
      enum: ['user', 'support', 'company'],
      default: 'support'
    },
    // Display name to show in conversations (could be company name or 'Support')
    displayName: {
      type: String,
      trim: true,
      default: null
    },
    respondingCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    },
    respondingCompanyName: {
      type: String,
      trim: true,
      default: null
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    emailId: String
    ,
    isRead: {
      type: Boolean,
      default: false
    }
  }],

  // Timeline & History
  timeline: [{
    action: {
      type: String,
      enum: [
        'created',
        'read',
        'unread',
        'status_changed',
        'assigned',
        'replied',
        'note_added',
        'priority_changed'
      ],
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: {
      type: String,
      trim: true
    },
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    performedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Dates
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  firstResponseAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },

  // Technical Information
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  pageUrl: {
    type: String,
    trim: true
  },
  referrer: {
    type: String,
    trim: true
  },
  browser: {
    name: String,
    version: String,
    major: String
  },
  os: {
    name: String,
    version: String
  },
  device: {
    type: String,
    enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
    default: 'Unknown'
  },

  // Metadata
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, "Tag cannot exceed 50 characters"]
  }],

  // Follow-up
  followUpDate: {
    type: Date
  },
  followUpNotes: {
    type: String,
    trim: true
  },

  // Attachments (if needed in future)
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Rating & Feedback (for resolved tickets)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [500, "Feedback cannot exceed 500 characters"]
  },
  feedbackSubmittedAt: {
    type: Date
  },

  // Internal Flags
  isSpam: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
ContactUsSchema.virtual('responseTime').get(function() {
  if (!this.firstResponseAt) return null;
  return this.firstResponseAt - this.submittedAt;
});

ContactUsSchema.virtual('resolutionTime').get(function() {
  if (!this.resolvedAt) return null;
  return this.resolvedAt - this.submittedAt;
});

ContactUsSchema.virtual('daysOpen').get(function() {
  if (this.status === 'resolved' || this.status === 'closed') {
    if (!this.resolvedAt) return null;
    return Math.ceil((this.resolvedAt - this.submittedAt) / (1000 * 60 * 60 * 24));
  }
  return Math.ceil((new Date() - this.submittedAt) / (1000 * 60 * 60 * 24));
});

ContactUsSchema.virtual('isOverdue').get(function() {
  if (this.status === 'resolved' || this.status === 'closed') return false;

  const daysOpen = Math.ceil((new Date() - this.submittedAt) / (1000 * 60 * 60 * 24));

  if (this.priority === 'Urgent' && daysOpen > 1) return true;
  if (this.priority === 'High' && daysOpen > 3) return true;
  if (this.priority === 'Medium' && daysOpen > 7) return true;
  if (this.priority === 'Low' && daysOpen > 14) return true;

  return false;
});

// Indexes for better query performance
ContactUsSchema.index({ email: 1 });
ContactUsSchema.index({ status: 1 });
ContactUsSchema.index({ category: 1 });
ContactUsSchema.index({ priority: 1 });
ContactUsSchema.index({ isRead: 1 });
ContactUsSchema.index({ isReplied: 1 });
ContactUsSchema.index({ submittedAt: -1 });
ContactUsSchema.index({ updatedAt: -1 });
ContactUsSchema.index({ assignedTo: 1 });
ContactUsSchema.index({ tags: 1 });
ContactUsSchema.index({ status: 1, priority: 1 });
ContactUsSchema.index({ status: 1, submittedAt: -1 });
ContactUsSchema.index({ category: 1, status: 1 });
ContactUsSchema.index({ email: 1, submittedAt: -1 });
ContactUsSchema.index({ isSpam: 1, status: 1 });
ContactUsSchema.index({ isArchived: 1 });
ContactUsSchema.index({ followUpDate: 1 });

// Text search index for full-text search
ContactUsSchema.index({
  name: 'text',
  email: 'text',
  subject: 'text',
  message: 'text',
  adminNotes: 'text'
});

// Middleware
ContactUsSchema.pre('save', function(next) {
  // Update last activity timestamp
  this.lastActivityAt = new Date();

  // Auto-tag based on category
  if (this.category && !this.tags.includes(this.category)) {
    this.tags.push(this.category);
  }

  // Auto-tag based on priority
  if (this.priority && !this.tags.includes(this.priority)) {
    this.tags.push(this.priority);
  }

  // Auto-tag if overdue
  if (this.isOverdue && !this.tags.includes('Overdue')) {
    this.tags.push('Overdue');
  }

  next();
});

// Static Methods
ContactUsSchema.statics.getStats = async function(filter = {}) {
  try {
    const stats = await this.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: {
            $sum: {
              $cond: [{ $eq: ['$status', 'new'] }, 1, 0]
            }
          },
          in_progress: {
            $sum: {
              $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
            }
          },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
            }
          },
          closed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'closed'] }, 1, 0]
            }
          },
          unread: {
            $sum: {
              $cond: [{ $eq: ['$isRead', false] }, 1, 0]
            }
          },
          replied: {
            $sum: {
              $cond: [{ $eq: ['$isReplied', true] }, 1, 0]
            }
          },
          urgent: {
            $sum: {
              $cond: [{ $eq: ['$priority', 'Urgent'] }, 1, 0]
            }
          },
          high: {
            $sum: {
              $cond: [{ $eq: ['$priority', 'High'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          byStatus: {
            new: '$new',
            in_progress: '$in_progress',
            resolved: '$resolved',
            closed: '$closed'
          },
          unread: 1,
          replied: 1,
          byPriority: {
            urgent: '$urgent',
            high: '$high'
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      byStatus: { new: 0, in_progress: 0, resolved: 0, closed: 0 },
      unread: 0,
      replied: 0,
      byPriority: { urgent: 0, high: 0 }
    };
  } catch (error) {
    console.error('Error getting contact stats:', error);
    throw error;
  }
};

ContactUsSchema.statics.getDailyStats = async function(startDate, endDate) {
  try {
    const dailyStats = await this.aggregate([
      {
        $match: {
          submittedAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" }
          },
          count: { $sum: 1 },
          new: {
            $sum: {
              $cond: [{ $eq: ['$status', 'new'] }, 1, 0]
            }
          },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return dailyStats;
  } catch (error) {
    console.error('Error getting daily stats:', error);
    throw error;
  }
};

ContactUsSchema.statics.getAverageResponseTime = async function(startDate, endDate) {
  try {
    const stats = await this.aggregate([
      {
        $match: {
          submittedAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          firstResponseAt: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageResponseTime: {
            $avg: {
              $subtract: ['$firstResponseAt', '$submittedAt']
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    return stats[0] || { averageResponseTime: 0, count: 0 };
  } catch (error) {
    console.error('Error getting average response time:', error);
    throw error;
  }
};

// Instance Methods
ContactUsSchema.methods.markAsRead = function(userId) {
  if (!this.isRead) {
    this.isRead = true;
    this.timeline.push({
      action: 'read',
      performedBy: userId,
      performedAt: new Date()
    });
  }
  return this;
};

ContactUsSchema.methods.markAsUnread = function(userId) {
  if (this.isRead) {
    this.isRead = false;
    this.timeline.push({
      action: 'unread',
      performedBy: userId,
      performedAt: new Date()
    });
  }
  return this;
};

ContactUsSchema.methods.updateStatus = function(status, userId, notes = '') {
  const previousStatus = this.status;
  this.status = status;

  if (status === 'resolved' || status === 'closed') {
    this.resolvedAt = new Date();
  }

  this.timeline.push({
    action: 'status_changed',
    performedBy: userId,
    details: notes || `Status changed from ${previousStatus} to ${status}`,
    previousValue: previousStatus,
    newValue: status,
    performedAt: new Date()
  });

  return this;
};

ContactUsSchema.methods.assignTo = function(userId, assignedBy, notes = '') {
  const previousAssignee = this.assignedTo;
  this.assignedTo = userId;

  this.timeline.push({
    action: 'assigned',
    performedBy: assignedBy,
    details: notes || `Ticket assigned to user`,
    previousValue: previousAssignee,
    newValue: userId,
    performedAt: new Date()
  });

  return this;
};

ContactUsSchema.methods.addReply = function(content, userId, emailSent = false, emailId = null) {
  this.replies.push({
    content,
    sentBy: userId,
    sentAt: new Date(),
    emailSent,
    emailId
  });

  this.isReplied = true;

  if (!this.firstResponseAt) {
    this.firstResponseAt = new Date();
  }

  this.timeline.push({
    action: 'replied',
    performedBy: userId,
    details: 'Reply sent to user',
    performedAt: new Date()
  });

  return this;
};

ContactUsSchema.methods.addAdminNote = function(note, userId) {
  if (!this.adminNotes) {
    this.adminNotes = note;
  } else {
    this.adminNotes += `\n\n[${new Date().toISOString()}] ${note}`;
  }

  this.timeline.push({
    action: 'note_added',
    performedBy: userId,
    details: 'Admin note added',
    performedAt: new Date()
  });

  return this;
};

ContactUsSchema.methods.updatePriority = function(priority, userId, notes = '') {
  const previousPriority = this.priority;
  this.priority = priority;

  this.timeline.push({
    action: 'priority_changed',
    performedBy: userId,
    details: notes || `Priority changed from ${previousPriority} to ${priority}`,
    previousValue: previousPriority,
    newValue: priority,
    performedAt: new Date()
  });

  return this;
};

ContactUsSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this;
};

ContactUsSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this;
};

ContactUsSchema.methods.markAsSpam = function(userId) {
  this.isSpam = true;
  this.status = 'closed';
  this.timeline.push({
    action: 'status_changed',
    performedBy: userId,
    details: 'Marked as spam',
    previousValue: this.status,
    newValue: 'closed',
    performedAt: new Date()
  });
  return this;
};

ContactUsSchema.methods.archive = function(userId) {
  this.isArchived = true;
  this.timeline.push({
    action: 'status_changed',
    performedBy: userId,
    details: 'Ticket archived',
    performedAt: new Date()
  });
  return this;
};

ContactUsSchema.methods.unarchive = function(userId) {
  this.isArchived = false;
  this.timeline.push({
    action: 'status_changed',
    performedBy: userId,
    details: 'Ticket unarchived',
    performedAt: new Date()
  });
  return this;
};

ContactUsSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this;
};

ContactUsSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.timeline.push({
    action: 'status_changed',
    performedBy: userId,
    details: 'Ticket restored',
    performedAt: new Date()
  });
  return this;
};

// Query Helpers
ContactUsSchema.query.byStatus = function(status) {
  return this.where({ status });
};

ContactUsSchema.query.byCategory = function(category) {
  return this.where({ category });
};

ContactUsSchema.query.byPriority = function(priority) {
  return this.where({ priority });
};

ContactUsSchema.query.unread = function() {
  return this.where({ isRead: false });
};

ContactUsSchema.query.unreplied = function() {
  return this.where({ isReplied: false });
};

ContactUsSchema.query.assignedTo = function(userId) {
  return this.where({ assignedTo: userId });
};

ContactUsSchema.query.recent = function(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return this.where({ submittedAt: { $gte: date } });
};

ContactUsSchema.query.overdue = function() {
  const now = new Date();
  return this.where({
    status: { $nin: ['resolved', 'closed'] },
    $or: [
      {
        priority: 'Urgent',
        submittedAt: { $lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      },
      {
        priority: 'High',
        submittedAt: { $lte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }
      },
      {
        priority: 'Medium',
        submittedAt: { $lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      },
      {
        priority: 'Low',
        submittedAt: { $lte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) }
      }
    ]
  });
};

ContactUsSchema.query.needsFollowUp = function() {
  const now = new Date();
  return this.where({
    followUpDate: { $lte: now },
    status: { $nin: ['resolved', 'closed'] },
    isDeleted: false
  });
};

ContactUsSchema.query.active = function() {
  return this.where({
    isDeleted: false,
    isArchived: false,
    isSpam: false
  });
};

ContactUsSchema.query.search = function(searchTerm) {
  if (!searchTerm) return this;

  return this.where({
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { subject: { $regex: searchTerm, $options: 'i' } },
      { message: { $regex: searchTerm, $options: 'i' } },
      { adminNotes: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } }
    ]
  });
};

module.exports = mongoose.model("ContactUs", ContactUsSchema);