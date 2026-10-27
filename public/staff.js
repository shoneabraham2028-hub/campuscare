const $ = id => document.getElementById(id);
let token = '';
let debounceTimer = null;

async function api(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Expired or invalid token
    token = '';
    const dashboard = $('dashboard');
    const loginBox = $('loginBox');
    const loginMsg = $('loginMessage');
    if (dashboard) dashboard.hidden = true;
    if (loginBox) loginBox.hidden = false;
    if (loginMsg) {
      loginMsg.textContent = 'Session expired. Please sign in again.';
      loginMsg.style.color = 'var(--orange)';
    }
    throw new Error('Staff authorization required.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server request failed.');
  }
  return data;
}

// Staff Sign-in Form
const loginForm = $('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('loginBtn');
    const msg = $('loginMessage');
    const username = $('username').value.trim();
    const password = $('password').value;

    if (!username || !password) {
      msg.textContent = 'Please enter both username and password.';
      msg.style.color = 'var(--orange)';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Authenticating…';
    msg.textContent = 'Verifying credentials…';
    msg.style.color = 'var(--muted)';

    try {
      const data = await api('/api/staff/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      token = data.token;
      $('loginBox').hidden = true;
      $('dashboard').hidden = false;
      msg.textContent = '';
      await refresh();
    } catch (err) {
      msg.textContent = err.message || 'Login failed.';
      msg.style.color = '#c0392b';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in to workspace';
    }
  });
}

// Refresh Dashboard Data (Stats + Filtered Complaints)
async function refresh() {
  if (!token) return;

  const complaintsContainer = $('complaints');
  const statsContainer = $('stats');

  try {
    const params = new URLSearchParams({
      q: ($('search') ? $('search').value : '').trim(),
      status: $('statusFilter') ? $('statusFilter').value : '',
      category: $('categoryFilter') ? $('categoryFilter').value : ''
    });

    const [stats, list] = await Promise.all([
      api('/api/staff/stats'),
      api('/api/staff/complaints?' + params.toString())
    ]);

    // 1. Render Real Database Statistics
    if (statsContainer) {
      statsContainer.innerHTML = '';
      const statItems = [
        ['Total Requests', stats.total || 0, 'var(--heading)'],
        ['Open', stats.Open || 0, '#87590d'],
        ['In Progress', stats['In Progress'] || 0, '#1e4a78'],
        ['Resolved', stats.Resolved || 0, '#1f6d48'],
        ['Closed', stats.Closed || 0, '#475569'],
        ['High / Urgent Priority', stats.HighPriority || 0, '#b83b3b']
      ];

      statItems.forEach(([label, count, color]) => {
        const card = document.createElement('div');
        card.className = 'stat-card';

        const num = document.createElement('b');
        num.textContent = String(count);
        num.style.color = color;

        const text = document.createElement('p');
        text.textContent = label;

        card.append(num, text);
        statsContainer.appendChild(card);
      });
    }

    // 2. Render Filtered Complaints Registry
    if (complaintsContainer) {
      complaintsContainer.innerHTML = '';

      if (!list || list.length === 0) {
        const empty = document.createElement('p');
        empty.style.padding = '30px 20px';
        empty.style.textAlign = 'center';
        empty.style.background = 'var(--surface)';
        empty.style.border = '1px solid var(--line)';
        empty.style.borderRadius = 'var(--radius-md)';
        empty.style.color = 'var(--muted)';
        empty.textContent = 'No complaints match the current filter criteria.';
        complaintsContainer.appendChild(empty);
        return;
      }

      list.forEach(c => {
        const item = document.createElement('details');
        item.className = 'complaint-item';

        const summary = document.createElement('summary');
        summary.className = 'complaint-summary';

        const titleDiv = document.createElement('div');
        titleDiv.style.display = 'flex';
        titleDiv.style.alignItems = 'center';
        titleDiv.style.gap = '10px';
        titleDiv.style.flexWrap = 'wrap';

        const refBadge = document.createElement('span');
        refBadge.style.fontFamily = 'monospace';
        refBadge.style.fontWeight = '700';
        refBadge.style.color = 'var(--navy)';
        refBadge.textContent = c.reference;

        const titleText = document.createElement('span');
        titleText.textContent = c.title;

        titleDiv.append(refBadge, titleText);

        const pill = document.createElement('span');
        const statusNorm = (c.status || 'open').toLowerCase().replace(/\s+/g, '-');
        pill.className = 'status-pill ' + statusNorm;
        pill.textContent = c.status;

        summary.append(titleDiv, pill);

        // Expanded Body
        const body = document.createElement('div');
        body.className = 'complaint-body';

        const metaP = document.createElement('p');
        metaP.style.fontSize = '13px';
        metaP.style.color = 'var(--muted)';
        metaP.style.margin = '0 0 10px';
        metaP.innerHTML = `<strong>Category:</strong> ${escapeHtml(c.category)} &nbsp;|&nbsp; ` +
          `<strong>Priority:</strong> <span style="font-weight:600; color:${c.priority === 'Urgent' || c.priority === 'High' ? '#b83b3b' : 'inherit'}">${escapeHtml(c.priority)}</span> &nbsp;|&nbsp; ` +
          `<strong>Submitted:</strong> ${new Date(c.created_at).toLocaleString()}<br>` +
          `<strong>Student:</strong> ${escapeHtml(c.student_name)} &nbsp;|&nbsp; ` +
          `<strong>Contact Email:</strong> ${c.contact ? escapeHtml(c.contact) : '<em>Not provided</em>'}`;

        const descP = document.createElement('p');
        descP.style.background = '#ffffff';
        descP.style.padding = '12px 14px';
        descP.style.borderRadius = 'var(--radius-sm)';
        descP.style.border = '1px solid var(--line)';
        descP.style.fontSize = '14px';
        descP.style.lineHeight = '1.5';
        descP.style.margin = '10px 0 16px';
        descP.textContent = c.description;

        // Status Update Form
        const form = document.createElement('form');
        form.className = 'form-grid';
        form.style.gridTemplateColumns = '1fr 1fr';

        const statusLabel = document.createElement('label');
        statusLabel.textContent = 'Update Status';
        const select = document.createElement('select');
        ['Open', 'In Progress', 'Resolved', 'Closed'].forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          o.selected = (opt === c.status);
          select.appendChild(o);
        });
        statusLabel.appendChild(select);

        const noteLabel = document.createElement('label');
        noteLabel.innerHTML = 'Internal Staff Note <span style="font-weight:400; color:var(--muted);">(strictly hidden from student tracking)</span>';
        const noteInput = document.createElement('input');
        noteInput.className = 'staff-note-input';
        noteInput.maxLength = 300;
        noteInput.placeholder = 'e.g. Technician assigned; replacement scheduled';
        noteLabel.appendChild(noteInput);

        const actionWrap = document.createElement('div');
        actionWrap.className = 'wide';
        actionWrap.style.display = 'flex';
        actionWrap.style.alignItems = 'center';
        actionWrap.style.gap = '12px';
        actionWrap.style.marginTop = '6px';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.className = 'button primary';
        saveBtn.textContent = 'Save status update';

        const feedback = document.createElement('span');
        feedback.setAttribute('role', 'status');
        feedback.style.fontSize = '13px';
        feedback.style.fontWeight = '600';

        actionWrap.append(saveBtn, feedback);
        form.append(statusLabel, noteLabel, actionWrap);

        form.addEventListener('submit', async fe => {
          fe.preventDefault();
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving…';
          feedback.textContent = '';

          try {
            await api('/api/staff/complaints/' + encodeURIComponent(c.reference), {
              method: 'PATCH',
              body: JSON.stringify({
                status: select.value,
                note: noteInput.value.trim()
              })
            });

            feedback.textContent = '✓ Status updated to ' + select.value;
            feedback.style.color = '#1f6d48';
            noteInput.value = '';
            // Refresh counts and complaint listings
            await refresh();
          } catch (err) {
            feedback.textContent = '⚠ ' + (err.message || 'Update failed.');
            feedback.style.color = '#c0392b';
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save status update';
          }
        });

        body.append(metaP, descP, form);
        item.append(summary, body);
        complaintsContainer.appendChild(item);
      });
    }
  } catch (err) {
    if (complaintsContainer) {
      complaintsContainer.innerHTML = '';
      const errP = document.createElement('p');
      errP.style.color = '#c0392b';
      errP.style.fontWeight = '600';
      errP.textContent = '⚠ ' + (err.message || 'Error loading complaints data.');
      complaintsContainer.appendChild(errP);
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Filter listeners with live debounce
if ($('refresh')) {
  $('refresh').addEventListener('click', () => refresh());
}

if ($('search')) {
  $('search').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refresh, 250);
  });
}

['statusFilter', 'categoryFilter'].forEach(id => {
  const el = $(id);
  if (el) {
    el.addEventListener('change', () => refresh());
  }
});

// Logout action
if ($('logout')) {
  $('logout').addEventListener('click', () => {
    token = '';
    $('dashboard').hidden = true;
    $('loginBox').hidden = false;
    $('password').value = '';
    const msg = $('loginMessage');
    if (msg) {
      msg.textContent = 'Signed out successfully.';
      msg.style.color = 'var(--muted)';
    }
  });
}
