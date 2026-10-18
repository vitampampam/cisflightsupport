/* Aircraft for sale.
   Listings live in assets/data/fleet.json, edited through admin.html. Publishing
   the first listing is what re-enables the Fleet links across the site; with an
   empty list the page says so rather than showing invented aircraft. */
(function () {
  var STATUS = {
    'for-sale':    'For sale',
    'under-offer': 'Under offer',
    'sold':        'Sold',
    'wanted':      'Acquisition mandate'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  fetch('assets/data/fleet.json?t=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var list = (d && d.listings) || [];
      showLinks(list.length > 0);
      render(list);
    })
    .catch(function () { showLinks(false); });

  /* a live listing brings the Fleet links back out of hiding */
  function showLinks(on) {
    if (!on) return;
    [].forEach.call(document.querySelectorAll('.temp-off'), function (el) {
      var a = el.matches('a') ? el : el.querySelector('a');
      if (a && /fleet\.html/.test(a.getAttribute('href') || '')) el.classList.remove('temp-off');
    });
    var robots = document.querySelector('meta[name="robots"]');
    if (robots && /noindex/.test(robots.content) && /fleet\.html/.test(location.pathname)) {
      robots.parentNode.removeChild(robots);
    }
  }

  function card(l) {
    var title = esc(l.title || '');
    var q = encodeURIComponent(l.title || '');
    var rows = '';
    if (l.hours)    rows += '<dt>Total time</dt><dd>' + esc(l.hours) + '</dd>';
    if (l.reg)      rows += '<dt>Registration</dt><dd>' + esc(l.reg) + '</dd>';
    if (l.location) rows += '<dt>Location</dt><dd>' + esc(l.location) + '</dd>';
    if (l.price_eur) rows += '<dt>Asking</dt><dd>€' + Number(l.price_eur).toLocaleString('en-GB') + '</dd>';
    var img = esc(l.silhouette || 'falcon-7x.png');
    var sold = l.status === 'sold';
    return '<article class="listing">' +
      '<div class="ph"><span class="tagpill">' + esc(STATUS[l.status] || 'For sale') + '</span>' +
      '<img src="assets/img/' + img + '" alt="' + title + ' profile"></div>' +
      '<div class="body"><h3>' + title + '</h3>' +
      (l.summary ? '<p class="lsum">' + esc(l.summary) + '</p>' : '') +
      '<dl>' + rows + '</dl>' +
      '<a class="req" href="contact.html?aircraft=' + q + '" data-aircraft="' + title + '">' +
      (sold ? 'Ask about similar aircraft' : 'Request more info') + '</a>' +
      '</div></article>';
  }

  function render(list) {
    var track = document.getElementById('fleetTrack');
    if (!track) return;
    var empty = document.getElementById('fleetEmpty');

    if (!list.length) {
      track.innerHTML = '';
      if (empty) empty.hidden = false;
      var car = track.closest('.carousel');
      if (car) car.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    track.innerHTML = list.map(card).join('');
    document.dispatchEvent(new CustomEvent('fleet:rendered'));
  }
})();
