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
      '<button class="rq-x" type="button" data-close aria-label="Close">&times;</button>' +
      '<h2 id="rqTitle"></h2>' +
      '<p class="rq-intro"></p>' +
      '<form class="rq-form" novalidate></form>' +
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
    if (!wrap.hidden && e.key === 'Escape') close();
  });

  function open(id) {
    var f = forms && forms[id];
    if (!f) return false;
    current = f;
    wrap.querySelector('#rqTitle').textContent = f.title;
    wrap.querySelector('.rq-intro').textContent = f.intro || '';
    formEl.innerHTML = f.fields.map(field).join('');
    wrap.querySelector('.rq-err').hidden = true;
    lastFocus = document.activeElement;
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
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
    var missing = current.fields.filter(function (f) { return f.req && !value(f); });
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

    var lines = [current.title + ':'];
    current.fields.forEach(function (f) {
      var v = value(f);
      if (!v) return;
      if (f.t === 'date') v = prettyDate(v);
      lines.push('- ' + f.label.replace(/\s*\(.*?\)$/, '') + ': ' + v);
    });

    var q = 'service=' + encodeURIComponent(current.service) +
            '&msg=' + encodeURIComponent(lines.join('\n'));
    close();
    location.href = 'contact.html?' + q;
  });

  /* ---------- triggers ---------- */
  fetch('assets/data/request-forms.json?t=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      forms = d;
      if (!forms) return;
      /* a service card's call to action opens that service's form */
      [].forEach.call(document.querySelectorAll('.card[id]'), function (card) {
        if (!forms[card.id]) return;
        var a = card.querySelector('a[href^="#"]');
        if (!a) return;
        a.setAttribute('data-request', card.id);
      });
      document.addEventListener('click', function (e) {
        var t = e.target.closest('[data-request]');
        if (!t) return;
        if (open(t.getAttribute('data-request'))) e.preventDefault();
      });
    })
    .catch(function () { /* links keep their original behaviour */ });
})();
