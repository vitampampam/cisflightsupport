/* Per-service request forms.
   Each service card opens a dialog that asks what that service actually needs —
   a caterer needs the uplift time and the allergies, a pre-buy needs the serial
   and the facility. Field sets live in assets/data/request-forms.json.

   There is no backend: the answers are composed into a structured message and
   carried into the contact form, which the person then sends. */
(function () {
  var forms = null, current = null, lastFocus = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- dialog shell, built once ---------- */
  var wrap = document.createElement('div');
  wrap.className = 'rq';
  wrap.hidden = true;
  wrap.innerHTML =
    '<div class="rq-back" data-close></div>' +
    '<div class="rq-box" role="dialog" aria-modal="true" aria-labelledby="rqTitle">' +
      '<div class="rq-head">' +
        '<button class="rq-x" type="button" data-close aria-label="Close">&times;</button>' +
        '<h2 id="rqTitle"></h2>' +
        '<p class="rq-intro"></p>' +
      '</div>' +
      '<div class="rq-body">' +
        '<form class="rq-form" novalidate></form>' +
      '</div>' +
      '<div class="rq-foot">' +
        '<p class="rq-err" role="alert" hidden></p>' +
        '<button type="button" class="btn ghost" data-close>Cancel</button>' +
        '<button type="submit" class="btn" form="rqForm">Continue to enquiry</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);
  var box = wrap.querySelector('.rq-box');
  var formEl = wrap.querySelector('.rq-form');
  formEl.id = 'rqForm';

  wrap.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (wrap.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    /* Keep Tab inside the dialog. Shift+Tab twice from the first field used
       to land on the page behind it - two steps back from Airport reached
       the footer's Impressum link, and Enter left the page with the dialog
       still open. */
    var items = [].filter.call(
      box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetWidth || el.offsetHeight || el.getClientRects().length; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  });

  /* Who to reply to. Appended to every service form so the dialog is the
     whole enquiry, not a step on the way to another page. */
  var WHO = [
    { k: '_name',  label: 'Your name',   t: 'text',  req: true },
    { k: '_email', label: 'Email',       t: 'text',  req: true, ph: 'name@company.com' },
    { k: '_tel',   label: 'Telephone',   t: 'text',  ph: 'Including country code' },
    { k: '_org',   label: 'Company',     t: 'text' }
  ];

  /* A form that already asks for the name or the organisation must not ask
     again down here. The trial form was showing two "Your name" boxes, and
     when you pressed Continue with both empty it complained "Still needed:
     Your name, Your name". */
  function who() {
    var have = (current && current.fields || []).map(function (x) {
      return String(x.label || '').toLowerCase().replace(/\s*\(.*?\)\s*$/, '').trim();
    });
    return WHO.filter(function (f) {
      if (f.k === '_name') return !have.some(function (l) { return /^(your |contact |full )?name$/.test(l); });
      if (f.k === '_org')  return !have.some(function (l) { return /^(your )?(organisation|organization|company)$/.test(l); });
      if (f.k === '_email') return !have.some(function (l) { return /^(your |contact )?e-?mail$/.test(l); });
      if (f.k === '_tel')  return !have.some(function (l) { return /^(your |contact )?(telephone|phone|mobile)$/.test(l); });
      return true;
    });
  }

  /* "None" and "Not sure" answer the whole question, so they cannot stand
     beside a specific choice. Ticking one clears the others and vice versa. */
  var EXCLUSIVE = /^(none|not sure|no preference|none of these)$/i;
  formEl.addEventListener('change', function (e) {
    var box = e.target;
    if (!box || box.type !== 'checkbox') return;
    var group = formEl.querySelectorAll('[name="' + box.name + '"]');
    if (group.length < 2) return;
    var isExclusive = EXCLUSIVE.test(box.value);
    [].forEach.call(group, function (other) {
      if (other === box || !other.checked) return;
      if (isExclusive || EXCLUSIVE.test(other.value)) other.checked = false;
    });
  });

  function open(id) {
    var f = forms && forms[id];
    if (!f) return false;
    current = f;
    wrap.querySelector('#rqTitle').textContent = f.title;
    wrap.querySelector('.rq-intro').textContent = f.intro || '';
    formEl.innerHTML = f.fields.map(field).join('') +
      '<p class="rq-sep rq-wide">Where to send the answer</p>' +
      who().map(field).join('');
    wrap.querySelector('.rq-err').hidden = true;
    lastFocus = document.activeElement;
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
    wrap.querySelector('.rq-body').scrollTop = 0;
    var first = formEl.querySelector('input,select,textarea');
    if (first) setTimeout(function () { first.focus(); }, 40);
    return true;
  }

  function close() {
    wrap.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- field markup ---------- */
  function field(f) {
    var id = 'rq_' + f.k;
    var req = f.req ? ' <span class="rq-req">required</span>' : '';
    var label = '<label for="' + id + '">' + esc(f.label) + req + '</label>';
    var ph = f.ph ? ' placeholder="' + esc(f.ph) + '"' : '';
    var body;

    if (f.t === 'textarea') {
      body = '<textarea id="' + id + '" name="' + f.k + '" rows="3"' + ph + '></textarea>';
    } else if (f.t === 'select') {
      body = '<select id="' + id + '" name="' + f.k + '">' +
        f.opts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') +
        '</select>';
    } else if (f.t === 'checks') {
      body = '<div class="rq-checks" id="' + id + '">' + f.opts.map(function (o, n) {
        return '<label class="rq-check"><input type="checkbox" name="' + f.k +
               '" value="' + esc(o) + '"> ' + esc(o) + '</label>';
      }).join('') + '</div>';
      return '<div class="rq-field rq-wide" data-k="' + f.k + '">' +
             '<span class="rq-lab">' + esc(f.label) + req + '</span>' + body + '</div>';
    } else {
      body = '<input id="' + id + '" name="' + f.k + '" type="' + (f.t || 'text') + '"' + ph + '>';
    }
    var wide = (f.t === 'textarea') ? ' rq-wide' : '';
    return '<div class="rq-field' + wide + '" data-k="' + f.k + '">' + label + body + '</div>';
  }

  /* ---------- collect and validate ---------- */
  function value(f) {
    if (f.t === 'checks') {
      return [].slice.call(formEl.querySelectorAll('[name="' + f.k + '"]:checked'))
               .map(function (c) { return c.value; }).join(', ');
    }
    var el = formEl.querySelector('[name="' + f.k + '"]');
    return el ? el.value.trim() : '';
  }

  function prettyDate(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var d = new Date(v + 'T00:00:00');
    return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    var all = current.fields.concat(who());
    var missing = all.filter(function (f) { return f.req && !value(f); });
    var err = wrap.querySelector('.rq-err');

    formEl.querySelectorAll('.rq-field').forEach(function (d) { d.classList.remove('rq-bad'); });
    if (missing.length) {
      missing.forEach(function (f) {
        var d = formEl.querySelector('.rq-field[data-k="' + f.k + '"]');
        if (d) d.classList.add('rq-bad');
      });
      err.textContent = 'Still needed: ' + missing.map(function (f) { return f.label; }).join(', ');
      err.hidden = false;
      var firstBad = formEl.querySelector('.rq-bad input,.rq-bad select,.rq-bad textarea');
      if (firstBad) firstBad.focus();
      return;
    }

    var lines = [current.title, ''];
    current.fields.forEach(function (f) {
      var v = value(f);
      if (!v) return;
      if (f.t === 'date') v = prettyDate(v);
      lines.push('- ' + f.label.replace(/\s*\(.*?\)$/, '') + ': ' + v);
    });

    lines.push('');
    lines.push('Contact');
    who().forEach(function (f) {
      var v = value(f);
      if (v) lines.push('- ' + f.label + ': ' + v);
    });

    /* No server to post to, so the enquiry leaves as a composed email and
       the dialog stays where it is, confirming what was sent. */
    var body = lines.join('\n');
    var href = 'mailto:ops@cisflightsupport.com' +
               '?subject=' + encodeURIComponent(current.title) +
               '&body=' + encodeURIComponent(body);
    window.location.href = href;
    done(body);
  });

  /* ---------- sent ---------- */
  function done(body) {
    wrap.querySelector('.rq-head h2').textContent = 'Ready to send';
    wrap.querySelector('.rq-intro').textContent =
      'Your email app should be opening with this enquiry in it. If nothing ' +
      'happens, copy the text below and send it to ops@cisflightsupport.com.';
    wrap.querySelector('.rq-body').innerHTML =
      '<textarea class="rq-done" readonly rows="12"></textarea>';
    wrap.querySelector('.rq-done').value = body;
    wrap.querySelector('.rq-foot').innerHTML =
      '<button type="button" class="btn ghost" data-close>Close</button>' +
      '<button type="button" class="btn" id="rqCopy">Copy the text</button>';
    var copy = wrap.querySelector('#rqCopy');
    copy.addEventListener('click', function () {
      var t = wrap.querySelector('.rq-done');
      t.select();
      if (navigator.clipboard) navigator.clipboard.writeText(t.value);
      copy.textContent = 'Copied';
    });
  }

  /* ---------- triggers ---------- */
  fetch('assets/data/request-forms.json?t=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      forms = d;
      if (!forms) return;
      /* Which links open a form is declared in the markup with data-request,
         not guessed from the href. Guessing caught the navigational calls to
         action too — "See the process" and "See the platform" are meant to
         take you to the page that explains them, not to open an enquiry. */
      document.addEventListener('click', function (e) {
        var t = e.target.closest('[data-request]');
        if (!t) return;
        if (open(t.getAttribute('data-request'))) e.preventDefault();
      });
    })
    .catch(function () { /* links keep their original behaviour */ });
})();
