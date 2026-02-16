const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Staff email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: [true, 'Staff name is required'],
    trim: true
  },
  departments: {
    type: [String],
    required: [true, 'At least one department must be assigned'],
    enum: [
      'General Inquiry',
      'Technical Support',
      'Billing',
      'Privacy Concerns',
      'Bug Report',
      'Feature Request'
    ]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
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

// Update the updatedAt timestamp before saving
StaffSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Staff', StaffSchema);
