(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('sc', window.scrollY > 60);
  }, { passive: true });
})();

/* Mobile menu. Below 900px the link list is hidden and this button is the only
   route to any page other than home and contact, so it has to keep working
   even if something else on the page throws. */
(function initMobileMenu() {
  const nav = document.getElementById('nav');
  const btn = nav && nav.querySelector('.nav-toggle');
  if (!nav || !btn) return;

  const set = (open) => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    set(!nav.classList.contains('open'));
  });

  // following a link should close the panel behind it
  nav.querySelectorAll('.nav-links a').forEach((a) =>
    a.addEventListener('click', () => set(false)),
  );

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') set(false);
  });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) set(false);
  });
  // rotating to landscape must not leave the panel stuck open over the page
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) set(false);
  });
})();

(function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      items.forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();

const WEB3FORMS_KEY = '49bb65a5-b437-4e6a-99ae-12d3b992c916';

/* Called from the contact form's `submit` event, so pressing Enter in a field
   works and the browser runs its own `required` / `type="email"` checks first.
   The event must be cancelled or the page would reload and lose the input. */
async function submitForm(ev) {
  if (ev) ev.preventDefault();

  const isEn = (document.documentElement.lang || 'sk').toLowerCase().startsWith('en');
  const t = isEn
    ? { alert: 'Please fill in your name and e-mail.',
        subject: 'New SEO audit request (lumaweb.sk)',
        error: 'Sending failed. Please try again or e-mail us directly.',
        sending: 'Sending…' }
    : { alert: 'Vyplňte prosím meno a e-mail.',
        subject: 'Nová žiadosť o SEO audit (lumaweb.sk)',
        error: 'Odoslanie zlyhalo. Skúste to znova alebo nám napíšte priamo e-mailom.',
        sending: 'Odosielam…' };

  const name  = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const web   = (document.getElementById('f-web')?.value || '').trim();
  const msg   = (document.getElementById('f-msg')?.value || '').trim();

  if (!name || !email) {
    alert(t.alert);
    return;
  }

  const btn = document.querySelector('.form-submit');
  const btnLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = t.sending; }

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject:    t.subject,
        from_name:  'LumaWeb web',
        name:       name,
        email:      email,
        web:        web || 'neuvedené',
        message:    msg || 'neuvedené',
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Web3Forms error');

    document.getElementById('form-wrap').style.display    = 'none';
    document.getElementById('form-success').style.display = 'block';
  } catch (err) {
    console.error('Form submit failed:', err);
    alert(t.error);
    if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
  }
}
window.submitForm = submitForm;

(function setYear() {
  const el = document.getElementById('yr');
  if (el) el.textContent = new Date().getFullYear();
})();

/* Reveal blocks as they scroll in. The `js` flag goes on <html> first: the
   stylesheet only hides .reveal once that class is present, so if this script
   never runs the content simply stays visible. */
(function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('js');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

  // stagger siblings so a row of tiles arrives one after another
  let last = null, step = 0;
  targets.forEach((el) => {
    if (el.parentElement !== last) { last = el.parentElement; step = 0; }
    el.style.transitionDelay = (step * 70) + 'ms';
    step = Math.min(step + 1, 5);
    obs.observe(el);
  });
})();
