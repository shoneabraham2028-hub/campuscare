// CampusCare Public Client Application
const FAQ_ITEMS = [
  {
    id: 'faq-1',
    category: 'it',
    catName: 'IT & Wi-Fi',
    formCat: 'IT & Wi-Fi',
    question: 'How do I resolve campus Wi-Fi connection issues?',
    answer: 'Ensure your device Wi-Fi is enabled and select the official campus network. Verify that your student credentials are active. If your device fails to authenticate or repeatedly disconnects in a specific zone, submit a complaint with your exact building and room location.'
  },
  {
    id: 'faq-2',
    category: 'classroom',
    catName: 'Classroom',
    formCat: 'Classroom / Equipment',
    question: 'What should I do if a classroom projector is not displaying?',
    answer: 'First check that the HDMI/VGA cable is securely connected to the console and that the wall switch is powered on. If the projector lamp does not turn on or flashes an error light, file a report detailing the room number and equipment tag.'
  },
  {
    id: 'faq-3',
    category: 'it',
    catName: 'IT & Wi-Fi',
    formCat: 'IT & Wi-Fi',
    question: 'How do I report a lab computer malfunction?',
    answer: 'Note the terminal number and physical workstation position. If the machine encounters boot failure, network isolation, or peripheral damage, notify your lab assistant and log a ticket here for technical support.'
  },
  {
    id: 'faq-4',
    category: 'library',
    catName: 'Library',
    formCat: 'Library',
    question: 'Who do I contact for library facility or terminal concerns?',
    answer: 'Issues with reading room digital search terminals, catalog kiosks, or study area air circulation can be reported directly using the Library category in the form below.'
  },
  {
    id: 'faq-5',
    category: 'hostel',
    catName: 'Hostel',
    formCat: 'Hostel & Facilities',
    question: 'How can resident students request hostel room maintenance?',
    answer: 'For electrical fittings, plumbing, fan regulators, or furniture repairs in resident halls, select Hostel & Facilities and mention your block and room number for swift technician dispatch.'
  },
  {
    id: 'faq-6',
    category: 'classroom',
    catName: 'Classroom',
    formCat: 'Classroom / Equipment',
    question: 'How do I report general campus facility or classroom maintenance?',
    answer: 'Submit an equipment or facility request with the specific department block, floor, and room so the maintenance crew can attend to it directly.'
  },
  {
    id: 'faq-7',
    category: 'transport',
    catName: 'Transport',
    formCat: 'Transport',
    question: 'How do I ask questions regarding campus transport routes?',
    answer: 'For queries regarding college bus schedules, route coverage, or boarding points, choose Transport in the category dropdown to reach the transport administration.'
  },
  {
    id: 'faq-8',
    category: 'it',
    catName: 'General',
    formCat: 'Other',
    question: 'How do I track my submitted complaint?',
    answer: 'After filing a complaint, you receive a reference code (such as CH-0001). Enter this code in the "Track a Request" box above at any time to view the live status and resolution history.'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  // Set current year
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  initSubmitForm();
  initTrackForm();
  initServicesTiles();
  initFaqSection();
});

// Submit Form Handler
function initSubmitForm() {
  const form = document.getElementById('complaintForm');
  const nameInput = document.getElementById('c_name');
  const emailInput = document.getElementById('c_email');
  const deptInput = document.getElementById('c_department');
  const catSelect = document.getElementById('c_cat');
  const titleInput = document.getElementById('c_title');
  const descInput = document.getElementById('c_desc');
  const submitBtn = document.getElementById('submitBtn');
  const submitOut = document.getElementById('submitOut');
  const charCounter = document.getElementById('charCounter');

  if (!form) return;

  // Live character counter
  if (descInput && charCounter) {
    descInput.addEventListener('input', () => {
      const len = descInput.value.length;
      charCounter.textContent = `${len} / 2000`;
      if (len > 1900) {
        charCounter.classList.add('near-limit');
      } else {
        charCounter.classList.remove('near-limit');
      }
    });
  }

  // Clear inline error on input
  [nameInput, emailInput, deptInput, catSelect, titleInput, descInput].forEach(field => {
    if (!field) return;
    field.addEventListener('input', () => {
      field.classList.remove('invalid');
      const errEl = document.getElementById(`${field.id}_err`);
      if (errEl) errEl.classList.remove('visible');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let hasError = false;
    const nameVal = (nameInput.value || '').trim();
    const emailVal = (emailInput.value || '').trim();
    const deptVal = (deptInput.value || '').trim();
    const catVal = (catSelect.value || '').trim();
    const titleVal = (titleInput.value || '').trim();
    const descVal = (descInput.value || '').trim();

    // Validation
    if (nameVal.length < 2 || nameVal.length > 80) {
      setFieldError(nameInput, 'c_name_err', true);
      hasError = true;
    } else {
      setFieldError(nameInput, 'c_name_err', false);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      setFieldError(emailInput, 'c_email_err', true);
      hasError = true;
    } else {
      setFieldError(emailInput, 'c_email_err', false);
    }

    if (deptVal.length > 80) {
      setFieldError(deptInput, 'c_dept_err', true);
      hasError = true;
    } else {
      setFieldError(deptInput, 'c_dept_err', false);
    }

    if (!catVal) {
      setFieldError(catSelect, 'c_cat_err', true);
      hasError = true;
    } else {
      setFieldError(catSelect, 'c_cat_err', false);
    }

    if (titleVal.length < 5 || titleVal.length > 120) {
      setFieldError(titleInput, 'c_title_err', true);
      hasError = true;
    } else {
      setFieldError(titleInput, 'c_title_err', false);
    }

    if (descVal.length < 10 || descVal.length > 2000) {
      setFieldError(descInput, 'c_desc_err', true);
      hasError = true;
    } else {
      setFieldError(descInput, 'c_desc_err', false);
    }

    if (hasError) return;

    // Send to backend
    submitBtn.disabled = true;
    submitOut.innerHTML = `
      <div class="alert-box" style="background: rgba(36, 73, 106, 0.08); border: 1px solid var(--color-border); color: var(--color-navy);">
        Registering complaint into system...
      </div>
    `;

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameVal,
          email: emailVal,
          department: deptVal,
          category: catVal,
          title: titleVal,
          description: descVal
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit complaint.');
      }

      // Success
      form.reset();
      if (charCounter) charCounter.textContent = '0 / 2000';

      submitOut.innerHTML = `
        <div class="alert-box alert-success">
          <div style="font-weight: 700; margin-bottom: 0.35rem;">Complaint Submitted Successfully!</div>
          <div style="font-size: 0.92rem;">Save your reference number to track resolution progress.</div>
          <div class="ref-highlight-wrap">
            <span class="ref-value" id="generatedRef">${escapeHtml(data.ref)}</span>
            <span class="ticket-badge badge-open">Open</span>
          </div>
          <div class="alert-btn-row">
            <button type="button" class="btn btn-outline btn-sm" id="copyRefBtn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy reference</span>
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="trackNowBtn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Track this request</span>
            </button>
          </div>
          <div id="copyFeedback" style="font-size: 0.8rem; margin-top: 0.4rem; color: var(--color-success); display: none;"></div>
        </div>
      `;

      // Copy reference handler
      const copyBtn = document.getElementById('copyRefBtn');
      const copyFeedback = document.getElementById('copyFeedback');
      if (copyBtn && copyFeedback) {
        copyBtn.addEventListener('click', async () => {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(data.ref);
              copyFeedback.textContent = 'Reference copied to clipboard!';
              copyFeedback.style.display = 'block';
            } else {
              copyFeedback.textContent = `Reference: ${data.ref}`;
              copyFeedback.style.display = 'block';
            }
          } catch {
            copyFeedback.textContent = `Reference: ${data.ref}`;
            copyFeedback.style.display = 'block';
          }
        });
      }

      // Track now button handler
      const trackNowBtn = document.getElementById('trackNowBtn');
      if (trackNowBtn) {
        trackNowBtn.addEventListener('click', () => {
          const tRefInput = document.getElementById('t_ref');
          const trackSection = document.getElementById('track');
          if (tRefInput && trackSection) {
            tRefInput.value = data.ref;
            trackSection.scrollIntoView({ behavior: 'smooth' });
            tRefInput.focus();
            // Automatically execute tracking lookup
            const trackForm = document.getElementById('trackForm');
            if (trackForm) {
              trackForm.dispatchEvent(new Event('submit'));
            }
          }
        });
      }
    } catch (err) {
      submitOut.innerHTML = `
        <div class="alert-box alert-error">
          <div style="font-weight: 700;">Submission Error</div>
          <div style="font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(err.message)}</div>
        </div>
      `;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function setFieldError(inputEl, errorId, hasError) {
  if (!inputEl) return;
  const errEl = document.getElementById(errorId);
  if (hasError) {
    inputEl.classList.add('invalid');
    if (errEl) errEl.classList.add('visible');
  } else {
    inputEl.classList.remove('invalid');
    if (errEl) errEl.classList.remove('visible');
  }
}

// Track Form Handler
function initTrackForm() {
  const form = document.getElementById('trackForm');
  const refInput = document.getElementById('t_ref');
  const trackBtn = document.getElementById('trackBtn');
  const trackOut = document.getElementById('trackOut');

  if (!form || !refInput || !trackBtn || !trackOut) return;

  refInput.addEventListener('input', () => {
    refInput.classList.remove('invalid');
    const errEl = document.getElementById('t_ref_err');
    if (errEl) errEl.classList.remove('visible');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawRef = (refInput.value || '').trim();
    const refRegex = /^CH-\d{4,}$/i;

    if (!refRegex.test(rawRef)) {
      refInput.classList.add('invalid');
      const errEl = document.getElementById('t_ref_err');
      if (errEl) errEl.classList.add('visible');
      return;
    }

    trackBtn.disabled = true;
    trackOut.innerHTML = `
      <div class="alert-box" style="background: rgba(36, 73, 106, 0.08); border: 1px solid var(--color-border); color: var(--color-navy);">
        Querying status for ${escapeHtml(rawRef.toUpperCase())}...
      </div>
    `;

    try {
      const response = await fetch(`/api/complaints/${encodeURIComponent(rawRef)}`);
      const data = await response.json();

      if (response.status === 400) {
        throw new Error(data.error || 'Invalid reference code entered.');
      }
      if (response.status === 404) {
        throw new Error('No record found with reference ' + rawRef.toUpperCase() + '. Please check the number.');
      }
      if (!response.ok) {
        throw new Error(data.error || 'Unable to retrieve status. Please try again.');
      }

      // Render tracking result
      const badgeClass = getStatusBadgeClass(data.status);
      const createdStr = formatDate(data.created_at);
      const updatedStr = formatDate(data.updated_at);

      let historyHtml = '';
      if (Array.isArray(data.history) && data.history.length > 0) {
        historyHtml = data.history.map((h, idx) => {
          const isLatest = idx === data.history.length - 1;
          return `
            <div class="timeline-item">
              <div class="timeline-dot ${isLatest ? 'current' : ''}"></div>
              <div class="timeline-content">
                <span class="timeline-status">${escapeHtml(h.status)}</span>
                <span class="timeline-date">${formatDate(h.changed_at)}</span>
              </div>
            </div>
          `;
        }).join('');
      } else {
        historyHtml = `<div style="font-size: 0.85rem; color: var(--color-text-secondary);">No history events recorded.</div>`;
      }

      trackOut.innerHTML = `
        <div class="track-result-card">
          <div class="track-header">
            <div>
              <div class="track-ref-label">${escapeHtml(data.ref)}</div>
              <div class="track-category-tag">${escapeHtml(data.category)}</div>
            </div>
            <span class="ticket-badge ${badgeClass}">${escapeHtml(data.status)}</span>
          </div>

          <div class="track-issue-title">${escapeHtml(data.title)}</div>

          <div class="track-meta-row">
            <div><strong>Submitted:</strong> ${createdStr}</div>
            <div><strong>Updated:</strong> ${updatedStr}</div>
          </div>

          <div style="font-size: 0.82rem; font-weight: 700; color: var(--color-navy); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
            Resolution Timeline
          </div>

          <div class="timeline">
            ${historyHtml}
          </div>
        </div>
      `;
    } catch (err) {
      trackOut.innerHTML = `
        <div class="alert-box alert-error">
          <div style="font-weight: 700;">Lookup Failed</div>
          <div style="font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(err.message)}</div>
        </div>
      `;
    } finally {
      trackBtn.disabled = false;
    }
  });
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'In Progress': return 'badge-progress';
    case 'Resolved': return 'badge-resolved';
    case 'Closed': return 'badge-closed';
    case 'Open':
    default:
      return 'badge-open';
  }
}

// Campus Services Tiles Preselection
function initServicesTiles() {
  const buttons = document.querySelectorAll('.service-action-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category');
      const catSelect = document.getElementById('c_cat');
      const nameInput = document.getElementById('c_name');
      const submitCard = document.getElementById('submit');

      if (catSelect && category) {
        catSelect.value = category;
        catSelect.classList.remove('invalid');
      }

      if (submitCard) {
        submitCard.scrollIntoView({ behavior: 'smooth' });
      }

      if (nameInput) {
        setTimeout(() => nameInput.focus(), 400);
      }
    });
  });
}

// FAQ Section: Rendering, Accordions, Search & ARIA Tabs
function initFaqSection() {
  const panel = document.getElementById('faqPanel');
  const searchInput = document.getElementById('faqSearch');
  const tabButtons = document.querySelectorAll('.tabs-list .tab-btn');

  if (!panel) return;

  let activeCategory = 'all';
  let searchQuery = '';

  function renderFaqs() {
    const filtered = FAQ_ITEMS.filter(item => {
      const matchesCat = (activeCategory === 'all') || (item.category === activeCategory);
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.catName.toLowerCase().includes(query);
      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      panel.innerHTML = `<div class="no-faq-results">No questions match your query. Try searching for a different keyword or submit a complaint directly.</div>`;
      return;
    }

    panel.innerHTML = filtered.map(item => {
      return `
        <div class="faq-item glass-panel">
          <button type="button" class="faq-trigger" id="btn-${item.id}" aria-expanded="false" aria-controls="content-${item.id}">
            <span>${escapeHtml(item.question)}</span>
            <span class="faq-trigger-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </button>
          <div class="faq-content" id="content-${item.id}" role="region" aria-labelledby="btn-${item.id}" hidden>
            <p>${escapeHtml(item.answer)}</p>
            <div class="faq-action-row">
              <button type="button" class="btn btn-outline btn-sm faq-prefill-btn" data-category="${escapeHtml(item.formCat)}">
                Still need help? Report this issue
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach accordion toggle events
    panel.querySelectorAll('.faq-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        const contentId = trigger.getAttribute('aria-controls');
        const content = document.getElementById(contentId);

        // Close other items
        panel.querySelectorAll('.faq-trigger').forEach(otherTrigger => {
          if (otherTrigger !== trigger) {
            otherTrigger.setAttribute('aria-expanded', 'false');
            const otherContent = document.getElementById(otherTrigger.getAttribute('aria-controls'));
            if (otherContent) otherContent.hidden = true;
          }
        });

        if (isExpanded) {
          trigger.setAttribute('aria-expanded', 'false');
          if (content) content.hidden = true;
        } else {
          trigger.setAttribute('aria-expanded', 'true');
          if (content) content.hidden = false;
        }
      });
    });

    // Attach prefill buttons
    panel.querySelectorAll('.faq-prefill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        const catSelect = document.getElementById('c_cat');
        const nameInput = document.getElementById('c_name');
        const submitCard = document.getElementById('submit');

        if (catSelect && cat) {
          catSelect.value = cat;
          catSelect.classList.remove('invalid');
        }

        if (submitCard) {
          submitCard.scrollIntoView({ behavior: 'smooth' });
        }

        if (nameInput) {
          setTimeout(() => nameInput.focus(), 400);
        }
      });
    });
  }

  // Initial render
  renderFaqs();

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderFaqs();
    });
  }

  // Tab buttons with ARIA keyboard navigation
  tabButtons.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabButtons.forEach(t => {
        t.setAttribute('aria-selected', 'false');
      });
      tab.setAttribute('aria-selected', 'true');
      activeCategory = tab.getAttribute('data-cat') || 'all';
      renderFaqs();
    });

    tab.addEventListener('keydown', (e) => {
      let targetIndex = null;
      if (e.key === 'ArrowRight') {
        targetIndex = (index + 1) % tabButtons.length;
      } else if (e.key === 'ArrowLeft') {
        targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      } else if (e.key === 'Home') {
        targetIndex = 0;
      } else if (e.key === 'End') {
        targetIndex = tabButtons.length - 1;
      }

      if (targetIndex !== null) {
        e.preventDefault();
        tabButtons[targetIndex].focus();
        tabButtons[targetIndex].click();
      }
    });
  });
}

// Helpers
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
