const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Alert = require('../models/Alert');
const Donation = require('../models/Donation');

const router = express.Router();

router.get('/dashboard', auth('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await User.countDocuments({ role: 'donor' });
    const totalSeekers = await User.countDocuments({ role: 'seeker' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalAlerts = await Alert.countDocuments();
    const totalDonations = await Donation.countDocuments({
      status: 'completed',
    });

    res.json({
      totalUsers,
      totalDonors,
      totalSeekers,
      totalAdmins,
      totalAlerts,
      totalDonations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

