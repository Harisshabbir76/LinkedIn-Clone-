const mongoose = require('mongoose');

const portfolioLinkSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [50, "Title cannot exceed 50 characters"]
  },
  url: {
    type: String,
    required: [true, "URL is required"],
    trim: true,
    match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, "Please enter a valid URL"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, "Description cannot exceed 200 characters"]
  },
  type: {
    type: String,
    enum: ["website", "github", "linkedin", "behance", "dribbble", "other"],
    default: "website"
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const ApplicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Store name and email for quick access without populating
  name: {
    type: String,
    trim: true,
    required: [true, "Name is required"]
  },
  
  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: [true, "Email is required"]
  },
  
  phone: {
    type: String,
    trim: true
  },
  
  location: {
    type: String,
    trim: true
  },
  
  resume: {
    type: String,
    required: true
  },
  
  coverLetter: {
    type: String,
    default: ''
  },
  
  portfolio: {
    type: String,
    default: ''
  },
  
  linkedin: {
    type: String,
    default: ''
  },
  
  portfolioLinks: [portfolioLinkSchema],
  
  questions: [{
    question: String,
    answer: String
  }],
  
  additionalInfo: {
    type: String,
    default: ''
  },
  
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  skillsMatch: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  rejectionReason: {
    type: String
  },
  
  interview: {
    scheduledDate: Date,
    interviewType: {
      type: String,
      enum: ['phone', 'video', 'in-person']
    },
    notes: String,
    feedback: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  notes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  communications: [{
    type: {
      type: String,
      enum: ['email', 'message', 'call'],
      required: true
    },
    subject: String,
    message: String,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    }
  }],
  
  timeline: [{
    action: {
      type: String,
      enum: ['applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'interview_completed', 'accepted', 'rejected', 'withdrawn', 'note_added', 'communication_sent', 'status_updated'],
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    date: {
      type: Date,
      default: Date.now
    },
    previousStatus: String,
    newStatus: String
  }],
  
  viewedAt: {
    type: Date
  },
  
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  lastViewedAt: {
    type: Date
  },
  
  appliedAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Applicant metadata (cached from User model)
  applicantMetadata: {
    phone: String,
    location: String,
    skills: [{
      name: String,
      proficiency: String
    }],
    education: [{
      institution: String,
      degree: String,
      fieldOfStudy: String
    }],
    experience: [{
      title: String,
      company: String,
      startDate: Date,
      endDate: Date,
      currentlyWorking: Boolean,
      description: String
    }],
    profileImage: String,
    totalExperience: Number,
    currentPosition: String,
    currentCompany: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ appliedAt: -1 });
ApplicationSchema.index({ company: 1 });
ApplicationSchema.index({ score: -1 });
ApplicationSchema.index({ skillsMatch: -1 });
ApplicationSchema.index({ 'timeline.date': -1 });
ApplicationSchema.index({ name: 1 });
ApplicationSchema.index({ email: 1 });
ApplicationSchema.index({ phone: 1 });
ApplicationSchema.index({ 'applicantMetadata.skills.name': 1 });
ApplicationSchema.index({ 'applicantMetadata.location': 1 });
ApplicationSchema.index({ 'applicantMetadata.totalExperience': -1 });

// Middleware to update timestamp and cache applicant data
ApplicationSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Cache applicant data for faster queries
  if (this.isNew || this.isModified('applicant')) {
    try {
      const User = mongoose.model('User');
      const applicant = await User.findById(this.applicant).select(
        'name email phone location skills education experience profileImage totalExperience currentPosition currentCompany'
      );
      
      if (applicant) {
        this.applicantMetadata = {
          phone: applicant.phone,
          location: applicant.location,
          skills: applicant.skills || [],
          education: applicant.education || [],
          experience: applicant.experience || [],
          profileImage: applicant.profileImage,
          totalExperience: applicant.totalExperience || 0,
          currentPosition: applicant.currentPosition,
          currentCompany: applicant.currentCompany
        };
        
        // Also update name, email, phone, and location if not already set
        if (!this.name && applicant.name) {
          this.name = applicant.name;
        }
        if (!this.email && applicant.email) {
          this.email = applicant.email;
        }
        if (!this.phone && applicant.phone) {
          this.phone = applicant.phone;
        }
        if (!this.location && applicant.location) {
          this.location = applicant.location;
        }
      }
    } catch (error) {
      console.error('Error caching applicant data:', error);
    }
  }
  
  next();
});

// Methods
ApplicationSchema.methods.updateStatus = function(status, userId, notes) {
  const previousStatus = this.status;
  this.status = status;
  
  const timelineEntry = {
    action: 'status_updated',
    performedBy: userId,
    notes: notes || `Status changed from ${previousStatus} to ${status}`,
    date: new Date(),
    previousStatus: previousStatus,
    newStatus: status
  };
  
  this.timeline.push(timelineEntry);
  
  if (status === 'reviewed') {
    this.viewedAt = new Date();
    this.lastViewedAt = new Date();
    
    // Add to viewedBy array
    if (!this.viewedBy.some(view => view.user.toString() === userId.toString())) {
      this.viewedBy.push({
        user: userId,
        viewedAt: new Date()
      });
    }
  }
  
  // Add additional timeline entries for specific status changes
  if (status === 'interview') {
    this.timeline.push({
      action: 'interview_scheduled',
      performedBy: userId,
      notes: 'Interview scheduled',
      date: new Date()
    });
  }
  
  if (status === 'accepted') {
    this.timeline.push({
      action: 'accepted',
      performedBy: userId,
      notes: 'Application accepted',
      date: new Date()
    });
  }
  
  if (status === 'rejected') {
    this.timeline.push({
      action: 'rejected',
      performedBy: userId,
      notes: 'Application rejected',
      date: new Date()
    });
  }
  
  return timelineEntry;
};

ApplicationSchema.methods.markAsViewed = function(userId) {
  if (!this.viewedAt) {
    this.viewedAt = new Date();
    this.lastViewedAt = new Date();
    
    this.timeline.push({
      action: 'reviewed',
      performedBy: userId,
      notes: 'Application viewed',
      date: new Date()
    });
    
    // Add to viewedBy array
    if (!this.viewedBy.some(view => view.user.toString() === userId.toString())) {
      this.viewedBy.push({
        user: userId,
        viewedAt: new Date()
      });
    }
    
    if (this.status === 'pending') {
      this.status = 'reviewed';
    }
  } else {
    this.lastViewedAt = new Date();
    
    // Update viewedBy if user hasn't viewed before
    if (!this.viewedBy.some(view => view.user.toString() === userId.toString())) {
      this.viewedBy.push({
        user: userId,
        viewedAt: new Date()
      });
    }
  }
  
  return this;
};

ApplicationSchema.methods.addNote = function(note, userId) {
  const newNote = {
    note,
    addedBy: userId,
    addedAt: new Date()
  };
  
  this.notes.push(newNote);
  this.timeline.push({
    action: 'note_added',
    performedBy: userId,
    notes: 'Note added to application',
    date: new Date()
  });
  
  return newNote;
};

ApplicationSchema.methods.addCommunication = function(type, subject, message, userId) {
  const communication = {
    type,
    subject,
    message,
    sentBy: userId,
    sentAt: new Date()
  };
  
  this.communications.push(communication);
  this.timeline.push({
    action: 'communication_sent',
    performedBy: userId,
    notes: `${type} communication sent: ${subject}`,
    date: new Date()
  });
  
  return communication;
};

ApplicationSchema.methods.calculateMatchScore = function(jobRequirements) {
  let score = 0;
  let totalWeight = 0;
  
  // Skills matching (40%)
  if (jobRequirements.skills && jobRequirements.skills.length > 0 && this.applicantMetadata.skills) {
    const userSkills = this.applicantMetadata.skills.map(s => s.name.toLowerCase());
    const matchedSkills = jobRequirements.skills.filter(jobSkill => 
      userSkills.some(userSkill => 
        userSkill.includes(jobSkill.toLowerCase()) || 
        jobSkill.toLowerCase().includes(userSkill)
      )
    );
    score += (matchedSkills.length / jobRequirements.skills.length) * 40;
    totalWeight += 40;
  } else {
    totalWeight += 40;
  }
  
  // Experience matching (30%)
  if (jobRequirements.experience && jobRequirements.experience.minYears && this.applicantMetadata.totalExperience) {
    const experienceScore = Math.min(30, (this.applicantMetadata.totalExperience / jobRequirements.experience.minYears) * 30);
    score += experienceScore;
    totalWeight += 30;
  } else {
    totalWeight += 30;
  }
  
  // Education matching (15%)
  if (jobRequirements.education && this.applicantMetadata.education && this.applicantMetadata.education.length > 0) {
    const highestDegree = this.applicantMetadata.education.reduce((highest, edu) => {
      const degreeRank = getDegreeRank(edu.degree);
      return degreeRank > highest.rank ? { degree: edu.degree, rank: degreeRank } : highest;
    }, { degree: '', rank: 0 });
    
    if (isEducationMatch(highestDegree.degree, jobRequirements.education)) {
      score += 15;
    }
    totalWeight += 15;
  } else {
    totalWeight += 15;
  }
  
  // Location matching (15%)
  if (jobRequirements.location && this.applicantMetadata.location) {
    const jobLocation = jobRequirements.location.toLowerCase();
    const userLocation = this.applicantMetadata.location.toLowerCase();
    
    if (userLocation.includes(jobLocation) || jobLocation.includes(userLocation)) {
      score += 15;
    }
    totalWeight += 15;
  } else {
    totalWeight += 15;
  }
  
  const finalScore = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
  
  // Calculate skills match separately
  let skillsMatch = 0;
  if (jobRequirements.skills && jobRequirements.skills.length > 0 && this.applicantMetadata.skills) {
    const userSkills = this.applicantMetadata.skills.map(s => s.name.toLowerCase());
    const matchedSkills = jobRequirements.skills.filter(jobSkill => 
      userSkills.some(userSkill => 
        userSkill.includes(jobSkill.toLowerCase()) || 
        jobSkill.toLowerCase().includes(userSkill)
      )
    );
    skillsMatch = Math.round((matchedSkills.length / jobRequirements.skills.length) * 100);
  }
  
  this.score = finalScore;
  this.skillsMatch = skillsMatch;
  
  return {
    score: finalScore,
    skillsMatch: skillsMatch,
    breakdown: {
      skills: skillsMatch,
      experience: this.applicantMetadata.totalExperience || 0,
      education: this.applicantMetadata.education ? this.applicantMetadata.education.length : 0,
      location: this.applicantMetadata.location || 'Not specified'
    }
  };
};

// Static methods
ApplicationSchema.statics.getStats = async function(companyId, jobId = null) {
  try {
    // Convert companyId to ObjectId
    const companyObjectId = new mongoose.Types.ObjectId(companyId);
    
    const matchStage = { company: companyObjectId };
    if (jobId) {
      matchStage.job = new mongoose.Types.ObjectId(jobId);
    }
    
    const stats = await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgScore: { $avg: { $ifNull: ['$score', 0] } },
          avgSkillsMatch: { $avg: { $ifNull: ['$skillsMatch', 0] } },
          avgExperience: { $avg: { $ifNull: ['$applicantMetadata.totalExperience', 0] } }
        }
      },
      {
        $project: {
          count: 1,
          avgScore: { $round: ['$avgScore', 1] },
          avgSkillsMatch: { $round: ['$avgSkillsMatch', 1] },
          avgExperience: { $round: ['$avgExperience', 1] }
        }
      }
    ]);
    
    const total = await this.countDocuments(matchStage);
    const viewed = await this.countDocuments({ 
      ...matchStage,
      viewedAt: { $exists: true, $ne: null } 
    });
    
    // Get applications by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyStats = await this.aggregate([
      { $match: { ...matchStage, appliedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$appliedAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);
    
    const byStatus = {};
    stats.forEach(stat => {
      byStatus[stat._id] = {
        count: stat.count,
        avgScore: stat.avgScore || 0,
        avgSkillsMatch: stat.avgSkillsMatch || 0,
        avgExperience: stat.avgExperience || 0
      };
    });
    
    return {
      total,
      viewed,
      byStatus,
      viewRate: total > 0 ? Math.round((viewed / total) * 100) : 0,
      dailyStats: dailyStats.reduce((acc, day) => {
        acc[day._id] = day.count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting application stats:', error);
    throw error;
  }
};

ApplicationSchema.statics.getTopCandidates = async function(jobId, limit = 10) {
  try {
    const candidates = await this.aggregate([
      { $match: { job: new mongoose.Types.ObjectId(jobId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'applicant',
          foreignField: '_id',
          as: 'applicantDetails'
        }
      },
      { $unwind: '$applicantDetails' },
      {
        $addFields: {
          matchScore: {
            $add: [
              { $multiply: [{ $divide: ['$score', 100] }, 40] },
              { $multiply: [{ $divide: ['$skillsMatch', 100] }, 60] }
            ]
          }
        }
      },
      { $sort: { matchScore: -1, appliedAt: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          phone: 1,
          status: 1,
          score: 1,
          skillsMatch: 1,
          appliedAt: 1,
          'applicantDetails.phone': 1,
          'applicantDetails.location': 1,
          'applicantDetails.profileImage': 1,
          'applicantDetails.totalExperience': 1,
          'applicantDetails.currentPosition': 1,
          'applicantDetails.currentCompany': 1,
          matchScore: 1
        }
      }
    ]);
    
    return candidates;
  } catch (error) {
    console.error('Error getting top candidates:', error);
    throw error;
  }
};

ApplicationSchema.statics.getApplicationAnalytics = async function(companyId, startDate, endDate) {
  try {
    const companyObjectId = new mongoose.Types.ObjectId(companyId);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const analytics = await this.aggregate([
      {
        $match: {
          company: companyObjectId,
          appliedAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'jobDetails'
        }
      },
      { $unwind: '$jobDetails' },
      {
        $group: {
          _id: {
            job: '$jobDetails.title',
            status: '$status'
          },
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
          avgSkillsMatch: { $avg: '$skillsMatch' },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$viewedAt', null] }, { $ne: ['$appliedAt', null] }] },
                { $divide: [{ $subtract: ['$viewedAt', '$appliedAt'] }, 1000 * 60 * 60 * 24] },
                null
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.job',
          totalApplications: { $sum: '$count' },
          byStatus: {
            $push: {
              status: '$_id.status',
              count: '$count',
              avgScore: '$avgScore',
              avgSkillsMatch: '$avgSkillsMatch'
            }
          },
          avgResponseTime: { $avg: '$avgResponseTime' }
        }
      },
      {
        $project: {
          job: '$_id',
          totalApplications: 1,
          byStatus: 1,
          avgResponseTime: { $round: ['$avgResponseTime', 1] }
        }
      },
      { $sort: { totalApplications: -1 } }
    ]);
    
    return analytics;
  } catch (error) {
    console.error('Error getting application analytics:', error);
    throw error;
  }
};

// Helper functions
const getDegreeRank = (degree) => {
  const degreeHierarchy = {
    'high school': 1,
    'diploma': 2,
    'associate': 3,
    'bachelor': 4,
    'master': 5,
    'phd': 6,
    'doctorate': 6
  };
  
  if (!degree) return 0;
  
  const lowerDegree = degree.toLowerCase();
  for (const [key, value] of Object.entries(degreeHierarchy)) {
    if (lowerDegree.includes(key)) {
      return value;
    }
  }
  return 0;
};

const isEducationMatch = (userDegree, jobEducation) => {
  const userRank = getDegreeRank(userDegree);
  const jobRank = getDegreeRank(jobEducation);
  return userRank >= jobRank;
};

// Virtuals
ApplicationSchema.virtual('applicantProfile').get(function() {
  return {
    name: this.name,
    email: this.email,
    phone: this.phone || this.applicantMetadata?.phone,
    location: this.location || this.applicantMetadata?.location,
    skills: this.applicantMetadata?.skills || [],
    education: this.applicantMetadata?.education || [],
    experience: this.applicantMetadata?.experience || [],
    profileImage: this.applicantMetadata?.profileImage,
    totalExperience: this.applicantMetadata?.totalExperience || 0,
    currentPosition: this.applicantMetadata?.currentPosition,
    currentCompany: this.applicantMetadata?.currentCompany
  };
});

ApplicationSchema.virtual('daysSinceApplied').get(function() {
  if (!this.appliedAt) return 0;
  const diffTime = Math.abs(new Date() - this.appliedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

ApplicationSchema.virtual('isRecent').get(function() {
  if (!this.appliedAt) return false;
  const diffTime = Math.abs(new Date() - this.appliedAt);
  const diffHours = diffTime / (1000 * 60 * 60);
  return diffHours < 24; // Applied within last 24 hours
});

// Query helpers
ApplicationSchema.query.byStatus = function(status) {
  return this.where({ status });
};

ApplicationSchema.query.byJob = function(jobId) {
  return this.where({ job: jobId });
};

ApplicationSchema.query.byCompany = function(companyId) {
  return this.where({ company: companyId });
};

ApplicationSchema.query.byApplicant = function(applicantId) {
  return this.where({ applicant: applicantId });
};

ApplicationSchema.query.withHighScore = function(minScore = 80) {
  return this.where({ score: { $gte: minScore } });
};

ApplicationSchema.query.recent = function(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return this.where({ appliedAt: { $gte: date } });
};

// Static method to get applications with populated data
ApplicationSchema.statics.getApplicationsWithDetails = async function(filter = {}, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'appliedAt',
    sortOrder = 'desc',
    populate = 'all'
  } = options;
  
  const skip = (page - 1) * limit;
  
  let query = this.find(filter);
  
  // Apply population based on options
  if (populate === 'all' || populate.includes('applicant')) {
    query = query.populate({
      path: 'applicant',
      select: 'name email profileImage phone location skills education experience totalExperience currentPosition currentCompany'
    });
  }
  
  if (populate === 'all' || populate.includes('job')) {
    query = query.populate({
      path: 'job',
      select: 'title description requirements location employmentType salary company'
    });
  }
  
  if (populate === 'all' || populate.includes('company')) {
    query = query.populate({
      path: 'company',
      select: 'name logo industry'
    });
  }
  
  // Apply sorting
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  query = query.sort(sort);
  
  // Apply pagination
  query = query.skip(skip).limit(limit);
  
  const [applications, total] = await Promise.all([
    query.exec(),
    this.countDocuments(filter)
  ]);
  
  return {
    applications,
    total,
    page,
    pages: Math.ceil(total / limit),
    hasMore: page * limit < total
  };
};

module.exports = mongoose.model('Application', ApplicationSchema);