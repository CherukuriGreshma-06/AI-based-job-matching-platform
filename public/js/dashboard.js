const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) window.location.href = 'index.html';

let currentPage = 1;
let searchTimer = null;

// Init
window.onload = async () => {
  document.getElementById('userName').textContent = user.fullName || user.username || 'User';
  document.getElementById('userAvatar').textContent = (user.fullName || 'U')[0].toUpperCase();
  await loadProfile();
  await loadFilters();
  await searchJobs();
  await loadAI();
};

function signOut() {
  localStorage.clear();
  window.location.href = 'index.html';
}

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(name + 'Section').classList.add('active');
  document.querySelector(`[data-section="${name}"]`).classList.add('active');
  if (name === 'applied') loadApplied();
}

// ===== PROFILE =====
async function loadProfile() {
  try {
    const res = await fetch('/api/auth/profile', { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    if (!res.ok) return;

    document.getElementById('profileName').textContent = data.fullName || '-';
    document.getElementById('profileUsername').textContent = '@' + (data.username || '-');
    document.getElementById('profileEmail').textContent = data.email || '-';
    document.getElementById('profilePhone').textContent = data.phone || '-';
    document.getElementById('profileYear').textContent = data.yearPassed ? 'Class of ' + data.yearPassed : '-';
    document.getElementById('profileExperience').textContent = data.experience || 'No experience added yet.';
    document.getElementById('profileAvatar').textContent = (data.fullName || 'U')[0].toUpperCase();

    const skillsList = document.getElementById('skillsList');
    skillsList.innerHTML = (data.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('') || '<span style="color:var(--text2)">No skills added</span>';

    const docs = document.getElementById('documentsSection');
    docs.innerHTML = '';
    if (data.cvFile) docs.innerHTML += `<a href="/uploads/${data.cvFile}" target="_blank" class="doc-link">📄 View CV</a>`;
    if (data.photo) docs.innerHTML += `<a href="/uploads/${data.photo}" target="_blank" class="doc-link">🖼 View Photo</a>`;
    if (!data.cvFile && !data.photo) docs.innerHTML = '<span style="color:var(--text2);font-size:14px">No documents uploaded</span>';
  } catch (err) {
    console.error(err);
  }
}

// ===== FILTERS =====
async function loadFilters() {
  try {
    const res = await fetch('/api/jobs/filters');
    const data = await res.json();

    const locSel = document.getElementById('filterLocation');
    data.locations.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l; opt.textContent = l;
      locSel.appendChild(opt);
    });

    const indSel = document.getElementById('filterIndustry');
    data.industries.forEach(i => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = i;
      indSel.appendChild(opt);
    });
  } catch (err) { console.error(err); }
}

// ===== SEARCH JOBS =====
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage = 1; searchJobs(); }, 400);
}

async function searchJobs(page = 1) {
  currentPage = page;
  const q = document.getElementById('searchInput').value;
  const location = document.getElementById('filterLocation').value;
  const type = document.getElementById('filterType').value;
  const mode = document.getElementById('filterMode').value;
  const industry = document.getElementById('filterIndustry').value;

  document.getElementById('searchResults').innerHTML = '<div class="loading">🔍 Searching jobs...</div>';

  const params = new URLSearchParams({ q, location, type, mode, industry, page: currentPage });
  try {
    const res = await fetch('/api/jobs/search?' + params);
    const data = await res.json();
    renderJobs(data.jobs);
    renderPagination(data.pages, data.total);
    document.getElementById('jobCount').textContent = `Found ${data.total.toLocaleString()} jobs`;
  } catch {
    document.getElementById('searchResults').innerHTML = '<div class="loading">❌ Error loading jobs</div>';
  }
}

function renderJobs(jobs) {
  const container = document.getElementById('searchResults');
  if (!jobs.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>No jobs found. Try different keywords!</p></div>';
    return;
  }

  const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs') || '[]');
  container.innerHTML = jobs.map(job => {
    const skills = (job['required skills'] || '').split(',').map(s => s.trim()).filter(Boolean);
    const isApplied = appliedJobs.includes(job['job title'] + job['company']);
    return `
    <div class="job-card">
      <div class="job-card-top">
        <div>
          <div class="job-title">${job['job title'] || 'N/A'}</div>
          <div class="job-company">${job['company'] || 'N/A'}</div>
        </div>
        <div class="job-badge">${job['Work Mode'] || 'N/A'}</div>
      </div>
      <div class="job-salary">💰 ${job['salary'] || 'N/A'} ${job['Salary Currency'] || ''}</div>
      <div class="job-meta">
        <div class="job-meta-item">📍 ${job['location'] || 'N/A'}</div>
        <div class="job-meta-item">💼 ${job['Employment Type'] || 'N/A'}</div>
        <div class="job-meta-item">⭐ ${job['Company Rating'] || 'N/A'}</div>
        <div class="job-meta-item">🎓 ${job['Education Requirement'] || 'N/A'}</div>
      </div>
      <div class="job-skills">${skills.slice(0,4).map(s => `<span class="job-skill-tag">${s}</span>`).join('')}</div>
      <button class="apply-btn ${isApplied ? 'applied' : ''}" onclick="applyJob('${job['job title']?.replace(/'/g, "\\'")}', '${job['company']?.replace(/'/g, "\\'")}', this)">
        ${isApplied ? '✅ Applied' : 'Apply Now'}
      </button>
    </div>`;
  }).join('');
}

function renderPagination(pages, total) {
  const container = document.getElementById('pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(pages, currentPage + 2);

  if (currentPage > 1) html += `<button class="page-btn" onclick="searchJobs(${currentPage - 1})">← Prev</button>`;
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="searchJobs(${i})">${i}</button>`;
  }
  if (currentPage < pages) html += `<button class="page-btn" onclick="searchJobs(${currentPage + 1})">Next →</button>`;
  container.innerHTML = html;
}

// ===== APPLY JOB =====
async function applyJob(jobTitle, company, btn) {
  if (btn.classList.contains('applied')) return;
  try {
    const res = await fetch('/api/auth/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ jobTitle, company })
    });
    const data = await res.json();
    if (res.ok) {
      btn.textContent = '✅ Applied';
      btn.classList.add('applied');
      const applied = JSON.parse(localStorage.getItem('appliedJobs') || '[]');
      applied.push(jobTitle + company);
      localStorage.setItem('appliedJobs', JSON.stringify(applied));
    } else {
      alert(data.message);
    }
  } catch { alert('Error applying. Please try again.'); }
}

// ===== APPLIED JOBS =====
async function loadApplied() {
  const container = document.getElementById('appliedList');
  container.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const res = await fetch('/api/auth/profile', { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    const jobs = data.appliedJobs || [];

    if (!jobs.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No applied jobs yet. Start applying!</p></div>';
      return;
    }

    container.innerHTML = jobs.reverse().map(job => `
      <div class="applied-card">
        <div class="applied-info">
          <h4>${job.jobTitle}</h4>
          <p>${job.company} • Applied ${new Date(job.appliedDate).toLocaleDateString()}</p>
        </div>
        <span class="status-badge status-${job.status}">${job.status}</span>
      </div>`).join('');
  } catch { container.innerHTML = '<div class="loading">❌ Error loading</div>'; }
}

// ===== AI RECOMMENDATIONS =====
async function loadAI() {
  const container = document.getElementById('aiResults');
  container.innerHTML = '<div class="loading">🤖 AI is analyzing your skills...</div>';
  try {
    const profileRes = await fetch('/api/auth/profile', { headers: { Authorization: 'Bearer ' + token } });
    const profile = await profileRes.json();
    const skills = profile.skills || user.skills || [];

    const res = await fetch('/api/jobs/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills })
    });
    const data = await res.json();

    let html = '';

    // Top matches
    html += `<div class="ai-top-jobs">
      <h3>🎯 Best Job Matches for You</h3>
      ${data.jobs.length ? data.jobs.map(job => `
        <div class="match-card">
          <div class="match-score">${job.matchScore}%</div>
          <div class="match-info">
            <h4>${job['job title']}</h4>
            <p>${job['company']} • ${job['location']} • ${job['salary']} ${job['Salary Currency'] || ''}</p>
            <div class="matched-skills">${(job.matchedSkills || []).map(s => `<span class="matched-skill">✅ ${s}</span>`).join('')}</div>
          </div>
        </div>`).join('') : '<p style="color:var(--text2)">Add skills to your profile to get matches!</p>'}
    </div>`;

    // Skills to improve
    if (data.missingSkills?.length) {
      const icons = ['🐍','📊','🔥','⚡','🧠','☁️','🔒','📱'];
      html += `<div class="ai-skills-section">
        <h3>📈 Skills to Learn for More Opportunities</h3>
        <div class="skills-improve">
          ${data.missingSkills.map((item, i) => `
            <div class="skill-improve-card">
              <div class="skill-improve-icon">${icons[i % icons.length]}</div>
              <div class="skill-improve-info">
                <h5>${item.skill}</h5>
                <p>${item.jobCount} jobs require this</p>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    }

    container.innerHTML = html;
  } catch { container.innerHTML = '<div class="loading">❌ Error loading AI recommendations</div>'; }
}
