const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['donor', 'seeker', 'admin'],
      required: true,
    },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    area: { type: String, required: true },
    passwordHash: { type: String, required: true },
    // donor specific
    heightCm: Number,
    weightKg: Number,
    isEligible: { type: Boolean, default: false },
    isPaidDonor: { type: Boolean, default: false },
    bloodGroup: {
      type: String,
      enum: [
        'A+',
        'A-',
        'B+',
        'B-',
        'O+',
        'O-',
        'AB+',
        'AB-',
        'unknown',
      ],
      default: 'unknown',
    },
    lastDonationAt: Date,
    totalDonations: { type: Number, default: 0 },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

UserSchema.methods.checkPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

UserSchema.statics.hashPassword = async function (password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

module.exports = mongoose.model('User', UserSchema);

