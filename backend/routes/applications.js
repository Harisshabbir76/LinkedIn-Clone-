const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const Job = require("../models/Jobs");
const Company = require("../models/Company");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { body, validationResult } = require("express-validator");
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

// Middleware to check if user can view application
const checkApplicationPermission = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    const application = await Application.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    // Check if user is applicant
    if (application.applicant.toString() === userId.toString()) {
      req.application = application;
      return next();
    }
    
    // Check if user is company admin/recruiter
    const company = await Company.findById(application.company);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    const isCompanyMember = company.teamMembers.some(member => 
      member.user.toString() === userId.toString() && 
      ['admin', 'recruiter', 'manager'].includes(member.role)
    );
    
    if (isCompanyMember || company.owner.toString() === userId.toString()) {
      req.application = application;
      return next();
    }
    
    // Admins can view all applications
    if (userRole === 'admin') {
      req.application = application;
      return next();
    }
    
    return res.status(403).json({ error: "You don't have permission to view this application" });
  } catch (error) {
    console.error("Check application permission error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @route   POST /api/applications
// @desc    Apply for a job
// @access  Private
router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
  ]),
  [
    body("jobId").notEmpty().withMessage("Job ID is required"),
    body("coverLetterText").optional().isLength({ max: 5000 }).withMessage("Cover letter too long"),
    body("portfolio").optional().isURL().withMessage("Invalid portfolio URL"),
    body("linkedin").optional().isURL().withMessage("Invalid LinkedIn URL"),
    body("phone").optional().isMobilePhone().withMessage("Invalid phone number")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.files) {
          if (req.files.resume) fs.unlinkSync(req.files.resume[0].path);
          if (req.files.coverLetter) fs.unlinkSync(req.files.coverLetter[0].path);
        }
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { 
        jobId, 
        coverLetterText, 
        portfolio, 
        linkedin,
        questions,
        phone,
        location,
        additionalInfo,
        portfolioLinks
      } = req.body;
      
      // Check if job exists and is active
      const job = await Job.findById(jobId);
      if (!job || !job.isActive) {
        if (req.files) {
          if (req.files.resume) fs.unlinkSync(req.files.resume[0].path);
          if (req.files.coverLetter) fs.unlinkSync(req.files.coverLetter[0].path);
        }
        return res.status(404).json({ error: "Job not found or no longer available" });
      }
      
      // Check if user has already applied
      const existingApplication = await Application.findOne({
        job: jobId,
        applicant: req.user._id
      });
      
      if (existingApplication) {
        if (req.files) {
          if (req.files.resume) fs.unlinkSync(req.files.resume[0].path);
          if (req.files.coverLetter) fs.unlinkSync(req.files.coverLetter[0].path);
        }
        return res.status(400).json({ error: "You have already applied for this job" });
      }
      
      // Check if resume is uploaded
      if (!req.files || !req.files.resume) {
        return res.status(400).json({ error: "Resume is required" });
      }
      
      // Parse portfolio links if provided
      let parsedPortfolioLinks = [];
      if (portfolioLinks) {
        try {
          parsedPortfolioLinks = JSON.parse(portfolioLinks);
        } catch (e) {
          parsedPortfolioLinks = [];
        }
      }
      
      // Parse questions if provided
      let parsedQuestions = [];
      if (questions) {
        try {
          parsedQuestions = JSON.parse(questions);
        } catch (e) {
          parsedQuestions = [];
        }
      }
      
      // Get user data
      const user = await User.findById(req.user._id);
      
      // Create application
      const application = new Application({
        job: jobId,
        company: job.company,
        applicant: req.user._id,
        name: user.name,
        email: user.email,
        phone: phone || user.phone,
        location: location || user.location,
        resume: req.files.resume[0].path,
        coverLetter: req.files.coverLetter ? req.files.coverLetter[0].path : coverLetterText || '',
        portfolio: portfolio || '',
        linkedin: linkedin || '',
        portfolioLinks: parsedPortfolioLinks,
        questions: parsedQuestions,
        additionalInfo: additionalInfo || '',
        timeline: [{
          action: 'applied',
          performedBy: req.user._id,
          notes: 'Application submitted',
          date: new Date()
        }]
      });
      
      await application.save();
      
      // Add application to job
      job.applications.push(application._id);
      await job.save();
      
      // Add application to user
      await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { applications: application._id } }
      );
      
      // Add application to company
      await Company.findByIdAndUpdate(
        job.company,
        { $addToSet: { applications: application._id } }
      );
      
      res.status(201).json({
        message: "Application submitted successfully",
        application: await Application.findById(application._id)
          .populate('job', 'title company')
          .populate('company', 'name logo')
          .populate('applicant', 'name email phone location profileImage')
      });
      
    } catch (error) {
      console.error("Apply for job error:", error);
      if (req.files) {
        if (req.files.resume) {
          try { fs.unlinkSync(req.files.resume[0].path); } catch (e) {}
        }
        if (req.files.coverLetter) {
          try { fs.unlinkSync(req.files.coverLetter[0].path); } catch (e) {}
        }
      }
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   GET /api/applications/my-applications
// @desc    Get user's applications
// @access  Private
router.get("/my-applications", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { applicant: userId };
    
    if (status) {
      filter.status = status;
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate('job', 'title company location employmentType salary')
        .populate('company', 'name logo industry')
        .populate('applicant', 'name email phone location profileImage')
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Application.countDocuments(filter)
    ]);
    
    const stats = await Application.aggregate([
      { $match: { applicant: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      applications,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error("Get user applications error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/applications/company/:companyId
// @desc    Get applications for a company (admin/recruiter only)
// @access  Private
router.get("/company/:companyId", authMiddleware, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const userId = req.user._id;
    const { status, jobId, search, page = 1, limit = 10, populate } = req.query;
    
    // Check if user has permission
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    const isCompanyMember = company.teamMembers.some(member => 
      member.user.toString() === userId.toString() && 
      ['admin', 'recruiter', 'manager'].includes(member.role)
    );
    
    if (!isCompanyMember && company.owner.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: "You don't have permission to view company applications" });
    }
    
    const filter = { company: companyId };
    
    if (status) filter.status = status;
    if (jobId) filter.job = jobId;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'applicant.name': { $regex: search, $options: 'i' } },
        { 'applicant.skills.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build query
    let query = Application.find(filter);
    
    // Populate based on query parameter
    if (populate === 'applicant') {
      query = query.populate({
        path: 'applicant',
        select: 'name email profileImage phone location skills education experience'
      });
    } else {
      query = query.populate('applicant', 'name email profileImage phone location');
    }
    
    query = query.populate('job', 'title location employmentType salary')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const [applications, total] = await Promise.all([
      query.exec(),
      Application.countDocuments(filter)
    ]);
    
    // Get stats
    const stats = await Application.getStats(companyId, jobId);
    
    res.json({
      applications,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      stats
    });
  } catch (error) {
    console.error("Get company applications error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/applications/:id
// @desc    Get application details
// @access  Private (applicant or company admin)
router.get("/:id", authMiddleware, checkApplicationPermission, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('applicant', 'name email profileImage phone location skills education experience')
      .populate('job', 'title description requirements location employmentType salary company')
      .populate('company', 'name logo industry')
      .populate('notes.addedBy', 'name email')
      .populate('timeline.performedBy', 'name email')
      .populate('communications.sentBy', 'name email');
    
    res.json({ application });
  } catch (error) {
    console.error("Get application error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   PUT /api/applications/:id/status
// @desc    Update application status
// @access  Private (company admin/recruiter)
router.put(
  "/:id/status",
  authMiddleware,
  checkApplicationPermission,
  [
    body("status").isIn(['pending', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn']),
    body("notes").optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { status, notes, rejectionReason, interviewDetails } = req.body;
      const application = req.application;
      
      // Check if user has permission to update status (must be company member)
      const company = await Company.findById(application.company);
      const isCompanyMember = company.teamMembers.some(member => 
        member.user.toString() === req.user._id.toString() && 
        ['admin', 'recruiter', 'manager'].includes(member.role)
      );
      
      if (!isCompanyMember && company.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: "You don't have permission to update application status" });
      }
      
      // Update status
      const result = await application.updateStatus(status, req.user._id, notes);
      
      // Update additional fields based on status
      if (status === 'rejected' && rejectionReason) {
        application.rejectionReason = rejectionReason;
      }
      
      if (status === 'interview' && interviewDetails) {
        try {
          const parsedInterview = JSON.parse(interviewDetails);
          application.interview = { ...application.interview, ...parsedInterview };
        } catch (e) {
          // Ignore parse error
        }
      }
      
      await application.save();
      
      res.json({
        message: "Application status updated",
        application,
        statusChange: result
      });
    } catch (error) {
      console.error("Update application status error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   POST /api/applications/:id/note
// @desc    Add note to application
// @access  Private (company admin/recruiter)
router.post(
  "/:id/note",
  authMiddleware,
  checkApplicationPermission,
  [
    body("note").notEmpty().withMessage("Note is required")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { note } = req.body;
      const application = req.application;
      
      // Check if user has permission (must be company member)
      const company = await Company.findById(application.company);
      const isCompanyMember = company.teamMembers.some(member => 
        member.user.toString() === req.user._id.toString() && 
        ['admin', 'recruiter', 'manager'].includes(member.role)
      );
      
      if (!isCompanyMember && company.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: "You don't have permission to add notes" });
      }
      
      const addedNote = await application.addNote(note, req.user._id);
      
      res.json({
        message: "Note added successfully",
        note: addedNote
      });
    } catch (error) {
      console.error("Add note error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   POST /api/applications/:id/communication
// @desc    Add communication to application
// @access  Private (company admin/recruiter)
router.post(
  "/:id/communication",
  authMiddleware,
  checkApplicationPermission,
  [
    body("type").isIn(['email', 'message', 'call']),
    body("subject").notEmpty().withMessage("Subject is required"),
    body("message").notEmpty().withMessage("Message is required")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { type, subject, message } = req.body;
      const application = req.application;
      
      // Check if user has permission (must be company member)
      const company = await Company.findById(application.company);
      const isCompanyMember = company.teamMembers.some(member => 
        member.user.toString() === req.user._id.toString() && 
        ['admin', 'recruiter', 'manager'].includes(member.role)
      );
      
      if (!isCompanyMember && company.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: "You don't have permission to send communications" });
      }
      
      const communication = await application.addCommunication(type, subject, message, req.user._id);
      
      res.json({
        message: "Communication sent successfully",
        communication
      });
    } catch (error) {
      console.error("Add communication error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   PUT /api/applications/:id/score
// @desc    Update application score
// @access  Private (company admin/recruiter)
router.put(
  "/:id/score",
  authMiddleware,
  checkApplicationPermission,
  [
    body("score").isInt({ min: 0, max: 100 }),
    body("skillsMatch").isInt({ min: 0, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { score, skillsMatch } = req.body;
      const application = req.application;
      
      // Check if user has permission
      const company = await Company.findById(application.company);
      const isCompanyMember = company.teamMembers.some(member => 
        member.user.toString() === req.user._id.toString() && 
        ['admin', 'recruiter', 'manager'].includes(member.role)
      );
      
      if (!isCompanyMember && company.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: "You don't have permission to update scores" });
      }
      
      application.score = score;
      application.skillsMatch = skillsMatch;
      await application.save();
      
      res.json({
        message: "Scores updated successfully",
        application
      });
    } catch (error) {
      console.error("Update score error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   DELETE /api/applications/:id
// @desc    Withdraw application
// @access  Private (applicant only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const userId = req.user._id;
    
    console.log(`Withdraw request for application: ${applicationId} by user: ${userId}`);
    
    const application = await Application.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    // Check if user is the applicant
    if (application.applicant.toString() !== userId.toString()) {
      console.log(`Permission denied: User ${userId} is not applicant ${application.applicant}`);
      return res.status(403).json({ error: "You can only withdraw your own applications" });
    }
    
    // Check if application can be withdrawn
    const allowedStatuses = ['pending', 'reviewed', 'shortlisted', 'interview'];
    if (!allowedStatuses.includes(application.status)) {
      return res.status(400).json({ 
        error: `Application cannot be withdrawn because it's already ${application.status}` 
      });
    }
    
    // Update status to withdrawn with timeline entry
    application.status = 'withdrawn';
    
    // Add timeline entry
    application.timeline.push({
      action: 'withdrawn',
      performedBy: userId,
      notes: 'Application withdrawn by applicant',
      date: new Date(),
      previousStatus: application.status,
      newStatus: 'withdrawn'
    });
    
    // Also add a note
    application.notes.push({
      note: 'Application withdrawn by the applicant',
      addedBy: userId,
      addedAt: new Date()
    });
    
    // Save the application
    await application.save();
    
    // Populate the response for better frontend display
    const populatedApplication = await Application.findById(applicationId)
      .populate('job', 'title company location')
      .populate('company', 'name logo');
    
    console.log(`Application ${applicationId} withdrawn successfully`);
    
    res.json({
      message: "Application withdrawn successfully",
      application: populatedApplication
    });
  } catch (error) {
    console.error("Withdraw application error:", error);
    
    // Handle specific errors
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid application ID" });
    }
    
    res.status(500).json({ 
      error: "Server error while withdrawing application",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/applications/stats/overall
// @desc    Get overall application statistics
// @access  Private (admin only)
router.get("/stats/overall", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Only admins can view overall statistics" });
    }
    
    const stats = await Application.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgScore: { $avg: '$score' },
          avgSkillsMatch: { $avg: '$skillsMatch' },
          byStatus: {
            $push: {
              status: '$status',
              count: 1
            }
          }
        }
      },
      {
        $project: {
          total: 1,
          avgScore: 1,
          avgSkillsMatch: 1,
          byStatus: {
            $arrayToObject: {
              $map: {
                input: '$byStatus',
                as: 'statusItem',
                in: {
                  k: '$$statusItem.status',
                  v: '$$statusItem.count'
                }
              }
            }
          }
        }
      }
    ]);
    
    const monthlyStats = await Application.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$appliedAt' },
            month: { $month: '$appliedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    res.json({
      overall: stats[0] || { total: 0, avgScore: 0, avgSkillsMatch: 0, byStatus: {} },
      monthly: monthlyStats
    });
  } catch (error) {
    console.error("Get overall stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/applications/job/:jobId/applicants
// @desc    Get applicants for a specific job
// @access  Private (company admin/recruiter)
router.get("/job/:jobId/applicants", authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const userId = req.user._id;
    const { status, search } = req.query;
    
    // Get job to check company ownership
    const job = await Job.findById(jobId).populate('company');
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    const company = job.company;
    
    // Check if user has permission
    const isCompanyMember = company.teamMembers.some(member => 
      member.user.toString() === userId.toString() && 
      ['admin', 'recruiter', 'manager'].includes(member.role)
    );
    
    if (!isCompanyMember && company.owner.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: "You don't have permission to view job applicants" });
    }
    
    const filter = { job: jobId };
    
    if (status) filter.status = status;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const applications = await Application.find(filter)
      .populate('applicant', 'name email profileImage phone location skills')
      .sort({ appliedAt: -1 });
    
    res.json({
      applications,
      total: applications.length,
      job: {
        title: job.title,
        company: job.company.name
      }
    });
  } catch (error) {
    console.error("Get job applicants error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/applications/download/resume/:id
// @desc    Download resume
// @access  Private (applicant or company admin)
router.get("/download/resume/:id", authMiddleware, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const userId = req.user._id;
    
    const application = await Application.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    // Check permissions
    if (application.applicant.toString() !== userId.toString()) {
      // Check if user is company admin/recruiter
      const company = await Company.findById(application.company);
      const isCompanyMember = company.teamMembers.some(member => 
        member.user.toString() === userId.toString() && 
        ['admin', 'recruiter', 'manager'].includes(member.role)
      );
      
      if (!isCompanyMember && company.owner.toString() !== userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: "You don't have permission to download this resume" });
      }
    }
    
    // Mark as viewed if not already
    if (!application.viewedAt) {
      application.markAsViewed(userId);
      await application.save();
    }
    
    const resumePath = path.resolve(application.resume);
    
    // Check if file exists
    if (!fs.existsSync(resumePath)) {
      return res.status(404).json({ error: "Resume file not found" });
    }
    
    // Get file extension
    const ext = path.extname(resumePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(resumePath)}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(resumePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error("Download resume error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;