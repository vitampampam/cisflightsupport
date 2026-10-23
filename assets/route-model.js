/* Advisory route-distance geometry for a PUBLIC cost estimator.
   Not AIRAC, NOT an ATS airway graph, NOT NOTAM-aware and NEVER a flight plan.
   Source: airports.json coordinates and coarse restricted polygons in routing.json.
*/
(function (global) {
  'use strict';
  var EARTH_NM = 3440.065;
  function rad(d) { return d * Math.PI / 180; }
  function distance(a,b) {
    var y1=rad(a.y), y2=rad(b.y), dy=y2-y1, dx=rad(b.x-a.x);
    var h=Math.sin(dy/2)**2+Math.cos(y1)*Math.cos(y2)*Math.sin(dx/2)**2;
    return 2*EARTH_NM*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function point(rings,y,x) {
    for (var k=0;k<rings.length;k++) {
      var ring=rings[k],inside=false;
      for(var i=0,j=ring.length-1;i<ring.length;j=i++) {
        var a=ring[i],b=ring[j];
        if ((a[0]>y)!==(b[0]>y) && x<(b[1]-a[1])*(y-a[0])/(b[0]-a[0])+a[1])inside=!inside;
      }
      if(inside)return true;
    }
    return false;
  }
  function spherical(a,b,t) {
    var y1=rad(a.y),x1=rad(a.x),y2=rad(b.y),x2=rad(b.x);
    var omega=distance(a,b)/EARTH_NM;
    if(omega<0.000001)return {y:a.y,x:a.x};
    var aa=Math.sin((1-t)*omega)/Math.sin(omega),bb=Math.sin(t*omega)/Math.sin(omega);
    var X=aa*Math.cos(y1)*Math.cos(x1)+bb*Math.cos(y2)*Math.cos(x2);
    var Y=aa*Math.cos(y1)*Math.sin(x1)+bb*Math.cos(y2)*Math.sin(x2);
    var Z=aa*Math.sin(y1)+bb*Math.sin(y2);
    return {y:Math.atan2(Z,Math.hypot(X,Y))*180/Math.PI,x:Math.atan2(Y,X)*180/Math.PI};
  }
  function obstacle(point, restricted) {
    return restricted.some(function(r){return pointInside(r,point.y,point.x);});
  }
  function pointInside(r,lat,lon) {
    if(!r._bounds)r._bounds=r.rings.map(function(ring){
      var ys=ring.map(function(p){return p[0]}),xs=ring.map(function(p){return p[1]});
      return {minY:Math.min.apply(null,ys),maxY:Math.max.apply(null,ys),minX:Math.min.apply(null,xs),maxX:Math.max.apply(null,xs)};
    });
    for(var j=0;j<r._bounds.length;j++){
      var b=r._bounds[j];
      if(lat>=b.minY && lat<=b.maxY && lon>=b.minX && lon<=b.maxX && point([r.rings[j]],lat,lon))return true;
    }
    return false;
  }
  function clear(a,b, restricted) {
    var n=Math.max(1,Math.ceil(distance(a,b)/14));
    for(var i=0;i<=n;i++)if(obstacle(spherical(a,b,i/n),restricted))return false;
    return true;
  }
  function crossed(a,b,restricted) {
    var n=Math.max(2,Math.ceil(distance(a,b)/15)),hit={};
    for(var i=0;i<=n;i++){
      var p=spherical(a,b,i/n);
      restricted.forEach(function(r){if(pointInside(r,p.y,p.x))hit[r.id]=r.name;});
    }
    return Object.keys(hit).map(function(id){return {id:id,name:hit[id]};});
  }
  function pathLength(path) {var n=0;for(var i=1;i<path.length;i++)n+=distance(path[i-1],path[i]);return n;}
  function geometricDetour(a,b,restricted) {
    // Constrain the search to a local corridor. The grid is approximate geometry,
    // not a published waypoint/airway network. No routing near the date line/poles.
    if (Math.abs(a.x-b.x)>170 || Math.max(Math.abs(a.y),Math.abs(b.y))>74 || distance(a,b)>4000)
      return null;
    var step=1.5, ymin=Math.max(-75,Math.min(a.y,b.y)-18), ymax=Math.min(75,Math.max(a.y,b.y)+12);
    var xmin=Math.max(-180,Math.min(a.x,b.x)-12),xmax=Math.min(180,Math.max(a.x,b.x)+12);
    var cols=Math.ceil((xmax-xmin)/step)+1, rows=Math.ceil((ymax-ymin)/step)+1;
    if(cols*rows>8500)return null;
    var nodes=[],byId={},neighbors=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for(var i=0;i<rows;i++)for(var j=0;j<cols;j++){
      var p={y:ymin+i*step,x:xmin+j*step,i:i,j:j,id:i*cols+j};
      if(!obstacle(p,restricted)){nodes.push(p);byId[p.id]=p;}
    }
    var sid=-1,tid=-2,start={y:a.y,x:a.x,id:sid},target={y:b.y,x:b.x,id:tid};
    // Connect actual airports to all unobstructed nodes within 240nm (no snapping
    // across a closed region) and apply shortest-path search over coarse grid.
    var startEdges=nodes.filter(function(p){return distance(a,p)<240 && clear(a,p,restricted)});
    var endEdges=nodes.filter(function(p){return distance(b,p)<240 && clear(b,p,restricted)});
    if(!startEdges.length||!endEdges.length)return null;
    var endSet={};endEdges.forEach(function(p){endSet[p.id]=true});
    var open=[start],g={};g[sid]=0;var visited={},parent={},checks=0;
    while(open.length && checks++<12000){
      var best=0,bestf=Infinity;
      for(var k=0;k<open.length;k++){
        var f=g[open[k].id]+distance(open[k],target);
        if(f<bestf){bestf=f;best=k;}
      }
      var cur=open.splice(best,1)[0];if(visited[cur.id])continue;
      visited[cur.id]=true;
      if(cur.id===tid){
        var chain=[],at=cur;
        while(at){chain.push({y:at.y,x:at.x});at=parent[at.id];}
        chain.reverse();return {path:chain,nm:pathLength(chain),method:'geometric restricted-airspace detour'};
      }
      var next=[];
      if(cur.id===sid)next=startEdges;
      else if(cur.id!==tid){
        for(var k=0;k<neighbors.length;k++){
          var ii=cur.i+neighbors[k][0],jj=cur.j+neighbors[k][1];
          if(ii<0||jj<0||ii>=rows||jj>=cols)continue;
          var p=byId[ii*cols+jj];if(p && clear(cur,p,restricted))next.push(p);
        }
        if(endSet[cur.id])next.push(target);
      }
      next.forEach(function(p){
        var ng=g[cur.id]+distance(cur,p);
        if((g[p.id]===undefined||ng<g[p.id])&&!visited[p.id]){
          g[p.id]=ng;parent[p.id]=cur;open.push(p);
        }
      });
    }
    return null;
  }
  function estimate(a,b,restricted) {
    var direct=distance(a,b), active=restricted||[];
    var endpoints=active.filter(function(r){return pointInside(r,a.y,a.x)||pointInside(r,b.y,b.x)});
    if(endpoints.length)return {direct:direct,blocked:endpoints,method:'unavailable',path:[a,b]};
    var hit=crossed(a,b,active);
    if(!hit.length)return {direct:direct,detour:0,nm:direct,hit:[],path:[a,b],method:'direct geometry; en-route allowances separate'};
    var geo=geometricDetour(a,b,active);
    if(!geo){
      /* The coarse grid deliberately stops at 4,000 nm and cannot solve
         some shorter corridors. Do not incorrectly classify those commercial
         journeys as impossible. For public price estimates only, apply an
         explicitly non-operational bypass allowance; this is NOT a plotted
         airway, a restriction clearance, or evidence of route feasibility. */
      var factor=1+Math.min(.30,.09+.035*hit.length);
      var estimated=direct*factor;
      return {direct:direct,nm:estimated,detour:estimated-direct,hit:hit,
        approximate:true,method:'indicative non-operational avoidance allowance',
        path:[a,b]};
    }
    geo.direct=direct;geo.detour=Math.max(0,geo.nm-direct);geo.hit=hit;
    return geo;
  }
  global.CisRouteModel={distance:distance,crossed:crossed,estimate:estimate,clear:clear};
})(typeof window==='undefined'?globalThis:window);
