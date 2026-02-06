const express = require('express');
const auth = require('../middleware/auth');
const Donation = require('../models/Donation');
const User = require('../models/User');

const router = express.Router();

router.get('/dashboard', auth('donor'), async (req, res) => {
  try {
    const donorId = req.user.id;
    const totalDonations = await Donation.countDocuments({
      donor: donorId,
      status: 'completed',
    });
    const recentDonations = await Donation.find({ donor: donorId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalDonations,
      recentDonations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// nearby eligible donors based on current user's location and optional blood group
router.get('/nearby', auth(['donor', 'seeker', 'admin']), async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    const query = {
      role: 'donor',
      isEligible: true,
      location: currentUser.location,
    };

    if (req.query.bloodGroup) {
      query.bloodGroup = req.query.bloodGroup;
    }

    const donors = await User.find({
      ...query,
      _id: { $ne: currentUser._id },
    })
      .select('name phone bloodGroup location area isPaidDonor lastDonationAt')
      .limit(20);

    res.json(donors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/donations/:id/certificate', auth('admin'), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id).populate('donor');
    if (!donation) return res.status(404).json({ message: 'Not found' });

    donation.status = 'completed';
    donation.certificateUrl = `/certificates/${donation._id}.pdf`;
    await donation.save();

    res.json({ message: 'Certificate generated', donation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

