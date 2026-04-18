const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  yearPassed: { type: String },
  skills: { type: [String], default: [] },
  experience: { type: String },
  cvFile: { type: String },
  photo: { type: String },
  appliedJobs: [
    {
      jobTitle: String,
      company: String,
      status: { type: String, default: 'Applied' },
      appliedDate: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
