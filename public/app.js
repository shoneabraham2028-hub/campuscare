const $ = id => document.getElementById(id);

const faqs = [
  [
    "Wi-Fi is not connecting in hostel or classrooms",
    "Ensure your Wi-Fi is toggled on and reconnect to the AJCE-Student SSID. If the captive portal does not load, try opening http://1.1.1.1 in your browser. If connectivity is down across the wing, report the block and room number.",
    "Network / Wi-Fi"
  ],
  [
    "A projector, audio mic, or smart display is not working",
    "Double-check HDMI and power switch connections on the podium. If the display remains blank or the projector lamp indicator blinks red, submit a report with the department seminar hall or room number.",
    "Classroom / Equipment"
  ],
  [
    "A laboratory desktop or software license is failing",
    "Note down the machine label/terminal number, the specific lab room, and the exact error code or software title (e.g. Oracle, VS Code, GCC) before reporting.",
    "Classroom / Equipment"
  ],
  [
    "Library digital catalog or reading room facility query",
    "For access to digital journals, IEEE Xplore, OPAC catalog terminals, or study cubicle power outlets, share the desk area or section number in the central library.",
    "Library"
  ],
  [
    "Hostel room electrical fitting, plumbing, or water cooler issue",
    "State your hostel block name, floor, and room or corridor location. For safety reasons, do not attempt to self-repair circuit breakers or high-voltage water heater switches.",
    "Hostel / Facilities"
  ],
  [
    "College bus timing, route changes, or campus parking",
    "Specify your route number (e.g. Route 12 - Pala / Kanjirappally) and approximate morning/evening timing. For vehicle parking permits, visit the security desk.",
    "Transport"
  ],
  [
    "Document requests, hall tickets, or administrative certificates",
    "For bonafide certificates, fee receipts, or hall ticket duplicates, contact the student affairs counter in the main administrative block with your university register number.",
    "Administration"
  ],
  [
    "I am unsure which service category fits my issue",
    "Choose 'Other' or the closest matching area and provide clear details. Our support coordinators will triage and assign the request to the appropriate department.",
    "Other"
  ]
];

function smoothScrollTo(element) {
  if (!element) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
}

// 1. FAQ Render & Search
const faqList = $('faqList');
const faqSearch = $('faqSearch');

function renderFaqs(query = '') {
  if (!faqList) return;
  faqList.innerHTML = '';
  const cleanQuery = query.trim().toLowerCase();
  const matched = faqs.filter(([q, a]) => 
    q.toLowerCase().includes(cleanQuery) || a.toLowerCase().includes(cleanQuery)
  );

  if (matched.length === 0) {
    const empty = document.createElement('p');
    empty.style.padding = '20px 0';
    empty.style.color = 'var(--muted)';
    empty.textContent = 'No matching help topics found. You can submit a direct request using the form above.';
    faqList.appendChild(empty);
    return;
  }

  matched.forEach(([question, answer, category]) => {
    const item = document.createElement('details');
    item.className = 'faq-item';

    const summary = document.createElement('summary');
    summary.textContent = question;

    const desc = document.createElement('p');
    desc.textContent = answer;

    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.textContent = 'Still need help? Report this issue ↗';
    actionBtn.addEventListener('click', () => {
      const categorySelect = $('category');
      if (categorySelect) categorySelect.value = category;
      smoothScrollTo($('submit'));
      const titleInput = $('title');
      if (titleInput) titleInput.focus();
    });

    item.append(summary, desc, actionBtn);
    faqList.appendChild(item);
  });
}

if (faqSearch) {
  faqSearch.addEventListener('input', e => renderFaqs(e.target.value));
}
renderFaqs();

// 2. Six Service Shortcuts
document.querySelectorAll('[data-category]').forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.dataset.category;
    const categorySelect = $('category');
    if (categorySelect && category) {
      categorySelect.value = category;
    }
    smoothScrollTo($('submit'));
    const titleInput = $('title');
    if (titleInput) titleInput.focus();
  });
});

// 3. Complaint Submission
const complaintForm = $('complaintForm');
if (complaintForm) {
  complaintForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('submitBtn');
    const msg = $('submitMessage');
    const resultBox = $('submitResult');

    const name = $('name').value.trim();
    const contact = $('contact').value.trim();
    const category = $('category').value;
    const priority = $('priority').value;
    const title = $('title').value.trim();
    const description = $('description').value.trim();

    // Client-side validations
    if (name.length < 2) {
      msg.textContent = 'Please enter your name (at least 2 characters).';
      msg.style.color = 'var(--orange)';
      $('name').focus();
      return;
    }
    if (title.length < 3) {
      msg.textContent = 'Please provide a descriptive title (at least 3 characters).';
      msg.style.color = 'var(--orange)';
      $('title').focus();
      return;
    }
    if (description.length < 10) {
      msg.textContent = 'Please describe the issue in more detail (at least 10 characters).';
      msg.style.color = 'var(--orange)';
      $('description').focus();
      return;
    }
    if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      msg.textContent = 'Please enter a valid email address, or leave it blank.';
      msg.style.color = 'var(--orange)';
      $('contact').focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting…';
    msg.textContent = 'Recording your request in the campus database…';
    msg.style.color = 'var(--muted)';
    resultBox.hidden = true;

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, category, priority, title, description })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit complaint.');
      }

      // Success Display
      resultBox.hidden = false;
      resultBox.innerHTML = '';

      const notice = document.createElement('p');
      notice.textContent = '✓ Request registered successfully. Please save your reference number:';

      const strong = document.createElement('strong');
      strong.textContent = data.reference;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'result-actions';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'button secondary';
      copyBtn.textContent = 'Copy reference';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(data.reference);
          copyBtn.textContent = '✓ Copied to clipboard';
          setTimeout(() => { copyBtn.textContent = 'Copy reference'; }, 3000);
        } catch {
          copyBtn.textContent = data.reference + ' (Manual copy)';
        }
      });

      const trackBtn = document.createElement('button');
      trackBtn.type = 'button';
      trackBtn.className = 'button primary';
      trackBtn.textContent = 'Track this request ↗';
      trackBtn.addEventListener('click', () => {
        const refInput = $('reference');
        if (refInput) {
          refInput.value = data.reference;
        }
        smoothScrollTo($('track'));
        const trackForm = $('trackForm');
        if (trackForm) {
          if (typeof trackForm.requestSubmit === 'function') {
            trackForm.requestSubmit();
          } else {
            trackForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
      });

      actionsDiv.append(copyBtn, trackBtn);
      resultBox.append(notice, strong, actionsDiv);

      msg.textContent = '';
      complaintForm.reset();
      $('priority').value = 'Normal';
    } catch (err) {
      msg.textContent = err.message || 'An error occurred while submitting.';
      msg.style.color = '#c0392b';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit complaint ↗';
    }
  });
}

// 4. Request Tracking Lookup
const trackForm = $('trackForm');
if (trackForm) {
  trackForm.addEventListener('submit', async e => {
    e.preventDefault();
    const box = $('trackResult');
    const refInput = $('reference');
    const rawRef = (refInput ? refInput.value : '').trim().toUpperCase();

    if (!rawRef) {
      box.textContent = 'Please enter a valid reference number (e.g. CH-0001).';
      box.style.color = 'var(--orange)';
      return;
    }

    box.textContent = 'Searching campus database for request ' + rawRef + '…';
    box.style.color = 'var(--muted)';

    try {
      const response = await fetch('/api/complaints/' + encodeURIComponent(rawRef));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to locate request with reference ' + rawRef);
      }

      box.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'track-result-card';

      const titleEl = document.createElement('h3');
      titleEl.textContent = data.reference + ' · ' + data.title;

      const metaEl = document.createElement('p');
      metaEl.className = 'track-meta';
      metaEl.textContent = data.category + ' · Submitted ' + new Date(data.created_at).toLocaleString();

      const pill = document.createElement('span');
      const statusNormalized = (data.status || 'open').toLowerCase().replace(/\s+/g, '-');
      pill.className = 'status-pill ' + statusNormalized;
      pill.textContent = data.status;

      const updateEl = document.createElement('p');
      updateEl.className = 'track-update-time';
      updateEl.textContent = 'Last status update: ' + new Date(data.updated_at).toLocaleString();

      const timelineWrap = document.createElement('div');
      const timelineLabel = document.createElement('strong');
      timelineLabel.style.fontSize = '12px';
      timelineLabel.style.letterSpacing = '0.08em';
      timelineLabel.style.color = 'var(--muted)';
      timelineLabel.textContent = 'STATUS TIMELINE';
      timelineWrap.appendChild(timelineLabel);

      const timeline = document.createElement('div');
      timeline.className = 'timeline';

      if (Array.isArray(data.timeline) && data.timeline.length > 0) {
        data.timeline.forEach(t => {
          const item = document.createElement('span');
          item.textContent = t.status + ' — ' + new Date(t.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
          if (t.status === data.status) {
            item.className = 'current';
          }
          timeline.appendChild(item);
        });
      } else {
        const item = document.createElement('span');
        item.className = 'current';
        item.textContent = data.status + ' — ' + new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
        timeline.appendChild(item);
      }

      timelineWrap.appendChild(timeline);
      card.append(titleEl, metaEl, pill, updateEl, timelineWrap);
      box.appendChild(card);
    } catch (err) {
      box.innerHTML = '';
      const errEl = document.createElement('p');
      errEl.style.color = '#c0392b';
      errEl.style.fontWeight = '600';
      errEl.textContent = '⚠ ' + (err.message || 'Error fetching status.');
      box.appendChild(errEl);
    }
  });
}
