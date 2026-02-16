const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  institution: {
    type: String,
    required: true,
    trim: true
  },
  degree: {
    type: String,
    required: true,
    trim: true
  },
  fieldOfStudy: {
    type: String,
    trim: true
  },
  startMonth: {
    type: Number,
    min: 1,
    max: 12
  },
  startYear: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear()
  },
  endMonth: {
    type: Number,
    min: 1,
    max: 12
  },
  endYear: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 5
  },
  description: {
    type: String,
    trim: true
  },
  isCurrentlyStudying: {
    type: Boolean,
    default: false
  },
  gpa: {
    type: Number,
    min: 0,
    max: 4
  }
}, { _id: false });

const experienceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  currentlyWorking: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true
  },
  employmentType: {
    type: String,
    enum: ["Full-time", "Part-time", "Contract", "Internship", "Freelance"],
    default: "Full-time"
  },
  industry: {
    type: String,
    trim: true
  },
  skillsUsed: [{
    type: String,
    trim: true
  }],
  achievements: [{
    type: String,
    trim: true
  }]
}, { _id: false });

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  proficiency: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
    default: "Intermediate"
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    max: 50
  },
  category: {
    type: String,
    enum: ["Technical", "Soft", "Language", "Certification", "Other"],
    default: "Technical"
  },
  verified: {
    type: Boolean,
    default: false
  },
  lastUsed: {
    type: Date
  }
}, { _id: false });

// Schema for tracking job applications
const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["Applied", "Under Review", "Shortlisted", "Rejected", "Accepted", "Withdrawn"],
    default: "Applied"
  },
  coverLetter: String,
  resume: String,
  screeningScore: {
    type: Number,
    min: 0,
    max: 100
  },
  interviewStage: {
    type: String,
    enum: ["Phone Screen", "Technical", "HR", "Final", "Offer"]
  },
  notes: [{
    content: String,
    addedBy: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { _id: true });

// Portfolio link schema
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

const UserSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [50, "Name cannot exceed 50 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"]
  },
  
  // Personal Information
  age: {
    type: Number,
    required: [true, "Age is required"],
    min: [16, "Age must be at least 16"],
    max: [100, "Age cannot exceed 100"]
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, "Please enter a valid phone number"]
  },
  location: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [1000, "Bio cannot exceed 1000 characters"]
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other", "Prefer not to say"]
  },
  
  // Professional Information
  role: {
    type: String,
    enum: ["Looking for job", "Hiring job", "admin", "freelancer", "student"],
    required: [true, "Role is required"],
    default: "Looking for job"
  },
  currentPosition: {
    type: String,
    trim: true
  },
  currentCompany: {
    type: String,
    trim: true
  },
  headline: {
    type: String,
    trim: true,
    maxlength: [120, "Headline cannot exceed 120 characters"]
  },
  totalExperience: {
    type: Number,
    min: 0,
    max: 50,
    default: 0
  },
  
  // Job Applications & Postings
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Application"
  }],
  // In your User model schema
  // In UserSchema - Make sure this is the only savedJobs definition:
  savedJobs: [{
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
}],
  postedJobs: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Job" 
  }],
  
  // Company Relationships
  ownedCompanies: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Company" 
  }],
  companyMemberships: [{
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },
    role: {
      type: String,
      enum: ["admin", "recruiter", "manager", "member", "hr", "owner"],
      default: "member"
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    permissions: [{
      type: String,
      enum: ["post_jobs", "view_applications", "manage_team", "edit_company"]
    }]
  }],
  
  // Skills & Qualifications
  skills: [skillSchema],
  education: [educationSchema],
  experience: [experienceSchema],
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    credentialId: String,
    credentialURL: String
  }],
  languages: [{
    language: String,
    proficiency: {
      type: String,
      enum: ["Basic", "Conversational", "Professional", "Native"]
    }
  }],
  
  // Portfolio & Links
  portfolioLinks: [portfolioLinkSchema], // ADDED: Multiple portfolio links
  linkedin: {
  type: String,
  trim: true,
  match: [
    /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company|feed|pub|profile)\/[a-zA-Z0-9-_.]+\/?$/,
    "Please enter a valid LinkedIn URL (profile, company, feed, or publication)"
  ]
},
  portfolio: {
    type: String,
    trim: true,
    match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, "Please enter a valid URL"]
  },
  twitter: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  
  // Files
  resume: {
    type: String
  },
  resumeFile: {
    filename: String,
    path: String,
    uploadedAt: Date
  },
  profileImage: {
    type: String,
    default: null
  },
  coverImage: {
    type: String,
    default: null
  },
  
  // Preferences & Settings
  jobPreferences: {
    jobTypes: [{
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship", "Freelance", "Remote", "On-site", "Hybrid"]
    }],
    salaryExpectation: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: "USD"
      },
      period: {
        type: String,
        enum: ["hourly", "daily", "weekly", "monthly", "yearly"],
        default: "yearly"
      }
    },
    preferredLocations: [String],
    preferredIndustries: [String],
    companySize: {
      type: String,
      enum: ["Startup (1-10)", "Small (11-50)", "Medium (51-200)", "Large (201-1000)", "Enterprise (1000+)"]
    },
    workEnvironment: [{
      type: String,
      enum: ["Fast-paced", "Structured", "Creative", "Collaborative", "Independent"]
    }],
    noticePeriod: {
      type: Number,
      default: 30,
      min: 0,
      max: 90
    }
  },
  
  // Following & Bookmarks
  following: [{
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },
    followedAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookmarks: [{
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },
    bookmarkedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // In UserSchema
  savedJobs: [{
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job"
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
}],
  
  // Job Alerts
  jobAlerts: [{
    name: String,
    searchQuery: String,
    location: String,
    jobTypes: [String],
    salaryRange: {
      min: Number,
      max: Number
    },
    experienceLevel: String,
    frequency: {
      type: String,
      enum: ["daily", "weekly", "instant"],
      default: "daily"
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics & Metrics
  profileViews: {
    type: Number,
    default: 0
  },
  searchAppearances: {
    type: Number,
    default: 0
  },
  applicationSuccessRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  averageMatchScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpiresAt: Date,
  verificationToken: String,
  verificationTokenExpiry: Date,
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
  emailVerificationCode: String,
  emailVerificationExpiry: Date,
  
  // Security
  lastPasswordChange: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  
  // Timestamps
  lastLogin: {
    type: Date
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  profileCompletionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update timestamps and calculate metrics
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.lastActive = Date.now();
  
  // Calculate profile completion percentage
  const fields = [
    { value: this.name, weight: 5 },
    { value: this.email, weight: 5 },
    { value: this.phone, weight: 3 },
    { value: this.location, weight: 3 },
    { value: this.bio, weight: 2 },
    { value: this.headline, weight: 3 },
    { value: this.skills, weight: 15, minLength: 3 },
    { value: this.education, weight: 10, minLength: 1 },
    { value: this.experience, weight: 15, minLength: 1 },
    { value: this.profileImage, weight: 5 },
    { value: this.resume, weight: 10 },
    { value: this.linkedin || this.portfolio || this.portfolioLinks?.length > 0, weight: 5 },
    { value: this.currentPosition, weight: 5 },
    { value: this.currentCompany, weight: 3 },
    { value: this.jobPreferences.salaryExpectation?.min, weight: 5 },
    { value: this.jobPreferences.preferredLocations, weight: 3, minLength: 1 }
  ];
  
  let totalWeight = 0;
  let completedWeight = 0;
  
  fields.forEach(field => {
    totalWeight += field.weight;
    
    if (Array.isArray(field.value)) {
      if (field.minLength) {
        if (field.value.length >= field.minLength) {
          completedWeight += field.weight;
        }
      } else if (field.value.length > 0) {
        completedWeight += field.weight;
      }
    } else if (field.value) {
      if (typeof field.value === 'string') {
        if (field.value.trim().length > 0) {
          completedWeight += field.weight;
        }
      } else if (typeof field.value === 'boolean') {
        if (field.value === true) {
          completedWeight += field.weight;
        }
      } else {
        completedWeight += field.weight;
      }
    }
  });
  
  this.profileCompletionPercentage = Math.round((completedWeight / totalWeight) * 100);
  this.profileCompleted = this.profileCompletionPercentage >= 70;
  
  // Calculate total experience
  if (this.experience && this.experience.length > 0) {
    let totalMonths = 0;
    this.experience.forEach(exp => {
      const startDate = new Date(exp.startDate);
      const endDate = exp.currentlyWorking ? new Date() : new Date(exp.endDate);
      const diffTime = Math.abs(endDate - startDate);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      totalMonths += diffMonths;
    });
    this.totalExperience = Math.round(totalMonths / 12);
  }
  
  next();
});

// Indexes for better query performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ name: 1 });
UserSchema.index({ location: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ "skills.name": 1 });
UserSchema.index({ "skills.category": 1 });
UserSchema.index({ totalExperience: 1 });
UserSchema.index({ applications: 1 });
UserSchema.index({ savedJobs: 1 });
UserSchema.index({ "companyMemberships.company": 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ "jobPreferences.preferredLocations": 1 });
UserSchema.index({ "jobPreferences.preferredIndustries": 1 });
UserSchema.index({ averageMatchScore: -1 });
UserSchema.index({ profileCompletionPercentage: -1 });

// Virtuals
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

UserSchema.virtual('experienceSummary').get(function() {
  if (this.totalExperience === 0) return "No experience";
  if (this.totalExperience === 1) return "1 year";
  return `${this.totalExperience} years`;
});

UserSchema.virtual('primarySkillCategories').get(function() {
  if (!this.skills || this.skills.length === 0) return [];
  
  const categories = {};
  this.skills.forEach(skill => {
    categories[skill.category] = (categories[skill.category] || 0) + 1;
  });
  
  return Object.keys(categories).sort((a, b) => categories[b] - categories[a]);
});

// Methods
UserSchema.methods.calculateJobMatchScore = function(job) {
  let score = 0;
  let totalPossible = 0;
  
  // Skills matching (40%)
  if (job.skills && job.skills.length > 0 && this.skills && this.skills.length > 0) {
    const userSkillNames = this.skills.map(s => s.name.toLowerCase());
    const matchedSkills = job.skills.filter(jobSkill => 
      userSkillNames.some(userSkill => 
        userSkill.includes(jobSkill.toLowerCase()) || 
        jobSkill.toLowerCase().includes(userSkill)
      )
    );
    const skillScore = (matchedSkills.length / job.skills.length) * 40;
    score += skillScore;
    totalPossible += 40;
  } else {
    totalPossible += 40;
  }
  
  // Experience matching (30%)
  if (job.experience && job.experience.minYears) {
    const experienceScore = Math.min(30, (this.totalExperience / job.experience.minYears) * 30);
    score += Math.min(experienceScore, 30);
    totalPossible += 30;
  } else {
    totalPossible += 30;
  }
  
  // Location matching (15%)
  if (job.location && this.jobPreferences.preferredLocations && this.jobPreferences.preferredLocations.length > 0) {
    const preferredLocation = this.jobPreferences.preferredLocations[0];
    if (job.location.toLowerCase().includes(preferredLocation.toLowerCase()) || 
        preferredLocation.toLowerCase().includes(job.location.toLowerCase())) {
      score += 15;
    }
    totalPossible += 15;
  } else {
    totalPossible += 15;
  }
  
  // Job type matching (10%)
  if (job.type && this.jobPreferences.jobTypes && this.jobPreferences.jobTypes.length > 0) {
    if (this.jobPreferences.jobTypes.includes(job.type)) {
      score += 10;
    }
    totalPossible += 10;
  } else {
    totalPossible += 10;
  }
  
  // Education matching (5%)
  if (job.education && this.education && this.education.length > 0) {
    const highestDegree = this.education.reduce((highest, edu) => {
      const degreeRank = getDegreeRank(edu.degree);
      return degreeRank > highest.rank ? { degree: edu.degree, rank: degreeRank } : highest;
    }, { degree: '', rank: 0 });
    
    if (isEducationMatch(highestDegree.degree, job.education)) {
      score += 5;
    }
    totalPossible += 5;
  } else {
    totalPossible += 5;
  }
  
  const finalScore = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;
  
  // Update average match score
  if (this.averageMatchScore === 0) {
    this.averageMatchScore = finalScore;
  } else {
    this.averageMatchScore = Math.round((this.averageMatchScore + finalScore) / 2);
  }
  
  return {
    score: finalScore,
    breakdown: {
      skills: Math.round(score),
      totalPossible: totalPossible
    }
  };
};

UserSchema.methods.getSkillNames = function() {
  return this.skills ? this.skills.map(skill => skill.name) : [];
};

UserSchema.methods.getTopSkills = function(limit = 10) {
  if (!this.skills || this.skills.length === 0) return [];
  
  return this.skills
    .sort((a, b) => {
      // Sort by proficiency first, then years of experience
      const proficiencyOrder = { Expert: 4, Advanced: 3, Intermediate: 2, Beginner: 1 };
      const aProf = proficiencyOrder[a.proficiency] || 0;
      const bProf = proficiencyOrder[b.proficiency] || 0;
      
      if (bProf !== aProf) return bProf - aProf;
      return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
    })
    .slice(0, limit);
};

UserSchema.methods.addSkill = function(skillData) {
  if (!this.skills) this.skills = [];
  
  const existingIndex = this.skills.findIndex(s => 
    s.name.toLowerCase() === skillData.name.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    // Update existing skill
    this.skills[existingIndex] = { ...this.skills[existingIndex], ...skillData };
  } else {
    // Add new skill
    this.skills.push(skillData);
  }
  
  return this;
};
// Add to UserSchema.methods
UserSchema.methods.saveJob = function(jobId) {
  // Check if job is already saved
  const alreadySaved = this.savedJobs.some(savedJob => 
    savedJob.job.toString() === jobId.toString()
  );
  
  if (!alreadySaved) {
    this.savedJobs.push({
      job: jobId,
      savedAt: new Date()
    });
  }
  return this;
};

UserSchema.methods.unsaveJob = function(jobId) {
  this.savedJobs = this.savedJobs.filter(
    savedJob => savedJob.job.toString() !== jobId.toString()
  );
  return this;
};

UserSchema.methods.isJobSaved = function(jobId) {
  return this.savedJobs.some(
    savedJob => savedJob.job.toString() === jobId.toString()
  );
};

UserSchema.methods.removeSkill = function(skillName) {
  if (!this.skills) return this;
  
  this.skills = this.skills.filter(s => 
    s.name.toLowerCase() !== skillName.toLowerCase()
  );
  
  return this;
};

UserSchema.methods.getApplications = function(status) {
  return this.populate({
    path: 'applications',
    match: status ? { status } : {},
    populate: {
      path: 'job',
      select: 'title companyName location type salary'
    }
  });
};

UserSchema.methods.addApplication = function(applicationId) {
  if (!this.applications.includes(applicationId)) {
    this.applications.push(applicationId);
  }
  return this;
};

UserSchema.methods.saveJob = function(jobId) {
  if (!this.savedJobs.includes(jobId)) {
    this.savedJobs.push(jobId);
  }
  return this;
};

UserSchema.methods.unsaveJob = function(jobId) {
  this.savedJobs = this.savedJobs.filter(id => id.toString() !== jobId.toString());
  return this;
};

UserSchema.methods.isJobSaved = function(jobId) {
  return this.savedJobs.some(id => id.toString() === jobId.toString());
};

UserSchema.methods.followCompany = function(companyId) {
  const isFollowing = this.following.some(f => f.company.toString() === companyId.toString());
  if (!isFollowing) {
    this.following.push({
      company: companyId,
      followedAt: new Date()
    });
  }
  return this;
};

UserSchema.methods.unfollowCompany = function(companyId) {
  this.following = this.following.filter(f => f.company.toString() !== companyId.toString());
  return this;
};

UserSchema.methods.bookmarkCompany = function(companyId) {
  const isBookmarked = this.bookmarks.some(b => b.company.toString() === companyId.toString());
  if (!isBookmarked) {
    this.bookmarks.push({
      company: companyId,
      bookmarkedAt: new Date()
    });
  }
  return this;
};

UserSchema.methods.removeBookmark = function(companyId) {
  this.bookmarks = this.bookmarks.filter(b => b.company.toString() !== companyId.toString());
  return this;
};

UserSchema.methods.getApplicationStats = async function() {
  const Application = mongoose.model('Application');
  const stats = await Application.aggregate([
    { $match: { applicant: this._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const total = await Application.countDocuments({ applicant: this._id });
  const accepted = await Application.countDocuments({ 
    applicant: this._id, 
    status: 'Accepted' 
  });
  
  const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
  this.applicationSuccessRate = successRate;
  
  return {
    total,
    successRate,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {})
  };
};

UserSchema.methods.createJobAlert = function(alertData) {
  if (!this.jobAlerts) this.jobAlerts = [];
  
  this.jobAlerts.push({
    ...alertData,
    createdAt: new Date()
  });
  
  return this;
};

UserSchema.methods.updateProfileViews = function() {
  this.profileViews += 1;
  return this;
};

// Add portfolio link methods
UserSchema.methods.addPortfolioLink = function(portfolioLinkData) {
  if (!this.portfolioLinks) this.portfolioLinks = [];
  
  // If this is the first link, mark it as primary
  if (this.portfolioLinks.length === 0) {
    portfolioLinkData.isPrimary = true;
  }
  
  this.portfolioLinks.push(portfolioLinkData);
  return this;
};

UserSchema.methods.removePortfolioLink = function(portfolioLinkId) {
  if (!this.portfolioLinks) return this;
  
  const linkToRemove = this.portfolioLinks.id(portfolioLinkId);
  if (linkToRemove && linkToRemove.isPrimary && this.portfolioLinks.length > 1) {
    // Make another link primary
    const anotherLink = this.portfolioLinks.find(link => !link._id.equals(portfolioLinkId));
    if (anotherLink) {
      anotherLink.isPrimary = true;
    }
  }
  
  this.portfolioLinks = this.portfolioLinks.filter(link => !link._id.equals(portfolioLinkId));
  return this;
};

UserSchema.methods.setPrimaryPortfolioLink = function(portfolioLinkId) {
  if (!this.portfolioLinks) return this;
  
  this.portfolioLinks.forEach(link => {
    link.isPrimary = link._id.equals(portfolioLinkId);
  });
  
  return this;
};

UserSchema.methods.getPrimaryPortfolioLink = function() {
  if (!this.portfolioLinks || this.portfolioLinks.length === 0) return null;
  return this.portfolioLinks.find(link => link.isPrimary) || this.portfolioLinks[0];
};

// Static methods
UserSchema.statics.findBySkills = function(skills, minMatch = 1) {
  return this.find({
    skills: {
      $elemMatch: {
        name: { $in: skills }
      }
    }
  });
};

UserSchema.statics.findRecruiters = function() {
  return this.find({ role: "Hiring job" });
};

UserSchema.statics.findJobSeekers = function() {
  return this.find({ role: "Looking for job" });
};

UserSchema.statics.findByLocation = function(location) {
  return this.find({
    $or: [
      { location: { $regex: location, $options: 'i' } },
      { "address.city": { $regex: location, $options: 'i' } },
      { "jobPreferences.preferredLocations": { $regex: location, $options: 'i' } }
    ]
  });
};

UserSchema.statics.getTopCandidates = function(jobData, limit = 10) {
  return this.aggregate([
    { $match: { role: "Looking for job", isActive: true } },
    {
      $addFields: {
        matchScore: {
          $let: {
            vars: {
              // Calculate skill match
              skillMatch: {
                $cond: {
                  if: { $gt: [{ $size: "$skills" }, 0] },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $size: { 
                            $setIntersection: [
                              "$skills.name", 
                              jobData.skills || []
                            ] 
                          } },
                          { $size: jobData.skills || [] }
                        ]
                      },
                      40
                    ]
                  },
                  else: 0
                }
              },
              // Calculate experience match
              expMatch: {
                $cond: {
                  if: { $and: [jobData.experience, jobData.experience.minYears] },
                  then: {
                    $min: [
                      30,
                      { $multiply: [
                        { $divide: ["$totalExperience", jobData.experience.minYears] },
                        30
                      ] }
                    ]
                  },
                  else: 0
                }
              }
            },
            in: {
              $add: ["$$skillMatch", "$$expMatch"]
            }
          }
        }
      }
    },
    { $sort: { matchScore: -1, profileCompletionPercentage: -1 } },
    { $limit: limit },
    {
      $project: {
        name: 1,
        email: 1,
        location: 1,
        currentPosition: 1,
        currentCompany: 1,
        totalExperience: 1,
        skills: 1,
        matchScore: 1,
        profileImage: 1
      }
    }
  ]);
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

module.exports = mongoose.model("User", UserSchema);