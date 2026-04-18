const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// SIGNUP
router.post('/signup', upload.fields([{ name: 'cvFile' }, { name: 'photo' }]), async (req, res) => {
  try {
    const { fullName, username, email, phone, password, yearPassed, skills, experience } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: 'Username or email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const skillsArr = skills ? skills.split(',').map(s => s.trim()) : [];

    const user = new User({
      fullName, username, email, phone,
      password: hashed,
      yearPassed, skills: skillsArr, experience,
      cvFile: req.files?.cvFile?.[0]?.filename || '',
      photo: req.files?.photo?.[0]?.filename || ''
    });

    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token, user: { fullName: user.fullName, username: user.username, skills: user.skills, photo: user.photo } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid username or password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token, user: { fullName: user.fullName, username: user.username, skills: user.skills, photo: user.photo } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET PROFILE
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// APPLY TO JOB
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const { jobTitle, company } = req.body;
    const user = await User.findById(req.userId);
    const alreadyApplied = user.appliedJobs.some(j => j.jobTitle === jobTitle && j.company === company);
    if (alreadyApplied) return res.status(400).json({ message: 'Already applied to this job' });
    user.appliedJobs.push({ jobTitle, company });
    await user.save();
    res.json({ message: 'Applied successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
