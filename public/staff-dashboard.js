// CampusCare Dedicated Staff Dashboard Application
const TOKEN_KEY = 'campuscare_staff_token';

document.addEventListener('DOMContentLoaded', () => {
  // Authentication check before loading any data
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = '/staff.html';
    return;
  }

  initDashboardControls();
  loadStats();
  loadComplaints();
});

// Authenticated fetch wrapper
async function authFetch(url, options = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = '/staff.html';
    throw new Error('Not authenticated');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.href = '/staff.html';
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}

// Stats Loader
async function loadStats() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return;

  try {
    const res = await authFetch('/api/staff/stats');
    if (!res.ok) return;
    const stats = await res.json();

    const totalEl = document.getElementById('statTotal');
    const openEl = document.getElementById('statOpen');
    const progEl = document.getElementById('statProgress');
    const resEl = document.getElementById('statResolved');

    if (totalEl) totalEl.textContent = stats.total ?? 0;
    if (openEl) openEl.textContent = stats.open ?? 0;
    if (progEl) progEl.textContent = stats.in_progress ?? 0;
    if (resEl) resEl.textContent = stats.resolved ?? 0;
  } catch (err) {
    // Session expired or network error handled by authFetch
  }
}

// Dashboard Controls & Filters
let debounceTimer = null;

function initDashboardControls() {
  const logoutBtn = document.getElementById('logoutBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const searchInput = document.getElementById('searchComplaints');
  const statusFilter = document.getElementById('statusFilter');
  const catFilter = document.getElementById('categoryFilter');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.href = '/staff.html';
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) {
        window.location.href = '/staff.html';
        return;
      }
      loadStats();
      loadComplaints();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadComplaints();
      }, 300);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return;
      loadComplaints();
    });
  }

  if (catFilter) {
    catFilter.addEventListener('change', () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return;
      loadComplaints();
    });
  }
}

// Complaints Loader
async function loadComplaints() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return;

  const listEl = document.getElementById('list');
  const searchInput = document.getElementById('searchComplaints');
  const statusFilter = document.getElementById('statusFilter');
  const catFilter = document.getElementById('categoryFilter');
  const dashOut = document.getElementById('dashOut');

  if (!listEl) return;

  const q = searchInput ? searchInput.value.trim() : '';
  const status = statusFilter ? statusFilter.value : '';
  const category = catFilter ? catFilter.value : '';

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (category) params.set('category', category);

  const url = `/api/staff/complaints?${params.toString()}`;

  listEl.setAttribute('aria-busy', 'true');
  listEl.innerHTML = `
    <div style="text-align: center; padding: 2.5rem; color: var(--color-text-secondary);">
      Loading complaints...
    </div>
  `;

  try {
    const res = await authFetch(url);
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to fetch complaints');
    }

    const complaints = await res.json();
    listEl.setAttribute('aria-busy', 'false');

    if (!Array.isArray(complaints) || complaints.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <h3>No complaints found</h3>
          <p style="margin-top: 0.5rem; font-size: 0.9rem;">No complaints match the current filter criteria.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = complaints.map(c => renderComplaintCard(c)).join('');
    attachComplaintCardListeners();
  } catch (err) {
    listEl.setAttribute('aria-busy', 'false');
    if (dashOut && err.message !== 'Not authenticated' && err.message !== 'Session expired. Please log in again.') {
      dashOut.innerHTML = `
        <div class="alert-box alert-error">
          <div style="font-weight: 700;">Error Loading Complaints</div>
          <div style="font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(err.message)}</div>
        </div>
      `;
      setTimeout(() => { if (dashOut) dashOut.innerHTML = ''; }, 4000);
    }
  }
}

function renderComplaintCard(c) {
  const badgeClass = getBadgeClass(c.status);
  const createdDate = formatDate(c.created_at);
  const updatedDate = formatDate(c.updated_at);
  const deptStr = c.department ? ` &bull; ${escapeHtml(c.department)}` : '';

  return `
    <article class="complaint-card" id="card-${escapeHtml(c.ref)}">
      <div class="complaint-card-header">
        <div>
          <span class="complaint-ref">${escapeHtml(c.ref)}</span>
          <span style="font-size: 0.9rem; color: var(--color-text-secondary); margin-left: 0.75rem;">${escapeHtml(c.category)}</span>
        </div>
        <span class="ticket-badge ${badgeClass}" id="badge-${escapeHtml(c.ref)}">${escapeHtml(c.status)}</span>
      </div>

      <div class="complaint-meta">
        <span><strong>Student:</strong> ${escapeHtml(c.student_name)} (${escapeHtml(c.student_email)})${deptStr}</span>
        <span><strong>Submitted:</strong> ${createdDate}</span>
        <span><strong>Updated:</strong> <span id="updated-${escapeHtml(c.ref)}">${updatedDate}</span></span>
      </div>

      <h3 class="complaint-card-title">${escapeHtml(c.title)}</h3>
      <div class="complaint-card-desc">${escapeHtml(c.description)}</div>

      <div class="complaint-actions-grid">
        <div class="form-group" style="margin-bottom: 0;">
          <label for="status-${escapeHtml(c.ref)}" class="form-label">Update Status</label>
          <select id="status-${escapeHtml(c.ref)}" class="form-select card-status-select">
            <option value="Open" ${c.status === 'Open' ? 'selected' : ''}>Open</option>
            <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            <option value="Closed" ${c.status === 'Closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label for="note-${escapeHtml(c.ref)}" class="form-label">Internal Staff Note</label>
          <textarea id="note-${escapeHtml(c.ref)}" class="form-textarea card-note-textarea" rows="2" placeholder="Record internal findings, technician notes, or actions taken...">${escapeHtml(c.staff_note || '')}</textarea>
          <div class="internal-note-hint">Private: Internal notes are never shown to students.</div>
        </div>

        <div>
          <button type="button" class="btn btn-primary btn-sm card-save-btn" data-ref="${escapeHtml(c.ref)}" id="save-${escapeHtml(c.ref)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Save</span>
          </button>
          <div id="feedback-${escapeHtml(c.ref)}" style="font-size: 0.78rem; margin-top: 0.35rem;"></div>
        </div>
      </div>
    </article>
  `;
}

function attachComplaintCardListeners() {
  const saveButtons = document.querySelectorAll('.card-save-btn');
  saveButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const ref = btn.getAttribute('data-ref');
      const statusSelect = document.getElementById(`status-${ref}`);
      const noteTextarea = document.getElementById(`note-${ref}`);
      const feedbackEl = document.getElementById(`feedback-${ref}`);
      const badgeEl = document.getElementById(`badge-${ref}`);
      const updatedEl = document.getElementById(`updated-${ref}`);

      if (!statusSelect || !noteTextarea) return;

      const newStatus = statusSelect.value;
      const newNote = noteTextarea.value.trim();

      btn.disabled = true;
      if (feedbackEl) {
        feedbackEl.style.color = 'var(--color-navy)';
        feedbackEl.textContent = 'Saving...';
      }

      try {
        const response = await authFetch(`/api/staff/complaints/${encodeURIComponent(ref)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            note: newNote
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update complaint.');
        }

        // Update badge and date on this card without full page reload
        if (badgeEl) {
          badgeEl.textContent = data.status;
          badgeEl.className = `ticket-badge ${getBadgeClass(data.status)}`;
        }
        if (updatedEl) {
          updatedEl.textContent = formatDate(data.updated_at);
        }

        if (feedbackEl) {
          feedbackEl.style.color = 'var(--color-success)';
          feedbackEl.textContent = 'Saved successfully!';
          setTimeout(() => {
            if (feedbackEl) feedbackEl.textContent = '';
          }, 2500);
        }

        // Refresh counters
        loadStats();
      } catch (err) {
        if (feedbackEl) {
          feedbackEl.style.color = 'var(--color-error)';
          feedbackEl.textContent = err.message || 'Error saving.';
        }
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function getBadgeClass(status) {
  switch (status) {
    case 'In Progress': return 'badge-progress';
    case 'Resolved': return 'badge-resolved';
    case 'Closed': return 'badge-closed';
    case 'Open':
    default:
      return 'badge-open';
  }
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

function formatDate(isoStr) {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
}
