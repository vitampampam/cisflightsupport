/* Rates and empty-leg editor.
   Static hosting has no server to save to, so this edits the data in the browser
   and hands back the finished JSON files to commit. Nothing is uploaded anywhere. */
(function () {
  var root = document.getElementById('adm');
  if (!root) return;

  var $ = function (id) { return document.getElementById(id); };
  var cats = [], legs = [], meta = {}, airports = null;
  var fleet = [], fleetMeta = {}, shapes = [];

  function load(url) {
    return fetch(url + '?t=' + Date.now()).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  Promise.all([load('assets/data/aircraft.json'), load('assets/data/empty-legs.json'),
               load('assets/data/fleet.json')])
    .then(function (d) {
      cats = d[0];
      meta = d[1] || {};
      legs = (meta.legs || []).slice();
      fleetMeta = d[2] || {};
      fleet = (fleetMeta.listings || []).slice();
      shapes = fleetMeta.silhouettes || ['falcon-7x.png'];
      drawRates();
      drawLegs();
      drawFleet();
      $('admLoading').hidden = true;
      $('admBody').hidden = false;
    })
    .catch(function (e) {
      $('admLoading').textContent = 'Could not load the data files: ' + e.message;
    });

  load('assets/data/airports.json').then(function (a) { airports = a; }).catch(function () {});

  /* ---------- rates ---------- */
  function drawRates() {
    $('admRates').innerHTML = cats.map(function (c, i) {
      return '<tr>' +
        '<td><b>' + c.name + '</b><span>' + c.examples + '</span></td>' +
        '<td><input type="number" data-k="rate" data-i="' + i + '" value="' + c.rate + '" min="0" step="100"></td>' +
        '<td><input type="number" data-k="tas"  data-i="' + i + '" value="' + c.tas + '" min="100" step="5"></td>' +
        '<td><input type="number" data-k="range" data-i="' + i + '" value="' + c.range + '" min="100" step="50"></td>' +
        '<td><input type="text" data-k="pax" data-i="' + i + '" value="' + c.pax + '" size="5"></td>' +
        '</tr>';
    }).join('');
  }

  $('admRates').addEventListener('input', function (e) {
    var el = e.target;
    if (!el.dataset.k) return;
    var c = cats[+el.dataset.i], k = el.dataset.k;
    c[k] = (k === 'pax') ? el.value : (parseFloat(el.value) || 0);
    dirty();
  });

  /* ---------- empty legs ---------- */
  function row(l, i) {
    var opts = cats.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === l.category ? ' selected' : '') + '>' + c.name + '</option>';
    }).join('');
    return '<tr>' +
      '<td><input type="text" data-l="' + i + '" data-k="from" value="' + (l.from || '') + '" maxlength="4" size="5" placeholder="EDMA"></td>' +
      '<td><input type="text" data-l="' + i + '" data-k="to" value="' + (l.to || '') + '" maxlength="4" size="5" placeholder="OMDB"></td>' +
      '<td><input type="date" data-l="' + i + '" data-k="date" value="' + (l.date || '') + '"></td>' +
      '<td><select data-l="' + i + '" data-k="category">' + opts + '</select></td>' +
      '<td><input type="number" data-l="' + i + '" data-k="seats" value="' + (l.seats || '') + '" min="1" max="19" size="3"></td>' +
      '<td><input type="number" data-l="' + i + '" data-k="price_eur" value="' + (l.price_eur || '') + '" min="0" step="500" placeholder="optional"></td>' +
      '<td><button type="button" class="adm-del" data-del="' + i + '" aria-label="Remove">&times;</button></td>' +
      '</tr>';
  }

  function drawLegs() {
    $('admLegs').innerHTML = legs.length
      ? legs.map(row).join('')
      : '<tr><td colspan="7" class="adm-none">No empty legs listed. Visitors are told nothing is on their route — which is the right thing to show when there is nothing.</td></tr>';
    checkCodes();
  }

  $('admLegs').addEventListener('input', function (e) {
    var el = e.target;
    if (!el.dataset.l) return;
    var l = legs[+el.dataset.l], k = el.dataset.k;
    var v = el.value;
    if (k === 'from' || k === 'to') v = v.toUpperCase();
    if (k === 'seats' || k === 'price_eur') v = v === '' ? '' : (parseInt(v, 10) || 0);
    l[k] = v;
    if (k === 'from' || k === 'to') { el.value = v; checkCodes(); }
    dirty();
  });

  $('admLegs').addEventListener('change', function (e) {
    if (e.target.dataset.k === 'category') {
      legs[+e.target.dataset.l].category = e.target.value;
      dirty();
    }
  });

  $('admLegs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]');
    if (!b) return;
    legs.splice(+b.dataset.del, 1);
    drawLegs();
    dirty();
  });

  $('admAdd').addEventListener('click', function () {
    legs.push({ from: '', to: '', date: '', category: cats[0] ? cats[0].id : '', seats: '', price_eur: '' });
    drawLegs();
    dirty();
  });

  /* an unknown ICAO silently never matches a route, so flag it here */
  function checkCodes() {
    if (!airports) return;
    var known = {};
    airports.forEach(function (a) { known[a.i] = a; });
    [].forEach.call($('admLegs').querySelectorAll('[data-k="from"],[data-k="to"]'), function (el) {
      var v = el.value.toUpperCase();
      var bad = v.length === 4 && !known[v];
      el.classList.toggle('adm-bad', bad);
      el.title = bad ? 'Not in the airport list — the estimator will never match this leg' :
                 (known[v] ? known[v].n : '');
    });
  }


  /* ---------- aircraft for sale ---------- */
  var STATUS = [['for-sale','For sale'],['under-offer','Under offer'],
                ['sold','Sold'],['wanted','Acquisition mandate']];

  function fleetRow(l, i) {
    var st = STATUS.map(function (s) {
      return '<option value="' + s[0] + '"' + (s[0] === l.status ? ' selected' : '') + '>' + s[1] + '</option>';
    }).join('');
    var sil = shapes.map(function (s) {
      return '<option value="' + s + '"' + (s === l.silhouette ? ' selected' : '') + '>' + s.replace('.png','') + '</option>';
    }).join('');
    return '<tr>' +
      '<td><select data-f="' + i + '" data-k="status">' + st + '</select></td>' +
      '<td><input type="text" data-f="' + i + '" data-k="title" value="' + (l.title || '').replace(/"/g,'&quot;') + '" placeholder="2016 Dassault Falcon 7X" size="24"></td>' +
      '<td><input type="text" data-f="' + i + '" data-k="reg" value="' + (l.reg || '') + '" size="8" placeholder="D-ABCD"></td>' +
      '<td><input type="text" data-f="' + i + '" data-k="hours" value="' + (l.hours || '') + '" size="8" placeholder="2,180 h"></td>' +
      '<td><input type="text" data-f="' + i + '" data-k="location" value="' + (l.location || '') + '" size="6" maxlength="4" placeholder="EDMA"></td>' +
      '<td><input type="number" data-f="' + i + '" data-k="price_eur" value="' + (l.price_eur || '') + '" step="100000" placeholder="optional"></td>' +
      '<td><select data-f="' + i + '" data-k="silhouette">' + sil + '</select></td>' +
      '<td><button type="button" class="adm-del" data-delf="' + i + '" aria-label="Remove">&times;</button></td>' +
      '</tr>';
  }

  function drawFleet() {
    $('admFleet').innerHTML = fleet.length
      ? fleet.map(fleetRow).join('')
      : '<tr><td colspan="8" class="adm-none">Nothing listed — the Fleet page and its links stay hidden.</td></tr>';
  }

  $('admFleet').addEventListener('input', function (e) {
    var el = e.target;
    if (!el.dataset.f) return;
    var l = fleet[+el.dataset.f], k = el.dataset.k, v = el.value;
    if (k === 'reg' || k === 'location') { v = v.toUpperCase(); el.value = v; }
    if (k === 'price_eur') v = v === '' ? '' : (parseInt(v, 10) || 0);
    l[k] = v;
    dirty();
  });

  $('admFleet').addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.f && (el.dataset.k === 'status' || el.dataset.k === 'silhouette')) {
      fleet[+el.dataset.f][el.dataset.k] = el.value;
      dirty();
    }
  });

  $('admFleet').addEventListener('click', function (e) {
    var b = e.target.closest('[data-delf]');
    if (!b) return;
    fleet.splice(+b.dataset.delf, 1);
    drawFleet();
    dirty();
  });

  $('admAddAc').addEventListener('click', function () {
    fleet.push({ status: 'for-sale', title: '', reg: '', hours: '', location: '',
                 price_eur: '', silhouette: shapes[0] });
    drawFleet();
    dirty();
  });

  function fleetJson() {
    var clean = fleet.filter(function (l) { return l.title; }).map(function (l) {
      var o = { status: l.status || 'for-sale', title: l.title, silhouette: l.silhouette || shapes[0] };
      ['reg','hours','location','summary'].forEach(function (k) { if (l[k]) o[k] = l[k]; });
      if (l.price_eur) o.price_eur = +l.price_eur;
      return o;
    });
    return JSON.stringify({
      updated: new Date().toISOString().slice(0, 10),
      silhouettes: shapes,
      listings: clean
    }, null, 1);
  }

  $('admDlFleet').addEventListener('click', function () {
    download('fleet.json', fleetJson());
    if (!fleet.filter(function (l) { return l.title; }).length) {
      $('admState').textContent = 'Downloaded — empty, so the Fleet page stays hidden';
    }
  });

  /* ---------- output ---------- */
  function dirty() {
    $('admState').textContent = 'Edited — not saved yet';
    $('admState').className = 'adm-state on';
  }

  function cleanLegs() {
    return legs
      .filter(function (l) { return l.from && l.to && l.date; })
      .map(function (l) {
        var o = { from: l.from, to: l.to, date: l.date, category: l.category };
        if (l.seats) o.seats = +l.seats;
        if (l.price_eur) o.price_eur = +l.price_eur;
        return o;
      });
  }

  function aircraftJson() { return JSON.stringify(cats, null, 1); }

  function legsJson() {
    var out = { updated: new Date().toISOString().slice(0, 10), legs: cleanLegs() };
    return JSON.stringify(out, null, 1);
  }

  function download(name, text) {
    var b = new Blob([text], { type: 'application/json' });
    var u = URL.createObjectURL(b);
    var a = document.createElement('a');
    a.href = u; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
    $('admState').textContent = 'Downloaded — now commit it to assets/data/';
    $('admState').className = 'adm-state ok';
  }

  $('admDlRates').addEventListener('click', function () { download('aircraft.json', aircraftJson()); });
  $('admDlLegs').addEventListener('click', function () { download('empty-legs.json', legsJson()); });

  $('admCopy').addEventListener('click', function () {
    var text = '--- assets/data/aircraft.json ---\n' + aircraftJson() +
               '\n\n--- assets/data/empty-legs.json ---\n' + legsJson() +
               '\n\n--- assets/data/fleet.json ---\n' + fleetJson();
    navigator.clipboard.writeText(text).then(function () {
      $('admState').textContent = 'Both files copied to the clipboard';
      $('admState').className = 'adm-state ok';
    });
  });

  $('admPreview').addEventListener('click', function () {
    $('admJson').hidden = !$('admJson').hidden;
    $('admJson').textContent = '// assets/data/aircraft.json\n' + aircraftJson() +
      '\n\n// assets/data/empty-legs.json\n' + legsJson() +
      '\n\n// assets/data/fleet.json\n' + fleetJson();
  });
})();
