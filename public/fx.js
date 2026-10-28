// CampusCare Motion & Device Awareness Controller
document.addEventListener('DOMContentLoaded', () => {
  initKeyboardFocusDetection();
  initHeaderNavigation();
  initDeviceOptimizations();
  initHeroParallax();
  initStoryScrollSync();
  initIntersectionReveals();
});

// Keyboard Focus Detection: Add class to body when user tabs
function initKeyboardFocusDetection() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('user-is-tabbing');
    }
  });

  window.addEventListener('mousedown', () => {
    document.body.classList.remove('user-is-tabbing');
  });
}

// Header Navigation & Mobile Menu
function initHeaderNavigation() {
  const header = document.getElementById('site-header');
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('primaryNav');

  // Header scroll shadow
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  }, { passive: true });

  // Mobile menu toggle
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!isExpanded));
      navLinks.classList.toggle('open');
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('open');
      });
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        menuToggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('open');
        menuToggle.focus();
      }
    });
  }

  // Active section indicator via IntersectionObserver
  const sections = ['hero', 'submit', 'track', 'services', 'help'];
  const navItems = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navItems.forEach(item => {
          const href = item.getAttribute('href');
          if (href === `#${id}`) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      }
    });
  }, {
    rootMargin: '-30% 0px -60% 0px',
    threshold: 0
  });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

// Low-power / Small Device Detection
function initDeviceOptimizations() {
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLowConcurrency = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const isLowMemory = (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  if (isReducedMotion || isLowConcurrency || isLowMemory || isTouch) {
    // Hide extra background decorative cubes for smooth performance
    const cube3 = document.querySelector('.cube-3');
    const cube4 = document.querySelector('.cube-4');
    if (cube3) cube3.style.display = 'none';
    if (cube4) cube4.style.display = 'none';
  }
}

// Hero 3D Scene Mouse Tilt
function initHeroParallax() {
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isFinePointer || isReducedMotion) return;

  const stage = document.getElementById('heroStage');
  const scene = document.getElementById('heroScene');
  if (!stage || !scene) return;

  let mouseX = 0;
  let mouseY = 0;
  let currentX = 0;
  let currentY = 0;
  let isTicking = false;

  stage.addEventListener('mousemove', (e) => {
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Normalize between -1 and 1
    mouseX = (x / (rect.width / 2)) * 12; // max 12 deg tilt
    mouseY = -(y / (rect.height / 2)) * 10; // max 10 deg tilt

    if (!isTicking) {
      requestAnimationFrame(updateHeroScene);
      isTicking = true;
    }
  });

  stage.addEventListener('mouseleave', () => {
    mouseX = 0;
    mouseY = 0;
    if (!isTicking) {
      requestAnimationFrame(updateHeroScene);
      isTicking = true;
    }
  });

  function updateHeroScene() {
    currentX += (mouseX - currentX) * 0.1;
    currentY += (mouseY - currentY) * 0.1;

    scene.style.transform = `rotateY(${currentX}deg) rotateX(${currentY}deg)`;

    if (Math.abs(mouseX - currentX) > 0.05 || Math.abs(mouseY - currentY) > 0.05) {
      requestAnimationFrame(updateHeroScene);
    } else {
      isTicking = false;
    }
  }
}

// Sticky Story Section: Scroll-driven --progress variable & Ticket State Transitions
function initStoryScrollSync() {
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storyWrapper = document.getElementById('story-section');
  const storyTicket = document.getElementById('storyTicket');
  const ticketRef = document.getElementById('storyTicketRef');
  const ticketBadge = document.getElementById('storyTicketBadge');
  const ticketTitle = document.getElementById('storyTicketTitle');
  const ticketDept = document.getElementById('storyTicketDept');
  const ticketStatusNote = document.getElementById('storyTicketStatusNote');
  const steps = document.querySelectorAll('.story-step');

  if (!storyWrapper || isReducedMotion) return;

  let ticking = false;

  const states = [
    {
      progressLimit: 0.25,
      ref: 'CH-0104',
      status: 'Open',
      badgeClass: 'badge-open',
      title: 'Lab Workstation 12 OS Boot Failure',
      dept: 'IT & Wi-Fi Support',
      note: 'Step 1: Ticket Logged'
    },
    {
      progressLimit: 0.50,
      ref: 'CH-0104',
      status: 'In Progress',
      badgeClass: 'badge-progress',
      title: 'Lab Workstation 12 OS Boot Failure',
      dept: 'Assigned: Hardware Tech',
      note: 'Step 2: Technician Reviewing'
    },
    {
      progressLimit: 0.75,
      ref: 'CH-0104',
      status: 'In Progress',
      badgeClass: 'badge-progress',
      title: 'Lab Workstation 12 OS Boot Failure',
      dept: 'Disk Re-imaged & Verified',
      note: 'Step 3: Remediation In Progress'
    },
    {
      progressLimit: 1.00,
      ref: 'CH-0104',
      status: 'Resolved',
      badgeClass: 'badge-resolved',
      title: 'Lab Workstation 12 OS Boot Failure',
      dept: 'Closed & Confirmed Working',
      note: 'Step 4: Ticket Resolved'
    }
  ];

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateStory);
      ticking = true;
    }
  }

  function updateStory() {
    const rect = storyWrapper.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const totalScrollable = rect.height - windowHeight;

    if (totalScrollable <= 0) {
      ticking = false;
      return;
    }

    // Calculate progress 0 to 1
    let progress = -rect.top / totalScrollable;
    progress = Math.max(0, Math.min(1, progress));

    // Update CSS variable --progress on the story section
    storyWrapper.style.setProperty('--progress', progress.toFixed(4));

    // Determine current state based on progress
    let activeStepIndex = 0;
    if (progress >= 0.75) {
      activeStepIndex = 3;
    } else if (progress >= 0.50) {
      activeStepIndex = 2;
    } else if (progress >= 0.25) {
      activeStepIndex = 1;
    } else {
      activeStepIndex = 0;
    }

    // Update step highlight
    steps.forEach((step, idx) => {
      if (idx === activeStepIndex) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    // Update ticket data
    const currentState = states[activeStepIndex];
    if (ticketBadge && ticketStatusNote && ticketDept) {
      ticketRef.textContent = currentState.ref;
      ticketBadge.textContent = currentState.status;
      ticketBadge.className = `ticket-badge ${currentState.badgeClass}`;
      ticketTitle.textContent = currentState.title;
      ticketDept.textContent = currentState.dept;
      ticketStatusNote.textContent = currentState.note;
    }

    ticking = false;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateStory();
}

// Staggered reveals for cards and sections
function initIntersectionReveals() {
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReducedMotion) return;

  const revealTargets = document.querySelectorAll('.service-tile, .workflow-card, .faq-item');

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });

  revealTargets.forEach(target => {
    target.style.opacity = '0';
    target.style.transform = 'translateY(18px)';
    target.style.transition = 'opacity 0.4s cubic-bezier(0.22, 0.61, 0.36, 1), transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)';
    observer.observe(target);
  });
}
