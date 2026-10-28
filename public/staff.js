// CampusCare Dedicated Staff Login Page Application
const TOKEN_KEY = 'campuscare_staff_token';

document.addEventListener('DOMContentLoaded', () => {
  // If already authenticated, redirect directly to dashboard
  const existingToken = sessionStorage.getItem(TOKEN_KEY);
  if (existingToken) {
    window.location.href = '/staff-dashboard.html';
    return;
  }

  initLoginForm();
});

function initLoginForm() {
  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('u_username');
  const passwordInput = document.getElementById('u_password');
  const loginBtn = document.getElementById('loginBtn');
  const loginOut = document.getElementById('loginOut');

  if (!form) return;

  [usernameInput, passwordInput].forEach(field => {
    if (!field) return;
    field.addEventListener('input', () => {
      field.classList.remove('invalid');
      const errEl = document.getElementById(`${field.id}_err`);
      if (errEl) errEl.classList.remove('visible');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = (usernameInput.value || '').trim();
    const password = (passwordInput.value || '');

    let hasError = false;
    if (!username) {
      usernameInput.classList.add('invalid');
      const errEl = document.getElementById('u_username_err');
      if (errEl) errEl.classList.add('visible');
      hasError = true;
    }
    if (!password) {
      passwordInput.classList.add('invalid');
      const errEl = document.getElementById('u_password_err');
      if (errEl) errEl.classList.add('visible');
      hasError = true;
    }
    if (hasError) return;

    loginBtn.disabled = true;
    loginOut.innerHTML = `
      <div class="alert-box" style="background: rgba(36, 73, 106, 0.08); border: 1px solid var(--color-border); color: var(--color-navy);">
        Authenticating...
      </div>
    `;

    try {
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid username or password.');
      }

      // Store authentication token
      sessionStorage.setItem(TOKEN_KEY, data.token);

      // Navigate to separate dashboard page
      window.location.href = '/staff-dashboard.html';
    } catch (err) {
      loginOut.innerHTML = `
        <div class="alert-box alert-error">
          <div style="font-weight: 700;">Login Failed</div>
          <div style="font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(err.message)}</div>
        </div>
      `;
    } finally {
      loginBtn.disabled = false;
    }
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
