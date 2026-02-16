// middleware/trackView.js
const CompanyView = require('../models/CompanyView');
const { v4: uuidv4 } = require('uuid');

const trackCompanyView = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    if (!companyId || req.method !== 'GET') {
      return next();
    }
    
    // Get session ID from cookies or create new
    let sessionId = req.cookies.session_id;
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie('session_id', sessionId, {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
    }
    
    // Determine source
    const referer = req.get('Referer') || '';
    let source = 'direct';
    
    if (referer.includes('google') || referer.includes('bing')) {
      source = 'search';
    } else if (referer.includes('facebook') || referer.includes('twitter') || referer.includes('linkedin')) {
      source = 'social';
    } else if (referer && !referer.includes(req.get('host'))) {
      source = 'referral';
    } else if (referer.includes(req.get('host'))) {
      source = 'internal';
    }
    
    // Track the view asynchronously (don't wait for it to complete)
    CompanyView.trackView(companyId, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?._id || null,
      source,
      sessionId,
      duration: 0 // Will be updated if we track view duration
    });
    
    next();
  } catch (error) {
    console.error('Track view middleware error:', error);
    next();
  }
};

module.exports = trackCompanyView;