/* Trip estimator — distance, block time, fuel stops, indicative cost.
   Loaded only on trip-estimator.html. */
(function () {
  var root = document.getElementById('te');
  if (!root) return;

  var $ = function (id) { return document.getElementById(id); };
  var R_NM = 3440.065;                 // earth radius in nautical miles
  var airports = null, cats = null, legs = null, models = [], config = null, routing = null;
  var activeForecast = null, lastNotice = "";
  var from = null, to = null;
  var fields = {};

  /* ---------- data ---------- */
  function load(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  var goButton = $('teGo');
  if (goButton) { goButton.disabled = true; goButton.textContent = 'Loading airports…'; }
  Promise.all([
    load('assets/data/airports.json'),
    load('assets/data/aircraft.json'),
    load('assets/data/routing.json'),
    load('assets/data/aircraft-models.json'),
    load('assets/data/estimator-config.json')
  ]).then(function (d) {
    airports = d[0];
    cats = d[1];
    routing = d[2];
    models = d[3];
    config = d[4];
    wire();
    if (goButton) { goButton.disabled = false; goButton.textContent = 'Calculate'; }
  }).catch(function (e) {
    if (goButton) goButton.textContent = 'Unavailable';
    $('teHint').textContent = 'The airport list could not be loaded. Please send us the route instead and we will work it out.';
    if (window.console) console.error(e);
  });

  load('assets/data/empty-legs.json')
    .then(function (d) { legs = (d && d.legs) || []; })
    .catch(function () { legs = []; });

  /* ---------- search ---------- */
  /* People type on a plain latin keyboard: "Chisinau" for Chişinău, "Malmo"
     for Malmö, "Dusseldorf" for Düsseldorf. Both the query and the airport
     fields are folded to unaccented latin before matching, so either
     spelling finds the airport. NFD splits a letter from its accent and the
     accent is dropped; the few letters that have no decomposition are
     mapped by hand, since NFD leaves those exactly as they were. */
  var FOLD = {'ø':'o','ł':'l','đ':'d','ð':'d','þ':'th','ß':'ss',
              'æ':'ae','œ':'oe','ı':'i','ħ':'h','ŋ':'n','ŧ':'t'};
  function fold(s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[^\u0000-\u007f]/g, function (ch) { return FOLD[ch] || ch; });
  }
  /* folded once per airport and kept, rather than on every keystroke */
  function folded(a) {
    if (!a._f) a._f = { i: fold(a.i), a: fold(a.a || ''), c: fold(a.c || ''), n: fold(a.n) };
    return a._f;
  }

  /* Folding gets you Chisinau for Chişinău, but not Munchen for Munich -
     that is a different name, not an accent, and the data carries only the
     English one. These are the local names a European caller is most likely
     to type; each is matched as a prefix, so "munch" still finds Munich. */
  var ALIAS = {
    munchen:'munich', wien:'vienna', praha:'prague', warszawa:'warsaw',
    moskva:'moscow', kyiv:'kiev', lisboa:'lisbon', roma:'rome',
    milano:'milan', napoli:'naples', firenze:'florence', torino:'turin',
    venezia:'venice', genova:'genoa', geneve:'geneva', zuerich:'zurich',
    kobenhavn:'copenhagen', koebenhavn:'copenhagen', goteborg:'gothenburg',
    bruxelles:'brussels', brussel:'brussels', antwerpen:'antwerp',
    'den haag':'the hague', beograd:'belgrade', bucuresti:'bucharest',
    athina:'athens', sevilla:'seville', lisbona:'lisbon', koeln:'cologne',
    nuernberg:'nuremberg', hannover:'hanover', tallinna:'tallinn',
    riia:'riga', vilnius:'vilnius', chisinau:'chisinau'
  };
  function expand(q) {
    var out = [q];
    for (var k in ALIAS) {
      if (k.indexOf(q) === 0 && out.indexOf(ALIAS[k]) < 0) out.push(ALIAS[k]);
    }
    return out;
  }

  function score(a, q) {
    var f = folded(a);
    var icao = f.i, iata = f.a;
    var city = f.c, name = f.n;
    if (icao === q || iata === q) return 0;
    if (city === q) return 1;
    if (icao.indexOf(q) === 0 || iata.indexOf(q) === 0) return 2;
    if (city.indexOf(q) === 0) return 3;
    if (name.indexOf(q) === 0) return 4;
    if (city.indexOf(q) > -1) return 5;
    if (name.indexOf(q) > -1) return 6;
    return -1;
  }

  function search(q) {
    q = fold(q.trim());
    if (q.length < 2) return [];
    var qs = expand(q);
    var hits = [];
    for (var i = 0; i < airports.length; i++) {
      var s = -1;
      for (var j = 0; j < qs.length; j++) {
        var sj = score(airports[i], qs[j]);
        if (sj > -1 && (s === -1 || sj < s)) s = sj;
      }
      if (s > -1) hits.push([s - airports[i].t * 0.3, airports[i]]);
    }
    hits.sort(function (a, b) { return a[0] - b[0]; });
    return hits.slice(0, 8).map(function (h) { return h[1]; });
  }

  /* Keep city and ICAO in the input itself, rather than showing a bare
     code that visitors may not recognize. The airport and IATA stay below. */
  function airportLabel(a) {
    return (a.c || a.n) + ' (' + a.i + ')';
  }

  function airportDetail(a) {
    return a.n + (a.a ? ' · ' + a.a : '');
  }

  /* The previous calculator only accepted a click on an autocomplete row.
     Typing a valid city (Amsterdam) or code (LUKK) and pressing Calculate
     left from/to null, making the calculator appear broken. Resolve exact
     unique city/name matches and ICAO/IATA codes automatically. Never
     guess a city with multiple airports, e.g. London. */
  function resolveAirport(value) {
    if (!airports) return null;
    var raw = String(value || '').trim();
    if (!raw) return null;
    var selectedFormat = raw.match(/\(([A-Za-z0-9]{3,4})\)\s*$/);
    var q = fold(selectedFormat ? selectedFormat[1] : raw);
    var exactCode = airports.filter(function (a) {
      var f = folded(a);
      return f.i === q || (f.a && f.a === q);
    });
    if (exactCode.length === 1) return exactCode[0];
    if (selectedFormat) return null;
    var exactPlace = airports.filter(function (a) {
      var f = folded(a);
      return f.c === q || f.n === q;
    });
    return exactPlace.length === 1 ? exactPlace[0] : null;
  }

  /* ---------- advisory routing ----------
     Geometric detours avoid coarse restricted-country polygons when possible.
     NOT an ATS airway, SID/STAR, RAD/NOTAM or AIRAC-valid route. */
  function bandFactor(nm) {
    for (var i = 0; i < routing.bands.length; i++) {
      if (nm <= routing.bands[i].upto) return routing.bands[i].factor;
    }
    return 1.03;
  }
  function routeEstimate(a, b) {
    var nm = window.CisRouteModel.distance(a,b);
    var active = $('teAvoid').checked ? routing.restricted : [];
    var geo = window.CisRouteModel.estimate(a,b,active);
    if(geo.blocked || geo.unroutable)return geo;
    /* The published SID/STAR track miles are not available. The terminal
       and en-route allowances below remain explicitly heuristic. */
    var terminal = Math.min(routing.terminal_nm, nm * routing.terminal_cap);
    var enroute = geo.nm * (bandFactor(nm)-1);
    return {greatCircle:nm, geometry:geo.nm, detour:geo.detour, hit:geo.hit,
      enroute:enroute, terminal:terminal, track:geo.nm+enroute+terminal,
      method:geo.method, path:geo.path};
  }
  function unitPax(c){return typeof c.pax === 'number' ? c.pax : parseInt(String(c.pax).split('–').pop(),10);}
  function selectedAircraft(){
    var id = $('teAircraft').value;
    if(!id) return cats;
    var m = models.filter(function(x){return x.id===id})[0];
    if(!m)return cats;
    var category=cats.filter(function(c){return c.id===m.category})[0];
    if(!category)return cats;
    return [{id:m.id,name:m.name,examples:'Specific aircraft planning profile',pax:m.pax,
      tas:m.tas,range:m.range,rate:category.rate,cabin:m.note,category:m.category}];
  }
  function dateOnly(id){return ($(id).value||'').trim();}
  function nightsAway(){
    var first=dateOnly('teDate'),last=dateOnly('teReturnDate');
    if(!first||!last)return 0;
    var delta=(Date.parse(last+'T00:00:00Z')-Date.parse(first+'T00:00:00Z'))/86400000;
    return Math.max(0,Math.min(30,Math.round(delta)));
  }
  function outputWind(){
    var cfg=config||{},endpoint=String(cfg.wind_endpoint||'').trim();
    var departure=dateOnly('teDate'),returnDate=dateOnly('teReturnDate');
    if(!endpoint||!departure){
      return Promise.resolve({out:0,back:0,active:false,note:cfg.wind_notice||'Still-air calculation; wind data not connected.'});
    }
    // Only a configured, licensed endpoint is queried. Never embed API keys
    // or use a non-commercial weather tier on this business website.
    var params=new URLSearchParams({from:from.i,to:to.i,lat1:String(from.y),lon1:String(from.x),
      lat2:String(to.y),lon2:String(to.x),departure:departure,return_date:returnDate||departure});
    var url=endpoint+(endpoint.indexOf('?')>=0?'&':'?')+params.toString();
    return Promise.race([
      fetch(url,{credentials:'omit'}).then(function(r){if(!r.ok)throw Error('forecast not available');return r.json()}),
      new Promise(function(_,reject){setTimeout(function(){reject(Error('wind request timed out'));},4500);})
    ]).then(function(data){
      var a=Number(data.outbound_tailwind_kt),b=Number(data.return_tailwind_kt);
      if(!isFinite(a)||!isFinite(b))throw Error('invalid wind response');
      return {out:Math.max(-130,Math.min(130,a)),back:Math.max(-130,Math.min(130,b)),
        active:true,note:'Forecast wind component (approximate): outbound '+Math.round(a)+
        ' kt tailwind; return '+Math.round(b)+' kt tailwind. Forecast/model: '+
        String(data.provider||'configured provider')+'.'};
    }).catch(function(){return {out:0,back:0,active:false,
      note:'Wind forecast unavailable for this date or location; showing still-air estimates.'};});
  }

  var USABLE = 0.88;      // of normal range, planned (reserves, winds, payload)
  var TAXI_H = 0.25;      // taxi out + in
  var TERMINAL_H = 0.25;  // 15 min extra for climb/descent vs constant cruise TAS
  var STOP_H = 1.0;       // descent, turn, climb for a tech stop
  function estimate(cat, route, wind, returnTrip) {
    var p=config.pricing;
    var track=route.track;
    var stops=Math.max(0,Math.ceil(track/(cat.range*USABLE))-1);
    function flightHours(tailwind){
      // Tailwind speeds up flight; headwind slows it down; bound model noise.
      var groundspeed=Math.max(cat.tas*0.65,cat.tas+tailwind);
      return track/groundspeed+TERMINAL_H+TAXI_H+stops*STOP_H;
    }
    var outH=flightHours(wind.out),backH=returnTrip?flightHours(wind.back):0;
    var hrs=outH+backH,sectors=returnTrip?2:1;
    var pos=returnTrip?0:Number(p.one_way_positioning_h||0.8)*cat.rate;
    var flying=hrs*cat.rate;
    var stopsCost=stops*Number(p.fuel_stop_eur||2500)*sectors;
    var airport=sectors*Number(p.airport_handling_eur_per_sector||0);
    var nav=sectors*track/100*Number(p.navigation_eur_per_100nm||0);
    var overnight=returnTrip?nightsAway()*Number(p.crew_overnight_eur_per_night||0):0;
    return {stops:stops,hours:hrs,cost:flying+pos+stopsCost+airport+nav+overnight,
      flying:flying,positioning:pos,stopFees:stopsCost,airport:airport,nav:nav,overnight:overnight,
      groundspeed:cat.tas+wind.out,viable:stops<=2};
  }

  function hhmm(h) {
    var m = Math.round(h * 60);
    return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
  }

  function money(n) {
    var spread=Number((config && config.pricing && config.pricing.display_variation)||0.15);
    var lo = Math.round(n * (1-spread) / 500) * 500;
    var hi = Math.round(n * (1+spread) / 500) * 500;
    var f = function (v) { return '€' + v.toLocaleString('en-GB'); };
    return f(lo) + ' – ' + f(hi);
  }

  /* ---------- render ---------- */
  /* The estimate runs when Calculate is pressed, never as the form is
     edited. Anything the visitor changes afterwards marks the figures on
     screen as out of date rather than quietly rewriting them. */
  function markStale() {
    var out = $('teOut'), note = $('teNote');
    if (out && !out.hidden) out.classList.add('te-stale');
    if (note) note.hidden = !(out && !out.hidden);
  }

  function calculate() {
    /* Resolve a city or code typed directly, even without opening the list. */
    if (fields.from) fields.from.resolve();
    if (fields.to) fields.to.resolve();
    var out = $('teOut'), note = $('teNote');
    if (out) out.classList.remove('te-stale');
    if (note) note.hidden = true;
    if (!from || !to) { render(null); return; }
    if (goButton) {goButton.disabled=true;goButton.textContent='Calculating…';}
    outputWind().then(function(wind){
      activeForecast=wind;
      render(wind);
    }).finally(function(){if(goButton){goButton.disabled=false;goButton.textContent='Calculate';}});
  }

  function render(wind) {
    var out = $('teOut'), hint = $('teHint');
    if (!from || !to) {
      out.hidden = true; hint.hidden = false;
      $('teLegs').hidden = true;
      /* Reset the wording. Typing over a chosen airport clears the choice
         but used to leave whatever the hint last said on screen - so after
         EGLL to EGLL, typing LFPB and pressing Calculate still read
         "Departure and destination are the same airport" while the two
         codes on screen plainly differed. */
      var typed = ($('teFrom').value.trim() && !from) || ($('teTo').value.trim() && !to);
      hint.textContent = typed
        ? 'Please choose ' + ((!from && $('teFrom').value.trim()) ? 'the departure airport' : 'the destination airport') +
          ' from the suggestions. City names with multiple airports need a specific selection.'
        : 'Pick a departure and a destination, then press Calculate.';
      return;
    }
    if (from.i === to.i) {
      out.hidden = true; hint.hidden = false;
      $('teLegs').hidden = true;
      hint.textContent = 'Departure and destination are the same airport.';
      return;
    }
    /* A negative or fractional passenger count used to calculate happily
       and then travel into the enquiry as "-2 passengers". */
    var paxRaw = $('tePax').value.trim();
    var pax = parseInt(paxRaw, 10);
    if (paxRaw !== '' && (!/^\d+$/.test(paxRaw) || pax < 1)) {
      out.hidden = true; hint.hidden = false;
      $('teLegs').hidden = true;
      hint.textContent = 'Passengers has to be a whole number, one or more.';
      return;
    }
    if (!pax || pax < 1) pax = 1;
    if ($('teReturn').checked && dateOnly('teDate') && dateOnly('teReturnDate') &&
        dateOnly('teReturnDate') < dateOnly('teDate')) {
      out.hidden = true; hint.hidden = false;
      hint.textContent = 'Return date cannot be earlier than the outbound departure date.';
      return;
    }

    hint.hidden = true; out.hidden = false;

    var route=routeEstimate(from,to);
    if(route.blocked||route.unroutable){
      out.hidden=true;hint.hidden=false;$('teLegs').hidden=true;
      hint.textContent=route.blocked
        ? 'Origin or destination is within an airspace area marked restricted in this simplified dataset. Route eligibility requires operator review.'
        : 'Unable to draw an indicative geometric detour around the marked restricted airspace. Please request a manually planned route.';
      return;
    }
    var track=route.track,ret=$('teReturn').checked,shown=ret?track*2:track;
    $('teNm').textContent=Math.round(shown).toLocaleString('en-GB');
    $('teKm').textContent=Math.round(shown*1.852).toLocaleString('en-GB');
    var ext='Geodesic distance '+Math.round(route.greatCircle)+' nm; '+
      (route.detour>1 ? 'restricted-area geometric detour +'+Math.round(route.detour)+' nm; ' : '')+
      'en-route allowance +'+Math.round(route.enroute)+' nm; terminal/SID-STAR allowance +'+
      Math.round(route.terminal)+' nm. '+
      'Geometry uses coarse restricted-country polygons and a grid search, NOT published airways, actual SID/STAR tracks, NOTAMs or an approved AIRAC route.';
    if(route.hit.length)ext+=' Simplified avoidance applied for '+route.hit.map(function(x){return x.name}).join(', ')+'.';
    $('teExt').textContent=ext;
    $('teCostHeading').textContent=ret?'Return-trip indicative total':'One-way indicative total';
    var aircraft=selectedAircraft(),p=config.pricing;
    var windData=wind||{out:0,back:0,active:false,note:'No wind forecast attached.'};
    var days=ret?nightsAway():0;
    $('teWeather').textContent=windData.note;
    $('tePricing').textContent=(ret?
      'Return estimates include outbound and inbound flight hours, two sets of handling and navigation allowances, stops in each direction, and '+days+' assumed crew overnight(s). No additional positioning is modeled for the return.' :
      'One-way estimates include a benchmark 0.8-hour aircraft positioning allowance, plus handling and navigation allowances.')+
      ' Amounts are assumptions, not actual airport, NM route-charge or operator tariff data.';
    var rows=aircraft.map(function(c){
      var e=estimate(c,route,windData,ret),tight=pax>unitPax(c);
      var invalid=!e.viable||tight;
      var cls=invalid?' class="te-no"':'';
      var note=!e.viable?'beyond sensible range':tight?'too many passengers':
        (e.stops?e.stops+(e.stops>1?' stops/sector':' stop/sector'):'non-stop');
      var price=invalid?'—':money(e.cost);
      var details=invalid?'':('<span>Flying €'+Math.round(e.flying).toLocaleString('en-GB')+
        ' · Positioning €'+Math.round(e.positioning).toLocaleString('en-GB')+
        ' · Ground €'+Math.round(e.airport).toLocaleString('en-GB')+
        ' · Nav allowance €'+Math.round(e.nav).toLocaleString('en-GB')+
        ' · Stops €'+Math.round(e.stopFees).toLocaleString('en-GB')+
        (e.overnight?' · Overnight €'+Math.round(e.overnight).toLocaleString('en-GB'):'')+'</span>');
      return '<tr'+cls+'><td><b>'+c.name+'</b><span>'+c.examples+' · '+unitPax(c)+
        ' pax</span><span>'+c.tas+' kt cruise TAS · €'+c.rate.toLocaleString('en-GB')+
        '/block h (planning benchmark)</span></td><td>'+hhmm(e.hours)+'</td><td>'+note+'</td><td>'+price+
        (ret&&!invalid?'<span>Two sectors · about '+money(e.cost/2)+'/sector</span>':'')+details+'</td></tr>';
    }).join('');
    $('teRows').innerHTML=rows;
    var hrsList=aircraft.map(function(c){
      var e=estimate(c,route,windData,ret);
      return (e.viable&&pax<=unitPax(c))?e.hours:null;
    }).filter(function(v){return v!==null});
    if(!hrsList.length)$('teDur').textContent='—';
    else {
      var lo=Math.min.apply(null,hrsList),hi=Math.max.apply(null,hrsList);
      $('teDur').textContent=Math.abs(hi-lo)<.1?hhmm(lo):hhmm(lo)+' – '+hhmm(hi);
    }
    $('teSend').href='contact.html?service=Charter organisation&msg='+encodeURIComponent(
      'Quote request: '+from.i+' ('+(from.c||from.n)+') to '+to.i+' ('+(to.c||to.n)+')'+
      (ret?', return':', one way')+', '+pax+' passengers; '+
      'departure date '+(dateOnly('teDate')||'to confirm')+
      (ret?'; return date '+(dateOnly('teReturnDate')||'to confirm'):'')+
      '; requested aircraft '+($('teAircraft').selectedOptions[0].textContent||'compare all')+
      '; estimated '+Math.round(shown)+' nm, non-operational routing.');

    showLegs();
  }

  function showLegs() {
    var box = $('teLegs'), body = $('teLegsBody');
    if (!legs) { box.hidden = true; return; }
    var match = legs.filter(function (l) {
      return (l.from === from.i && l.to === to.i) || (l.from === to.i && l.to === from.i);
    });
    box.hidden = false;
    if (!match.length) {
      body.innerHTML = '<p class="te-note">Nothing listed on this route at the moment. ' +
        'Empty legs appear at short notice — tell us your dates and we will watch for one.</p>';
      return;
    }
    body.innerHTML = '<ul class="te-leglist">' + match.map(function (l) {
      var c = cats.filter(function (x) { return x.id === l.category; })[0];
      return '<li><b>' + l.from + ' → ' + l.to + '</b>' +
        '<span>' + l.date + (c ? ' · ' + c.name : '') +
        (l.seats ? ' · ' + l.seats + ' seats' : '') + '</span>' +
        (l.price_eur ? '<em>€' + l.price_eur.toLocaleString('en-GB') + '</em>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  /* ---------- inputs ---------- */
  function attach(inputId, pickId, nameId, set) {
    var input = $(inputId), pick = $(pickId), name = $(nameId);
    var idx = -1, items = [];

    function close() { pick.hidden = true; idx = -1; }

    function open(list) {
      items = list;
      if (!list.length) { close(); return; }
      pick.innerHTML = list.map(function (a, n) {
        return '<button type="button" role="option" data-n="' + n + '">' +
          '<b>' + airportLabel(a) + '</b> — ' + a.n +
          (a.a ? '<i>' + a.a + '</i>' : '') + '</button>';
      }).join('');
      pick.hidden = false;
    }

    function choose(a) {
      if (!a) return;
      set(a);
      input.value = airportLabel(a);
      name.textContent = airportDetail(a);
      close();
      markStale();
    }

    function resolve() {
      if (!input.value.trim()) return;
      var match = resolveAirport(input.value);
      if (match) choose(match);
      else open(search(input.value)); // let the visitor pick an ambiguous airport
    }

    input.addEventListener('input', function () {
      set(null); name.textContent = '';
      open(search(input.value));
      markStale();
    });
    /* On leaving a field, normalize a valid city or code to City (ICAO),
       even if the visitor never selected an autocomplete suggestion. */
    input.addEventListener('change', function () {
      var match = resolveAirport(input.value);
      if (match) choose(match);
    });
    /* Reopen suggestions when returning to an unresolved field; otherwise
       a Calculate click on an ambiguous city could leave them dismissed. */
    function reopenPicker() {
      if (!resolveAirport(input.value)) open(search(input.value));
    }
    input.addEventListener('focus', reopenPicker);
    input.addEventListener('click', reopenPicker);
    input.addEventListener('keydown', function (e) {
      if (pick.hidden) return;
      var btns = pick.querySelectorAll('button');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx += (e.key === 'ArrowDown' ? 1 : -1);
        if (idx < 0) idx = btns.length - 1;
        if (idx >= btns.length) idx = 0;
        btns.forEach(function (b, n) { b.classList.toggle('on', n === idx); });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        choose(idx > -1 ? items[idx] : (resolveAirport(input.value) || items[0]));
      } else if (e.key === 'Escape') { close(); }
    });
    pick.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) choose(items[+b.dataset.n]);
    });
    document.addEventListener('click', function (e) {
      if (!pick.contains(e.target) && e.target !== input) close();
    });
    return {resolve: resolve};
  }

  function wire() {
    fields.from = attach('teFrom', 'teFromPick', 'teFromName', function (a) { from = a; });
    fields.to = attach('teTo', 'teToPick', 'teToName', function (a) { to = a; });
    $('teGo').addEventListener('click', calculate);
    $('teReturn').addEventListener('change', markStale);
    $('teAvoid').addEventListener('change', markStale);
    $('tePax').addEventListener('input', markStale);
    ['teAircraft','teDate','teReturnDate'].forEach(function(id){$(id).addEventListener('change',markStale)});
    $('teReturn').addEventListener('change',function(){
      $('teReturnDateWrap').hidden=!$('teReturn').checked;
    });
    var options=models.map(function(m){return '<option value="'+m.id+'">'+m.name+'</option>'}).join('');
    $('teAircraft').insertAdjacentHTML('beforeend',options);
    /* Enter anywhere in the form runs it, as long as a suggestion list
       is not open - there Enter still picks the highlighted airport. */
    var formEl = document.querySelector('.te-form');
    formEl && formEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var open = document.querySelector('.te-pick:not([hidden])');
      if (open) return;
      e.preventDefault();
      calculate();
    });
    $('teSwap').addEventListener('click', function () {
      var a = from, b = to;
      from = b; to = a;
      $('teFrom').value = from ? airportLabel(from) : '';
      $('teTo').value = to ? airportLabel(to) : '';
      $('teFromName').textContent = from ? airportDetail(from) : '';
      $('teToName').textContent = to ? airportDetail(to) : '';
      markStale();
    });

    /* deep link: trip-estimator.html?from=EDMA&to=OMDB */
    var p = new URLSearchParams(location.search);
    ['from', 'to'].forEach(function (k) {
      var v = (p.get(k) || '').toUpperCase();
      if (!v) return;
      var hit = airports.filter(function (a) { return a.i === v || a.a === v; })[0];
      if (!hit) return;
      if (k === 'from') { from = hit; $('teFrom').value = airportLabel(hit); $('teFromName').textContent = airportDetail(hit); }
      else { to = hit; $('teTo').value = airportLabel(hit); $('teToName').textContent = airportDetail(hit); }
    });
    /* arriving with ?from=&to= is a request for the answer, so run it */
    if (from && to) calculate();
  }
})();
