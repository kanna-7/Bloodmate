const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bloodGroup: { type: String, required: true },
    location: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    certificateUrl: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Donation', DonationSchema);

