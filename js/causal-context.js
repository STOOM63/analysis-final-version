window.AU = window.AU || {};

AU.causalContext = (() => {
  const U = () => AU.util;
  const DAY = 86400000;
  const MONTHS = {
    janvier:0,fevrier:1,mars:2,avril:3,mai:4,juin:5,juillet:6,aout:7,septembre:8,octobre:9,novembre:10,decembre:11
  };
  const WEEKDAYS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

  function clamp(v,a=0,b=100){ return Math.max(a,Math.min(b,v)); }
  function n(v){ return U().normText(v || '').toLowerCase(); }
  function pct(a,b){ return b ? (a-b)/Math.abs(b) : null; }
  function sum(rows,key){ return U().sum(rows.map(x=>Number(typeof key==='function'?key(x):x[key])||0)); }
  function escRe(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  function parseIso(value){
    if(!value) return null;
    const s=String(value).trim();
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m){ const d=new Date(+m[1],+m[2]-1,+m[3]); return Number.isNaN(d.getTime())?null:d; }
    const d=new Date(s); return Number.isNaN(d.getTime())?null:d;
  }

  function monthIndex(word){ return MONTHS[n(word)] ?? null; }
  function lastDay(year,month){ return new Date(year,month+1,0).getDate(); }
  function dateFromParts(day,month,year){
    const mi=monthIndex(month); if(mi===null||!year) return null;
    const d=new Date(+year,mi,+day); return Number.isNaN(d.getTime())?null:d;
  }
  function monthBoundary(month,year,end=false){
    const mi=monthIndex(month); if(mi===null||!year) return null;
    return new Date(+year,mi,end?lastDay(+year,mi):1);
  }

  function extractDatesFromText(text){
    const raw=String(text||''); const s=n(raw);
    let start=null,end=null,precision='unknown';
    const month='(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)';
    let m;
    // du 4 mai 2026 au 31 mars 2027
    m=s.match(new RegExp(`(?:du|de)\\s+(\\d{1,2})\\s+${month}\\s+(20\\d{2})\\s+(?:au|a)\\s+(\\d{1,2})\\s+${month}\\s+(20\\d{2})`));
    if(m){ start=dateFromParts(m[1],m[2],m[3]); end=dateFromParts(m[4],m[5],m[6]); precision='day'; return {start,end,precision}; }
    // nuit du 26 au 27 août 2026
    m=s.match(new RegExp(`(?:nuit\\s+)?(?:du|de)\\s+(\\d{1,2})\\s+(?:au|a)\\s+(\\d{1,2})\\s+${month}\\s+(20\\d{2})`));
    if(m){ start=dateFromParts(m[1],m[3],m[4]); end=dateFromParts(m[2],m[3],m[4]); precision='day'; return {start,end,precision}; }
    // du 4 mai 2026 à juin 2027
    m=s.match(new RegExp(`(?:du|de)\\s+(\\d{1,2})\\s+${month}\\s+(20\\d{2})\\s+(?:au|a)\\s+${month}\\s+(20\\d{2})`));
    if(m){ start=dateFromParts(m[1],m[2],m[3]); end=monthBoundary(m[4],m[5],true); precision='month-end'; return {start,end,precision}; }
    // du 4 mai au 25 septembre 2026
    m=s.match(new RegExp(`(?:du|de)\\s+(\\d{1,2})\\s+${month}\\s+(?:au|a)\\s+(\\d{1,2})\\s+${month}\\s+(20\\d{2})`));
    if(m){ start=dateFromParts(m[1],m[2],m[5]); end=dateFromParts(m[3],m[4],m[5]); precision='day'; return {start,end,precision}; }
    // du 31 août au 19 septembre 2026 (same regex above)
    // du 1er juin à septembre 2026 / de début juin à octobre 2026
    m=s.match(new RegExp(`(?:du|de)\\s+(?:debut\\s+)?(\\d{1,2}|1er)?\\s*${month}\\s+(?:au|a)\\s+${month}\\s+(20\\d{2})`));
    if(m){ const d=m[1]&&/^\\d/.test(m[1])?parseInt(m[1],10):1; start=dateFromParts(d,m[2],m[4]); end=monthBoundary(m[3],m[4],true); precision='month-end'; return {start,end,precision}; }
    // à partir du 8 juin jusqu'en septembre 2026
    m=s.match(new RegExp(`(?:a partir du|a compter du)\\s+(\\d{1,2})\\s+${month}(?:\\s+(20\\d{2}))?.*?(?:jusqu[' ]?en|jusqu[' ]?a)\\s+${month}\\s+(20\\d{2})`));
    if(m){ const year=m[3]||m[5]; start=dateFromParts(m[1],m[2],year); end=monthBoundary(m[4],m[5],true); precision='month-end'; return {start,end,precision}; }
    // à partir du 17 août 2026 pour environ un mois
    m=s.match(new RegExp(`(?:a partir du|a compter du)\\s+(\\d{1,2})\\s+${month}\\s+(20\\d{2})`));
    if(m){ start=dateFromParts(m[1],m[2],m[3]); const oneMonth=/environ un mois|pour un mois/.test(s); end=oneMonth?new Date(start.getTime()+30*DAY):null; precision=oneMonth?'approx-month':'start-only'; return {start,end,precision}; }
    // jusqu'au 28 août 2026
    m=s.match(new RegExp(`(?:jusqu[' ]?au|jusqu[' ]?a)\\s+(\\d{1,2})\\s+${month}\\s+(20\\d{2})`));
    if(m){ end=dateFromParts(m[1],m[2],m[3]); precision='end-only'; return {start,end,precision}; }
    // jusqu'à août 2026
    m=s.match(new RegExp(`(?:jusqu[' ]?a|jusqu[' ]?en)\\s+${month}\\s+(20\\d{2})`));
    if(m){ end=monthBoundary(m[1],m[2],true); precision='end-month'; return {start,end,precision}; }
    // generic exact date in text
    const dates=[...s.matchAll(new RegExp(`(\\d{1,2})\\s+${month}\\s+(20\\d{2})`,'g'))];
    if(dates.length){ start=dateFromParts(dates[0][1],dates[0][2],dates[0][3]); if(dates.length>1) end=dateFromParts(dates[1][1],dates[1][2],dates[1][3]); precision=dates.length>1?'day':'single-date'; }
    return {start,end,precision};
  }

  function workSeverity(work){
    const t=n(`${work.place||''} ${work.text||''}`);
    let score=35; let reason='chantier signalé';
    const tests=[
      [/fermeture complete|route barree|circulation totalement coupee|axe principal.*fermeture/,95,'fermeture / route barrée'],
      [/deviation|deviation/,86,'déviation'],
      [/sens unique|alternat|circulation alternee/,78,'circulation contrainte'],
      [/stationnement.*supprime|places.*supprime/,72,'stationnement réduit'],
      [/circulation perturbee|circulation adaptee|perturbations de circulation/,62,'circulation perturbée'],
      [/travaux|chantier|amenagement|reseaux|inspire/,48,'travaux / aménagement']
    ];
    for(const [re,s,r] of tests) if(re.test(t) && s>score){score=s;reason=r;}
    if(/principalement de nuit|entre 21h|de nuit/.test(t)) score=Math.max(20,Math.round(score*0.55));
    return {score,reason};
  }

  function normalizeWork(w){
    const explicitStart=parseIso(w.start||w.start_date||w.date_debut);
    const explicitEnd=parseIso(w.end||w.end_date||w.date_fin||(!w.active?w.observed_end:null));
    const inferred=extractDatesFromText(`${w.text||''} ${w.place||''}`);
    const sev=workSeverity(w);
    return {...w,startDate:explicitStart||inferred.start,endDate:explicitEnd||inferred.end,datePrecision:(explicitStart||explicitEnd)?'structured':inferred.precision,severity:sev.score,severityReason:sev.reason,sourceTrust:w.source_type==='clermont_api'?0.95:w.source_type==='official_page'?0.82:0.65};
  }

  function overlaps(work,window){
    if(!window) return false;
    const s=work.startDate, e=work.endDate;
    if(s&&e) return s<=window.end && e>=window.start;
    if(s) return s<=window.end && U().daysBetween(s,window.end)<=180;
    if(e) return e>=window.start && U().daysBetween(window.start,e)<=180;
    return true; // current official context without machine-readable date: weak compatibility only
  }

  function nearestDays(date, work){
    if(!date) return null;
    const candidates=[work.startDate,work.endDate].filter(Boolean).map(d=>Math.abs(U().daysBetween(d,date)));
    return candidates.length?Math.min(...candidates):null;
  }

  function eventTimingScore(work, targetDate, currentWindow){
    if(!targetDate){ return overlaps(work,currentWindow)?45:0; }
    const d=nearestDays(targetDate,work);
    if(d===null) return overlaps(work,currentWindow)?35:0;
    if(d<=3) return 100; if(d<=7) return 90; if(d<=14) return 76; if(d<=30) return 55; if(overlaps(work,currentWindow)) return 40; return 0;
  }

  function aggregateTx(txs,metric='ca'){
    const ca=sum(txs,x=>x.ttc), margin=sum(txs,x=>x.margin);
    return {ca,margin,visits:txs.length,clients:new Set(txs.map(x=>x.clientCode).filter(Boolean)).size};
  }
  function aggregateLines(lines,metric='ca'){
    return {ca:sum(lines,x=>x.saleTTC),margin:sum(lines,x=>x.margin),visits:new Set(lines.map(x=>x.transactionKey)).size,clients:new Set(lines.map(x=>x.clientCode).filter(Boolean)).size};
  }

  function weekdayFromFinding(f){
    const title=n(f.title); for(let i=0;i<WEEKDAYS.length;i++) if(title.startsWith(n(WEEKDAYS[i]))) return i; return null;
  }

  function scopeForFinding(model,f,windows){
    const cur=windows.current, prev=windows.previous;
    const base={kind:'transactions',metric:f.category==='margin'?'margin':'ca',filterLabel:'ensemble du magasin',current:[],previous:[]};
    let txFilter=()=>true, lineFilter=()=>true, useLines=false;
    const entity=(f.entities||[])[0];
    if(f.category==='rayon' && entity?.key){ useLines=true; lineFilter=l=>(l.effectiveRayon||'NON CLASSE')===entity.key; base.filterLabel=`rayon ${entity.label||entity.key}`; }
    else if(f.category==='product' && entity?.key){ useLines=true; lineFilter=l=>l.articleCode===entity.key; base.filterLabel=`produit ${entity.label||entity.key}`; }
    else if(f.category==='family'){
      useLines=true; const label=String(f.title||'').split(':')[0]; const parts=label.split('·').map(x=>x.trim());
      if(parts.length>=2){ lineFilter=l=>(l.effectiveRayon||'Non classé')===parts[0] && (l.effectiveFamille||'Non classée')===parts[1]; base.filterLabel=`famille ${label}`; }
    }
    else if(f.category==='returns'){ useLines=true; lineFilter=l=>l.isReturn||l.qty<0; base.filterLabel='retours'; }
    else if(f.category==='vendor'){
      const vendor=String(f.title||'').replace(/^Contribution brute vendeur\s*:\s*/i,'').replace(/\s+[+-].*$/,'').trim(); txFilter=t=>(t.vendor||'')===vendor; base.filterLabel=`tickets ${vendor}`;
    }
    else if(f.category==='traffic'){
      const wd=weekdayFromFinding(f); if(wd!==null){txFilter=t=>t.date?.getDay()===wd;base.filterLabel=WEEKDAYS[wd];}
    }
    else if(f.id==='high-risk-customers'){
      const codes=new Set(model.customers.filter(c=>c.risk?.key==='high').map(c=>c.client.codeClient)); txFilter=t=>codes.has(t.clientCode);base.filterLabel='clients à risque élevé';
    }
    else if(f.id==='customer-movement'){
      const codes=model.intelligence?.metrics?.movement?.absentCodes || new Set(); txFilter=t=>codes.has(t.clientCode);base.filterLabel='clients présents avant et absents récemment';
    }
    if(useLines){
      base.kind='lines'; base.current=model.sales.filter(l=>U().inRange(l.date,cur.start,cur.end)&&lineFilter(l)); base.previous=model.sales.filter(l=>U().inRange(l.date,prev.start,prev.end)&&lineFilter(l));
    } else {
      base.current=model.transactions.filter(t=>U().inRange(t.date,cur.start,cur.end)&&txFilter(t)); base.previous=model.transactions.filter(t=>U().inRange(t.date,prev.start,prev.end)&&txFilter(t));
    }
    return base;
  }

  function geoDeltas(scope){
    const cur=U().groupBy(scope.current,x=>x.geo?.zone||'Zone inconnue');
    const prev=U().groupBy(scope.previous,x=>x.geo?.zone||'Zone inconnue');
    const keys=new Set([...cur.keys(),...prev.keys()]); const rows=[];
    for(const zone of keys){
      if(zone==='Zone inconnue') continue;
      const a=scope.kind==='lines'?aggregateLines(cur.get(zone)||[]):aggregateTx(cur.get(zone)||[]);
      const b=scope.kind==='lines'?aggregateLines(prev.get(zone)||[]):aggregateTx(prev.get(zone)||[]);
      const av=scope.metric==='margin'?a.margin:a.ca, bv=scope.metric==='margin'?b.margin:b.ca;
      rows.push({zone,current:a,previous:b,delta:av-bv,trend:pct(av,bv),currentValue:av,previousValue:bv});
    }
    rows.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)); return rows;
  }

  function restDelta(model, zoneName, windows, metric='ca'){
    const select=(w)=>model.transactions.filter(t=>U().inRange(t.date,w.start,w.end)&&t.geo?.zone!==zoneName);
    const a=aggregateTx(select(windows.current)),b=aggregateTx(select(windows.previous));
    const av=metric==='margin'?a.margin:a.ca,bv=metric==='margin'?b.margin:b.ca; return pct(av,bv);
  }

  function geoSignal(model,scope,windows,direction){
    const rows=geoDeltas(scope);
    const relevant=rows.filter(r=>direction<0?r.delta<0:r.delta>0);
    const totalAbs=relevant.reduce((s,r)=>s+Math.abs(r.delta),0)||1;
    const top=relevant.slice(0,3).map(r=>{
      const z=model.geoIntelligence?.zones?.find(x=>x.name===r.zone);
      const rest=restDelta(model,r.zone,windows,scope.metric);
      return {...r,share:Math.abs(r.delta)/totalAbs,geo:z||null,restTrend:rest,excess:r.trend!==null&&rest!==null?r.trend-rest:null,worksSector:z?.worksSector||null};
    });
    return {rows,top,concentration:top[0]?.share||0};
  }

  function recentRainShift(ctx,windows){
    const weather=ctx?.weather||[]; if(!weather.length) return null;
    const avgFor=w=>{const rows=weather.filter(x=>{const d=parseIso(x.date);return d&&U().inRange(d,w.start,w.end)});return rows.length?sum(rows,x=>x.precipitation_mm)/rows.length:null;};
    const a=avgFor(windows.current),b=avgFor(windows.previous); if(a===null||b===null)return null;
    return {current:a,previous:b,delta:a-b};
  }

  function competingSignals(model,f,scope,windows){
    const out=[];
    const h=n((f.hypotheses||[]).join(' '));
    if(/stock|rupture/.test(h)||f.category==='stock') out.push({key:'stock',label:'Stock / rupture',strength:65,evidence:'Un signal stock est déjà présent dans le diagnostic métier.'});
    if(/prix|prix unitaire/.test(h)) out.push({key:'price',label:'Prix',strength:60,evidence:'Une hausse de prix associée à une baisse de quantité est détectée.'});
    if(f.category==='calendar'||f.id==='calendar-mix') out.push({key:'calendar',label:'Saisonnalité / vacances',strength:65,evidence:'Le mix de jours vacances/hors vacances diffère entre les périodes.'});
    const rain=recentRainShift(model.publicContext,windows);
    const corr=model.contextCorrelation?.weather?.rainVisitsCorrelation;
    if(rain&&corr!==null&&Math.abs(corr)>=0.18&&Math.abs(rain.delta)>=1.5) out.push({key:'weather',label:'Météo',strength:clamp(45+Math.abs(corr)*50,45,80),evidence:`Pluie moyenne ${rain.current.toFixed(1)} mm/j récemment vs ${rain.previous.toFixed(1)} mm/j précédemment ; corrélation pluie/visites ${corr.toFixed(2)}.`});
    if(f.category==='margin'){
      const d=model.intelligence?.findings?.find(x=>x.id==='discount-shift'); if(d) out.push({key:'discount',label:'Remises / mix de marge',strength:65,evidence:d.summary});
    }
    return out.sort((a,b)=>b.strength-a.strength);
  }

  const ZONE_TERMS={
    'brezet / est commercial':['brezet','ernest cristal','jules verne','gutenberg','georges besse','newton','kepler','ampere','lavoisier'],
    'montferrand / republique':['montferrand','republique','carmes','clos four','salengro'],
    'estaing / michelin':['estaing','michelin','auger','union sovietique'],
    'la plaine / nord est':['la plaine','vergn','croix neyrat','chanturgue','flamina'],
    'pardieu / oradou':['pardieu','oradou'],
    'centre / jaude':['jaude','blatin','ballainvilliers','vercingetorix','desaix','delille','fontgieve','lagarlaye','malfreyt'],
    'est metropole':['aulnat','lempdes','pont du chateau','dalet','dallet','mur sur allier','martres','lussat','malintrat'],
    'nord metropole':['gerzat','cebazat','blanzat','chateaugay','nohanent','sayat'],
    'sud metropole':['aubiere','beaumont','ceyrat','cournon','le cendre','romagnat','perignat'],
    'ouest metropole':['chamalieres','durtol','orcines','royat','saint genes'],
    'clermont est / nord est 63100':['brezet','montferrand','estaing','la plaine','carmes','republique','michelin'],
    'clermont centre / sud 63000':['jaude','blatin','lagarlaye','oradou','pardieu','delille']
  };
  function zoneAffinity(zoneName,work){
    const zn=n(zoneName); const text=n(`${work.place||''} ${work.text||''}`); const terms=ZONE_TERMS[zn]||[];
    if(terms.some(t=>text.includes(t))) return 100;
    if(zn.includes('metropole')) return 58;
    if(zn.includes('clermont')||zn.includes('/') ) return 32;
    return 45;
  }

  function eventImpactAround(model, zone, work, metric='ca', direction=-1){
    const pivot=direction<0?work.startDate:work.endDate; if(!pivot) return null;
    const tx=model.transactions.filter(t=>t.geo?.zone===zone&&t.date);
    const days=14;
    const before={start:U().startOfDay(U().addDays(pivot,-days)),end:U().endOfDay(U().addDays(pivot,-1))};
    const after={start:U().startOfDay(pivot),end:U().endOfDay(U().addDays(pivot,days-1))};
    const a=aggregateTx(tx.filter(t=>U().inRange(t.date,after.start,after.end))),b=aggregateTx(tx.filter(t=>U().inRange(t.date,before.start,before.end)));
    if(a.visits<3||b.visits<3) return null;
    const av=metric==='margin'?a.margin:a.ca,bv=metric==='margin'?b.margin:b.ca;
    return {before:b,after:a,delta:pct(av,bv),visitDelta:pct(a.visits,b.visits),pivot,days};
  }

  function findWorks(model, zoneSignal, targetDate, windows, direction){
    const raw=[...(model.publicContext?.works_history||[]),...(model.publicContext?.works||[])];
    const seen=new Set(); const all=[];
    for(const item of raw){const k=item?.event_id||`${n(item?.sector)}|${n(item?.place)}|${n(item?.text).slice(0,180)}`;if(seen.has(k))continue;seen.add(k);all.push(normalizeWork(item));}
    if(!zoneSignal?.worksSector||zoneSignal.worksSector==='Hors secteurs Métropole') return [];
    return all.filter(w=>n(w.sector)===n(zoneSignal.worksSector) && (overlaps(w,windows.current)||nearestDays(targetDate,w)!==null))
      .map(w=>{
        const timing=eventTimingScore(w,targetDate,windows.current);
        const around=eventImpactAround(model,zoneSignal.zone,w,'ca',direction);
        const behavior=around?.delta===null||around?.delta===undefined?0:(direction<0?-around.delta:around.delta);
        const behaviorScore=around?clamp(50+behavior*120,15,100):35;
        const affinity=zoneAffinity(zoneSignal.zone,w);
        const score=clamp(timing*0.30+w.severity*0.20+w.sourceTrust*100*0.10+behaviorScore*0.20+affinity*0.20,0,100);
        return {...w,timingScore:timing,zoneAffinity:affinity,around,compatibility:Math.round(score)};
      }).sort((a,b)=>b.compatibility-a.compatibility).slice(0,6);
  }

  function targetDateForFinding(model,f,zoneSignal){
    if(zoneSignal?.geo?.changePoint?.date) return zoneSignal.geo.changePoint.date;
    const anomaly=f.id?.startsWith('anomaly-')?parseIso(f.id.replace('anomaly-','')):null;
    return anomaly||model.intelligence?.referenceDate||model.range?.max||null;
  }

  function testFinding(model,f){
    if(!f||f.category==='quality') return {tested:false,status:'not-applicable',score:0,label:'Non applicable',summary:'Contrôle contextuel non applicable à un diagnostic de qualité des données.',chain:[],works:[],alternatives:[]};
    const windows=model.intelligence?.windows||model.geoIntelligence?.windows; if(!windows?.current||!windows?.previous) return {tested:false,status:'unavailable',score:0,label:'Indisponible',summary:'Historique insuffisant pour tester le contexte urbain.',chain:[],works:[],alternatives:[]};
    const direction=(f.impactAmount||0)<0?-1:(f.level==='positive'||f.level==='opportunity'?1:-1);
    const scope=scopeForFinding(model,f,windows);
    if(scope.current.length+scope.previous.length<6) return {tested:true,status:'insufficient',score:0,label:'Échantillon insuffisant',summary:`Le test contexte a été exécuté mais ${scope.filterLabel} ne fournit pas assez d'observations comparables.`,chain:['Observation métier détectée','Test géographique lancé','Échantillon insuffisant'],works:[],alternatives:competingSignals(model,f,scope,windows)};
    const geo=geoSignal(model,scope,windows,direction);
    const top=geo.top[0];
    const targetDate=targetDateForFinding(model,f,top);
    const works=findWorks(model,top,targetDate,windows,direction);
    const best=works[0];
    const concentrationScore=clamp((geo.concentration-0.2)*125,0,100);
    const excessScore=top?.excess===null||top?.excess===undefined?25:clamp((direction<0?-top.excess:top.excess)*250,0,100);
    const sample=Math.min(100,((top?.current?.visits||0)+(top?.previous?.visits||0))*2.5);
    const workScore=best?.compatibility||0;
    const source=model.contextCorrelation?.source;
    const freshness=source?.stale?55:source?.apiOk?100:75;
    let score=clamp(concentrationScore*0.25+excessScore*0.22+workScore*0.38+sample*0.08+freshness*0.07,0,100);
    if(!best) score=Math.min(score,38);
    if(top?.geo?.impactScore>=70) score=clamp(score+6,0,100);
    const status=score>=78?'strong':score>=58?'moderate':score>=36?'weak':'none';
    const label={strong:'Compatibilité forte',moderate:'Compatibilité moyenne',weak:'Compatibilité faible',none:'Aucun signal travaux convaincant'}[status];
    const alternatives=competingSignals(model,f,scope,windows);
    const chain=[
      `Constat : ${f.title}`,
      `Segment testé : ${scope.filterLabel}`,
      top?`Zone la plus contributrice : ${top.zone} (${Math.round(top.share*100)} % du mouvement ${direction<0?'négatif':'positif'} géolocalisé).`:'Aucune zone contributrice dominante.',
      top?.excess!==null&&top?.excess!==undefined?`Écart zone / reste de la clientèle : ${top.excess>=0?'+':''}${(top.excess*100).toFixed(1)} points.`:'Écart aux zones témoins non calculable.',
      best?`Événement public le plus compatible : ${best.place||best.sector} — ${best.severityReason} — affinité géographique ${best.zoneAffinity}/100 — score événement ${best.compatibility}/100.`:'Aucun événement travaux suffisamment compatible trouvé dans le contexte disponible.'
    ];
    if(best?.around) chain.push(`${direction<0?'Après démarrage':'Autour de la fin'} de l'événement : CA zone ${best.around.delta>=0?'+':''}${(best.around.delta*100).toFixed(1)} %, visites ${best.around.visitDelta>=0?'+':''}${(best.around.visitDelta*100).toFixed(1)} % sur fenêtres de ${best.around.days} jours.`);
    const summary=status==='strong'
      ? `Les travaux / conditions d'accès constituent une explication contextuelle forte pour ce constat, surtout via ${top?.zone||'la zone dominante'}. Cela reste une attribution probabiliste, jamais une preuve absolue.`
      : status==='moderate'
        ? `Un effet travaux / mobilité est plausible mais n'explique pas seul le constat. Le moteur conserve aussi les explications concurrentes.`
        : status==='weak'
          ? `Le contexte travaux présente quelques coïncidences, mais elles sont trop faibles pour être retenues comme explication principale.`
          : `Le moteur a cherché un lien avec les travaux et n'a pas trouvé de signal suffisamment convaincant. Il privilégie les causes métier ou saisonnières.`;
    return {tested:true,status,score:Math.round(score),label,summary,scope:scope.filterLabel,targetDate,topZone:top?.zone||null,concentration:geo.concentration,zoneExcess:top?.excess??null,chain,works,alternatives,sourceFreshness:freshness};
  }

  function analyze(model,intel){
    const findings=intel?.findings||[]; const results=[];
    for(const f of findings){ const causal=testFinding(model,f); f.causal=causal; results.push({findingId:f.id,title:f.title,category:f.category,level:f.level,impactAmount:f.impactAmount||0,...causal}); }
    const tested=results.filter(x=>x.tested&&x.status!=='insufficient');
    const strong=tested.filter(x=>x.status==='strong'); const moderate=tested.filter(x=>x.status==='moderate');
    const explainedAmount=strong.reduce((s,x)=>s+Math.abs(x.impactAmount||0),0);
    const top=results.filter(x=>['strong','moderate'].includes(x.status)).sort((a,b)=>b.score-a.score||Math.abs(b.impactAmount)-Math.abs(a.impactAmount));
    const actions=top.slice(0,10).map(x=>({
      action:x.status==='strong'?`Suivre automatiquement le couple « ${x.title} » ↔ ${x.topZone||'zone concernée'} et vérifier l'évolution à chaque nouvel import.`:`Maintenir le contexte travaux comme hypothèse secondaire pour « ${x.title} » et tester les causes concurrentes.`,
      sourceTitle:`Contexte causal · ${x.title}`,confidence:x.score,level:x.status==='strong'?'warning':'info',external:false
    }));
    const byWork=new Map();
    for(const r of top){ for(const w of (r.works||[]).slice(0,2)){ const key=`${w.sector}|${w.place}|${w.text}`; if(!byWork.has(key))byWork.set(key,{work:w,diagnostics:[],maxScore:0}); const row=byWork.get(key);row.diagnostics.push(r.title);row.maxScore=Math.max(row.maxScore,r.score); } }
    const events=[...byWork.values()].sort((a,b)=>b.maxScore-a.maxScore).slice(0,12);
    return {generatedAt:new Date(),results,tested:tested.length,strong:strong.length,moderate:moderate.length,explainedAmount,top,events,actions,coverage:findings.length?tested.length/findings.filter(f=>f.category!=='quality').length:0};
  }

  function apply(model){
    const c=analyze(model,model.intelligence); model.causalContext=c;
    const intel=model.intelligence;
    if(intel){
      for(const f of intel.findings||[]){ if(f.causal?.score>=58) f.score=(f.score||0)+f.causal.score/8; }
      intel.findings.sort((a,b)=>(b.score||0)-(a.score||0));
      const seen=new Set(); const merged=[];
      for(const a of [...(c.actions||[]),...(intel.actions||[])]){ const k=n(a.action); if(!k||seen.has(k))continue;seen.add(k);merged.push(a); }
      intel.actions=merged.slice(0,30);
      if(c.strong||c.moderate){
        const line=`Couplage Clermont exécuté sur ${c.tested} diagnostic(s) : ${c.strong} compatibilité(s) forte(s), ${c.moderate} moyenne(s). Les travaux ne sont retenus que lorsqu'un signal géographique et temporel existe.`;
        intel.brief=[intel.brief?.[0]||'Analyse automatique terminée.',line,...(intel.brief||[]).slice(1)];
      }
    }
    return c;
  }

  function answer(model){
    const c=model.causalContext; if(!c) return {title:'Contexte causal indisponible',intro:'Le moteur n’a pas encore exécuté le couplage travaux.',items:[],extra:[]};
    return {
      title:'Travaux, circulation et causes contextuelles',
      intro:`${c.tested} diagnostic(s) métier ont été automatiquement testés contre le contexte Clermont : ${c.strong} compatibilité(s) forte(s), ${c.moderate} moyenne(s).`,
      items:c.top.slice(0,8).map(x=>({title:`${x.label} · ${x.title}`,text:x.summary,bullets:x.chain.slice(2,6),confidence:`${x.score} %`,quality:'signal contextuel'})),
      extra:c.events.slice(0,5).map(e=>`${e.work.place||e.work.sector} : relié à ${e.diagnostics.length} diagnostic(s), compatibilité maximale ${e.maxScore}/100.`)
    };
  }

  return {analyze,apply,testFinding,normalizeWork,answer};
})();
