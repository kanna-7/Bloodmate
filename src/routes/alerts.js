const express = require('express');
const auth = require('../middleware/auth');
const Alert = require('../models/Alert');

const router = express.Router();

router.post('/', auth(['seeker', 'admin', 'donor']), async (req, res) => {
  try {
    const { bloodGroup, location, message } = req.body;
    if (!bloodGroup || !location || !message) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const alert = await Alert.create({
      createdBy: req.user.id,
      bloodGroup,
      location,
      message,
    });

    const emitEmergency = req.app.get('ioEmitEmergency');
    if (emitEmergency) emitEmergency(alert);

    res.status(201).json(alert);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth(), async (req, res) => {
  try {
    const alerts = await Alert.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

