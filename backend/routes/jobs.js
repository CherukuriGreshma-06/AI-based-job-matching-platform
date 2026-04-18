const express = require('express');
const router = express.Router();
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

let jobsCache = [];

// Load CSV once into memory
function loadJobs() {
  return new Promise((resolve) => {
    if (jobsCache.length > 0) return resolve(jobsCache);
    const results = [];
    fs.createReadStream(path.join(__dirname, '../dataset.csv'))
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => {
        jobsCache = results;
        console.log(`✅ Loaded ${results.length} jobs from dataset`);
        resolve(results);
      });
  });
}

// SEARCH JOBS
router.get('/search', async (req, res) => {
  try {
    const jobs = await loadJobs();
    const { q, location, type, mode, industry, page = 1 } = req.query;
    const limit = 20;

    let filtered = jobs.filter(job => {
      let match = true;
      if (q) {
        const query = q.toLowerCase();
        match = match && (
          job['job title']?.toLowerCase().includes(query) ||
          job['required skills']?.toLowerCase().includes(query) ||
          job['company']?.toLowerCase().includes(query) ||
          job['industry']?.toLowerCase().includes(query)
        );
      }
      if (location) match = match && job['location']?.toLowerCase().includes(location.toLowerCase());
      if (type) match = match && job['Employment Type']?.toLowerCase() === type.toLowerCase();
      if (mode) match = match && job['Work Mode']?.toLowerCase() === mode.toLowerCase();
      if (industry) match = match && job['industry']?.toLowerCase().includes(industry.toLowerCase());
      return match;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    res.json({ jobs: paginated, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// AI MATCH - match user skills to jobs
router.post('/match', async (req, res) => {
  try {
    const jobs = await loadJobs();
    const { skills } = req.body;
    if (!skills || skills.length === 0) return res.json({ jobs: [], recommendations: [] });

    const userSkills = skills.map(s => s.toLowerCase().trim());

    // Score each job by skill overlap
    const scored = jobs.map(job => {
      const jobSkills = (job['required skills'] || '').toLowerCase().split(',').map(s => s.trim());
      const matched = userSkills.filter(s => jobSkills.some(js => js.includes(s) || s.includes(js)));
      const score = jobSkills.length > 0 ? (matched.length / jobSkills.length) * 100 : 0;
      return { ...job, matchScore: Math.round(score), matchedSkills: matched };
    });

    // Top matches
    const topJobs = scored
      .filter(j => j.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    // AI Recommendations - find skills to learn
    const allSkills = {};
    jobs.forEach(job => {
      (job['required skills'] || '').split(',').forEach(s => {
        const skill = s.trim().toLowerCase();
        if (skill) allSkills[skill] = (allSkills[skill] || 0) + 1;
      });
    });

    const missingSkills = Object.entries(allSkills)
      .filter(([skill]) => !userSkills.some(us => skill.includes(us) || us.includes(skill)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, jobCount: count }));

    res.json({ jobs: topJobs, missingSkills });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET ALL INDUSTRIES & LOCATIONS for filters
router.get('/filters', async (req, res) => {
  try {
    const jobs = await loadJobs();
    const industries = [...new Set(jobs.map(j => j['industry']).filter(Boolean))].sort();
    const locations = [...new Set(jobs.map(j => j['location']).filter(Boolean))].sort();
    res.json({ industries, locations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.loadJobs = loadJobs;
