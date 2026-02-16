const express = require("express");
const router = express.Router();
const Job = require("../models/Jobs");
const Company = require("../models/Company");
const Application = require("../models/Application");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/applications/';
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
  const allowedTypes = /pdf|doc|docx|txt|rtf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only document files are allowed (PDF, DOC, DOCX, TXT, RTF)!'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @route   GET /api/jobs
// @desc    Get all jobs (with optional filters)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { 
      search, 
      location, 
      employmentType, 
      experience,
      minSalary,
      maxSalary,
      industry,
      companyId,
      isRemote,
      isUrgent,
      isFeatured,
      status = 'active',
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } }
      ];
    }

    // Location filter
    if (location) {
      if (location.toLowerCase() === 'remote') {
        filter.isRemote = true;
      } else {
        filter.location = { $regex: location, $options: 'i' };
      }
    }

    // Employment type filter
    if (employmentType) {
      filter.employmentType = employmentType;
    }

    // Experience filter
    if (experience) {
      const experienceMap = {
        'entry': { $lte: 2 },
        'mid': { $gt: 2, $lte: 5 },
        'senior': { $gt: 5 }
      };
      if (experienceMap[experience]) {
        filter['experience.minYears'] = experienceMap[experience];
      }
    }

    // Salary filter
    if (minSalary || maxSalary) {
      filter.$and = [];
      if (minSalary) {
        filter.$and.push({
          $or: [
            { 'salary.min': { $gte: parseInt(minSalary) } },
            { 'salary.max': { $gte: parseInt(minSalary) } }
          ]
        });
      }
      if (maxSalary) {
        filter.$and.push({
          $or: [
            { 'salary.max': { $lte: parseInt(maxSalary) } },
            { 'salary.min': { $lte: parseInt(maxSalary) } }
          ]
        });
      }
    }

    // Company ID filter
    if (companyId) {
      filter.company = companyId;
    }

    // Industry filter
    if (industry) {
      // Find companies in this industry first
      const companies = await Company.find({ 
        industry: { $regex: industry, $options: 'i' },
        isActive: true 
      }).select('_id');
      
      const companyIds = companies.map(c => c._id);
      filter.company = { $in: companyIds };
    }

    // Boolean filters
    if (isRemote === 'true') filter.isRemote = true;
    if (isUrgent === 'true') filter.isUrgent = true;
    if (isFeatured === 'true') filter.isFeatured = true;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with company details populated (including website)
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate({
          path: 'company',
          select: 'name logo description location website industry size foundedYear email phone socialLinks',
          match: { isActive: true } // Only include active companies
        })
        .populate('postedBy', 'name email profileImage')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Job.countDocuments(filter)
    ]);

    // Filter out jobs where company was not found (due to isActive: false)
    const activeJobs = jobs.filter(job => job.company !== null);

    // Format the response to ensure consistent structure
    const formattedJobs = activeJobs.map(job => ({
      _id: job._id,
      title: job.title,
      description: job.description,
      location: job.location,
      employmentType: job.employmentType,
      type: job.type || job.employmentType,
      salary: job.salary || {},
      company: {
        _id: job.company._id,
        name: job.company.name,
        logo: job.company.logo,
        description: job.company.description,
        location: job.company.location || job.location,
        website: job.company.website || '', // Ensure website is included
        industry: job.company.industry,
        size: job.company.size,
        foundedYear: job.company.foundedYear,
        email: job.company.email,
        phone: job.company.phone,
        socialLinks: job.company.socialLinks || {}
      },
      companyName: job.company.name,
      skills: job.skills || [],
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      experience: job.experience || { minYears: 0 },
      education: job.education,
      benefits: job.benefits || [],
      tags: job.tags || [],
      isRemote: job.isRemote || false,
      isUrgent: job.isUrgent || false,
      isFeatured: job.isFeatured || false,
      status: job.status,
      postedBy: job.postedBy,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      applicationDeadline: job.applicationDeadline
    }));

    res.json({
      jobs: formattedJobs,
      total: activeJobs.length,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      filters: {
        search,
        location,
        employmentType,
        experience,
        industry
      }
    });

  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get job by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate({
        path: 'company',
        select: 'name logo description location website industry size foundedYear email phone socialLinks',
        match: { isActive: true }
      })
      .populate('postedBy', 'name email profileImage')
      .lean();

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (!job.company) {
      return res.status(404).json({ error: "Company not found or inactive" });
    }

    // Format the response
    const formattedJob = {
      _id: job._id,
      title: job.title,
      description: job.description,
      location: job.location,
      employmentType: job.employmentType,
      type: job.type || job.employmentType,
      salary: job.salary || {},
      company: {
        _id: job.company._id,
        name: job.company.name,
        logo: job.company.logo,
        description: job.company.description,
        location: job.company.location || job.location,
        website: job.company.website || '', // Ensure website is included
        industry: job.company.industry,
        size: job.company.size,
        foundedYear: job.company.foundedYear,
        email: job.company.email,
        phone: job.company.phone,
        socialLinks: job.company.socialLinks || {}
      },
      companyName: job.company.name,
      skills: job.skills || [],
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      experience: job.experience || { minYears: 0 },
      education: job.education,
      benefits: job.benefits || [],
      tags: job.tags || [],
      isRemote: job.isRemote || false,
      isUrgent: job.isUrgent || false,
      isFeatured: job.isFeatured || false,
      status: job.status,
      postedBy: job.postedBy,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      applicationDeadline: job.applicationDeadline
    };

    res.json({ job: formattedJob });
  } catch (error) {
    console.error("Get job by ID error:", error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid job ID format" });
    }
    
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/jobs
// @desc    Create a new job
// @access  Private (Company owner or admin)
router.post(
  "/",
  authMiddleware,
  [
    body("title").notEmpty().withMessage("Job title is required"),
    body("description").notEmpty().withMessage("Job description is required"),
    body("location").notEmpty().withMessage("Location is required"),
    body("employmentType").notEmpty().withMessage("Employment type is required"),
    body("company").notEmpty().withMessage("Company ID is required")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        description,
        location,
        employmentType,
        type,
        salary,
        company,
        skills,
        requirements,
        responsibilities,
        experience,
        education,
        benefits,
        tags,
        isRemote,
        isUrgent,
        isFeatured,
        applicationDeadline
      } = req.body;

      // Check if user has permission to post jobs for this company
      const companyDoc = await Company.findById(company);
      
      if (!companyDoc) {
        return res.status(404).json({ error: "Company not found" });
      }

      if (!companyDoc.isActive) {
        return res.status(400).json({ error: "Company is not active" });
      }

      // Check if user is owner or team member with appropriate role
      const isOwner = companyDoc.owner.toString() === req.user._id.toString();
      const isTeamMember = companyDoc.teamMembers.some(
        member => member.user.toString() === req.user._id.toString() && 
        ["admin", "recruiter", "manager"].includes(member.role)
      );

      if (!isOwner && !isTeamMember) {
        return res.status(403).json({ 
          error: "You don't have permission to post jobs for this company" 
        });
      }

      const jobData = {
        title,
        description,
        location,
        employmentType,
        type: type || employmentType,
        salary: salary || {},
        company,
        skills: skills || [],
        requirements: requirements || [],
        responsibilities: responsibilities || [],
        experience: experience || { minYears: 0 },
        education,
        benefits: benefits || [],
        tags: tags || [],
        isRemote: isRemote || false,
        isUrgent: isUrgent || false,
        isFeatured: isFeatured || false,
        postedBy: req.user._id,
        applicationDeadline: applicationDeadline || null
      };

      const job = new Job(jobData);
      await job.save();

      // Add job to company's jobs array
      companyDoc.jobs.push(job._id);
      await companyDoc.save();

      // Populate company details for response
      const populatedJob = await Job.findById(job._id)
        .populate({
          path: 'company',
          select: 'name logo description location website industry size'
        })
        .populate('postedBy', 'name email');

      res.status(201).json({
        message: "Job created successfully",
        job: populatedJob
      });

    } catch (error) {
      console.error("Create job error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   PUT /api/jobs/:id
// @desc    Update a job
// @access  Private (Job poster or company admin)
router.put(
  "/:id",
  authMiddleware,
  [
    body("title").optional().notEmpty().withMessage("Job title cannot be empty"),
    body("description").optional().notEmpty().withMessage("Job description cannot be empty")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const jobId = req.params.id;
      const updateData = req.body;

      const job = await Job.findById(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check permission
      const company = await Company.findById(job.company);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const isOwner = company.owner.toString() === req.user._id.toString();
      const isJobPoster = job.postedBy.toString() === req.user._id.toString();
      const isAdmin = company.teamMembers.some(
        member => member.user.toString() === req.user._id.toString() && 
        member.role === "admin"
      );

      if (!isOwner && !isJobPoster && !isAdmin) {
        return res.status(403).json({ 
          error: "You don't have permission to update this job" 
        });
      }

      // Remove fields that shouldn't be updated
      delete updateData._id;
      delete updateData.company;
      delete updateData.postedBy;
      delete updateData.createdAt;

      const updatedJob = await Job.findByIdAndUpdate(
        jobId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .populate({
        path: 'company',
        select: 'name logo description location website industry size'
      })
      .populate('postedBy', 'name email');

      res.json({
        message: "Job updated successfully",
        job: updatedJob
      });

    } catch (error) {
      console.error("Update job error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   DELETE /api/jobs/:id
// @desc    Delete a job
// @access  Private (Job poster, company owner or admin)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check permission
    const company = await Company.findById(job.company);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const isOwner = company.owner.toString() === req.user._id.toString();
    const isJobPoster = job.postedBy.toString() === req.user._id.toString();
    const isAdmin = company.teamMembers.some(
      member => member.user.toString() === req.user._id.toString() && 
      member.role === "admin"
    );

    if (!isOwner && !isJobPoster && !isAdmin) {
      return res.status(403).json({ 
        error: "You don't have permission to delete this job" 
      });
    }

    // Remove job from company's jobs array
    company.jobs = company.jobs.filter(
      jobId => jobId.toString() !== job._id.toString()
    );
    await company.save();

    // Delete the job
    await Job.findByIdAndDelete(jobId);

    res.json({ message: "Job deleted successfully" });

  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/jobs/user/my-jobs
// @desc    Get jobs posted by the authenticated user
// @access  Private
router.get("/user/my-jobs", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find companies where user is owner or team member
    const companies = await Company.find({
      $or: [
        { owner: userId },
        { "teamMembers.user": userId }
      ],
      isActive: true
    }).select("_id");

    const companyIds = companies.map(c => c._id);

    // Find jobs for these companies
    const jobs = await Job.find({
      company: { $in: companyIds }
    })
    .populate({
      path: 'company',
      select: 'name logo description location website industry size'
    })
    .populate('postedBy', 'name email')
    .sort({ createdAt: -1 });

    res.json({ jobs });

  } catch (error) {
    console.error("Get user jobs error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/jobs/user/applied
// @desc    Get jobs applied by the authenticated user
// @access  Private
router.get("/user/applied", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const applications = await Application.find({ user: userId })
      .populate({
        path: 'job',
        populate: {
          path: 'company',
          select: 'name logo description location website industry size'
        }
      })
      .sort({ appliedAt: -1 });

    // Extract jobs from applications
    const jobs = applications
      .filter(app => app.job)
      .map(app => ({
        ...app.job.toObject(),
        applicationStatus: app.status,
        appliedAt: app.appliedAt
      }));

    res.json(jobs);

  } catch (error) {
    console.error("Get applied jobs error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/jobs/:id/apply
// @desc    Apply for a job
// @access  Private
router.post(
  "/:id/apply",
  authMiddleware,
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetterFile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const jobId = req.params.id;
      const userId = req.user._id;
      
      // Get user details
      const user = await User.findById(userId).select('name email resume portfolioLinks');
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const job = await Job.findById(jobId);
      
      if (!job) {
        // Clean up uploaded files if job not found
        if (req.files) {
          if (req.files.resume) fs.unlinkSync(req.files.resume[0].path);
          if (req.files.coverLetterFile) fs.unlinkSync(req.files.coverLetterFile[0].path);
        }
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.status !== 'active') {
        // Clean up uploaded files if job not active
        if (req.files) {
          if (req.files.resume) fs.unlinkSync(req.files.resume[0].path);
          if (req.files.coverLetterFile) fs.unlinkSync(req.files.coverLetterFile[0].path);
        }
        return res.status(400).json({ error: "Job is not active" });
      }

      // Check if already applied
      const existingApplication = await Application.findOne({
        job: jobId,
        applicant: userId
      });

      if (existingApplication) {
        // Clean up uploaded files if already applied
        if (req.files) {
          if (req.files.resume) fs.unlinkSync(req.files.resume[0].path);
          if (req.files.coverLetterFile) fs.unlinkSync(req.files.coverLetterFile[0].path);
        }
        return res.status(400).json({ error: "You have already applied for this job" });
      }

      // Check if resume is required and provided
      let resumePath = '';
      if (req.files && req.files.resume) {
        resumePath = req.files.resume[0].path;
      } else if (user.resume) {
        resumePath = user.resume;
      } else {
        // Clean up uploaded files if no resume
        if (req.files) {
          if (req.files.coverLetterFile) fs.unlinkSync(req.files.coverLetterFile[0].path);
        }
        return res.status(400).json({ 
          error: "Resume is required for this application. Please upload your resume." 
        });
      }

      // Parse portfolio links from request
      let portfolioLinks = [];
      if (req.body.portfolioLinks) {
        try {
          portfolioLinks = JSON.parse(req.body.portfolioLinks);
          // Validate portfolio links
          if (!Array.isArray(portfolioLinks)) {
            portfolioLinks = [];
          }
          // Validate each link has URL
          portfolioLinks = portfolioLinks.filter(link => link && link.url && link.url.trim());
        } catch (e) {
          portfolioLinks = [];
        }
      }

      // Parse questions from request
      let questions = [];
      if (req.body.questions) {
        try {
          questions = JSON.parse(req.body.questions);
          if (!Array.isArray(questions)) {
            questions = [];
          }
        } catch (e) {
          questions = [];
        }
      }

      // Get cover letter text or file
      let coverLetter = '';
      if (req.files && req.files.coverLetterFile) {
        coverLetter = req.files.coverLetterFile[0].path;
      } else if (req.body.coverLetterText) {
        coverLetter = req.body.coverLetterText;
      }

      // Create application data
      const applicationData = {
        job: jobId,
        company: job.company,
        applicant: userId,
        name: user.name,
        email: user.email,
        resume: resumePath,
        coverLetter: coverLetter,
        additionalInfo: req.body.additionalInfo || '',
        portfolioLinks: portfolioLinks,
        questions: questions,
        status: 'pending',
        timeline: [{
          action: 'applied',
          performedBy: userId,
          notes: 'Application submitted',
          date: new Date()
        }]
      };

      const application = new Application(applicationData);
      await application.save();

      // Update job's application count and add application to job
      job.applicationsCount = (job.applicationsCount || 0) + 1;
      job.applications.push(application._id);
      await job.save();

      // Add application to user
      user.applications = user.applications || [];
      user.applications.push(application._id);
      await user.save();

      // Add application to company if company exists
      if (job.company) {
        await Company.findByIdAndUpdate(
          job.company,
          { $addToSet: { applications: application._id } }
        );
      }

      // Populate application with details for response
      const populatedApplication = await Application.findById(application._id)
        .populate('job', 'title company location')
        .populate('company', 'name logo');

      res.status(201).json({
        message: "Application submitted successfully",
        application: populatedApplication
      });

    } catch (error) {
      console.error("Apply for job error:", error);
      
      // Clean up uploaded files on error
      if (req.files) {
        if (req.files.resume) {
          try { fs.unlinkSync(req.files.resume[0].path); } catch (e) {}
        }
        if (req.files.coverLetterFile) {
          try { fs.unlinkSync(req.files.coverLetterFile[0].path); } catch (e) {}
        }
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          error: "Application validation failed", 
          details: error.message,
          errors: error.errors 
        });
      }
      
      res.status(500).json({ error: "Server error", details: error.message });
    }
  }
);

// @route   GET /api/jobs/company/:companyId
// @desc    Get jobs by company ID
// @access  Public
router.get("/company/:companyId", async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { status = 'active' } = req.query;

    const company = await Company.findById(companyId);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (!company.isActive) {
      return res.status(400).json({ error: "Company is not active" });
    }

    const filter = { company: companyId };
    
    if (status) {
      filter.status = status;
    }

    const jobs = await Job.find(filter)
      .populate({
        path: 'company',
        select: 'name logo description location website industry size'
      })
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ jobs });

  } catch (error) {
    console.error("Get company jobs error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/jobs/recent
// @desc    Get recent jobs (for homepage)
// @access  Public
router.get("/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const jobs = await Job.find({ status: 'active' })
      .populate({
        path: 'company',
        select: 'name logo description location website industry size',
        match: { isActive: true }
      })
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Filter out jobs where company was not found
    const activeJobs = jobs.filter(job => job.company !== null);

    // Format the response
    const formattedJobs = activeJobs.map(job => ({
      _id: job._id,
      title: job.title,
      description: job.description.substring(0, 200) + '...',
      location: job.location,
      employmentType: job.employmentType,
      type: job.type || job.employmentType,
      salary: job.salary || {},
      company: {
        _id: job.company._id,
        name: job.company.name,
        logo: job.company.logo,
        description: job.company.description,
        location: job.company.location || job.location,
        website: job.company.website || '',
        industry: job.company.industry,
        size: job.company.size
      },
      companyName: job.company.name,
      skills: job.skills || [],
      isRemote: job.isRemote || false,
      isUrgent: job.isUrgent || false,
      isFeatured: job.isFeatured || false,
      createdAt: job.createdAt
    }));

    res.json({ jobs: formattedJobs });

  } catch (error) {
    console.error("Get recent jobs error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/jobs/search/suggestions
// @desc    Get search suggestions for jobs
// @access  Public
router.get("/search/suggestions", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const searchRegex = new RegExp(q, 'i');

    // Get suggestions from job titles
    const titleSuggestions = await Job.find({
      title: searchRegex,
      status: 'active'
    })
    .distinct('title')
    .limit(5);

    // Get suggestions from company names
    const companySuggestions = await Company.find({
      name: searchRegex,
      isActive: true
    })
    .distinct('name')
    .limit(5);

    // Get suggestions from skills
    const skillSuggestions = await Job.find({
      skills: searchRegex,
      status: 'active'
    })
    .distinct('skills')
    .limit(5);

    // Flatten and deduplicate skills
    const flattenedSkills = [...new Set(skillSuggestions.flat())]
      .filter(skill => skill.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5);

    // Get suggestions from locations
    const locationSuggestions = await Job.find({
      location: searchRegex,
      status: 'active'
    })
    .distinct('location')
    .limit(5);

    const suggestions = {
      titles: titleSuggestions,
      companies: companySuggestions,
      skills: flattenedSkills,
      locations: locationSuggestions
    };

    res.json({ suggestions });

  } catch (error) {
    console.error("Get search suggestions error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/jobs/stats/overview
// @desc    Get job statistics overview
// @access  Public
router.get("/stats/overview", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalJobs,
      activeJobs,
      recentJobs,
      remoteJobs,
      featuredJobs
    ] = await Promise.all([
      Job.countDocuments({ status: 'active' }),
      Job.countDocuments({ status: 'active', createdAt: { $gte: thirtyDaysAgo } }),
      Job.countDocuments({ status: 'active', isUrgent: true }),
      Job.countDocuments({ status: 'active', isRemote: true }),
      Job.countDocuments({ status: 'active', isFeatured: true })
    ]);

    // Get job counts by type
    const jobsByType = await Job.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$employmentType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get job counts by industry
    const jobsByIndustry = await Job.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'companyData'
        }
      },
      {
        $unwind: '$companyData'
      },
      {
        $group: {
          _id: '$companyData.industry',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      total: totalJobs,
      recent: recentJobs,
      active: activeJobs,
      remote: remoteJobs,
      featured: featuredJobs,
      byType: jobsByType,
      byIndustry: jobsByIndustry
    });

  } catch (error) {
    console.error("Get job stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   PUT /api/jobs/:id/status
// @desc    Update job status
// @access  Private (Job poster, company owner or admin)
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.id;
    const { status } = req.body;

    if (!['active', 'closed', 'draft', 'paused'].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check permission
    const company = await Company.findById(job.company);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const isOwner = company.owner.toString() === req.user._id.toString();
    const isJobPoster = job.postedBy.toString() === req.user._id.toString();
    const isAdmin = company.teamMembers.some(
      member => member.user.toString() === req.user._id.toString() && 
      member.role === "admin"
    );

    if (!isOwner && !isJobPoster && !isAdmin) {
      return res.status(403).json({ 
        error: "You don't have permission to update this job status" 
      });
    }

    job.status = status;
    await job.save();

    res.json({
      message: `Job status updated to ${status}`,
      job
    });

  } catch (error) {
    console.error("Update job status error:", error);
    res.status(500).json({ error: "Server error" });
  }
});







// @route   POST /api/jobs/:id/bookmark
// @desc    Save a job to user's saved jobs
// @access  Private
router.post("/:id/bookmark", authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id;

    console.log(`Bookmark request - Job ID: ${jobId}, User ID: ${userId}`);

    // Check if job exists
    const job = await Job.findById(jobId);
    
    if (!job) {
      console.log(`Job not found: ${jobId}`);
      return res.status(404).json({ error: "Job not found" });
    }

    // Find user - only select necessary fields
    const user = await User.findById(userId).select('savedJobs');
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already saved
    const isSaved = user.savedJobs?.some(savedJob => 
      savedJob.job && savedJob.job.toString() === jobId.toString()
    );
    
    if (isSaved) {
      console.log(`Job already saved by user: ${userId}`);
      return res.status(400).json({ error: "Already saved this job" });
    }

    // Initialize savedJobs array if it doesn't exist
    if (!user.savedJobs) {
      user.savedJobs = [];
    }

    // Save the job
    user.savedJobs.push({
      job: jobId,
      savedAt: new Date()
    });
    
    // Save ONLY the savedJobs field without validating the entire user
    await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          savedJobs: user.savedJobs,
          updatedAt: new Date()
        } 
      },
      { 
        runValidators: false,
        new: true 
      }
    );

    console.log(`Job ${jobId} saved successfully for user ${userId}`);

    res.json({ 
      message: "Job saved successfully", 
      isBookmarked: true,
      success: true
    });

  } catch (error) {
    console.error("Save job error details:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid job ID format" });
    }
    
    res.status(500).json({ 
      error: "Failed to save job",
      details: error.message,
      success: false
    });
  }
});

// @route   DELETE /api/jobs/:id/bookmark
// @desc    Remove a job from user's saved jobs
// @access  Private
router.delete("/:id/bookmark", authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id;

    console.log(`Remove bookmark request - Job ID: ${jobId}, User ID: ${userId}`);

    // Check if job exists
    const job = await Job.findById(jobId);
    
    if (!job) {
      console.log(`Job not found: ${jobId}`);
      return res.status(404).json({ error: "Job not found" });
    }

    // Find user - only select savedJobs
    const user = await User.findById(userId).select('savedJobs');
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has saved jobs
    if (!user.savedJobs || user.savedJobs.length === 0) {
      console.log(`No saved jobs found for user: ${userId}`);
      return res.status(400).json({ error: "No saved jobs found" });
    }

    // Remove from saved jobs
    const initialLength = user.savedJobs.length;
    user.savedJobs = user.savedJobs.filter(savedJob => 
      savedJob.job && savedJob.job.toString() !== jobId.toString()
    );
    
    // Check if job was actually removed
    if (user.savedJobs.length === initialLength) {
      console.log(`Job ${jobId} not found in saved jobs for user ${userId}`);
      return res.status(400).json({ error: "Job not found in saved jobs" });
    }
    
    // Save ONLY the savedJobs field without validating the entire user
    await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          savedJobs: user.savedJobs,
          updatedAt: new Date()
        } 
      },
      { 
        runValidators: false,
        new: true 
      }
    );

    console.log(`Job ${jobId} removed successfully from user ${userId}'s saved jobs`);

    res.json({ 
      message: "Job removed from saved", 
      isBookmarked: false,
      success: true
    });

  } catch (error) {
    console.error("Remove saved job error details:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid job ID format" });
    }
    
    res.status(500).json({ 
      error: "Failed to remove saved job",
      details: error.message,
      success: false
    });
  }
});

// @route   GET /api/jobs/:id/bookmark/check
// @desc    Check if a job is bookmarked by user
// @access  Private
router.get("/:id/bookmark/check", authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id;

    console.log(`Check bookmark - Job ID: ${jobId}, User ID: ${userId}`);

    const user = await User.findById(userId).select('savedJobs');
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Check if savedJobs exists and has items
    const isBookmarked = user.savedJobs?.some(savedJob => 
      savedJob.job && savedJob.job.toString() === jobId.toString()
    ) || false;

    console.log(`Bookmark status for job ${jobId}: ${isBookmarked}`);

    res.json({ 
      isBookmarked,
      success: true
    });

  } catch (error) {
    console.error("Check saved job error details:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid job ID format" });
    }
    
    res.status(500).json({ 
      error: "Failed to check bookmark status",
      details: error.message,
      success: false
    });
  }
});


// @route   GET /api/jobs/:id/application/check
// @desc    Check if user has already applied for a job
// @access  Private
router.get("/:id/application/check", authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id;

    const application = await Application.findOne({
      job: jobId,
      applicant: userId
    });

    res.json({ 
      hasApplied: !!application,
      application: application || null
    });

  } catch (error) {
    console.error("Check application error:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid job ID format" });
    }
    
    res.status(500).json({ error: "Server error: " + error.message });
  }
});



module.exports = router;