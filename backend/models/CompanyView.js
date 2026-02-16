const mongoose = require('mongoose');

const companyViewSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    enum: ['direct', 'search', 'social', 'referral', 'internal'],
    default: 'direct'
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  sessionId: {
    type: String,
    default: ''
  }
});

// Compound indexes for better query performance
companyViewSchema.index({ company: 1, viewedAt: -1 });
companyViewSchema.index({ ipAddress: 1, company: 1, viewedAt: -1 });
companyViewSchema.index({ sessionId: 1 });
companyViewSchema.index({ viewedAt: 1 });

// Virtual for date-only view (for grouping)
companyViewSchema.virtual('viewDate').get(function() {
  return this.viewedAt.toISOString().split('T')[0];
});

// Static method to track a view
companyViewSchema.statics.trackView = async function(companyId, data) {
  try {
    const view = new this({
      company: companyId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      viewer: data.userId,
      source: data.source || 'direct',
      sessionId: data.sessionId || '',
      duration: data.duration || 0
    });
    
    await view.save();
    return view;
  } catch (error) {
    console.error('Error tracking view:', error);
    return null;
  }
};

// Static method to get unique views
companyViewSchema.statics.getUniqueViews = async function(companyId, startDate, endDate) {
  const match = {
    company: new mongoose.Types.ObjectId(companyId),
    viewedAt: { $gte: startDate, $lte: endDate }
  };
  
  return await this.aggregate([
    { $match: match },
    { $group: { _id: "$ipAddress" } },
    { $count: "count" }
  ]);
};

// Static method to get views by date
companyViewSchema.statics.getViewsByDate = async function(companyId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        company: new mongoose.Types.ObjectId(companyId),
        viewedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$viewedAt" }
        },
        totalViews: { $sum: 1 },
        uniqueViews: { $addToSet: "$ipAddress" }
      }
    },
    {
      $project: {
        date: "$_id",
        totalViews: 1,
        uniqueViews: { $size: "$uniqueViews" },
        _id: 0
      }
    },
    { $sort: { date: 1 } }
  ]);
};

module.exports = mongoose.model('CompanyView', companyViewSchema);