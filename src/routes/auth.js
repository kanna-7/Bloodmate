const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

router.post('/register', async (req, res) => {
  try {
    const {
      role,
      name,
      phone,
      location,
      area,
      password,
      heightCm,
      weightKg,
      isPaidDonor,
      bloodGroup,
    } = req.body;

    if (!role || !name || !phone || !location || !area || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: 'Phone already registered' });
    }

    const passwordHash = await User.hashPassword(password);

    let isEligible = false;
    if (role === 'donor') {
      if (heightCm && weightKg) {
        const hM = heightCm / 100;
        const bmi = weightKg / (hM * hM);
        isEligible = weightKg >= 50 && bmi >= 18.5 && bmi <= 30;
      }
    }

    const user = await User.create({
      role,
      name,
      phone,
      location,
      area,
      passwordHash,
      heightCm: role === 'donor' ? heightCm : undefined,
      weightKg: role === 'donor' ? weightKg : undefined,
      isEligible,
      isPaidDonor: role === 'donor' ? !!isPaidDonor : false,
      bloodGroup: role === 'donor' ? bloodGroup || 'unknown' : 'unknown',
    });

    const token = createToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        phone: user.phone,
        location: user.location,
        area: user.area,
        isEligible: user.isEligible,
        isPaidDonor: user.isPaidDonor,
        bloodGroup: user.bloodGroup,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await user.checkPassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        phone: user.phone,
        location: user.location,
        area: user.area,
        isEligible: user.isEligible,
        isPaidDonor: user.isPaidDonor,
        bloodGroup: user.bloodGroup,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

