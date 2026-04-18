require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./backend/connection');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads folder if not exists
const fs = require('fs');
if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

// API Routes
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/jobs', require('./backend/routes/jobs'));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
