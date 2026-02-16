const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");


router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Invalid email"),
    body("age").notEmpty().withMessage("Age is required").isNumeric().withMessage("Age must be a number"),
    body("role").notEmpty().withMessage("Role is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password,age,role } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ message: "User already exists" });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = new User({ name, email, password: hashedPassword,age,role });
      await user.save();

      // Create token WITHOUT expiration
      const token = jwt.sign({ 
        userId: user.id,
        email: user.email 
      }, process.env.JWT_SECRET);
      // No expiresIn option means token never expires
      
      // Return user data
      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        role: user.role
      };

      res.json({ 
        token, 
        user: userData,
        message: "Registration successful"
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// routes/auth.js - Update login route
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "Invalid credentials" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

      // Create token WITHOUT expiration
      const token = jwt.sign({ 
        userId: user.id,
        email: user.email
      }, process.env.JWT_SECRET);
      
      // Update user's last login time - but don't validate the entire user
      user.lastLogin = Date.now();
      
      // Save without validation for login
      await user.save({ validateBeforeSave: false });
      
      // Return user data along with token
      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        role: user.role,
        profileImage: user.profileImage,
        skills: user.skills,
        location: user.location,
        phone: user.phone,
        linkedin: user.linkedin,
        portfolio: user.portfolio,
        bio: user.bio,
        education: user.education,
        experience: user.experience
      };

      res.json({ 
        token, 
        user: userData,
        message: "Login successful"
      });
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle specific validation errors
      if (error.name === 'ValidationError') {
        // If it's a LinkedIn URL validation error, still allow login
        if (error.errors?.linkedin) {
          console.warn("LinkedIn URL validation failed, but allowing login:", error.errors.linkedin.message);
          
          // Try to get user without validation
          const user = await User.findOne({ email }).select('-password');
          if (!user) return res.status(400).json({ message: "Invalid credentials" });
          
          const token = jwt.sign({ 
            userId: user.id,
            email: user.email
          }, process.env.JWT_SECRET);
          
          const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            age: user.age,
            role: user.role,
            profileImage: user.profileImage,
            skills: user.skills,
            location: user.location,
            phone: user.phone,
            linkedin: user.linkedin,
            portfolio: user.portfolio,
            bio: user.bio,
            education: user.education,
            experience: user.experience
          };

          return res.json({ 
            token, 
            user: userData,
            message: "Login successful (with validation warning)",
            warning: "LinkedIn URL format issue detected"
          });
        }
      }
      
      res.status(500).json({ message: "Server Error" });
    }
  }
);


router.get("/logout", authMiddleware, async (req, res) => {
  try {
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// routes/auth.js - Add this route
router.post("/refresh-token", authMiddleware, async (req, res) => {
  try {
    // Create a new token with the same payload but newer timestamp
    const token = jwt.sign({ 
      userId: req.user._id,
      email: req.user.email
    }, process.env.JWT_SECRET);
    
    res.json({ 
      token,
      message: "Token refreshed"
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ error: "Server error" });
  }
});


router.get("/user/applied-jobs", authMiddleware, async (req, res) => {
  try {
      

      const user = await User.findById(req.user._id).select("appliedJobs");
      if (!user) return res.status(404).json({ error: "User not found" });

      

      res.json(user.appliedJobs || []); // Ensure it's an array
  } catch (err) {
      
      res.status(500).json({ error: "Internal Server Error" });
  }
});




router.get("/user", authMiddleware, async (req, res) => {
  try {
      console.log("User ID from token:", req.user._id); // Debugging

      const user = await User.findById(req.user._id).select("-password");
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json(user);
  } catch (err) {
      console.error("Error fetching user data:", err);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/user/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// routes/auth.js - Update the user update route
router.put("/user/update", authMiddleware, async (req, res) => {
  try {
    console.log("Updating user:", req.user._id);
    console.log("Received data:", req.body);

    const { 
      name, phone, location, linkedin, portfolio, bio, 
      skills, education, experience 
    } = req.body;

    // Prepare update object
    const updateData = {};
    
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (location) updateData.location = location;
    if (linkedin) updateData.linkedin = linkedin;
    if (portfolio) updateData.portfolio = portfolio;
    if (bio) updateData.bio = bio;
    
    // Handle skills - remove any _id fields from skills
    if (skills) {
      updateData.skills = skills.map(skill => {
        const { _id, ...skillData } = skill;
        return skillData;
      });
    }
    
    // Handle education - remove any _id fields and validate data
    if (education) {
      updateData.education = education.map(edu => {
        const { _id, ...eduData } = edu;
        
        // Convert null values to undefined
        if (eduData.startMonth === null) delete eduData.startMonth;
        if (eduData.endMonth === null) delete eduData.endMonth;
        if (eduData.endYear === null) delete eduData.endYear;
        if (eduData.fieldOfStudy === '') delete eduData.fieldOfStudy;
        if (eduData.description === '') delete eduData.description;
        
        return eduData;
      });
    }
    
    // Handle experience - remove any _id fields
    if (experience) {
      updateData.experience = experience.map(exp => {
        const { _id, ...expData } = exp;
        
        // Ensure dates are properly formatted
        if (expData.startDate) {
          expData.startDate = new Date(expData.startDate);
        }
        if (expData.endDate) {
          expData.endDate = new Date(expData.endDate);
        }
        
        return expData;
      });
    }
    
    updateData.updatedAt = Date.now();

    console.log("Update data:", JSON.stringify(updateData, null, 2));

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        setDefaultsOnInsert: true 
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User updated successfully:", user._id);
    res.json(user);
  } catch (err) {
    console.error("Error updating profile:", err);
    console.error("Error details:", err.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});





const verificationCodes = {}; // Temporary storage for verification codes

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a 6-digit random verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = verificationCode;

    // Check if Nodemailer is set up properly
    if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
      return res.status(500).json({ error: "Email service not configured" });
    }

    // Send email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset Verification Code",
      text: `Your password reset code is: ${verificationCode}`,
    });


    res.json({ message: "Verification code sent to email" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});




router.post("/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (verificationCodes[email] !== code) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    res.json({ message: "Verification successful. You can now reset your password." });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (verificationCodes[email] !== code) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Remove the verification code
    delete verificationCodes[email];

    res.json({ message: "Password reset successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});



// routes/auth.js - Add this route

// Get any user's public profile by ID
router.get("/user-public/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select(
      "-password -appliedJobs -postedJobs -createdAt -updatedAt -__v"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// routes/users.js - Add this route

// @route   GET /api/users/:userId/saved-jobs
// @desc    Get user's saved jobs
// @access  Private (own user only)
// In routes/auth.js - Add this route after your existing routes

// @route   GET /api/users/:userId/saved-jobs
// @desc    Get user's saved jobs
// @access  Private
router.get("/:userId/saved-jobs", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      sort = 'recent',
      filter = 'all',
      search = ''
    } = req.query;

    // Check permission - user can only view their own saved jobs
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ 
        error: "You can only view your own saved jobs" 
      });
    }

    // Find user with saved jobs populated
    const user = await User.findById(userId)
      .populate({
        path: 'savedJobs.job',
        populate: {
          path: 'company',
          select: 'name logo description location website industry size foundedYear email phone socialLinks',
          match: { isActive: true }
        }
      })
      .select('savedJobs');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Filter saved jobs - remove any where job or company is null
    let savedJobs = user.savedJobs?.filter(savedJob => savedJob.job && savedJob.job.company) || [];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      savedJobs = savedJobs.filter(savedJob => {
        const job = savedJob.job;
        return (
          job.title.toLowerCase().includes(searchLower) ||
          job.company.name.toLowerCase().includes(searchLower) ||
          (job.skills && job.skills.some(skill => skill.toLowerCase().includes(searchLower)))
        );
      });
    }

    // Apply status filter
    if (filter === 'active') {
      savedJobs = savedJobs.filter(savedJob => 
        savedJob.job.status === 'active'
      );
    } else if (filter === 'closed') {
      savedJobs = savedJobs.filter(savedJob => 
        savedJob.job.status === 'closed'
      );
    } else if (filter === 'expired') {
      savedJobs = savedJobs.filter(savedJob => {
        if (!savedJob.job.applicationDeadline) return false;
        return new Date(savedJob.job.applicationDeadline) < new Date();
      });
    }

    // Apply sorting
    if (sort === 'recent') {
      savedJobs.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    } else if (sort === 'oldest') {
      savedJobs.sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
    } else if (sort === 'title') {
      savedJobs.sort((a, b) => a.job.title.localeCompare(b.job.title));
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    const totalJobs = savedJobs.length;
    const totalPages = Math.ceil(totalJobs / limitNum);

    const paginatedJobs = savedJobs.slice(startIndex, endIndex);

    res.json({
      savedJobs: paginatedJobs,
      totalJobs,
      totalPages,
      currentPage: pageNum,
      hasNextPage: endIndex < totalJobs,
      hasPrevPage: startIndex > 0
    });

  } catch (error) {
    console.error("Get saved jobs error:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid user ID format" });
    }
    
    res.status(500).json({ error: "Server error: " + error.message });
  }
});





module.exports = router;