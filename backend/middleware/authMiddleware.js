// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header("Authorization");

        console.log("Received Token:", token); // Debugging

        if (!token) {
            return res.status(401).json({ error: "Access denied. No token provided." });
        }

        // Remove "Bearer " prefix if present
        const tokenString = token.replace("Bearer ", "");
        
        try {
            // Verify token without checking expiration
            const decoded = jwt.decode(tokenString);
            
            if (!decoded) {
                return res.status(401).json({ error: "Invalid token format." });
            }

            console.log("Decoded Token:", decoded);

            // Check if token has expired (only if it has an exp field)
            if (decoded.exp && decoded.exp < Date.now() / 1000) {
                return res.status(401).json({ error: "Token has expired." });
            }

            // Verify the token signature (without expiration check)
            const verified = jwt.verify(tokenString, process.env.JWT_SECRET, { 
                ignoreExpiration: true 
            });

            const user = await User.findById(verified.userId);
            if (!user) {
                return res.status(404).json({ error: "User not found." });
            }

            // Add admin status to user object based on email
            const isAdmin = isAdminByEmail(user.email);
            
            // Add admin property to user object (for backward compatibility)
            req.user = {
                ...user.toObject(), // Convert mongoose document to plain object
                isAdmin: isAdmin // Add isAdmin flag
            };
            
            next();
        } catch (verifyError) {
            console.error("Token verification error:", verifyError);
            return res.status(401).json({ error: "Invalid token signature." });
        }
    } catch (error) {
        console.error("Middleware Error:", error);
        res.status(401).json({ error: "Invalid token" });
    }
};

// Middleware to check admin access by email
const adminByEmailMiddleware = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Check if user is admin by email
    if (!isAdminByEmail(req.user.email)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required. Your email is not authorized.' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Admin check failed'
    });
  }
};

// Optional authentication middleware - doesn't fail if no token, but extracts user if token is valid
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    const tokenString = token.replace("Bearer ", "");
    
    try {
      const verified = jwt.verify(tokenString, process.env.JWT_SECRET, { 
        ignoreExpiration: true 
      });

      const user = await User.findById(verified.userId);
      if (user) {
        const isAdmin = isAdminByEmail(user.email);
        req.user = {
          ...user.toObject(),
          isAdmin: isAdmin
        };
      }
      next();
    } catch (verifyError) {
      // Token invalid or expired, continue without user
      next();
    }
  } catch (error) {
    // Silently continue without user
    next();
  }
};

module.exports = authMiddleware;

// Also attach helper functions to the exported function
module.exports.getAdminEmails = getAdminEmails;
module.exports.isAdminByEmail = isAdminByEmail;
module.exports.adminByEmailMiddleware = adminByEmailMiddleware;
module.exports.optionalAuthMiddleware = optionalAuthMiddleware;