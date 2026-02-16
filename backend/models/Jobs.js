const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Job title is required"],
    trim: true,
    maxlength: [100, "Title cannot exceed 100 characters"]
  },
  
  // Company Reference
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: [true, "Company reference is required"]
  },
  
  // Alternative: Direct company name (for backward compatibility)
  companyName: {
    type: String,
    required: [true, "Company name is required"],
    trim: true
  },
  
  description: {
    type: String,
    required: [true, "Job description is required"],
    minlength: [50, "Description must be at least 50 characters"]
  },
  
  location: {
    type: String,
    required: [true, "Location is required"]
  },
  
  // Employment Details
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
    default: 'Full-time'
  },
  
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Volunteer', 'Other'],
    default: 'Full-time'
  },
  
  salary: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    isNegotiable: {
      type: Boolean,
      default: false
    },
    payPeriod: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'yearly'
    }
  },
  
  // Job Requirements
  requirements: [{
    type: String,
    trim: true
  }],
  
  responsibilities: [{
    type: String,
    trim: true
  }],
  
  skills: [{
    type: String,
    trim: true
  }],
  
  experience: {
    minYears: {
      type: Number,
      min: 0,
      default: 0
    },
    maxYears: {
      type: Number,
      min: 0
    }
  },
  
  education: {
    type: String,
    enum: ['High School', 'Associate', 'Bachelor', 'Master', 'PhD', 'Any'],
    default: 'Any'
  },
  
  // Posted By
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Applications
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  
  // View tracking
  views: {
    type: Number,
    default: 0
  },
  
  // Status - UPDATED to include 'archived'
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'filled', 'archived'],
    default: 'active'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Urgency flags
  isUrgent: {
    type: Boolean,
    default: false
  },
  
  isRemote: {
    type: Boolean,
    default: false
  },
  
  // Benefits
  benefits: [{
    type: String,
    trim: true
  }],
  
  // Application instructions
  applicationInstructions: {
    type: String,
    trim: true
  },
  
  applicationDeadline: {
    type: Date
  },
  
  // Metadata
  tags: [{
    type: String,
    trim: true
  }],
  
  keywords: [{
    type: String,
    trim: true
  }],
  
  // Timestamps
  postedAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
JobSchema.index({ title: 'text', description: 'text', skills: 'text' });
JobSchema.index({ company: 1, status: 1 });
JobSchema.index({ location: 1 });
JobSchema.index({ type: 1 });
JobSchema.index({ 'salary.min': 1, 'salary.max': 1 });
JobSchema.index({ isRemote: 1 });
JobSchema.index({ isFeatured: 1 });
JobSchema.index({ isUrgent: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ postedAt: -1 });
JobSchema.index({ expiresAt: 1 });
JobSchema.index({ postedBy: 1 });

// Virtual for active applications count
JobSchema.virtual('applicationsCount').get(function() {
  return this.applications ? this.applications.length : 0;
});

// Virtual for job duration
JobSchema.virtual('duration').get(function() {
  if (!this.postedAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.postedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for isExpired
JobSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Method to increment views
JobSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
  return this.views;
};

// Method to get application statistics
JobSchema.methods.getApplicationStats = async function() {
  const Application = mongoose.model('Application');
  return await Application.aggregate([
    { $match: { job: this._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' },
        avgSkillsMatch: { $avg: '$skillsMatch' }
      }
    }
  ]);
};

// Static method to get jobs by company
JobSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = { company: companyId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }
  
  return this.find(query)
    .populate('company', 'name logo industry')
    .populate('postedBy', 'name email')
    .sort({ postedAt: -1 });
};

// Static method to get featured jobs
JobSchema.statics.getFeaturedJobs = function(limit = 10) {
  return this.find({ 
    isFeatured: true, 
    status: 'active',
    isActive: true 
  })
  .populate('company', 'name logo industry')
  .populate('postedBy', 'name email')
  .sort({ postedAt: -1 })
  .limit(limit);
};

// Static method to get urgent jobs
JobSchema.statics.getUrgentJobs = function(limit = 10) {
  return this.find({ 
    isUrgent: true, 
    status: 'active',
    isActive: true 
  })
  .populate('company', 'name logo industry')
  .populate('postedBy', 'name email')
  .sort({ postedAt: -1 })
  .limit(limit);
};

// Static method to get remote jobs
JobSchema.statics.getRemoteJobs = function(limit = 20) {
  return this.find({ 
    isRemote: true, 
    status: 'active',
    isActive: true 
  })
  .populate('company', 'name logo industry')
  .populate('postedBy', 'name email')
  .sort({ postedAt: -1 })
  .limit(limit);
};

// Static method to search jobs with filters
JobSchema.statics.searchJobs = function(filters = {}) {
  const {
    search,
    location,
    type,
    employmentType,
    minSalary,
    maxSalary,
    isRemote,
    experience,
    education,
    skills,
    page = 1,
    limit = 10
  } = filters;
  
  const query = {
    status: 'active',
    isActive: true
  };
  
  // Text search
  if (search) {
    query.$text = { $search: search };
  }
  
  // Location filter
  if (location) {
    query.location = new RegExp(location, 'i');
  }
  
  // Type filter
  if (type) {
    query.type = type;
  }
  
  // Employment type filter
  if (employmentType) {
    query.employmentType = employmentType;
  }
  
  // Salary filter
  if (minSalary || maxSalary) {
    query['salary.min'] = {};
    if (minSalary) {
      query['salary.min'].$gte = minSalary;
    }
    if (maxSalary) {
      query['salary.max'] = { $lte: maxSalary };
    }
  }
  
  // Remote filter
  if (isRemote !== undefined) {
    query.isRemote = isRemote;
  }
  
  // Experience filter
  if (experience) {
    query['experience.minYears'] = { $lte: experience };
  }
  
  // Education filter
  if (education) {
    query.education = education;
  }
  
  // Skills filter
  if (skills && skills.length > 0) {
    query.skills = { $in: skills };
  }
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  return Promise.all([
    this.find(query)
      .populate('company', 'name logo industry')
      .populate('postedBy', 'name email')
      .sort({ isFeatured: -1, isUrgent: -1, postedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    this.countDocuments(query)
  ]);
};

// Pre-save middleware to set expiresAt if not set
JobSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Default: 30 days from posting
    const expires = new Date(this.postedAt || Date.now());
    expires.setDate(expires.getDate() + 30);
    this.expiresAt = expires;
  }
  
  // Set isRemote based on type or location
  if (this.type === 'Remote' || this.location.toLowerCase().includes('remote')) {
    this.isRemote = true;
  }
  
  // Update status if expired
  if (this.expiresAt && new Date() > this.expiresAt && this.status === 'active') {
    this.status = 'closed';
    this.isActive = false;
  }
  
  // Update updatedAt
  this.updatedAt = new Date();
  
  next();
});

module.exports = mongoose.model('Job', JobSchema);