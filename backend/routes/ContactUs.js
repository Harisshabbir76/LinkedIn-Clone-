// routes/contact.js

const express = require('express');
const ContactUs = require('../models/ContactUs');
const Notification = require('../models/Notification');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const router = express.Router();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Helper function to get admin emails from environment
const getAdminEmails = () => {
  return process.env.ADMIN_EMAILS 
    ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
    : ['admin@example.com']; // fallback
};

// Helper function to check if user is admin by email
const isAdminByEmail = (email) => {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email);
};

// Middleware to check admin access by email OR staff permissions
// If user is a staff member (in Staff collection) we attach `req.staff` for later use
const checkAdminByEmail = () => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // If user's email is in admin list, allow
      if (isAdminByEmail(req.user.email)) {
        return next();
      }

      // Otherwise check Staff collection for permission grants
      try {
        const Staff = require('../models/Staff');
        const staff = await Staff.findOne({ email: req.user.email, isActive: true });
        if (staff) {
          // attach staff info to request for downstream handlers to filter results
          // Map staff departments to ContactUs categories for consistent filtering
          const deptToCategory = {
            'General Inquiry': 'Support',
            'Technical Support': 'Technical',
            'Billing': 'Account',
            'Privacy Concerns': 'Other',
            'Bug Report': 'Technical',
            'Feature Request': 'Feedback'
          };

          const allowedCategories = (staff.departments || []).map(d => deptToCategory[d] || d);
          // attach staff info and allowed categories
          req.staff = staff; // eslint-disable-line no-param-reassign
          req.staff.allowedCategories = allowedCategories; // eslint-disable-line no-param-reassign
          return next();
        }
      } catch (e) {
        console.error('Staff lookup failed:', e);
      }

      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required. Your email is not authorized.' 
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

// ==================== PUBLIC ROUTES ====================

// @route   POST /api/contact-us
// @desc    Submit contact form
// @access  Public (Optional Authentication)
router.post('/', 
  require('../middleware/authMiddleware').optionalAuthMiddleware,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { name, email, subject, message, category = 'Other', companyId = null } = req.body;

      // If companyId provided, check for EXISTING conversation between this user and company owner
      if (companyId) {
        try {
          const Company = require('../models/Company');
          const company = await Company.findById(companyId).populate('owner', 'email name _id');
          
          if (company && company.owner) {
            // Check if there's an existing conversation with this company owner
            const existingConversation = await ContactUs.findOne({
              email: email.toLowerCase(),
              assignedTo: company.owner._id,
              isDeleted: false
            });

            if (existingConversation) {
              console.log(`Found existing conversation ${existingConversation._id} for ${email} with company owner`);
              
              // Update company info if not already set
              if (!existingConversation.companyId) {
                existingConversation.companyId = company._id;
                existingConversation.companyName = company.name;
              }
              
              // Add this as a reply to the existing conversation
              const User = require('../models/User');
              let senderUser = null;
              
              try {
                senderUser = await User.findOne({ email: email.toLowerCase() });
              } catch (e) {
                console.warn('Could not find user, will use email for sender info:', e.message);
              }

              const newReply = {
                content: message,
                sentBy: senderUser ? senderUser._id : null,
                senderContext: 'user',
                displayName: senderUser ? senderUser.name : name,
                respondingCompanyId: null,
                respondingCompanyName: null,
                sentAt: new Date(),
                emailSent: false,
                isRead: false
              };

              existingConversation.replies.push(newReply);
              existingConversation.lastActivityAt = new Date();
              existingConversation.updatedAt = new Date();
              
              const updatedConversation = await existingConversation.save();
              console.log(`Reply added to existing conversation. Total replies: ${updatedConversation.replies.length}`);

              // Emit socket event to company owner
              try {
                const { getIO } = require('../socket');
                const io = getIO();
                const room = `user:${company.owner.email}`;
                const replyForEmit = {
                  _id: newReply._id || null,
                  content: newReply.content,
                  sentBy: senderUser ? { _id: senderUser._id, name: senderUser.name, email: senderUser.email } : { name, email },
                  sentAt: newReply.sentAt || new Date(),
                  emailSent: false,
                  isRead: false,
                  senderContext: newReply.senderContext || 'user',
                  displayName: newReply.displayName || (senderUser ? senderUser.name : name),
                  respondingCompanyId: newReply.respondingCompanyId || null,
                  respondingCompanyName: newReply.respondingCompanyName || null
                };

                io.to(room).emit('message:replied', {
                  messageId: existingConversation._id,
                  subject: existingConversation.subject,
                  reply: replyForEmit,
                  timestamp: new Date()
                });
                console.log('[socket] emitted message:replied to', room);
              } catch (socketErr) {
                console.error('Socket emit error:', socketErr && socketErr.message ? socketErr.message : socketErr);
              }

              // Return success response
              return res.status(201).json({
                success: true,
                message: 'Message added to existing conversation',
                data: {
                  id: existingConversation._id,
                  hasExistingConversation: true
                }
              });
            }
          }
        } catch (e) {
          console.error('Error checking existing conversation:', e);
          // Continue to create new message if check fails
        }
      }

      // No existing conversation or not a company message - create new contact submission
      const newContact = new ContactUs({
        name,
        email,
        subject,
        message,
        category,
        userId: req.user ? req.user._id : null, // Capture userId if user is authenticated
        assignedTo: null,
        userAgent: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        pageUrl: req.headers.referer || 'Direct',
        submittedAt: new Date(),
        status: 'new'
      });

      // Conversation-level sender context (this was created by a user)
      newContact.senderContext = 'user';
      newContact.displaySenderName = name;

      // If companyId provided, link message to company owner
      if (companyId) {
        try {
          const Company = require('../models/Company');
          const company = await Company.findById(companyId).populate('owner', 'email name');
          if (company && company.owner) {
            newContact.assignedTo = company.owner._id;
            newContact.companyId = company._id;
            newContact.companyName = company.name;
            if (!newContact.category || newContact.category === 'Other') newContact.category = 'Partnership';
          }
        } catch (e) {
          console.error('Company lookup failed for contact message:', e);
        }
      }

      await newContact.save();

      // If linked to a company owner, create a notification for the owner
      if (companyId) {
        try {
          const Company = require('../models/Company');
          const company = await Company.findById(companyId).populate('owner', 'email name');
              if (company && company.owner && company.owner.email) {
                const Notification = require('../models/Notification');
                const note = new Notification({
                  userEmail: company.owner.email,
                  userId: company.owner._id,
                  type: 'new_message',
                  title: `${name} sent a message to ${company.name}`,
                  message: `${name} sent a message to your company ${company.name}: "${subject}"`,
                  relatedMessage: newContact._id,
                  isConversational: true,
                  actionUrl: `/messages`
                });
                const savedNote = await note.save();
                console.log('Company message notification created:', {
                  noteId: savedNote._id,
                  for: savedNote.userEmail,
                  relatedMessage: savedNote.relatedMessage
                });
              }
        } catch (notifyErr) {
          console.error('Company message notification error:', notifyErr);
        }
      }

      // Send confirmation email to user
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Thank you for contacting us!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Thank you for contacting us!</h2>
              <p>Dear ${name},</p>
              <p>We have received your message and will get back to you as soon as possible.</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
              </div>
              <p>Your ticket ID: <strong>${newContact._id}</strong></p>
              <p>Best regards,<br>Support Team</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Confirmation email error:', emailError);
      }

      // Send notification email to all admins
      try {
        const adminEmails = getAdminEmails();
        
        for (const adminEmail of adminEmails) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: adminEmail,
            subject: `New Contact Form Submission: ${subject}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New Contact Form Submission</h2>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>From:</strong> ${name} (${email})</p>
                  <p><strong>Subject:</strong> ${subject}</p>
                  <p><strong>Category:</strong> ${category}</p>
                  <p><strong>Message:</strong></p>
                  <p>${message}</p>
                  <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                  <p><strong>IP Address:</strong> ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}</p>
                </div>
                <p><a href="${process.env.ADMIN_URL || 'http://localhost:3000'}/admin/contacts" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a></p>
              </div>
            `
          });
        }
      } catch (adminEmailError) {
        console.error('Admin notification email error:', adminEmailError);
      }

      res.status(201).json({
        success: true,
        message: 'Thank you for contacting us! We will get back to you soon.',
        data: {
          id: newContact._id,
          name: newContact.name,
          email: newContact.email,
          subject: newContact.subject,
          submittedAt: newContact.submittedAt
        }
      });

    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit contact form',
        message: error.message
      });
    }
  }
);

// ==================== ADMIN ROUTES (Email-Based) ====================

// @route   GET /api/contact-us/check-admin
// @desc    Check if current user is admin
// @access  Private
router.get('/check-admin', authMiddleware, async (req, res) => {
  try {
    const userEmail = (req.user && req.user.email) ? req.user.email.toString().trim().toLowerCase() : '';
    const isAdmin = isAdminByEmail(userEmail);
    const adminEmails = getAdminEmails();

    // Also check Staff collection for staff-based admin access
    let staffRecord = null;
    try {
      const Staff = require('../models/Staff');
      staffRecord = await Staff.findOne({ email: userEmail, isActive: true }).select('email name departments isActive');
    } catch (e) {
      console.error('Staff lookup failed in check-admin:', e);
    }

    res.json({
      success: true,
      isAdmin: isAdmin || !!staffRecord,
      isStaff: !!staffRecord,
      staff: staffRecord ? {
        email: staffRecord.email,
        name: staffRecord.name,
        departments: staffRecord.departments
      } : null,
      userEmail,
      adminEmails,
      message: (isAdmin || staffRecord) ? 'User is admin or staff' : 'User is not admin'
    });

  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check admin status'
    });
  }
});

// @route   GET /api/contact-us/all
// @desc    Get all contact submissions with filters
// @access  Private/Admin (Email-based)
router.get('/all', authMiddleware, checkAdminByEmail(), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category, 
      search,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    // Valid contact-us categories only
    const validCategories = ['Support', 'Technical', 'Feedback', 'Account', 'Partnership', 'Other'];

    // Build query in a robust way using $and of conditions
    let andConditions = [];

    // Exclude deleted messages
    andConditions.push({ isDeleted: false });

    // IMPORTANT: Exclude company messages (they are private between user and company owner)
    // Only show general support/contact-us messages in admin view
    andConditions.push({ companyId: null });

    // Only show messages with valid contact-us categories
    andConditions.push({ category: { $in: validCategories } });

    if (status) andConditions.push({ status });

    // If a category filter is provided in query params, include it (staff later validated)
    if (category) andConditions.push({ category });

    // Search filter
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Staff-specific constraints: restrict to allowed categories OR match department keywords in subject/message/name
    if (req.staff && Array.isArray(req.staff.allowedCategories) && req.staff.allowedCategories.length > 0) {
      // Build a safe regex from staff department names to match older messages whose category may be 'Other'
      const escapeForRegex = (s) => (s || '').replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      const deptArr = (req.staff.departments || []).map(d => (d || '').trim()).filter(Boolean);
      const deptKeywords = deptArr.map(d => escapeForRegex(d)).join('|');

      const staffOr = [ { category: { $in: req.staff.allowedCategories } } ];
      if (deptKeywords) {
        staffOr.push({ subject: { $regex: deptKeywords, $options: 'i' } });
        staffOr.push({ message: { $regex: deptKeywords, $options: 'i' } });
        staffOr.push({ name: { $regex: deptKeywords, $options: 'i' } });
      }

      // If a specific category is requested via query param, ensure staff is allowed to see it
      if (category && !req.staff.allowedCategories.includes(category)) {
        return res.status(403).json({ success: false, error: 'Access to this category is not allowed for your account' });
      }

      andConditions.push({ $or: staffOr });
    }

    // Final query
    let query = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

    // Debug: log final query when staff filtering is applied
    if (req.staff) {
      try {
        console.log('ContactUs /all final query for staff', JSON.stringify(query));
      } catch (e) {
        console.log('ContactUs /all final query (unable to stringify)');
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    const validSortFields = ['submittedAt', 'updatedAt', 'name', 'email'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'submittedAt';
    sort[sortField] = sortOrder === 'desc' ? -1 : 1;

    // Get messages
    const [messages, total] = await Promise.all([
      ContactUs.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-__v'),
      ContactUs.countDocuments(query)
    ]);

    // Get stats
    const stats = {
      total,
      new: await ContactUs.countDocuments({ ...query, status: 'new' }),
      in_progress: await ContactUs.countDocuments({ ...query, status: 'in_progress' }),
      resolved: await ContactUs.countDocuments({ ...query, status: 'resolved' }),
      closed: await ContactUs.countDocuments({ ...query, status: 'closed' }),
      unread: await ContactUs.countDocuments({ ...query, isRead: false })
    };

    res.json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      stats,
      data: messages
    });

  } catch (error) {
    console.error('Get all contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact messages',
      message: error.message
    });
  }
});

// @route   GET /api/contact-us/stats
// @desc    Get contact form statistics
// @access  Private/Admin (Email-based)
router.get('/stats', authMiddleware, checkAdminByEmail(), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Valid contact-us categories only
    const validCategories = ['Support', 'Technical', 'Feedback', 'Account', 'Partnership', 'Other'];

    // Build base match filter. If request comes from a staff member, limit to their allowedCategories
    const baseMatch = { isDeleted: false, companyId: null, category: { $in: validCategories } };
    if (req.staff && Array.isArray(req.staff.allowedCategories) && req.staff.allowedCategories.length) {
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      const deptArr = (req.staff.departments || []).map(d => (d || '').trim()).filter(Boolean);
      const deptKeywords = deptArr.map(d => escapeRegex(d)).join('|');

      const categoryFilter = { category: { $in: req.staff.allowedCategories } };
      const subjectFilter = deptKeywords ? { subject: { $regex: deptKeywords, $options: 'i' } } : null;
      const messageFilter = deptKeywords ? { message: { $regex: deptKeywords, $options: 'i' } } : null;
      const nameFilter = deptKeywords ? { name: { $regex: deptKeywords, $options: 'i' } } : null;

      const orArr = [ categoryFilter ];
      if (subjectFilter) orArr.push(subjectFilter);
      if (messageFilter) orArr.push(messageFilter);
      if (nameFilter) orArr.push(nameFilter);

      baseMatch.$or = orArr;
    }

    const [total, newCount, inProgress, resolved, closed, dailyStats] = await Promise.all([
      ContactUs.countDocuments(baseMatch),
      ContactUs.countDocuments(Object.assign({}, baseMatch, { status: 'new' })),
      ContactUs.countDocuments(Object.assign({}, baseMatch, { status: 'in_progress' })),
      ContactUs.countDocuments(Object.assign({}, baseMatch, { status: 'resolved' })),
      ContactUs.countDocuments(Object.assign({}, baseMatch, { status: 'closed' })),
      ContactUs.aggregate([
        {
          $match: Object.assign({}, baseMatch, { submittedAt: { $gte: thirtyDaysAgo } })
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ])
    ]);

    // Get category distribution
    const categoryStats = await ContactUs.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: {
          new: newCount,
          in_progress: inProgress,
          resolved: resolved,
          closed: closed
        },
        categories: categoryStats,
        dailyStats: dailyStats.reduce((acc, day) => {
          acc[day._id] = day.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// @route   GET /api/contact-us/:id
// @desc    Get single contact message by ID
// @access  Private/Admin (Email-based)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await ContactUs.findById(id)
      .populate('replies.sentBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('companyId', 'name')
      .select('-__v');
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Permission: allow platform admins/staff, message sender, or assigned company owner
    let allowed = false;
    try {
      if (message.email && req.user && message.email.toLowerCase() === req.user.email.toLowerCase()) {
        allowed = true;
      }
      if (!allowed && message.assignedTo && req.user && message.assignedTo.toString() === req.user._id.toString()) {
        allowed = true;
      }
      if (!allowed) {
        if (isAdminByEmail(req.user.email)) allowed = true;
        else {
          const Staff = require('../models/Staff');
          const staffRecord = await Staff.findOne({ email: req.user.email, isActive: true });
          if (staffRecord) allowed = true;
        }
      }
    } catch (permErr) {
      console.error('Permission check failed:', permErr);
    }

    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Mark as read if not already
    if (!message.isRead) {
      message.isRead = true;
      await message.save();
    }

    res.json({ success: true, data: message });

  } catch (error) {
    console.error('Get message error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid message ID' 
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message',
      message: error.message
    });
  }
});

// @route   PATCH /api/contact-us/:id/status
// @desc    Update message status
// @access  Private/Admin (Email-based)
router.patch('/:id/status', 
  authMiddleware, 
  checkAdminByEmail(),
  [
    body('status').isIn(['new', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
    body('notes').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, notes } = req.body;

      const message = await ContactUs.findById(id);
      if (!message) {
        return res.status(404).json({ 
          success: false, 
          error: 'Message not found' 
        });
      }

      const previousStatus = message.status;
      message.status = status;
      
      if (status === 'resolved' || status === 'closed') {
        message.resolvedAt = new Date();
      }
      
      // Add to admin notes
      if (notes) {
        message.adminNotes = message.adminNotes 
          ? `${message.adminNotes}\n\n[${new Date().toISOString()}] Status changed from ${previousStatus} to ${status} by ${req.user.email}: ${notes}`
          : `[${new Date().toISOString()}] Status changed from ${previousStatus} to ${status} by ${req.user.email}: ${notes}`;
      } else {
        message.adminNotes = message.adminNotes 
          ? `${message.adminNotes}\n\n[${new Date().toISOString()}] Status changed from ${previousStatus} to ${status} by ${req.user.email}`
          : `[${new Date().toISOString()}] Status changed from ${previousStatus} to ${status} by ${req.user.email}`;
      }
      
      message.updatedAt = new Date();
      await message.save();

      // Create notification for user about status change (PUSH NOTIFICATION ONLY - NOT IN MESSAGES)
      try {
        const userEmail = message.email.toLowerCase().trim();
        console.log(`Creating status notification for user: ${userEmail} for message: ${message._id}`);
        
        const notification = await Notification.createMessageStatusNotification(
          userEmail,
          message._id,
          message.subject,
          previousStatus,
          status
        );
        
        console.log(`Status notification created successfully: ${notification._id}`);
      } catch (notificationError) {
        console.error('Failed to create status notification:', {
          messageEmail: message.email,
          messageId: message._id,
          error: notificationError.message,
          stack: notificationError.stack
        });
      }

      // Send email to user notifying about status change (best-effort)
      try {
        const statusLabels = {
          'new': 'New',
          'in_progress': 'In Progress',
          'resolved': 'Resolved',
          'closed': 'Closed'
        };

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: message.email,
          subject: `Update on your support ticket: ${message.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
              <h2 style="color:#333;">Support Ticket Status Updated</h2>
              <p>Dear ${message.name || 'User'},</p>
              <p>Your support ticket <strong>"${message.subject}"</strong> has been updated by our team.</p>
              <div style="background:#f5f5f5; padding:12px; border-radius:6px;">
                <p><strong>Previous status:</strong> ${statusLabels[previousStatus] || previousStatus}</p>
                <p><strong>Current status:</strong> ${statusLabels[status] || status}</p>
              </div>
              ${notes ? `<p><strong>Admin note:</strong> ${notes}</p>` : ''}
              <p>You can view the conversation by logging into your account and visiting the Messages section.</p>
              <p>Best regards,<br/>Support Team</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send status change email:', emailError);
        // Do not fail the main request because of email errors
      }

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: message
      });

    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update status',
        message: error.message
      });
    }
  }
);

// @route   PATCH /api/contact-us/:id/read
// @desc    Mark message as read/unread
// @access  Private/Admin (Email-based)
router.patch('/:id/read', 
  authMiddleware, 
  checkAdminByEmail(),
  [
    body('isRead').isBoolean().withMessage('isRead must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { isRead } = req.body;

      const message = await ContactUs.findByIdAndUpdate(
        id,
        { isRead: Boolean(isRead), updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!message) {
        return res.status(404).json({ 
          success: false, 
          error: 'Message not found' 
        });
      }

      res.json({
        success: true,
        message: isRead ? 'Marked as read' : 'Marked as unread',
        data: message
      });

    } catch (error) {
      console.error('Update read status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update read status',
        message: error.message
      });
    }
  }
);

// @route   POST /api/contact-us/:id/reply
// @desc    Send reply to contact message
// @access  Private/Admin (Email-based)
router.post('/:id/reply', 
  authMiddleware,
  [
    body('content').notEmpty().withMessage('Reply content is required'),
    body('sendEmail').optional().isBoolean().withMessage('sendEmail must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { content, sendEmail = true } = req.body;

      const message = await ContactUs.findById(id);
      if (!message) {
        return res.status(404).json({ 
          success: false, 
          error: 'Message not found' 
        });
      }

      // Permission check: allow if logged-in user is assignedTo (company owner)
      // or if user is admin by email or active staff.
      const userIsAssignedOwner = message.assignedTo && req.user && message.assignedTo.toString() === req.user._id.toString();
      let userIsAdminOrStaff = false;
      try {
        if (isAdminByEmail(req.user.email)) {
          userIsAdminOrStaff = true;
        } else {
          const Staff = require('../models/Staff');
          const staffRecord = await Staff.findOne({ email: req.user.email, isActive: true });
          if (staffRecord) userIsAdminOrStaff = true;
        }
      } catch (permErr) {
        console.error('Permission check lookup failed:', permErr);
      }

      if (!userIsAssignedOwner && !userIsAdminOrStaff) {
        return res.status(403).json({ success: false, error: 'You do not have permission to reply to this message' });
      }

      // Check if message is closed - prevent replies
      if (message.status === 'closed' || message.status === 'resolved') {
        return res.status(400).json({
          success: false,
          error: 'Cannot reply to closed or resolved conversations. Please create a new support request.'
        });
      }

      let emailSent = false;
      let emailId = null;

      // Send email if requested
      if (sendEmail) {
        try {
          const emailResponse = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: message.email,
            replyTo: process.env.EMAIL_USER,
            subject: `Re: ${message.subject}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Reply to your inquiry</h2>
                <p>Dear ${message.name},</p>
                <p>Thank you for contacting us. Here is our response to your inquiry:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                  ${content.replace(/\n/g, '<br>')}
                </div>
                <p>If you have any further questions, you can reply directly to this email or visit your messages page to continue the conversation.</p>
                <p>Best regards,<br>Support Team</p>
              </div>
            `
          });
          
          emailSent = true;
          emailId = emailResponse.messageId;
        } catch (emailError) {
          console.error('Reply email error:', emailError);
        }
      }

      // Update message status if it's new — but do NOT change status when the assigned company owner replies
      if (message.status === 'new' && !userIsAssignedOwner) {
        message.status = 'in_progress';
      }
      
      // Add reply to the replies array (main conversation)
      const adminUser = await User.findById(req.user._id).select('_id name email');
      if (!adminUser) {
        return res.status(404).json({
          success: false,
          error: 'Admin user not found'
        });
      }

      // Ensure replies array exists
      if (!Array.isArray(message.replies)) {
        message.replies = [];
      }

      // Add new reply
      // Determine reply context/display name
      let replySenderContext = 'support';
      let replyDisplayName = adminUser.name || 'Support Team';
      let replyRespondingCompanyId = null;
      let replyRespondingCompanyName = null;

      if (userIsAssignedOwner) {
        // Replying as company owner
        replySenderContext = 'company';
        replyDisplayName = message.companyName || adminUser.name || 'Company';
        replyRespondingCompanyId = message.companyId || null;
        replyRespondingCompanyName = message.companyName || null;
      } else if (userIsAdminOrStaff) {
        // Admin/staff reply should appear as support
        replySenderContext = 'support';
        replyDisplayName = 'Support Team';
      } else {
        // Fallback to user's name
        replySenderContext = 'support';
        replyDisplayName = adminUser.name || 'Support Team';
      }

      const newReply = {
        content,
        sentBy: adminUser._id,
        senderContext: replySenderContext,
        displayName: replyDisplayName,
        respondingCompanyId: replyRespondingCompanyId,
        respondingCompanyName: replyRespondingCompanyName,
        sentAt: new Date(),
        emailSent,
        emailId: emailId || null,
        isRead: false
      };

      message.replies.push(newReply);
      console.log(`✅ Reply added to message. Total replies: ${message.replies.length}`);

      // Mark as replied
      message.isReplied = true;
      message.lastActivityAt = new Date();
      message.updatedAt = new Date();
      
      // Also track in admin notes for internal reference
      const timestamp = new Date().toISOString();
      message.adminNotes = message.adminNotes 
        ? `${message.adminNotes}\n\n[${timestamp}] Admin reply (${req.user.email}): ${content.substring(0, 100)}...`
        : `[${timestamp}] Admin reply (${req.user.email}): ${content.substring(0, 100)}...`;

      // If this reply was sent on behalf of a company owner, set conversation-level context
      if (replySenderContext === 'company') {
        message.senderContext = 'company';
        message.displaySenderName = replyDisplayName;
        message.respondingCompanyId = replyRespondingCompanyId;
        message.respondingCompanyName = replyRespondingCompanyName;
      }

      // Save and verify
      const savedMessage = await message.save();
      console.log(`✅ Message saved. Message ID: ${savedMessage._id}, Replies count: ${savedMessage.replies.length}`);

      // Verify the save was successful
      const verifyMessage = await ContactUs.findById(id);
      if (!verifyMessage || verifyMessage.replies.length === 0) {
        console.error('⚠️ WARNING: Reply may not have been saved correctly!', {
          messageId: id,
          repliesCount: verifyMessage ? verifyMessage.replies.length : 'Message not found'
        });
      }

      // Populate replies for response
      const populatedMessage = await ContactUs.findById(id)
        .populate('replies.sentBy', 'name email');

      console.log(`✅ Populated message fetched. Replies: ${populatedMessage.replies.length}`);

      // Create notification for user about reply
      try {
        await Notification.createReplyNotification(
          message.email,
          message._id,
          message.subject
        );
      } catch (notificationError) {
        console.error('Failed to create reply notification:', notificationError);
        // Don't fail the request if notification creation fails
      }
      // Emit socket event to user's room so frontend can update in real-time
      try {
        const { getIO } = require('../socket');
        const io = getIO();
        // Use user's email as room identifier
        const room = `user:${message.email}`;
        // Send a cleaned reply object (populate sentBy name/email if available)
        const replyForEmit = {
          _id: newReply._id || null,
          content: newReply.content,
          sentBy: adminUser ? { _id: adminUser._id, name: adminUser.name, email: adminUser.email } : null,
          sentAt: newReply.sentAt || new Date(),
          emailSent: !!newReply.emailSent,
          isRead: !!newReply.isRead,
          senderContext: newReply.senderContext || (userIsAssignedOwner ? 'company' : 'support'),
          displayName: newReply.displayName || (userIsAssignedOwner ? message.companyName : adminUser.name),
          respondingCompanyId: newReply.respondingCompanyId || null,
          respondingCompanyName: newReply.respondingCompanyName || null
        };

        io.to(room).emit('message:replied', {
          messageId: message._id,
          subject: message.subject,
          reply: replyForEmit,
          timestamp: new Date()
        });
        console.log('[socket] emitted message:replied to', room);
      } catch (socketErr) {
        console.error('Socket emit error (reply):', socketErr && socketErr.message ? socketErr.message : socketErr);
      }

      res.json({
        success: true,
        message: emailSent ? 'Reply sent successfully' : 'Reply saved (email not sent)',
        data: {
          emailSent,
          message: populatedMessage
        }
      });

    } catch (error) {
      console.error('Send reply error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send reply',
        message: error.message
      });
    }
  }
);

// @route   POST /api/contact-us/:id/note
// @desc    Add admin note to message
// @access  Private/Admin (Email-based)
router.post('/:id/note', 
  authMiddleware, 
  checkAdminByEmail(),
  [
    body('note').notEmpty().withMessage('Note content is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { note } = req.body;

      const message = await ContactUs.findById(id);
      if (!message) {
        return res.status(404).json({ 
          success: false, 
          error: 'Message not found' 
        });
      }

      const timestamp = new Date().toISOString();
      const adminName = req.user.name || 'Admin';
      
      message.adminNotes = message.adminNotes 
        ? `${message.adminNotes}\n\n[${timestamp}] ${adminName}: ${note}`
        : `[${timestamp}] ${adminName}: ${note}`;
      
      message.updatedAt = new Date();
      await message.save();

      res.json({
        success: true,
        message: 'Note added successfully',
        data: message
      });

    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add note',
        message: error.message
      });
    }
  }
);

// @route   DELETE /api/contact-us/:id
// @desc    Delete contact message
// @access  Private/Admin (Email-based)
router.delete('/:id', 
  authMiddleware, 
  checkAdminByEmail(),
  async (req, res) => {
    try {
      const { id } = req.params;

      const message = await ContactUs.findById(id);
      if (!message) {
        return res.status(404).json({ 
          success: false, 
          error: 'Message not found' 
        });
      }

      // Soft delete
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deletedBy = req.user._id;
      await message.save();

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });

    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete message',
        message: error.message
      });
    }
  }
);

// @route   GET /api/contact-us/export
// @desc    Export contact messages as CSV
// @access  Private/Admin (Email-based)
router.get('/export', authMiddleware, checkAdminByEmail(), async (req, res) => {
  try {
    const query = { isDeleted: false };
    
    const messages = await ContactUs.find(query)
      .sort({ submittedAt: -1 })
      .select('name email subject message category status isRead isReplied submittedAt resolvedAt');

    // Convert to CSV
    const csvData = [
      ['Name', 'Email', 'Subject', 'Message', 'Category', 'Status', 'Read', 'Replied', 'Submitted At', 'Resolved At']
    ];

    messages.forEach(msg => {
      csvData.push([
        `"${msg.name}"`,
        `"${msg.email}"`,
        `"${msg.subject}"`,
        `"${msg.message.replace(/"/g, '""')}"`,
        `"${msg.category}"`,
        `"${msg.status}"`,
        msg.isRead ? 'Yes' : 'No',
        msg.isReplied ? 'Yes' : 'No',
        `"${msg.submittedAt.toISOString()}"`,
        msg.resolvedAt ? `"${msg.resolvedAt.toISOString()}"` : ''
      ]);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=contact_messages_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export messages',
      message: error.message
    });
  }
});

// ==================== USER ROUTES ====================

// @route   GET /api/contact-us/user/messages
// @desc    Get user's contact messages with conversations
// @access  Private (User only)
router.get('/user/messages', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { unreadOnly = false } = req.query;

    // Find all contact messages for this user
    // Include messages where the logged-in user is the sender (email) OR assignedTo (e.g., company owner)
    const filter = {
      $or: [
        { email: req.user.email },
        { assignedTo: userId }
      ]
    };
    if (unreadOnly === 'true') {
      // restrict to unread in either branch
      filter.$and = [
        { $or: [ { isRead: false }, { 'replies.isRead': false } ] }
      ];
    }

    console.log(`📨 Fetching messages for user: ${req.user.email}, Filter:`, filter);

    // Return all messages for the user, sorted by last activity (most recent first)
    const messages = await ContactUs.find(filter)
      .populate('replies.sentBy', 'name email')
      .sort({ lastActivityAt: -1, submittedAt: -1 })
      .select('-__v');

    console.log(`📊 Total messages found: ${messages.length}`);
    messages.forEach((msg, idx) => {
      console.log(`  [${idx + 1}] ${msg.subject} - Replies: ${msg.replies ? msg.replies.length : 0}, Status: ${msg.status}`);
    });

    // Count unread messages
    const unreadCount = messages.filter(msg => {
      if (!msg.isRead) return true;
      // Check if any replies are unread
      return msg.replies && msg.replies.some(reply => !reply.isRead);
    }).length;

    console.log(`💬 Total messages returned: ${messages.length}`);

    res.json({
      success: true,
      messages,            // Return all messages (including older chats)
      allMessages: messages.length,
      unreadCount,
      total: messages.length
    });

  } catch (error) {
    console.error('Get user messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
});

// @route   GET /api/contact-us/user/:messageId
// @desc    Get single message conversation for user
// @access  Private (User only)
router.get('/user/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ContactUs.findOne({
      _id: messageId,
      email: req.user.email
    })
    .populate('replies.sentBy', 'name email')
    .select('-__v');

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Mark message as read if not already
    if (!message.isRead) {
      message.isRead = true;
      await message.save();
    }

    // Mark all replies as read for this user
    message.replies = message.replies.map(reply => {
      if (!reply.isRead) {
        reply.isRead = true;
      }
      return reply;
    });
    await message.save();

    res.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Get user message error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid message ID'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message',
      message: error.message
    });
  }
});

// @route   POST /api/contact-us/user/:messageId/reply
// @desc    User reply to contact message
// @access  Private (User only)
router.post('/user/:messageId/reply',
  authMiddleware,
  [
    body('content').notEmpty().withMessage('Reply content is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { messageId } = req.params;
      const { content } = req.body;

      const message = await ContactUs.findOne({
        _id: messageId,
        email: req.user.email
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      // Check if message status allows replies
      if (message.status === 'closed' || message.status === 'resolved') {
        return res.status(400).json({
          success: false,
          error: 'This conversation is closed. Please create a new contact request.',
          message: 'Cannot reply to closed or resolved messages'
        });
      }

      // Add user reply
      message.replies.push({
        content,
        sentBy: req.user._id,
        senderContext: 'user',
        displayName: req.user.name || null,
        respondingCompanyId: null,
        respondingCompanyName: null,
        sentAt: new Date(),
        emailSent: false, // User replies don't need email notification
        emailId: null,
        isRead: true // User's own messages are automatically read
      });

      message.lastActivityAt = new Date();
      await message.save();

      // Populate the reply for response
      const populatedMessage = await ContactUs.findById(messageId)
        .populate('replies.sentBy', 'name email');

      // Emit socket event to assigned owner (if any) so company owners see replies in real-time
      try {
        if (populatedMessage.assignedTo) {
          const User = require('../models/User');
          const owner = await User.findById(populatedMessage.assignedTo).select('email name');
          if (owner && owner.email) {
            const { getIO } = require('../socket');
            const io = getIO();
            const lastReply = populatedMessage.replies && populatedMessage.replies.length ? populatedMessage.replies[populatedMessage.replies.length - 1] : null;
            const replyForEmit = lastReply ? {
              _id: lastReply._id || null,
              content: lastReply.content,
              sentBy: lastReply.sentBy ? { _id: lastReply.sentBy._id, name: lastReply.sentBy.name, email: lastReply.sentBy.email } : { _id: req.user._id, name: req.user.name, email: req.user.email },
              sentAt: lastReply.sentAt || new Date(),
              emailSent: !!lastReply.emailSent,
              isRead: !!lastReply.isRead,
              senderContext: lastReply.senderContext || 'user',
              displayName: lastReply.displayName || req.user.name,
              respondingCompanyId: lastReply.respondingCompanyId || null,
              respondingCompanyName: lastReply.respondingCompanyName || null
            } : null;

            io.to(`user:${owner.email}`).emit('message:replied', {
              messageId: populatedMessage._id,
              subject: populatedMessage.subject,
              reply: replyForEmit,
              timestamp: new Date()
            });
            console.log('[socket] emitted message:replied to owner:', owner.email);
          }
        }
      } catch (emitErr) {
        console.error('Socket emit error (user reply):', emitErr && emitErr.message ? emitErr.message : emitErr);
      }

      res.json({
        success: true,
        message: 'Reply sent successfully',
        messageData: populatedMessage
      });

    } catch (error) {
      console.error('User reply error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send reply',
        message: error.message
      });
    }
  }
);

// @route   GET /api/contact-us/user/messages/unread-count
// @desc    Get unread message count for user
// @access  Private (User only)
router.get('/user/messages/unread-count', authMiddleware, async (req, res) => {
  try {
    const messages = await ContactUs.find({ email: req.user.email })
      .select('isRead replies.isRead');

    let unreadCount = 0;

    messages.forEach(msg => {
      if (!msg.isRead) {
        unreadCount++;
      } else {
        // Check replies
        const unreadReplies = msg.replies.filter(reply => !reply.isRead);
        unreadCount += unreadReplies.length;
      }
    });

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      message: error.message
    });
  }
});

// @route   GET /api/contact-us/check-staff
// @desc    Check if user is a staff member and get their departments
// @access  Private
router.get('/check-staff', authMiddleware, async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    
    const staff = await Staff.findOne({ email: req.user.email, isActive: true });

    if (!staff) {
      return res.json({
        success: true,
        isStaff: false,
        departments: []
      });
    }

    res.json({
      success: true,
      isStaff: true,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        departments: staff.departments
      }
    });
  } catch (error) {
    console.error('Check staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check staff status',
      message: error.message
    });
  }
});

module.exports = router;
