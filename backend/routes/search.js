// routes/search.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Job = require('../models/Jobs'); // You'll need to create this model

// Search endpoint
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({ jobs: [], users: [] });
    }

    const searchQuery = q.trim();

    // Search jobs
    const jobs = await Job.find({
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { companyName: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { location: { $regex: searchQuery, $options: 'i' } }
      ],
      isActive: true
    })
    .select('_id title companyName location type')
    .limit(10);

    // Search users
    const users = await User.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { role: { $regex: searchQuery, $options: 'i' } },
        { 'skills.name': { $regex: searchQuery, $options: 'i' } }
      ]
    })
    .select('_id name profileImage location')
    .limit(10);

    res.json({
      jobs,
      users
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;