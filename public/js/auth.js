function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.form-section').forEach(s => s.classList.add('hidden'));
  if (tab === 'login') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('loginSection').classList.remove('hidden');
  } else {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('signupSection').classList.remove('hidden');
  }
}

function updateLabel(inputId, labelId) {
  const file = document.getElementById(inputId).files[0];
  if (file) document.getElementById(labelId).textContent = '✅ ' + file.name;
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  if (!username || !password) return errEl.textContent = 'Please fill all fields';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) return errEl.textContent = data.message;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = 'dashboard.html';
  } catch {
    errEl.textContent = 'Server error. Please try again.';
  }
}

async function handleSignup() {
  const errEl = document.getElementById('signupError');
  errEl.textContent = '';

  const fullName = document.getElementById('fullName').value.trim();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const yearPassed = document.getElementById('yearPassed').value;
  const skills = document.getElementById('skills').value.trim();
  const experience = document.getElementById('experience').value.trim();

  if (!fullName || !username || !email || !password || !skills)
    return errEl.textContent = 'Please fill all required fields';
  if (password.length < 6)
    return errEl.textContent = 'Password must be at least 6 characters';

  const formData = new FormData();
  formData.append('fullName', fullName);
  formData.append('username', username);
  formData.append('email', email);
  formData.append('phone', phone);
  formData.append('password', password);
  formData.append('yearPassed', yearPassed);
  formData.append('skills', skills);
  formData.append('experience', experience);

  const cvFile = document.getElementById('cvFile').files[0];
  const photoFile = document.getElementById('photoFile').files[0];
  if (cvFile) formData.append('cvFile', cvFile);
  if (photoFile) formData.append('photo', photoFile);

  try {
    const res = await fetch('/api/auth/signup', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) return errEl.textContent = data.message;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = 'dashboard.html';
  } catch {
    errEl.textContent = 'Server error. Please try again.';
  }
}

// Redirect if already logged in
if (localStorage.getItem('token')) window.location.href = 'dashboard.html';
