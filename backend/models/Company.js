const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Company name is required"],
    trim: true,
    unique: true
  },
  email: {
    type: String,
    required: [true, "Company email is required"],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
  },
  description: {
    type: String,
    required: [true, "Company description is required"],
    minlength: [50, "Description should be at least 50 characters"]
  },
  website: {
    type: String,
    match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, "Please enter a valid URL"]
  },
  location: {
    type: String,
    required: [true, "Company location is required"]
  },
  industry: {
    type: String,
    required: [true, "Industry is required"]
  },
  size: {
    type: String,
    enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    required: true
  },
  foundedYear: {
    type: Number,
    min: [1800, "Founded year seems invalid"],
    max: [new Date().getFullYear(), "Founded year cannot be in the future"]
  },
  logo: {
    type: String,
    default: null
  },
  coverImage: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, "Please enter a valid phone number"]
  },
  socialLinks: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String
  },
  // Reference to the user who created/owns this company (HR/Recruiter)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // Team members who can manage this company
  teamMembers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    role: {
      type: String,
      enum: ["admin", "recruiter", "manager"],
      default: "recruiter"
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Jobs posted by this company
  jobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job"
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
companySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Company", companySchema);