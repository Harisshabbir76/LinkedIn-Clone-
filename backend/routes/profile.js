const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profile-images/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get user profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("appliedJobs", "title companyName")
      .populate("postedJobs", "title companyName");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Ensure user object has name field
    const userData = user.toObject();
    userData.fullName = user.name; // Add fullName property
    
    res.json(userData);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update user profile
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      phone,
      location,
      linkedin,
      portfolio,
      bio,
      skills,
      education,
      experience,
      portfolioLinks
    } = req.body;

    const updateData = {};
    
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (location) updateData.location = location;
    if (linkedin) updateData.linkedin = linkedin;
    if (portfolio) updateData.portfolio = portfolio;
    if (bio) updateData.bio = bio;
    
    // Parse arrays if they're strings
    if (skills) {
      try {
        updateData.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
      } catch (err) {
        updateData.skills = skills;
      }
    }
    
    if (education) {
      try {
        updateData.education = typeof education === 'string' ? JSON.parse(education) : education;
      } catch (err) {
        updateData.education = education;
      }
    }
    
    if (experience) {
      try {
        updateData.experience = typeof experience === 'string' ? JSON.parse(experience) : experience;
      } catch (err) {
        updateData.experience = experience;
      }
    }
    
    if (portfolioLinks) {
      try {
        updateData.portfolioLinks = typeof portfolioLinks === 'string' ? JSON.parse(portfolioLinks) : portfolioLinks;
      } catch (err) {
        updateData.portfolioLinks = portfolioLinks;
      }
    }
    
    updateData.updatedAt = Date.now();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// Upload profile image
router.post("/profile/image", authMiddleware, upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Remove old image if exists
    const user = await User.findById(req.user._id);
    if (user.profileImage && user.profileImage !== 'default-profile.png') {
      const oldImagePath = path.join(__dirname, '..', user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update user with new image path
    const imagePath = 'uploads/profile-images/' + req.file.filename;
    user.profileImage = imagePath;
    user.updatedAt = Date.now();
    await user.save();

    res.json({
      message: "Profile image uploaded successfully",
      profileImage: imagePath,
      user: await User.findById(req.user._id).select("-password")
    });
  } catch (err) {
    console.error("Error uploading profile image:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete profile image
router.delete("/profile/image", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.profileImage && user.profileImage !== 'default-profile.png') {
      const imagePath = path.join(__dirname, '..', user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    user.profileImage = null;
    user.updatedAt = Date.now();
    await user.save();

    res.json({
      message: "Profile image removed successfully",
      user: await User.findById(req.user._id).select("-password")
    });
  } catch (err) {
    console.error("Error removing profile image:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get any user's public profile
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await User.findById(userId)
      .select("-password -appliedJobs -postedJobs -createdAt -updatedAt -__v");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching public profile:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Portfolio links management
router.post("/profile/portfolio-links", authMiddleware, async (req, res) => {
  try {
    const { title, url, description, type } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user already has 3 portfolio links
    if (user.portfolioLinks && user.portfolioLinks.length >= 3) {
      return res.status(400).json({ error: "Maximum 3 portfolio links allowed" });
    }
    
    const newLink = {
      title: title || "",
      url,
      description: description || "",
      type: type || "website"
    };
    
    user.addPortfolioLink(newLink);
    await user.save();
    
    res.json({
      message: "Portfolio link added successfully",
      portfolioLinks: user.portfolioLinks
    });
  } catch (err) {
    console.error("Error adding portfolio link:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/profile/portfolio-links/:linkId", authMiddleware, async (req, res) => {
  try {
    const { linkId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(linkId)) {
      return res.status(400).json({ error: "Invalid link ID format" });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    user.removePortfolioLink(linkId);
    await user.save();
    
    res.json({
      message: "Portfolio link removed successfully",
      portfolioLinks: user.portfolioLinks
    });
  } catch (err) {
    console.error("Error removing portfolio link:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/profile/portfolio-links/:linkId/primary", authMiddleware, async (req, res) => {
  try {
    const { linkId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(linkId)) {
      return res.status(400).json({ error: "Invalid link ID format" });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    user.setPrimaryPortfolioLink(linkId);
    await user.save();
    
    res.json({
      message: "Primary portfolio link updated successfully",
      portfolioLinks: user.portfolioLinks
    });
  } catch (err) {
    console.error("Error setting primary portfolio link:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;