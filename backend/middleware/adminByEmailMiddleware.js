// middleware/adminByEmailMiddleware.js

const adminByEmailMiddleware = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Get admin emails from environment variable
    const adminEmails = process.env.ADMIN_EMAILS 
      ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
      : ['admin@example.com']; // fallback

    // Check if user's email is in admin list
    if (!adminEmails.includes(req.user.email)) {
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

module.exports.adminByEmailMiddleware = adminByEmailMiddleware;