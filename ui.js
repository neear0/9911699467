/**
 * lumaweb/ui.js
 * Handles: nav scroll shrink, FAQ accordion, contact form, sticky CTA
 */

// ─── Nav shrink on scroll ───────────────────────────────────────────────────
(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('sc', window.scrollY > 60);
  }, { passive: true });
})();


// ─── FAQ accordion ─────────────────────────────────────────────────────────
(function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // close all
      items.forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      // open clicked one if it was closed
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();


// ─── Contact form (Web3Forms) ──────────────────────────────────────────────
// 👉 Vlož svoj Web3Forms access key.
//    Zdarma na https://web3forms.com – zadáš e-mail, príde ti kľúč.
//    Dopyty potom chodia na tú adresu, ktorú si pri registrácii zadal.
const WEB3FORMS_KEY = '49bb65a5-b437-4e6a-99ae-12d3b992c916';

async function submitForm() {
  const isEn = (document.documentElement.lang || 'sk').toLowerCase().startsWith('en');
  const t = isEn
    ? { alert: 'Please fill in your name and e-mail.',
        subject: 'New SEO audit request – lumaweb.sk',
        error: 'Sending failed. Please try again or e-mail us directly.',
        sending: 'Sending…' }
    : { alert: 'Vyplňte prosím meno a e-mail.',
        subject: 'Nová žiadosť o SEO audit – lumaweb.sk',
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
        web:        web || '—',
        message:    msg || '—',
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
// Expose globally so onclick= works
window.submitForm = submitForm;


// ─── Smooth scroll helpers ─────────────────────────────────────────────────
function scrollToContact() {
  document.getElementById('kontakt').scrollIntoView({ behavior: 'smooth' });
}
window.scrollToContact = scrollToContact;


// ─── Sticky CTA visibility ─────────────────────────────────────────────────
(function initStickyCta() {
  const cta     = document.querySelector('.sticky-cta');
  const kontakt = document.getElementById('kontakt');
  if (!cta || !kontakt) return;

  const obs = new IntersectionObserver(entries => {
    const inView = entries[0].isIntersecting;
    cta.style.opacity       = inView ? '0' : '1';
    cta.style.pointerEvents = inView ? 'none' : 'auto';
  }, { threshold: 0.2 });

  obs.observe(kontakt);
})();


// ─── Footer year ───────────────────────────────────────────────────────────
(function setYear() {
  const el = document.getElementById('yr');
  if (el) el.textContent = new Date().getFullYear();
})();
