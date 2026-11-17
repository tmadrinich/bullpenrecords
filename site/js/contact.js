// ---------- Contact form ----------
// Shows the fields that fit who is writing, pre-fills from the link that brought them here
// (e.g. /contact/?type=venue&artist=Whiskey%20Peddler), validates, and sends.
//
// Where it sends: StaticForms (the form's data-endpoint and data-api-key attributes), which emails
// each inquiry to the address on the StaticForms account. The visitor's email becomes the reply-to.
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var typeIn = document.getElementById('cf-type');
  var artistIn = document.getElementById('cf-artist');
  var status = document.getElementById('contact-status');
  var messageLabel = form.querySelector('[data-message-label]');
  var blocks = form.querySelectorAll('.conditional-block');
  var submitBtn = form.querySelector('button[type="submit"]');

  var MESSAGE_LABELS = {
    artist: "What's wearing you out?",
    musician: 'What do you play, and what work are you looking for?',
    venue: 'Anything else we should know?',
    business: 'What does the site have to do?',
    other: 'How can we help?'
  };

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = 'status-message' + (kind ? ' ' + kind : '');
  }

  function showBlocks() {
    var type = typeIn.value;
    blocks.forEach(function (b) {
      var on = (b.getAttribute('data-for') || '').split(' ').indexOf(type) !== -1;
      b.classList.toggle('is-active', on);
      // Hidden fields should not be sent or tabbed to.
      b.querySelectorAll('input, select, textarea').forEach(function (el) { el.disabled = !on; });
    });
    if (messageLabel) messageLabel.textContent = MESSAGE_LABELS[type] || MESSAGE_LABELS.other;
  }

  // Pre-fill from the query string. Only known values are accepted.
  (function () {
    var q = new URLSearchParams(location.search);
    var type = q.get('type');
    if (type && typeIn.querySelector('option[value="' + type.replace(/[^a-z]/g, '') + '"]')) typeIn.value = type;
    var artist = q.get('artist');
    if (artist) {
      Array.prototype.forEach.call(artistIn.options, function (o) {
        if (o.textContent === artist) { artistIn.value = o.value || o.textContent; typeIn.value = 'venue'; }
      });
    }
  })();

  typeIn.addEventListener('change', showBlocks);
  showBlocks();

  function markError(el, on) {
    var field = el.closest('.field');
    if (field) field.classList.toggle('has-error', on);
    if (on) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }

  function validate() {
    var first = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      if (el.disabled) return;
      var bad = !el.value.trim() || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      markError(el, bad);
      if (bad && !first) first = el;
    });
    return first;
  }

  form.addEventListener('input', function (e) {
    if (e.target.closest('.has-error')) markError(e.target, false);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = validate();
    if (bad) { setStatus('Fill in the highlighted fields.', 'error'); bad.focus(); return; }

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
    // Bots fill the hidden field; people never see it.
    if (data.honeypot) { setStatus('Thanks. We got it.', 'success'); form.reset(); showBlocks(); return; }
    delete data.honeypot;

    var endpoint = form.getAttribute('data-endpoint');
    var apiKey = form.getAttribute('data-api-key');
    if (!endpoint || !apiKey) {
      setStatus('This form isn’t connected yet. Call or text 507-200-8199.', 'error');
      return;
    }

    // Readable values for the email, and a subject line that says who is writing.
    var typeLabel = typeIn.options[typeIn.selectedIndex].textContent;
    data.type = typeLabel;
    Object.keys(data).forEach(function (k) { if (!data[k]) delete data[k]; });
    data.subject = 'Bullpen Records inquiry: ' + typeLabel + (data.artist ? ' / ' + data.artist : '');
    data.apiKey = apiKey;

    submitBtn.disabled = true;
    setStatus('Sending…');
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('Request failed: ' + r.status);
      form.reset();
      showBlocks();
      setStatus('Thanks. We got it and we’ll be in touch.', 'success');
    }).catch(function () {
      setStatus('That didn’t send. Try again, or call or text 507-200-8199.', 'error');
    }).then(function () { submitBtn.disabled = false; });
  });
})();
