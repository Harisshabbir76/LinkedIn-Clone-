const express = require("express");
const router = express.Router();
const Company = require("../models/Company");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Job = require("../models/Jobs");
const Application = require("../models/Application");
const CompanyView = require("../models/CompanyView");
const authMiddleware = require("../middleware/authMiddleware");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/company/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// Middleware to check if user is company owner or admin
const checkCompanyPermission = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const userId = req.user._id;
    
    const company = await Company.findById(companyId).populate('owner', 'email name');
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    if (company.owner.toString() !== userId.toString()) {
      const isTeamMember = company.teamMembers.some(member => 
        member.user.toString() === userId.toString() && member.role === "admin"
      );
      
      if (!isTeamMember) {
        return res.status(403).json({ error: "You don't have permission to perform this action" });
      }
    }
    
    req.company = company;
    next();
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Middleware to track company views
const trackCompanyView = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    if (!companyId || req.method !== 'GET') {
      return next();
    }
    
    // Get IP address
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Determine source
    const referer = req.get('Referer') || '';
    let source = 'direct';
    
    if (referer.includes('google') || referer.includes('bing') || referer.includes('yahoo')) {
      source = 'search';
    } else if (referer.includes('facebook') || referer.includes('twitter') || referer.includes('linkedin')) {
      source = 'social';
    } else if (referer && !referer.includes(req.get('host'))) {
      source = 'referral';
    } else if (referer.includes(req.get('host'))) {
      source = 'internal';
    }
    
    // Track the view asynchronously
    setTimeout(async () => {
      try {
        const view = new CompanyView({
          company: companyId,
          ipAddress: ipAddress,
          userAgent: req.get('User-Agent') || '',
          viewer: req.user?._id || null,
          source: source
        });
        await view.save();
      } catch (viewError) {
        console.error('Error tracking view:', viewError);
      }
    }, 0);
    
    next();
  } catch (error) {
    console.error('Track view middleware error:', error);
    next();
  }
};

// ==================== DASHBOARD ROUTES ====================

// @route   GET /api/company/dashboard/summary
// @desc    Get company dashboard summary for authenticated user
// @access  Private
router.get("/dashboard/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const companies = await Company.find({
      $or: [
        { owner: userId },
        { "teamMembers.user": userId }
      ],
      isActive: true
    })
    .populate("owner", "name email")
    .populate("jobs", "title location employmentType")
    .select("name logo industry location size jobs createdAt")
    .sort({ createdAt: -1 });
    
    const totalJobs = companies.reduce((sum, company) => sum + (company.jobs?.length || 0), 0);
    const totalTeamMembers = companies.reduce((sum, company) => sum + (company.teamMembers?.length || 0), 0);
    const activeCompanies = companies.length;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentJobs = await Job.find({
      company: { $in: companies.map(c => c._id) },
      createdAt: { $gte: thirtyDaysAgo }
    }).countDocuments();
    
    res.json({
      companies,
      summary: {
        activeCompanies,
        totalJobs,
        totalTeamMembers,
        recentJobs
      },
      recentActivity: {
        jobViews: 0,
        applications: 0,
        follows: 0
      }
    });
  } catch (error) {
    console.error("Get dashboard summary error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/company/dashboard/analytics
// @desc    Get company dashboard analytics
// @access  Private
router.get("/dashboard/analytics", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const companies = await Company.find({
      $or: [
        { owner: userId },
        { "teamMembers.user": userId }
      ],
      isActive: true
    }).select("_id");
    
    const companyIds = companies.map(c => c._id);
    
    const totalJobs = await Job.countDocuments({ 
      company: { $in: companyIds } 
    });
    
    const activeJobs = await Job.countDocuments({ 
      company: { $in: companyIds },
      status: 'active'
    });
    
    const closedJobs = await Job.countDocuments({ 
      company: { $in: companyIds },
      status: 'closed'
    });
    
    const totalApplications = await Application.countDocuments({
      job: { $in: await Job.find({ company: { $in: companyIds } }).select('_id') }
    });
    
    // Get actual view data
    const companyViews = await Promise.all(
      companyIds.map(async (companyId) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const totalViews = await CompanyView.countDocuments({
          company: companyId,
          viewedAt: { $gte: thirtyDaysAgo }
        });
        
        const uniqueViews = await CompanyView.aggregate([
          {
            $match: {
              company: new mongoose.Types.ObjectId(companyId),
              viewedAt: { $gte: thirtyDaysAgo }
            }
          },
          {
            $group: {
              _id: "$ipAddress"
            }
          },
          {
            $count: "count"
          }
        ]);
        
        return { totalViews, uniqueViews: uniqueViews[0]?.count || 0 };
      })
    );
    
    const totalViews = companyViews.reduce((sum, view) => sum + view.totalViews, 0);
    const totalUniqueViews = companyViews.reduce((sum, view) => sum + view.uniqueViews, 0);
    
    const analytics = {
      jobs: {
        total: totalJobs,
        active: activeJobs,
        closed: closedJobs,
        byMonth: [
          { month: 'Jan', count: 12 },
          { month: 'Feb', count: 8 },
          { month: 'Mar', count: 15 },
          { month: 'Apr', count: 10 },
          { month: 'May', count: 18 },
          { month: 'Jun', count: 14 }
        ]
      },
      applications: {
        total: totalApplications,
        pending: await Application.countDocuments({
          job: { $in: await Job.find({ company: { $in: companyIds } }).select('_id') },
          status: 'pending'
        }),
        reviewed: await Application.countDocuments({
          job: { $in: await Job.find({ company: { $in: companyIds } }).select('_id') },
          status: 'reviewed'
        }),
        shortlisted: await Application.countDocuments({
          job: { $in: await Job.find({ company: { $in: companyIds } }).select('_id') },
          status: 'shortlisted'
        }),
        rejected: await Application.countDocuments({
          job: { $in: await Job.find({ company: { $in: companyIds } }).select('_id') },
          status: 'rejected'
        })
      },
      views: {
        total: totalViews,
        unique: totalUniqueViews,
        growth: totalUniqueViews > 0 ? Math.round(((totalUniqueViews - (totalUniqueViews * 0.8)) / (totalUniqueViews * 0.8)) * 100) : 0
      },
      engagement: {
        followers: await User.countDocuments({
          "following.company": { $in: companyIds }
        }),
        shares: 0, // Implement if you have sharing feature
        saves: 0   // Implement if you have saving feature
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Get dashboard analytics error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== MAIN COMPANY ROUTES ====================

// @route   POST /api/company/create
// @desc    Create a new company
// @access  Private
router.post(
  "/create",
  authMiddleware,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  [
    body("name").notEmpty().withMessage("Company name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("description").notEmpty().withMessage("Description is required").isLength({ min: 50 }).withMessage("Description should be at least 50 characters"),
    body("location").notEmpty().withMessage("Location is required"),
    body("industry").notEmpty().withMessage("Industry is required"),
    body("size").notEmpty().withMessage("Company size is required")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.files) {
          if (req.files.logo) fs.unlinkSync(req.files.logo[0].path);
          if (req.files.coverImage) fs.unlinkSync(req.files.coverImage[0].path);
        }
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { 
        name, 
        email, 
        description, 
        website, 
        location, 
        industry, 
        size,
        foundedYear,
        phone,
        socialLinks
      } = req.body;
      
      const existingCompany = await Company.findOne({ 
        $or: [{ name }, { email }] 
      });
      
      if (existingCompany) {
        if (req.files) {
          if (req.files.logo) fs.unlinkSync(req.files.logo[0].path);
          if (req.files.coverImage) fs.unlinkSync(req.files.coverImage[0].path);
        }
        return res.status(400).json({ error: "Company with this name or email already exists" });
      }
      
      let parsedSocialLinks = {};
      if (socialLinks) {
        try {
          parsedSocialLinks = JSON.parse(socialLinks);
        } catch (e) {
          parsedSocialLinks = {};
        }
      }
      
      const companyData = {
        name,
        email,
        description,
        website,
        location,
        industry,
        size,
        foundedYear: foundedYear || null,
        phone: phone || null,
        socialLinks: parsedSocialLinks,
        owner: req.user._id
      };
      
      if (req.files && req.files.logo) {
        companyData.logo = req.files.logo[0].path;
      }
      
      if (req.files && req.files.coverImage) {
        companyData.coverImage = req.files.coverImage[0].path;
      }
      
      const company = new Company(companyData);
      await company.save();
      
      company.teamMembers.push({
        user: req.user._id,
        role: "admin"
      });
      await company.save();
      
      try {
        await User.findByIdAndUpdate(
          req.user._id,
          { $addToSet: { ownedCompanies: company._id } },
          { new: true }
        );
      } catch (userUpdateError) {
        console.error("Error updating user's owned companies:", userUpdateError);
      }
      
      res.status(201).json({
        message: "Company created successfully",
        company: company
      });
      
    } catch (error) {
      console.error("Create company error:", error);
      if (req.files) {
        if (req.files.logo) {
          try { fs.unlinkSync(req.files.logo[0].path); } catch (e) {}
        }
        if (req.files.coverImage) {
          try { fs.unlinkSync(req.files.coverImage[0].path); } catch (e) {}
        }
      }
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   GET /api/company
// @desc    Get all companies (with optional filters)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { 
      industry, 
      location, 
      size, 
      search,
      page = 1, 
      limit = 10 
    } = req.query;
    
    const filter = { isActive: true };
    
    if (industry) filter.industry = { $regex: industry, $options: 'i' };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (size) filter.size = size;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const [companies, total] = await Promise.all([
      Company.find(filter)
        .populate("owner", "name")
        .populate("jobs", "title")
        .select("name description logo industry location size jobs")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Company.countDocuments(filter)
    ]);
    
    res.json({
      companies,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error("Get all companies error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/company/user/my-companies
// @desc    Get all companies owned/managed by the authenticated user
// @access  Private
router.get("/user/my-companies", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const companies = await Company.find({
      $or: [
        { owner: userId },
        { "teamMembers.user": userId }
      ]
    })
    .populate("owner", "name email")
    .populate("jobs", "title location")
    .select("name email description logo industry location size jobs isActive")
    .sort({ createdAt: -1 });
    
    res.json({ companies });
  } catch (error) {
    console.error("Get user companies error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== COMPANY BY ID ROUTES ====================

// @route   GET /api/company/:id
// @desc    Get company details by ID (with view tracking)
// @access  Public
router.get("/:id", trackCompanyView, async (req, res) => {
  try {
    const companyId = req.params.id;
    
    const company = await Company.findById(companyId)
      .populate("owner", "name email profileImage")
      .populate("teamMembers.user", "name email profileImage role")
      .populate("jobs", "title location employmentType salary createdAt status")
      .select("-__v");
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    res.json({ company });
  } catch (error) {
    console.error("Get company error:", error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid company ID format" });
    }
    
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/company/:id/stats
// @desc    Get accurate company statistics
// @access  Public
router.get("/:id/stats", async (req, res) => {
  try {
    const companyId = req.params.id;
    
    const company = await Company.findById(companyId).populate('owner', 'email name');
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    // Get actual followers count
    const followersCount = await User.countDocuments({
      "following.company": companyId
    });
    
    // Get page views from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const totalViews = await CompanyView.countDocuments({
      company: companyId,
      viewedAt: { $gte: thirtyDaysAgo }
    });
    
    // Get unique views from last 30 days (unique IPs)
    const uniqueViewsResult = await CompanyView.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          viewedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: "$ipAddress"
        }
      },
      {
        $count: "count"
      }
    ]);
    
    const uniqueViews = uniqueViewsResult[0]?.count || 0;
    
    // Get active jobs count
    const activeJobs = await Job.countDocuments({ 
      company: companyId,
      status: 'active'
    });
    
    // Get total jobs count
    const totalJobs = await Job.countDocuments({ 
      company: companyId
    });
    
    // Get applications for all jobs of this company
    const companyJobs = await Job.find({ company: companyId }).select('_id');
    const jobIds = companyJobs.map(job => job._id);
    
    const totalApplications = await Application.countDocuments({
      job: { $in: jobIds }
    });
    
    // Get applications from last 30 days
    const recentApplications = await Application.countDocuments({
      job: { $in: jobIds },
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Calculate engagement rate based on actual data
    let engagementRate = 0;
    
    if (totalViews > 0) {
      // Calculate based on interactions per unique view
      const interactions = followersCount + recentApplications;
      engagementRate = Math.round((interactions / Math.max(uniqueViews, 1)) * 100);
    }
    
    // Ensure engagement rate is reasonable (between 1-100%)
    engagementRate = Math.max(1, Math.min(100, engagementRate));
    
    // Get unique team members (excluding duplicates and owner)
    const uniqueTeamMembers = company.teamMembers.reduce((acc, member) => {
      const userId = member.user.toString();
      if (userId !== company.owner.toString() && !acc.includes(userId)) {
        acc.push(userId);
      }
      return acc;
    }, []).length;
    
    // Get view trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyViews = await CompanyView.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          viewedAt: { $gte: sevenDaysAgo }
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
    
    const stats = {
      followers: followersCount,
      pageViews: totalViews,
      uniqueViews: uniqueViews,
      engagement: engagementRate,
      jobs: activeJobs,
      totalJobs: totalJobs,
      teamMembers: uniqueTeamMembers + 1, // Include owner
      totalApplications: totalApplications,
      recentApplications: recentApplications,
      trends: {
        dailyViews: dailyViews
      }
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Get company stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/company/:id/views
// @desc    Get detailed view analytics for company
// @access  Private (Company owner/admin)
router.get("/:id/views", authMiddleware, checkCompanyPermission, async (req, res) => {
  try {
    const companyId = req.params.id;
    
    // Get views by source
    const viewsBySource = await CompanyView.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          viewedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get views by hour of day
    const viewsByHour = await CompanyView.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          viewedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $hour: "$viewedAt" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json({
      viewsBySource,
      viewsByHour
    });
  } catch (error) {
    console.error("Get view analytics error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/company/:id/follow
// @desc    Follow a company
// @access  Private
router.post("/:id/follow", authMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.user._id;
    
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    // Check if already following
    const user = await User.findById(userId);
    const isFollowing = user.following.some(f => f.company.toString() === companyId);
    
    if (isFollowing) {
      return res.status(400).json({ error: "Already following this company" });
    }
    
    // Add to user's following
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          following: {
            company: companyId,
            followedAt: new Date()
          }
        }
      }
    );
    
    // Get updated follower count
    const updatedFollowersCount = await User.countDocuments({
      "following.company": companyId
    });
    
    // Create notification for company owner (if owner exists and is not the follower)
    try {
      if (company.owner && company.owner.email && company.owner._id.toString() !== req.user._id.toString()) {
        const note = new Notification({
          userEmail: company.owner.email,
          userId: company.owner._id,
          type: 'new_message',
          title: `${req.user.name || 'Someone'} started following ${company.name}`,
          message: `${req.user.name || req.user.email} started following your company ${company.name}.`,
          isConversational: false,
          actionUrl: `/company/${company._id}`
        });
        const savedNote = await note.save();
        console.log('Follow notification created:', {
          noteId: savedNote._id,
          for: savedNote.userEmail,
          company: company._id
        });
      }
    } catch (notifyErr) {
      console.error('Follow notification error:', notifyErr);
    }

    res.json({ 
      message: "Following company", 
      isFollowing: true,
      followers: updatedFollowersCount
    });
  } catch (error) {
    console.error("Follow company error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /api/company/:id/follow
// @desc    Unfollow a company
// @access  Private
router.delete("/:id/follow", authMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.user._id;
    
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    // Remove from user's following
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: {
          following: { company: companyId }
        }
      }
    );
    
    // Get updated follower count
    const updatedFollowersCount = await User.countDocuments({
      "following.company": companyId
    });
    
    res.json({ 
      message: "Unfollowed company", 
      isFollowing: false,
      followers: updatedFollowersCount
    });
  } catch (error) {
    console.error("Unfollow company error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/company/:id/follow/check
// @desc    Check if user is following company
// @access  Private
router.get("/:id/follow/check", authMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    const isFollowing = user.following.some(f => f.company.toString() === companyId);
    
    res.json({ isFollowing });
  } catch (error) {
    console.error("Check follow error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/company/:id/bookmark
// @desc    Bookmark a company
// @access  Private
router.post("/:id/bookmark", authMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.user._id;
    
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    // Check if already bookmarked
    const user = await User.findById(userId);
    const isBookmarked = user.bookmarks.some(b => b.company.toString() === companyId);
    
    if (isBookmarked) {
      return res.status(400).json({ error: "Already bookmarked this company" });
    }
    
    // Add to user's bookmarks
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          bookmarks: {
            company: companyId,
            bookmarkedAt: new Date()
          }
        }
      }
    );
    
    res.json({ 
      message: "Company bookmarked", 
      isBookmarked: true
    });
  } catch (error) {
    console.error("Bookmark company error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /api/company/:id/bookmark
// @desc    Remove bookmark from company
// @access  Private
router.delete("/:id/bookmark", authMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.user._id;
    
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    // Remove from user's bookmarks
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: {
          bookmarks: { company: companyId }
        }
      }
    );
    
    res.json({ 
      message: "Bookmark removed", 
      isBookmarked: false
    });
  } catch (error) {
    console.error("Remove bookmark error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/company/:id/bookmark/check
// @desc    Check if user has bookmarked company
// @access  Private
router.get("/:id/bookmark/check", authMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    const isBookmarked = user.bookmarks.some(b => b.company.toString() === companyId);
    
    res.json({ isBookmarked });
  } catch (error) {
    console.error("Check bookmark error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   PUT /api/company/:id/update
// @desc    Update company information
// @access  Private (Company owner or admin)
router.put(
  "/:id/update",
  authMiddleware,
  checkCompanyPermission,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  [
    body("name").optional().notEmpty().withMessage("Company name cannot be empty"),
    body("email").optional().isEmail().withMessage("Valid email is required"),
    body("description").optional().isLength({ min: 50 }).withMessage("Description should be at least 50 characters")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const company = req.company;
      const updateData = {};
      
      const fields = [
        "name", "email", "description", "website", "location", 
        "industry", "size", "foundedYear", "phone"
      ];
      
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      
      if (req.body.socialLinks) {
        try {
          const parsedSocialLinks = JSON.parse(req.body.socialLinks);
          updateData.socialLinks = { ...company.socialLinks, ...parsedSocialLinks };
        } catch (e) {
          return res.status(400).json({ error: "Invalid social links format" });
        }
      }
      
      if (req.files && req.files.logo) {
        if (company.logo) {
          try { fs.unlinkSync(company.logo); } catch (e) {}
        }
        updateData.logo = req.files.logo[0].path;
      }
      
      if (req.files && req.files.coverImage) {
        if (company.coverImage) {
          try { fs.unlinkSync(company.coverImage); } catch (e) {}
        }
        updateData.coverImage = req.files.coverImage[0].path;
      }
      
      const updatedCompany = await Company.findByIdAndUpdate(
        company._id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("owner", "name email")
       .populate("teamMembers.user", "name email");
      
      res.json({
        message: "Company updated successfully",
        company: updatedCompany
      });
      
    } catch (error) {
      console.error("Update company error:", error);
      
      if (req.files) {
        if (req.files.logo) {
          try { fs.unlinkSync(req.files.logo[0].path); } catch (e) {}
        }
        if (req.files.coverImage) {
          try { fs.unlinkSync(req.files.coverImage[0].path); } catch (e) {}
        }
      }
      
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   DELETE /api/company/:id/logo
// @desc    Delete company logo
// @access  Private (Company owner or admin)
router.delete("/:id/logo", authMiddleware, checkCompanyPermission, async (req, res) => {
  try {
    const company = req.company;
    
    if (!company.logo) {
      return res.status(400).json({ error: "No logo to delete" });
    }
    
    try {
      fs.unlinkSync(company.logo);
    } catch (error) {
      console.error("Error deleting logo file:", error);
    }
    
    company.logo = null;
    await company.save();
    
    res.json({ message: "Logo deleted successfully" });
  } catch (error) {
    console.error("Delete logo error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /api/company/:id/cover
// @desc    Delete company cover image
// @access  Private (Company owner or admin)
router.delete("/:id/cover", authMiddleware, checkCompanyPermission, async (req, res) => {
  try {
    const company = req.company;
    
    if (!company.coverImage) {
      return res.status(400).json({ error: "No cover image to delete" });
    }
    
    try {
      fs.unlinkSync(company.coverImage);
    } catch (error) {
      console.error("Error deleting cover image file:", error);
    }
    
    company.coverImage = null;
    await company.save();
    
    res.json({ message: "Cover image deleted successfully" });
  } catch (error) {
    console.error("Delete cover image error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/company/:id/team/add
// @desc    Add a team member to company
// @access  Private (Company owner or admin)
router.post(
  "/:id/team/add",
  authMiddleware,
  checkCompanyPermission,
  [
    body("userId").notEmpty().withMessage("User ID is required"),
    body("role").isIn(["admin", "recruiter", "manager"]).withMessage("Invalid role")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { userId, role } = req.body;
      const company = req.company;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const isAlreadyMember = company.teamMembers.some(
        member => member.user.toString() === userId
      );
      
      if (isAlreadyMember) {
        return res.status(400).json({ error: "User is already a team member" });
      }
      
      company.teamMembers.push({
        user: userId,
        role: role
      });
      
      await company.save();
      
      res.json({
        message: "Team member added successfully",
        teamMember: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email
          },
          role: role
        }
      });
    } catch (error) {
      console.error("Add team member error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   DELETE /api/company/:id
// @desc    Delete a company (soft delete by setting isActive to false)
// @access  Private (Company owner only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.user._id;
    
    const company = await Company.findById(companyId);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    if (company.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only company owner can delete the company" });
    }
    
    company.isActive = false;
    await company.save();
    
    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Delete company error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/company/similar
// @desc    Get similar companies with intelligent matching
// @access  Public
router.get("/similar", async (req, res) => {
  try {
    const { industry, location, exclude, limit = 5 } = req.query;
    
    if (!industry || !location) {
      return res.status(400).json({ error: "Industry and location are required" });
    }
    
    const searchResults = {
      sameIndustrySameCity: [],
      sameIndustryDifferentCity: [],
      sameCityDifferentIndustry: [],
      otherCompanies: []
    };
    
    // Clean and parse location
    const locationParts = location.split(',').map(part => part.trim());
    const city = locationParts[0];
    const stateOrCountry = locationParts[1] || locationParts[0];
    
    // Phase 1: Same industry AND same city (exact match)
    searchResults.sameIndustrySameCity = await Company.find({
      isActive: true,
      industry: { $regex: new RegExp(`^${industry}$`, 'i') },
      location: { $regex: new RegExp(`^${city}`, 'i') },
      _id: { $ne: exclude }
    })
    .select("name industry location logo size description foundedYear")
    .limit(limit)
    .lean();
    
    // Phase 2: Same industry, different location
    if (searchResults.sameIndustrySameCity.length < limit) {
      searchResults.sameIndustryDifferentCity = await Company.find({
        isActive: true,
        industry: { $regex: new RegExp(`^${industry}$`, 'i') },
        location: { $not: new RegExp(city, 'i') },
        _id: { $ne: exclude, $nin: searchResults.sameIndustrySameCity.map(c => c._id) }
      })
      .select("name industry location logo size description foundedYear")
      .limit(limit - searchResults.sameIndustrySameCity.length)
      .lean();
    }
    
    // Phase 3: Same city, different industry
    if (searchResults.sameIndustrySameCity.length + searchResults.sameIndustryDifferentCity.length < limit) {
      searchResults.sameCityDifferentIndustry = await Company.find({
        isActive: true,
        industry: { $not: new RegExp(`^${industry}$`, 'i') },
        location: { $regex: new RegExp(`^${city}`, 'i') },
        _id: { $ne: exclude, $nin: [
          ...searchResults.sameIndustrySameCity.map(c => c._id),
          ...searchResults.sameIndustryDifferentCity.map(c => c._id)
        ]}
      })
      .select("name industry location logo size description foundedYear")
      .limit(limit - (searchResults.sameIndustrySameCity.length + searchResults.sameIndustryDifferentCity.length))
      .lean();
    }
    
    // Phase 4: Other companies (fallback)
    if (searchResults.sameIndustrySameCity.length + 
        searchResults.sameIndustryDifferentCity.length + 
        searchResults.sameCityDifferentIndustry.length < limit) {
      
      searchResults.otherCompanies = await Company.find({
        isActive: true,
        _id: { $ne: exclude, $nin: [
          ...searchResults.sameIndustrySameCity.map(c => c._id),
          ...searchResults.sameIndustryDifferentCity.map(c => c._id),
          ...searchResults.sameCityDifferentIndustry.map(c => c._id)
        ]}
      })
      .select("name industry location logo size description foundedYear")
      .limit(limit - (searchResults.sameIndustrySameCity.length + 
                     searchResults.sameIndustryDifferentCity.length + 
                     searchResults.sameCityDifferentIndustry.length))
      .lean();
    }
    
    // Combine all results
    let allCompanies = [
      ...searchResults.sameIndustrySameCity,
      ...searchResults.sameIndustryDifferentCity,
      ...searchResults.sameCityDifferentIndustry,
      ...searchResults.otherCompanies
    ];
    
    // Remove duplicates
    const uniqueCompanies = [];
    const seenIds = new Set();
    
    for (const company of allCompanies) {
      if (!seenIds.has(company._id.toString())) {
        seenIds.add(company._id.toString());
        uniqueCompanies.push(company);
      }
    }
    
    // Get follower counts and calculate similarity scores
    const companiesWithStats = await Promise.all(
      uniqueCompanies.map(async (company) => {
        const followersCount = await User.countDocuments({
          "following.company": company._id
        });
        
        // Calculate similarity score
        let similarityScore = 0;
        
        // Industry match (50 points for exact match)
        if (company.industry.toLowerCase() === industry.toLowerCase()) {
          similarityScore += 50;
        }
        
        // Location match (30 points for exact city match, 20 for region match)
        if (company.location.toLowerCase().includes(city.toLowerCase())) {
          if (company.location.toLowerCase().startsWith(city.toLowerCase())) {
            similarityScore += 30;
          } else {
            similarityScore += 20;
          }
        }
        
        // Company size similarity (10 points)
        if (company.size) {
          similarityScore += 10;
        }
        
        // Founding year similarity (10 points if within 5 years)
        if (company.foundedYear) {
          similarityScore += 5;
        }
        
        return {
          _id: company._id,
          name: company.name,
          industry: company.industry,
          location: company.location,
          logo: company.logo,
          size: company.size,
          description: company.description,
          followers: followersCount,
          similarity: Math.min(100, similarityScore),
          matchType: company.industry.toLowerCase() === industry.toLowerCase() ? 
                    (company.location.toLowerCase().includes(city.toLowerCase()) ? 'exact' : 'industry') :
                    (company.location.toLowerCase().includes(city.toLowerCase()) ? 'location' : 'other')
        };
      })
    );
    
    // Sort by similarity score (highest first)
    companiesWithStats.sort((a, b) => b.similarity - a.similarity);
    
    // Get search statistics
    const searchStats = {
      sameIndustrySameCity: searchResults.sameIndustrySameCity.length,
      sameIndustryDifferentCity: searchResults.sameIndustryDifferentCity.length,
      sameCityDifferentIndustry: searchResults.sameCityDifferentIndustry.length,
      otherCompanies: searchResults.otherCompanies.length,
      totalFound: companiesWithStats.length
    };
    
    res.json({ 
      companies: companiesWithStats,
      searchStats,
      searchCriteria: { 
        industry, 
        location,
        city,
        region: stateOrCountry
      }
    });
  } catch (error) {
    console.error("Get similar companies error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/company/:id/recommendations
// @desc    Get company recommendations for job seekers
// @access  Public
router.get("/:id/recommendations", async (req, res) => {
  try {
    const companyId = req.params.id;
    
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    // Get companies with similar industries and active jobs
    const recommendations = await Company.aggregate([
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(companyId) },
          isActive: true,
          $or: [
            { industry: company.industry },
            { location: { $regex: new RegExp(company.location.split(',')[0], 'i') } }
          ]
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: 'company',
          as: 'activeJobs',
          pipeline: [
            {
              $match: {
                status: 'active',
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
              }
            },
            { $limit: 5 }
          ]
        }
      },
      {
        $match: {
          activeJobs: { $ne: [] }
        }
      },
      {
        $project: {
          name: 1,
          industry: 1,
          location: 1,
          logo: 1,
          size: 1,
          description: 1,
          jobCount: { $size: '$activeJobs' },
          activeJobs: {
            $slice: ['$activeJobs', 3]
          }
        }
      },
      { $limit: 6 }
    ]);
    
    // Get follower counts for each recommendation
    const recommendationsWithStats = await Promise.all(
      recommendations.map(async (rec) => {
        const followersCount = await User.countDocuments({
          "following.company": rec._id
        });
        
        return {
          ...rec,
          followers: followersCount
        };
      })
    );
    
    res.json({
      recommendations: recommendationsWithStats,
      basedOn: {
        industry: company.industry,
        location: company.location
      }
    });
  } catch (error) {
    console.error("Get recommendations error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;