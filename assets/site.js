(function(){
  var $=function(s,c){return (c||document).querySelector(s)},
      $$=function(s,c){return [].slice.call((c||document).querySelectorAll(s))};

  /* sticky header state + scrollspy + fab */
  var hdr=$('header'), fab=$('#fab'),
      secs=$$('section[id], div[id="top"]'),
      navlinks=$$('.nav a[href^="#"]');
  function onScroll(){
    var y=window.scrollY;
    hdr.classList.toggle('stuck', y>20);
    fab.classList.toggle('on', y>700);
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
  sheet.addEventListener('click',function(e){ if(e.target===sheet||e.target.tagName==='A') setSheet(false); });
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
    var dots=$('#fleetDots');
    function step(){ var a=track.querySelector('article'); return a?a.offsetWidth+24:320; }
    function pages(){ return Math.max(1,Math.ceil(track.scrollWidth/track.clientWidth)); }
    function build(){
      dots.innerHTML='';
      for(var i=0;i<pages();i++){ (function(i){
        var d=document.createElement('i');
        d.addEventListener('click',function(){ track.scrollTo({left:i*track.clientWidth,behavior:'smooth'}); });
        dots.appendChild(d);
      })(i); }
      sync();
    }
    function sync(){
      var i=Math.round(track.scrollLeft/track.clientWidth);
      $$('i',dots).forEach(function(d,n){ d.classList.toggle('on',n===i); });
    }
    $('#fleetPrev').addEventListener('click',function(){ track.scrollBy({left:-step(),behavior:'smooth'}); });
    $('#fleetNext').addEventListener('click',function(){ track.scrollBy({left:step(),behavior:'smooth'}); });
    track.addEventListener('scroll',function(){ clearTimeout(track._t); track._t=setTimeout(sync,90); },{passive:true});
    window.addEventListener('resize',build); build();
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
    function visible(){ return $$('.card',st).filter(function(c){return !c.classList.contains('hide')}); }
    function mark(){
      var mid=st.getBoundingClientRect().left+st.clientWidth/2, best=null, bd=1e9;
      visible().forEach(function(c){
        var r=c.getBoundingClientRect(), d=Math.abs(r.left+r.width/2-mid);
        if(d<bd){bd=d;best=c;}
      });
      $$('.card',st).forEach(function(c){ c.classList.toggle('is-active',c===best); });
      var vs=visible(), i=vs.indexOf(best);
      $$('i',sdots).forEach(function(d,n){ d.classList.toggle('on',n===i); });
    }
    function centre(c,instant){
      st.scrollTo({left:c.offsetLeft-(st.clientWidth-c.offsetWidth)/2,
                   behavior:instant?'auto':'smooth'});
    }
    function rest(instant){
      var vs=visible(); if(!vs.length) return;
      centre(vs.length>2?vs[1]:vs[0],instant);
      setTimeout(mark,instant?0:220);
    }
    function dots(){
      sdots.innerHTML='';
      visible().forEach(function(c){
        var d=document.createElement('i');
        d.addEventListener('click',function(){ centre(c); });
        sdots.appendChild(d);
      });
      mark();
    }
    st.addEventListener('scroll',function(){ clearTimeout(st._t); st._t=setTimeout(mark,60); },{passive:true});
    $$('.card',st).forEach(function(c){
      c.addEventListener('click',function(e){ if(e.target.closest('a')) return; centre(c); });
    });
    function move(dir){
      var vs=visible(), cur=vs.findIndex(function(c){return c.classList.contains('is-active')});
      var nx=vs[Math.min(vs.length-1,Math.max(0,cur+dir))];
      if(nx) centre(nx);
    }
    $('#svcPrev').addEventListener('click',function(){ move(-1); });
    $('#svcNext').addEventListener('click',function(){ move(1); });
    $$('.fbtn').forEach(function(b){
      b.addEventListener('click',function(){ setTimeout(function(){ dots(); rest(); },30); });
    });
    window.addEventListener('resize',function(){ mark(); });
    dots();
    /* open on a centred, enlarged card rather than a flat row */
    requestAnimationFrame(function(){ rest(true); });
    window.addEventListener('load',function(){ rest(true); });
  }

  /* station map interaction */
  var out=$('#mapout');
  $$('.netmap .stn').forEach(function(g){
    function show(){
      $$('.netmap .stn').forEach(function(x){x.classList.remove('on')});
      g.classList.add('on');
      out.innerHTML='<b>'+g.dataset.n+'</b><span>'+Number(g.dataset.d).toLocaleString('en-US')+
        ' km from base · '+g.querySelector('.code').textContent+
        ({eu:' · Europe',cis:' · CIS',me:' · Middle East'}[g.dataset.r]||'')+'</span>';
    }
    g.addEventListener('pointerenter',show); g.addEventListener('focus',show);
    g.addEventListener('click',show);
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
  addEventListener('scroll',function(){
    if(innerWidth<900) return;
    var y=scrollY;
    if(plane) plane.style.transform='translateY('+(y*0.09)+'px)';
    blobs.forEach(function(b,i){ b.style.translate='0 '+(y*(i?0.05:-0.04))+'px'; });
  },{passive:true});

  /* theme */
  var root=document.documentElement, tg=$('#theme');
  function setTheme(t){
    root.dataset.theme=t;
    try{ localStorage.setItem('cis-theme',t); }catch(e){}
  }
  var saved=null; try{ saved=localStorage.getItem('cis-theme'); }catch(e){}
  setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  tg.addEventListener('click',function(){ setTheme(root.dataset.theme==='dark'?'light':'dark'); });

  var nums=$$('.stats b, .anums b, .tbig');
  var io2=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      io2.unobserve(e.target);
      var el=e.target, txt=el.textContent, m=txt.match(/[\d,]+/);
      if(!m) return;
      var end=parseInt(m[0].replace(/,/g,''),10), pre=txt.slice(0,m.index), post=txt.slice(m.index+m[0].length);
      var t0=null, dur=1100;
      function tick(ts){
        if(!t0) t0=ts;
        var k=Math.min(1,(ts-t0)/dur), v=Math.round(end*(1-Math.pow(1-k,3)));
        el.textContent=pre+v.toLocaleString('en-US')+post;
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
      var vs=[].slice.call(t.querySelectorAll('.card:not(.hide)')), c=vs[1]||vs[0];
      if(c){ c.classList.add('is-active'); t.scrollLeft=c.offsetLeft-(t.clientWidth-c.offsetWidth)/2; }
    }
  },1500);
})();
