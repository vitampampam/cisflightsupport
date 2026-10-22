/* OPTIONAL server-side wind adapter for the CIS trip estimator.
   Deploy as a Cloudflare Worker with a PAID commercial Open-Meteo API license.
   Set secrets WEATHER_API_KEY and SITE_ORIGIN via Cloudflare configuration.
   Do not publish the key or call the free non-commercial API from the website.
   Weather is approximated from a few points at pressure altitude, NOT a
   winds-aloft flight-planning solution and NOT safe for operational use.
*/
export default {
  async fetch(request, env) {
    const origin=String(env.SITE_ORIGIN||'').replace(/\/$/,'');
    if(!origin||!env.WEATHER_API_KEY)return new Response('Wind provider not configured',{status:503});
    const cors={'Access-Control-Allow-Origin':origin,'Vary':'Origin'};
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
    if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:cors});
    const u=new URL(request.url);
    if(u.pathname!=='/api/trip-winds')return new Response('Not found',{status:404,headers:cors});
    const n=k=>Number(u.searchParams.get(k));
    const y1=n('lat1'),x1=n('lon1'),y2=n('lat2'),x2=n('lon2');
    if(![y1,x1,y2,x2].every(Number.isFinite)||[y1,y2].some(v=>Math.abs(v)>90)||[x1,x2].some(v=>Math.abs(v)>180))
      return new Response('Invalid coordinates',{status:400,headers:cors});
    const date=u.searchParams.get('departure'),backDate=u.searchParams.get('return_date')||date;
    if(!/^\d{4}-\d\d-\d\d$/.test(date||'')||!/^\d{4}-\d\d-\d\d$/.test(backDate||''))
      return new Response('Invalid date',{status:400,headers:cors});
    const today=new Date().toISOString().slice(0,10);
    const day=d=>Date.parse(d+'T12:00:00Z');
    const now=day(today),futureMax=now+13*86400000;
    if([date,backDate].some(d=>!Number.isFinite(day(d))||day(d)<now||day(d)>futureMax))
      return new Response('Forecast date outside the 14-day window',{status:422,headers:cors});
    const points=[0.2,0.5,0.8].map(t=>({
      lat:y1+(y2-y1)*t,lon:x1+(x2-x1)*t
    }));
    const url=new URL('https://customer-api.open-meteo.com/v1/forecast');
    url.searchParams.set('apikey',env.WEATHER_API_KEY);
    url.searchParams.set('latitude',points.map(p=>p.lat.toFixed(4)).join(','));
    url.searchParams.set('longitude',points.map(p=>p.lon.toFixed(4)).join(','));
    url.searchParams.set('hourly','wind_speed_250hPa,wind_direction_250hPa,wind_speed_300hPa,wind_direction_300hPa');
    url.searchParams.set('wind_speed_unit','kn');
    url.searchParams.set('timezone','UTC');
    url.searchParams.set('start_date',date<backDate?date:backDate);
    url.searchParams.set('end_date',date>backDate?date:backDate);
    const reply=await fetch(url.toString(),{cf:{cacheTtl:900,cacheEverything:true}});
    if(!reply.ok)return new Response('Wind forecast provider unavailable',{status:503,headers:cors});
    const json=await reply.json();const responses=Array.isArray(json)?json:[json];
    if(responses.length!==points.length)return new Response('Incomplete forecast',{status:502,headers:cors});
    const bearing=(ya,xa,yb,xb)=>{
      const r=Math.PI/180,dx=(xb-xa)*r;
      const Y=Math.sin(dx)*Math.cos(yb*r);
      const X=Math.cos(ya*r)*Math.sin(yb*r)-Math.sin(ya*r)*Math.cos(yb*r)*Math.cos(dx);
      return (Math.atan2(Y,X)*180/Math.PI+360)%360;
    };
    function component(date,reverse){
      const heading=bearing(reverse?y2:y1,reverse?x2:x1,reverse?y1:y2,reverse?x1:x2);
      const values=responses.map(entry=>{
        const h=entry.hourly||{},idx=(h.time||[]).indexOf(date+'T12:00');
        if(idx<0)return NaN;
        const pair=[250,300].map(level=>{
          const speed=Number((h['wind_speed_'+level+'hPa']||[])[idx]);
          const from=Number((h['wind_direction_'+level+'hPa']||[])[idx]);
          if(!Number.isFinite(speed)||!Number.isFinite(from))return NaN;
          // Weather wind direction is where wind comes FROM. A tailwind
          // points in the same direction as aircraft heading.
          return -speed*Math.cos((from-heading)*Math.PI/180);
        });
        return pair.every(Number.isFinite)?(pair[0]+pair[1])/2:NaN;
      });
      return values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0)/values.length:NaN;
    }
    const out=component(date,false),back=component(backDate,true);
    if(!Number.isFinite(out)||!Number.isFinite(back))return new Response('Forecast not available for requested hours',{status:422,headers:cors});
    return Response.json({outbound_tailwind_kt:Math.round(out),return_tailwind_kt:Math.round(back),
      provider:'Open-Meteo commercial forecast, approximate 250/300 hPa winds (12:00 UTC)',
      valid_date:date,attribution:'Weather data: Open-Meteo / originating weather services'},
      {headers:{...cors,'Cache-Control':'public,max-age=900'}});
  }
};
