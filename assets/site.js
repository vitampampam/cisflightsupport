(function(){
  /* browsers restore the previous scroll position on refresh — start at the top */
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  addEventListener('load',function(){
    if(!location.hash) scrollTo(0,0);      /* a #link still wins */
  });
})();

(function(){
  var $=function(s,c){return (c||document).querySelector(s)},
      $$=function(s,c){return [].slice.call((c||document).querySelectorAll(s))};

  /* sticky header state + scrollspy */
  var hdr=$('header'),
      secs=$$('section[id], div[id="top"]'),
      navlinks=$$('.nav a[href^="#"]');
  function onScroll(){
    var y=window.scrollY;
    hdr.classList.toggle('stuck', y>20);
    var cur='';
    secs.forEach(function(s){ if(s.getBoundingClientRect().top<=140) cur=s.id; });
    navlinks.forEach(function(a){ a.classList.toggle('active', a.getAttribute('href')==='#'+cur); });
  }
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

  /* mobile sheet */
  var burger=$('#burger'), sheet=$('#sheet');
  function setSheet(open){
    burger.classList.toggle('on',open);
    burger.setAttribute('aria-expanded',open);
    if(open){ sheet.hidden=false; requestAnimationFrame(function(){sheet.classList.add('open')}); }
    else { sheet.classList.remove('open'); setTimeout(function(){sheet.hidden=true},320); }
    document.body.style.overflow=open?'hidden':'';
  }
  burger.addEventListener('click',function(){ setSheet(sheet.hidden); });
  sheet.addEventListener('click',function(e){ if(e.target===sheet||e.target.tagName==='A'||e.target.closest('.sheetx')) setSheet(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!sheet.hidden) setSheet(false); });

  /* service filter */
  var cards=$$('.card');
  $$('.fbtn').forEach(function(b){
    b.addEventListener('click',function(){
      $$('.fbtn').forEach(function(x){x.classList.remove('on')}); b.classList.add('on');
      var f=b.dataset.f;
      cards.forEach(function(c){
        var show = f==='all' || c.dataset.cat===f;
        c.classList.toggle('hide',!show);
        if(show){ c.classList.remove('fadein'); void c.offsetWidth; c.classList.add('fadein'); }
      });
    });
  });

  /* fleet carousel */
  var track=$('#fleetTrack');
  if(track){
    var fdots=$('#fleetDots'), fprev=$('#fleetPrev'), fnext=$('#fleetNext');
    function fcards(){ return $$('article',track); }
    function idx(){
      var l=track.scrollLeft, best=0, bd=1e9;
      fcards().forEach(function(a,i){ var d=Math.abs(a.offsetLeft-track.offsetLeft-l);
        if(d<bd){bd=d;best=i;} });
      return best;
    }
    function atEnd(){ return track.scrollLeft >= track.scrollWidth-track.clientWidth-2; }
    function goTo(i,instant){
      var a=fcards()[i]; if(!a) return;
      track.scrollTo({left:a.offsetLeft-track.offsetLeft,behavior:instant?'auto':'smooth'});
    }
    function sync(){
      var i=idx();
      $$('i',fdots).forEach(function(d,n){ d.classList.toggle('on',n===i); });
      fprev.disabled = track.scrollLeft<=2;
      fnext.classList.toggle('wrap', atEnd());
      fnext.setAttribute('aria-label', atEnd()?'Back to the first aircraft':'Next aircraft');
    }
    function build(){
      fdots.innerHTML='';
      fcards().forEach(function(a,i){
        var d=document.createElement('i');
        d.addEventListener('click',function(){ goTo(i); });
        fdots.appendChild(d);
      });
      sync();
    }
    fprev.addEventListener('click',function(){ if(!fprev.disabled) goTo(Math.max(0,idx()-1)); });
    fnext.addEventListener('click',function(){
      if(atEnd()) goTo(0);                 /* last card -> back to the first */
      else goTo(Math.min(fcards().length-1, idx()+1));
    });
    track.addEventListener('scroll',function(){ clearTimeout(track._t); track._t=setTimeout(sync,80); },{passive:true});
    window.addEventListener('resize',build); build();
    addEventListener('load',sync);
  }

  /* aircraft enquiry buttons — carry the type into the contact form */
  (function(){
    var box=document.getElementById('ms'), sel=document.getElementById('sv');
    function fill(name){
      if(!box) return false;
      box.value='Please send more information on the '+name+'.';
      if(sel) for(var i=0;i<sel.options.length;i++)
        if(/buying|selling/i.test(sel.options[i].text)){ sel.selectedIndex=i; break; }
      var form=box.closest('.form')||box;
      form.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(function(){ box.focus(); },500);
      return true;
    }
    function pick(svcText){
      if(!sel||!svcText) return;
      for(var i=0;i<sel.options.length;i++)
        if(sel.options[i].text.toLowerCase().indexOf(svcText.toLowerCase())>-1){ sel.selectedIndex=i; return; }
    }
    function seed(msg,svc){
      if(!box) return false;
      if(msg) box.value=msg;
      pick(svc);
      (box.closest('.form')||box).scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(function(){ box.focus(); },500);
      return true;
    }
    $$('.req').forEach(function(a){
      a.addEventListener('click',function(e){
        var n=a.dataset.aircraft;
        if(n && fill(n)) e.preventDefault();   /* same page: fill in place */
      });
    });
    var p=new URLSearchParams(location.search);
    var q=p.get('aircraft');
    if(q) fill(q);
    if(p.get('service')||p.get('msg')) seed(p.get('msg'),p.get('service'));
  })();


  /* cards rise into place as they enter; the one behind eases back slightly */
  (function(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches ||
       matchMedia('(max-width:1023px) and (pointer:coarse)').matches) return;
    var stack=[].slice.call(document.querySelectorAll('.sec, .dual'));
    if(!stack.length) return;
    stack.forEach(function(s){ s.classList.add('stk'); });
    function clamp(v){ return v<0?0:v>1?1:v; }
    var ticking=false;
    function frame(){
      ticking=false;
      var vh=innerHeight;
      stack.forEach(function(el){
        var top=el.getBoundingClientRect().top;
        var enter=clamp((vh-top)/(vh*0.4));
        /* Rise only. A scale here was quietly resizing the panels: at 0.975
           it takes ~24px off a 950px panel, which is far more than the 9px
           the fan steps by, so panels looked randomly wide depending on how
           far they had scrolled in. Width is the fan's to decide. */
        el.style.transform = enter<1
          ? 'translate3d(0,'+((1-enter)*46).toFixed(1)+'px,0)'
          : '';
      });
    }
    function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(frame); } }
    addEventListener('scroll',onScroll,{passive:true});
    addEventListener('resize',onScroll);
    addEventListener('load',frame);
    frame();
  })();

  /* photo gallery */
  var gal=$('#galTrack');
  if(gal){
    var gd=$('#galDots'), gp=$('#galPrev'), gn=$('#galNext');
    function figs(){ return $$('figure',gal); }
    function gi(){ return Math.round(gal.scrollLeft/gal.clientWidth); }
    function glast(){ return figs().length-1; }
    function gto(i){ gal.scrollTo({left:i*gal.clientWidth,behavior:'smooth'}); }
    function gsync(){
      var i=gi();
      $$('i',gd).forEach(function(d,n){ d.classList.toggle('on',n===i); });
      gp.disabled = i<=0;
      gn.classList.toggle('wrap', i>=glast());
      gn.setAttribute('aria-label', i>=glast()?'Back to the first photo':'Next photo');
    }
    figs().forEach(function(f,i){
      var d=document.createElement('i');
      d.addEventListener('click',function(){ gto(i); });
      gd.appendChild(d);
    });
    gp.addEventListener('click',function(){ if(!gp.disabled) gto(Math.max(0,gi()-1)); });
    gn.addEventListener('click',function(){ gto(gi()>=glast()?0:gi()+1); });
    gal.addEventListener('scroll',function(){ clearTimeout(gal._t); gal._t=setTimeout(gsync,80); },{passive:true});
    window.addEventListener('resize',gsync);
    gsync();
  }

  /* pre-buy stepper */
  $$('.spill').forEach(function(b){
    b.addEventListener('click',function(){
      $$('.spill').forEach(function(x){x.classList.remove('on')});
      $$('.spanel').forEach(function(x){x.classList.remove('on')});
      b.classList.add('on');
      var t=$('.spanel[data-s="'+b.dataset.s+'"]'); if(t) t.classList.add('on');
    });
  });

  /* reveal on scroll + stat count-up */
  var rv=$$('.sec .wrap > *, .tile, .person');
  rv.forEach(function(el){ el.classList.add('rv'); });
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:.12,rootMargin:'0px 0px -40px'});
  rv.forEach(function(el){ io.observe(el); });




  /* services coverflow */
  var st=$('#svcTrack');
  if(st){
    var sdots=$('#svcDots');
    /* The track is a closed loop: a copy of the set sits on each side of the
       real cards, so the first card always has a neighbour on its left and the
       last one on its right. When a scroll settles we shift by exactly one set
       width — invisible, because the three sets are identical. */
    var setW=0, loop=false;
    /* On a wide screen the twelve services are laid out as a grid - the whole
       catalogue at a glance - and the carousel machinery stands down: no
       clones, no dots, no arrows, no scaled active card. */
    function isGrid(){ return getComputedStyle(st).display==='grid'; }
    function reals(){ return $$('.card',st).filter(function(c){
      return !c.classList.contains('clone') && !c.classList.contains('hide'); }); }
    function visible(){ return $$('.card',st).filter(function(c){return !c.classList.contains('hide')}); }
    function buildLoop(){
      $$('.card.clone',st).forEach(function(c){ c.parentNode.removeChild(c); });
      /* On touch screens the 3× loop duplicates all twelve photos and causes
         expensive image repaint/eviction on iOS when the browser chrome moves.
         Use one persistent set: swipe, arrows, dots and wrap-to-first remain. */
      if(isGrid() || (window.matchMedia &&
          window.matchMedia('(pointer:coarse) and (max-width:1366px)').matches)){
        loop=false; setW=0; return;
      }
      var rs=reals();
      loop = rs.length>2;
      setW = 0;
      if(!loop) return;
      var head=document.createDocumentFragment(), tail=document.createDocumentFragment();
      rs.forEach(function(c){
        [head,tail].forEach(function(frag){
          var n=c.cloneNode(true);
          n.classList.add('clone'); n.classList.remove('is-active');
          /* the clone keeps a pointer back to the card it copies, so the
             carousel can be put back on the same service after a rebuild */
          n.setAttribute('data-of', c.id || '');
          n.removeAttribute('id'); n.setAttribute('aria-hidden','true');
          $$('[id]',n).forEach(function(x){ x.removeAttribute('id'); });
          $$('a',n).forEach(function(a){ a.tabIndex=-1; });
          frag.appendChild(n);
        });
      });
      st.insertBefore(head, st.firstChild);
      st.appendChild(tail);
      var firstClone=$$('.card.clone',st)[0];
      setW = rs[0].offsetLeft - firstClone.offsetLeft;
      if(setW<=0) loop=false;
    }
    /* keep the scroll inside the middle set, so there is always a set either side */
    function normalise(){
      if(!loop || !setW) return;
      var x=st.scrollLeft, nx=null;
      if(x < setW*0.5) nx = x + setW;
      else if(x >= setW*1.5) nx = x - setW;
      if(nx === null) return;
      /* This hop puts the identical card back under the reader, so it has
         to be invisible. The rail carries scroll-behavior:smooth, which
         makes even a plain assignment animate - the whole set slid past
         on its own, which is what looked like the carousel resetting. */
      var prev = st.style.scrollBehavior;
      st.style.scrollBehavior = 'auto';
      st.scrollLeft = nx;
      void st.offsetWidth;                 /* flush before restoring */
      st.style.scrollBehavior = prev;
    }
    function mark(){
      if(isGrid()){
        $$('.card',st).forEach(function(c){ c.classList.remove('is-active'); });
        return;
      }
      var mid=st.getBoundingClientRect().left+st.clientWidth/2, best=null, bd=1e9;
      visible().forEach(function(c){
        var r=c.getBoundingClientRect(), d=Math.abs(r.left+r.width/2-mid);
        if(d<bd){bd=d;best=c;}
      });
      $$('.card',st).forEach(function(c){ c.classList.toggle('is-active',c===best); });
      var vs=visible(), i=vs.indexOf(best), rn=reals().length;
      if(loop && rn) i=((i%rn)+rn)%rn;       /* a clone lights its real card's dot */
      $$('i',sdots).forEach(function(d,n){ d.classList.toggle('on',n===i); });
      arrows();
    }
    function centre(c,instant){
      if(isGrid()){ c.scrollIntoView({block:'center',behavior:instant?'auto':'smooth'}); return; }
      st.scrollTo({left:c.offsetLeft-(st.clientWidth-c.offsetWidth)/2,
                   behavior:instant?'auto':'smooth'});
    }
    function rest(instant){
      if(isGrid()) return;
      var rs=reals(); if(!rs.length) return;
      centre(rs[0],instant);
      setTimeout(mark,instant?0:220);
    }
    function buildDots(){
      sdots.innerHTML='';
      if(isGrid()) return;
      reals().forEach(function(c){
        var d=document.createElement('i');
        d.addEventListener('click',function(){ centre(c); });
        sdots.appendChild(d);
      });
      mark();
    }
    st.addEventListener('scroll',function(){ clearTimeout(st._t);
      st._t=setTimeout(function(){ normalise(); mark(); },60); },{passive:true});
    st.addEventListener('click',function(e){
      if(isGrid()) return;              /* in a grid a card is not a scroll target */
      if(e.target.closest('a')) return;
      var c=e.target.closest('.card');
      if(c && st.contains(c)) centre(c);
    });
    var sprev=$('#svcPrev'), snext=$('#svcNext');
    function arrows(){
      if(isGrid()) return;
      var vs=visible(), cur=vs.findIndex(function(c){return c.classList.contains('is-active')});
      if(loop){
        sprev.disabled=false;
        snext.classList.remove('wrap');
        sprev.setAttribute('aria-label','Previous service');
        snext.setAttribute('aria-label','Next service');
        return;
      }
      sprev.disabled = cur<=0;
      var last = cur>=vs.length-1;
      snext.classList.toggle('wrap', last);
      snext.setAttribute('aria-label', last?'Back to the first service':'Next service');
    }
    function move(dir){
      if(isGrid()) return;
      var vs=visible(), cur=vs.findIndex(function(c){return c.classList.contains('is-active')});
      if(cur<0) return;
      if(loop){ var nl=vs[cur+dir]; if(nl) centre(nl); return; }
      if(dir>0 && cur>=vs.length-1){ centre(vs[0]); return; }   /* last -> first */
      var nx=vs[Math.min(vs.length-1,Math.max(0,cur+dir))];
      if(nx) centre(nx);
    }
    sprev.addEventListener('click',function(){ if(!sprev.disabled) move(-1); });
    snext.addEventListener('click',function(){ move(1); });
    var count=document.createElement('p');
    count.className='fcount';
    var fbar=document.querySelector('.filters');
    if(fbar) fbar.parentNode.insertBefore(count,fbar.nextSibling);
    function tell(b){
      /* count the services, not the cards on the rail: the loop carries a
         clone of every card on each side, so visible() returned three times
         the real number - "9 technical services", "all 36 service lines" */
      var n=reals().length, label=b?b.textContent.trim():'All services';
      count.textContent = (b && b.dataset.f!=='all')
        ? 'Showing '+n+' '+label.toLowerCase()+' service'+(n===1?'':'s')
        : 'Showing all '+n+' service lines';
    }
    $$('.fbtn').forEach(function(b){
      b.addEventListener('click',function(){
        setTimeout(function(){
          buildLoop();
          buildDots();
          var rs=reals();
          if(rs.length) centre(rs[0],true);
          setTimeout(function(){ normalise(); mark(); },220);
          tell(b);
        },30);
      });
    });
    tell(null);
    /* Rebuild only when the width really changed, and come back to the card
       the reader was on. iOS fires resize every time the browser toolbar
       slides in or out as you scroll - the height changes, the width does
       not - and rebuilding on that threw the carousel back to the first
       card mid-scroll, which is the "it resets by itself" fault. */
    var lastW = window.innerWidth, keepId = null;
    window.addEventListener('resize',function(){
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      /* Note the card on the FIRST resize of a burst. The new width makes
         a different card the centred one straight away, so by the time the
         debounce fires is-active has already moved and reading it there
         would just confirm the drift. */
      if (keepId === null) {
        var keep=$('.card.is-active',st);
        keepId = keep ? (keep.id || keep.getAttribute('data-of') || '') : '';
      }
      clearTimeout(st._r);
      st._r=setTimeout(function(){
        var want = keepId; keepId = null;
        buildLoop(); buildDots();
        /* next frame: the clones have just been inserted and offsetLeft is
           still the pre-rebuild layout until the browser reflows */
        requestAnimationFrame(function(){
          var rs=reals();
          var target=null;
          if(want) rs.forEach(function(c){ if(c.id===want) target=c; });
          if(!target) target=rs[0];
          if(target) centre(target,true);
          mark(); arrows();
        });
      },180);
    });
    buildLoop();
    buildDots();
    /* A #hash must win over the default centring, otherwise arriving from the
       menu at services.html#catering lands on whatever card rest() picks. */
    function svcHashCard(){
      var id=(location.hash||'').slice(1);
      if(!id) return null;
      var c=document.getElementById(id);
      return (c && c.classList.contains('card') && st.contains(c)) ? c : null;
    }
    /* land at the top of the Services section, clear of the sticky header,
       rather than part-way down at the card itself */
    function svcTop(instant){
      var sec=st.closest('section'); if(!sec) return;
      var hdr=document.querySelector('header');
      var off=(hdr?hdr.getBoundingClientRect().height:0)+14;
      var y=sec.getBoundingClientRect().top+(window.pageYOffset||0)-off;
      window.scrollTo({top:y<0?0:y,behavior:instant?'auto':'smooth'});
    }
    function svcOpen(instant){
      var c=svcHashCard();
      if(!c){ rest(instant); setTimeout(mark,60); return; }
      if(c.classList.contains('hide')){          /* target filtered out — show all */
        var allBtn=document.querySelector('.fbtn[data-f="all"]');
        if(allBtn) allBtn.click();
      }
      setTimeout(function(){
        centre(c,instant);
        svcTop(instant);
        setTimeout(mark,instant?0:240);
      },40);
    }
    /* open on a centred, enlarged card rather than a flat row */
    requestAnimationFrame(function(){ svcOpen(true); });
    window.addEventListener('load',function(){ svcOpen(true); });
    window.addEventListener('hashchange',function(){ svcOpen(false); });
  }

  /* station map interaction */
  var out=$('#mapout');
  $$('.netmap .stn').forEach(function(g){
    function showStation(){
      $$('.netmap .stn').forEach(function(x){x.classList.remove('on')});
      g.classList.add('on');
      out.innerHTML='<b>'+g.dataset.n+'</b><span>'+Number(g.dataset.d).toLocaleString('en-US')+
        ' km from the office · '+g.querySelector('.code').textContent+
        ({eu:' · Europe',cis:' · CIS',me:' · Middle East'}[g.dataset.r]||'')+'</span>';
    }
    g.addEventListener('pointerenter',showStation); g.addEventListener('focus',showStation);
    g.addEventListener('click',showStation);
  });
  /* gantt bars grow when the panel scrolls in */
  var g=$('.gantt');
  if(g){ new IntersectionObserver(function(e,o){
    if(e[0].isIntersecting){ g.classList.add('go'); o.disconnect(); }
  },{threshold:.25}).observe(g); }

  /* ---------- 2026 layer ---------- */
  /* scroll progress */
  var prog=$('#progress');
  function tick(){
    var d=document.documentElement, m=d.scrollHeight-innerHeight;
    prog.style.width=(m>0?(scrollY/m)*100:0)+'%';
  }
  addEventListener('scroll',tick,{passive:true}); addEventListener('resize',tick); tick();

  /* kinetic hero headline */
  var h1=$('.hero h1');
  if(h1){
    var words=h1.textContent.trim().split(/\s+/);
    h1.innerHTML=words.map(function(w,i){
      var g=(i>=3)?' grad':'';
      return '<span class="w'+g+'" style="--i:'+i+'">'+w+'</span>';
    }).join(' ');
  }

  /* cursor spotlight on tiles and cards */
  function spot(e){
    var r=this.getBoundingClientRect();
    this.style.setProperty('--mx',(e.clientX-r.left)+'px');
    this.style.setProperty('--my',(e.clientY-r.top)+'px');
  }
  if(matchMedia('(hover:hover)').matches){ $$('.tile, .card').forEach(function(el){ el.addEventListener('pointermove',spot); }); }

  /* parallax on hero artwork + blobs */
  var plane=$('.hero .plane'), blobs=$$('.blob');
  /* parallax writes an inline transform; on a tablet the CSS positions the aircraft
     itself, so the leftover inline value survived rotation until a refresh */
  function parallaxOn(){
    return innerWidth>=900 && matchMedia('(pointer:fine)').matches;
  }
  function clearParallax(){
    if(plane) plane.style.transform='';
    blobs.forEach(function(b){ b.style.translate=''; });
  }
  addEventListener('scroll',function(){
    if(!parallaxOn()) return;
    var y=scrollY;
    if(plane) plane.style.transform='translateY('+(y*0.09)+'px)';
    blobs.forEach(function(b,i){ b.style.translate='0 '+(y*(i?0.05:-0.04))+'px'; });
  },{passive:true});
  function onOrient(){
    clearParallax();                        /* drop stale values first */
    setTimeout(function(){                  /* let the new viewport settle */
      if(!parallaxOn()) clearParallax();
    },120);
  }
  addEventListener('resize',onOrient);
  addEventListener('orientationchange',onOrient);
  if(!parallaxOn()) clearParallax();

  var nums=$$('.stats b, .anums b, .tbig');
  var io2=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      io2.unobserve(e.target);
      var el=e.target, txt=el.textContent, m=txt.match(/[\d,]+/);
      if(!m) return;
      var end=parseInt(m[0].replace(/,/g,''),10), pre=txt.slice(0,m.index), post=txt.slice(m.index+m[0].length);
      var grouped=m[0].indexOf(',')>-1;   /* 2004 is a year, not a quantity — never group it */
      var t0=null, dur=1100;
      function tick(ts){
        if(!t0) t0=ts;
        var k=Math.min(1,(ts-t0)/dur), v=Math.round(end*(1-Math.pow(1-k,3)));
        el.textContent=pre+(grouped?v.toLocaleString('en-US'):String(v))+post;
        if(k<1) requestAnimationFrame(tick);
      }
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(tick);
    });
  },{threshold:.5});
  nums.forEach(function(n){ io2.observe(n); });
})();
/* safety net: keeps the page usable if the main bundle throws */
(function(){
  function go(){
    try{
      document.querySelectorAll('.rv:not(.in)').forEach(function(el){
        if(el.getBoundingClientRect().top < innerHeight*1.1) el.classList.add('in');
      });
      var g=document.querySelector('.gantt');
      if(g && g.getBoundingClientRect().top < innerHeight) g.classList.add('go');
    }catch(e){}
  }
  addEventListener('scroll',go,{passive:true}); addEventListener('resize',go); go();
  setTimeout(function(){
    if(!document.querySelector('.rv.in'))
      document.querySelectorAll('.rv').forEach(function(el){el.classList.add('in')});
    var t=document.getElementById('svcTrack');
    if(t && !t.querySelector('.card.is-active')){
      var vs=[].slice.call(t.querySelectorAll('.card:not(.hide)'));
      /* honour a #hash here too, so the fallback cannot land on the wrong card */
      var hid=(location.hash||'').slice(1);
      var hc=hid?document.getElementById(hid):null;
      var c=(hc && vs.indexOf(hc)>-1) ? hc : (vs[1]||vs[0]);
      if(c){ c.classList.add('is-active'); t.scrollLeft=c.offsetLeft-(t.clientWidth-c.offsetWidth)/2; }
    }
  },1500);
})();

/* ---- the stack fans out: each panel a little wider than the one above ----
   The panels are a mix of element types, so a CSS nth-child chain cannot
   count them; the width is handed out here instead. Desktop only - on a
   phone every panel already fills the screen. */
(function () {
  var SEL = 'body > .hero, body > .doorbar, body > section.sec, body > .dual, body > footer';
  var STEP = 9;                       /* rendered px of extra width per panel */

  /* The fan is set in RENDERED pixels, not declared ones. Two things get in
     the way of declaring a width and having it appear: the page carries
     zoom:.9 on :root, and a <section> resolves differently from a bare <div>
     for the same declared width. Both used to be patched with constants that
     made the steps uneven - "some cards the same width, some larger".

     So: give every panel the same probe width, read back what each one
     actually rendered, and from that derive its own declared-to-rendered
     factor. Then the first panel can be pinned to the header's measured width
     and each one after it stepped by exactly STEP on screen. */
  function fan() {
    /* Only on a true desktop. Below this the header follows its own tablet
       rules and no longer shares the panels' measure, so pinning the first
       panel to it would just make the panels disagree with each other -
       uniform width is the better answer there. */
    var wide = window.matchMedia('(min-width:1200px)').matches;
    var panels = [].slice.call(document.querySelectorAll(SEL));
    if (!panels.length) return;

    if (!wide) {
      panels.forEach(function (el) { el.style.removeProperty('--w'); });
      return;
    }

    var bar = document.querySelector('.bar');
    if (!bar) return;
    var head = bar.getBoundingClientRect().width;      /* the header's measure */

    /* Two probes, because the relation is affine and not merely scaled: a
       panel's own padding and borders add a constant on top of the scaled
       declared width. One probe assumes that constant is zero, which is what
       left two panels off the step. rendered = m * declared + c, solved per
       panel, then inverted. */
    var P1 = 900, P2 = 1100;
    panels.forEach(function (el) { el.style.setProperty('--w', P1 + 'px'); });
    var r1 = panels.map(function (el) { return el.getBoundingClientRect().width; });
    panels.forEach(function (el) { el.style.setProperty('--w', P2 + 'px'); });
    var r2 = panels.map(function (el) { return el.getBoundingClientRect().width; });

    var m = [], c = [];
    panels.forEach(function (el, i) {
      m[i] = (r2[i] - r1[i]) / (P2 - P1);
      if (!(m[i] > 0.01)) { m[i] = 1; c[i] = 0; return; }   /* clamped: don't divide by ~0 */
      c[i] = r1[i] - m[i] * P1;
    });

    /* How wide a panel may get before max-width clamps it. Read from the
       resolved max-width rather than by probing a huge width, which would
       throw a horizontal scrollbar and change the very viewport it depends
       on. Without this the widest panels silently collapse onto one width on
       a narrow desktop - the same "some are the same width" fault. */
    var maxDecl = parseFloat(getComputedStyle(panels[0]).maxWidth);
    var cap = isFinite(maxDecl) ? m[0] * maxDecl + c[0] : Infinity;
    var n = panels.length - 1;

    /* The first panel matching the header matters more than the size of the
       step, so when there is not room for both, the step gives way - not the
       starting width. */
    var base = head, step = STEP;
    if (head + STEP * n > cap) step = Math.max(0, (cap - head) / n);
    if (head > cap) { base = cap; step = 0; }

    panels.forEach(function (el, i) {
      el.style.setProperty('--w', (((base + i * step) - c[i]) / m[i]).toFixed(2) + 'px');
    });

    /* Then correct against what actually came out. The probe is taken with
       every panel at one width, and a panel's slope shifts a little once the
       page is back in its real shape, which is enough to knock a step off by
       a pixel or two. Measuring the error and feeding it back settles it. */
    for (var pass = 0; pass < 4; pass++) {
      var worst = 0;
      var err = panels.map(function (el, i) {
        var e = (base + i * step) - el.getBoundingClientRect().width;
        if (Math.abs(e) > worst) worst = Math.abs(e);
        return e;
      });
      if (worst < 0.25) break;
      panels.forEach(function (el, i) {
        var cur = parseFloat(el.style.getPropertyValue('--w'));
        el.style.setProperty('--w', (cur + err[i] / m[i]).toFixed(2) + 'px');
      });
    }
  }
  fan();
  window.addEventListener('resize', function () {
    clearTimeout(window._fanT); window._fanT = setTimeout(fan, 150);
  });
})();

/* ---- preload service cards once, as soon as the page opens ----
   Images are eagerly requested in the HTML (low priority after the hero),
   and this fallback covers pages with cards created dynamically. The browser
   manages a single resource/cache entry for each unique image URL. */
(function () {
  var imgs=document.querySelectorAll('#svcTrack .cshot img');
  if(!imgs.length) return;
  for(var i=0;i<imgs.length;i++){
    imgs[i].loading='eager';
    if(i>1 && !imgs[i].getAttribute('fetchpriority'))
      imgs[i].setAttribute('fetchpriority','low');
  }
})();

/* ---- the general enquiry form ----
   Its button carried no handler: an empty form reported nothing and a
   filled one went nowhere. There is no server behind this site, so the
   enquiry leaves the way the per-service dialogs send theirs - as a
   composed email - and the form now says what is missing first, marks
   those fields and puts the cursor in the first of them. */
(function () {
  var REQ = [
    { id: 'fn', label: 'First name' },
    { id: 'em', label: 'Email' },
    { id: 'ms', label: 'How can we assist' }
  ];
  var ALL = [
    { id: 'fn', label: 'First name' }, { id: 'ln', label: 'Last name' },
    { id: 'em', label: 'Email' },      { id: 'ph', label: 'Telephone' },
    { id: 'sv', label: 'Service required' },
    { id: 'ms', label: 'How can we assist' }
  ];

  [].forEach.call(document.querySelectorAll('.form'), function (form) {
    var btn = form.querySelector('button');
    if (!btn || !form.querySelector('#ms')) return;

    var err = document.createElement('p');
    err.className = 'rq-err';
    err.setAttribute('role', 'alert');
    err.hidden = true;
    btn.parentNode.insertBefore(err, btn);

    function val(id) {
      var el = form.querySelector('#' + id);
      return el ? el.value.trim() : '';
    }
    function box(id) {
      var el = form.querySelector('#' + id);
      return el ? el.closest('.f') : null;
    }

    btn.addEventListener('click', function () {
      [].forEach.call(form.querySelectorAll('.f'), function (f) { f.classList.remove('bad'); });

      var missing = REQ.filter(function (r) { return !val(r.id); });
      var email = val('em');
      var badEmail = !missing.some(function (m) { return m.id === 'em'; }) &&
                     !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email);

      if (missing.length || badEmail) {
        missing.forEach(function (m) { var d = box(m.id); if (d) d.classList.add('bad'); });
        if (badEmail) { var d = box('em'); if (d) d.classList.add('bad'); }
        err.textContent = missing.length
          ? 'Still needed: ' + missing.map(function (m) { return m.label; }).join(', ') +
            (badEmail ? ', and an email address we can reply to' : '')
          : 'That email address does not look right.';
        err.hidden = false;
        var first = form.querySelector('.f.bad input,.f.bad select,.f.bad textarea');
        if (first) first.focus();
        return;
      }

      err.hidden = true;
      var lines = ['Enquiry from the website', ''];
      ALL.forEach(function (f) {
        var v = val(f.id);
        if (v) lines.push('- ' + f.label + ': ' + v);
      });
      var body = lines.join('\n');
      window.location.href = 'mailto:ops@cisflightsupport.com' +
        '?subject=' + encodeURIComponent('Enquiry from the website') +
        '&body=' + encodeURIComponent(body);

      var done = document.createElement('div');
      done.className = 'rq-sent';
      done.innerHTML = '<h3>Ready to send</h3>' +
        '<p>Your email app should be opening with this enquiry in it. ' +
        'If nothing happens, copy the text below and send it to ' +
        'ops@cisflightsupport.com.</p>' +
        '<textarea class="rq-done" readonly rows="10"></textarea>' +
        '<button type="button" class="btn">Copy the text</button>';
      done.querySelector('textarea').value = body;
      done.querySelector('button').addEventListener('click', function () {
        var t = done.querySelector('textarea');
        t.select();
        if (navigator.clipboard) navigator.clipboard.writeText(t.value);
        this.textContent = 'Copied';
      });
      form.innerHTML = '';
      form.appendChild(done);
    });
  });
})();


/* Contact form: brand-matched accessible service selector. The existing native
   select remains the source of truth for form submission and URL preselection. */
(function () {
  var fields = document.querySelectorAll('.form select#sv');
  if (!fields.length) return;
  Array.prototype.forEach.call(fields, function (select, instance) {
    if (select.dataset.serviceEnhanced) return;
    var field = select.closest('.f');
    if (!field) return;
    var label = field.querySelector('label[for="sv"]');
    var shell = document.createElement('div');
    shell.className = 'cis-service-picker';
    select.parentNode.insertBefore(shell, select);
    shell.appendChild(select);
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cis-service-trigger';
    toggle.setAttribute('aria-haspopup', 'listbox');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Service required');
    var title = document.createElement('span');
    title.className = 'cis-service-value';
    var arrow = document.createElement('span');
    arrow.className = 'cis-service-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    toggle.appendChild(title); toggle.appendChild(arrow);
    var popup = document.createElement('div');
    popup.className = 'cis-service-options';
    popup.id = 'cis-service-options-' + instance;
    popup.setAttribute('role', 'listbox');
    popup.setAttribute('aria-label', 'Service required');
    popup.hidden = true;
    toggle.setAttribute('aria-controls', popup.id);
    shell.appendChild(toggle); shell.appendChild(popup);
    var options = [];
    var isOpen = false;
    Array.prototype.forEach.call(select.options, function (option, i) {
      var item = document.createElement('button');
      item.type = 'button'; item.className = 'cis-service-option';
      item.id = popup.id + '-opt-' + i;
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', '-1');
      item.textContent = option.textContent;
      item.dataset.index = String(i);
      item.addEventListener('click', function (event) {
        event.preventDefault(); choose(i); close(true);
      });
      item.addEventListener('keydown', function (event) {
        var key = event.key;
        if (key === 'ArrowDown' || key === 'ArrowUp') {
          event.preventDefault();
          focusOption((i + (key === 'ArrowDown' ? 1 : options.length - 1)) % options.length);
        } else if (key === 'Home' || key === 'End') {
          event.preventDefault(); focusOption(key === 'Home' ? 0 : options.length - 1);
        } else if (key === 'Escape') {
          event.preventDefault(); close(true);
        } else if (key === 'Tab') {
          close(false);
        } else if (key === 'Enter' || key === ' ') {
          event.preventDefault(); choose(i); close(true);
        }
      });
      popup.appendChild(item); options.push(item);
    });
    function sync() {
      var i = select.selectedIndex < 0 ? 0 : select.selectedIndex;
      var text = select.options[i] ? select.options[i].textContent : 'Select a service';
      title.textContent = text;
      title.classList.toggle('is-placeholder', !select.value);
      toggle.setAttribute('aria-label', 'Service required: ' + text);
      options.forEach(function (item, j) {
        var active = j === i;
        item.classList.toggle('is-selected', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    function choose(i) {
      if (select.selectedIndex !== i) {
        select.selectedIndex = i;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sync();
    }
    function focusOption(i) {
      if (options[i]) { options[i].focus(); options[i].scrollIntoView({ block: 'nearest' }); }
    }
    function open(focus) {
      if (isOpen) return;
      sync();
      popup.hidden = false; isOpen = true;
      shell.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      var rect = toggle.getBoundingClientRect();
      var height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      /* Keep the popup above the mobile fixed callbar and browser safe area. */
      var callbar = document.querySelector('.callbar');
      var bottomInset = callbar && getComputedStyle(callbar).position === 'fixed'
        ? callbar.getBoundingClientRect().height : 0;
      var below = height - rect.bottom - bottomInset;
      var above = rect.top;
      var upwards = below < 270 && above > below;
      shell.classList.toggle('is-up', upwards);
      popup.style.maxHeight = Math.max(130, Math.min(340, (upwards ? above : below) - 20)) + 'px';
      if (focus) focusOption(Math.max(0, select.selectedIndex));
    }
    function close(focus) {
      if (!isOpen) return;
      isOpen = false; popup.hidden = true;
      shell.classList.remove('is-open', 'is-up');
      toggle.setAttribute('aria-expanded', 'false');
      if (focus) toggle.focus();
    }
    toggle.addEventListener('click', function () {
      if (isOpen) close(false); else open(true);
    });
    toggle.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); open(true);
      } else if (event.key === 'Escape') {
        event.preventDefault(); close(true);
      }
    });
    if (label) label.addEventListener('click', function (event) {
      event.preventDefault(); if (isOpen) close(true); else open(true);
    });
    document.addEventListener('pointerdown', function (event) {
      if (isOpen && !shell.contains(event.target)) close(false);
    });
    document.addEventListener('keydown', function (event) {
      if (isOpen && event.key === 'Escape') { event.preventDefault(); close(true); }
    });
    select.addEventListener('change', sync);
    window.addEventListener('resize', function () { close(false); });
    select.dataset.serviceEnhanced = 'true';
    select.classList.add('cis-service-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    sync();
  });
})();
