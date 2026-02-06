const express = require('express');
const auth = require('../middleware/auth');
const Message = require('../models/Message');

const router = express.Router();

// get last 50 messages between current user and another user
router.get('/:otherId', auth(), async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { otherId } = req.params;

    const messages = await Message.find({
      $or: [
        { from: userId, to: otherId },
        { from: otherId, to: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(50);

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// send a new message
router.post('/:otherId', auth(), async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { otherId } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const message = await Message.create({
      from: userId,
      to: otherId,
      body: body.trim(),
    });

    const sendPrivate = req.app.get('ioSendPrivate');
    if (sendPrivate) {
      sendPrivate(otherId, message);
      sendPrivate(userId, message);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

