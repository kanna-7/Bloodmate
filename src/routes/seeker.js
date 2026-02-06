const express = require('express');
const auth = require('../middleware/auth');
const Alert = require('../models/Alert');

const router = express.Router();

router.get('/dashboard', auth('seeker'), async (req, res) => {
  try {
    const totalAlerts = await Alert.countDocuments({ createdBy: req.user.id });
    const activeAlerts = await Alert.countDocuments({
      createdBy: req.user.id,
      isActive: true,
    });
    const recentAlerts = await Alert.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ totalAlerts, activeAlerts, recentAlerts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

