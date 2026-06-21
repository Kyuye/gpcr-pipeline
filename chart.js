/* ============================================================
   SynBio SVG Chart Generator — v8.2
   3-tier panel system:
     ① GPCR-iTango: DARK/BLUE, LNC, ATG/AG bands, fold brackets
     ② Opto non-GPCR: DARK/BLUE, LNC, white bg, no fold
     ③ Non-opto: single bars, no LNC, no DARK/BLUE
   ============================================================ */

const GPCR_FULL_ORDER = [
  'CHRM1','CHRM2','CHRM3','CHRM4','CHRM5','HRH1','HRH2','HRH3',
  'HRH4','ADORA1','ADORA2A','ADORA2B','ADORA3','HTR1A','HTR2A','HTR4',
  'HTR2C','ADRA1B','ADRA2B','ADRA2C','ADRB2','Oxytocin','PACAP','GLP1'
];
const DISPLAY_NAME = { 'PACAP':'ADCYAP1', 'Oxytocin':'Oxytocin', 'GLP1':'GLP1R' };

let _isLab = false, _globalYMax = 0;
const HEADROOM_LAB = 1.5, HEADROOM_PAPER = 1.25;

function computeGlobalYMax(tableData, includeCtrl) {
  let m = 0;
  tableData.forEach(d => {
    Object.entries(d.conditions || {}).forEach(([cond, c]) => {
      if (!c) return;
      const isCtrl = cond.startsWith('control');
      if (isCtrl && !includeCtrl) return;
      if (typeof c.dark === 'number') m = Math.max(m, c.dark);
      if (typeof c.blue === 'number') m = Math.max(m, c.blue);
      if (typeof c.seap === 'number') m = Math.max(m, c.seap);
    });
  });
  return ceilYMax((m || 1) * HEADROOM_LAB);
}

function generateCombinedSVG(tableData, includeCtrl) {
  if (!tableData || !tableData.length) return '';
  const first = tableData[0];
  const chartType = !first.isOpto ? 'non-opto' : (first.optoSystem === 'gpcr' ? 'gpcr' : 'opto-other');
  const isNonOpto = (chartType === 'non-opto');
  const isGpcr = (chartType === 'gpcr');

  // Group by receptor key (one plasmid may have multiple platforms)
  const plasmidMap = {}, plasmidOrder = [];
  tableData.forEach(d => {
    if (!plasmidMap[d.receptor]) {
      plasmidMap[d.receptor] = {label: d.graphLabel || d.receptor, byPlat: {}};
      plasmidOrder.push(d.receptor);
    }
    plasmidMap[d.receptor].byPlat[d.platform] = d;
  });
  const nPlasmids = plasmidOrder.length;

  // Platforms present (canonical LNC order first)
  const platSet = new Set(); tableData.forEach(d => platSet.add(d.platform));
  const platforms = ['LNC1.0','LNC2.0'].filter(p => platSet.has(p));
  tableData.forEach(d => { if (!platforms.includes(d.platform)) platforms.push(d.platform); });
  if (!platforms.length) platforms.push('LNC1.0');

  // Conditions to display (sorted: control, antagonist*, agonist*)
  const condUnion = new Set();
  tableData.forEach(d => { Object.keys(d.conditions||{}).forEach(c => condUnion.add(c)); });
  const condCat = c => c.startsWith('control')?0 : c.startsWith('antagonist')?1 : c.startsWith('agonist')?2 : 3;
  let condList = [...condUnion].sort((a,b) => condCat(a)-condCat(b));
  if (!condList.length) condList = includeCtrl ? ['control','antagonist','agonist'] : ['antagonist','agonist'];
  const condDisplay = condList.filter(c => includeCtrl || !c.startsWith('control'));
  if (!condDisplay.length) condDisplay.push('agonist');

  // Bar sizing scales down as plasmid count grows
  const lightsPerCond = isNonOpto ? 1 : 2;
  const nBarsPerPlatform = condDisplay.length * lightsPerCond;
  const barW = nPlasmids <= 5 ? 4.5 : nPlasmids <= 10 ? 3.4 : nPlasmids <= 18 ? 2.6 : 2.0;
  const step = barW / 0.60;
  const platGap = platforms.length > 1 ? 2.5 : 0;
  const plasmidGap = 7;
  const plasmidPlotW = platforms.length * nBarsPerPlatform * step + (platforms.length - 1) * platGap;
  const plotW = nPlasmids * plasmidPlotW + (nPlasmids - 1) * plasmidGap;

  const ML = 26, MR = 10, MT = 14, MB = 44;
  const W = Math.max(120, ML + plotW + MR);
  const plotH = 65;
  const H = MT + plotH + MB;

  // Y max
  let maxVal = 0;
  tableData.forEach(d => {
    Object.entries(d.conditions||{}).forEach(([cond, c]) => {
      if (!c) return;
      if (cond.startsWith('control') && !includeCtrl) return;
      ['dark','blue','seap'].forEach(k => { if (typeof c[k] === 'number') maxVal = Math.max(maxVal, c[k]); });
    });
  });
  const ym = ceilYMax((maxVal||1) * HEADROOM_LAB);

  const pl = ML, pr = ML + plotW, pt = MT, pb = MT + plotH;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, sans-serif" style="background:#fff">
<defs>
  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5B9BD5"/><stop offset="100%" stop-color="#EDF4FB"/></linearGradient>
  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E8E8E8"/><stop offset="100%" stop-color="#333"/></linearGradient>
</defs>`;

  if (isGpcr) svg += renderLegendGpcr(W);
  else if (chartType === 'opto-other') svg += renderLegendOptoSimple(W);

  // Shared Y axis + grid
  svg += `<text x="${pl-18}" y="${(pt+pb)/2}" font-size="3.2" fill="#333" text-anchor="middle" transform="rotate(-90,${pl-18},${(pt+pb)/2})">SEAP (Vmax)</text>`;
  svg += `<line x1="${pl}" y1="${pt}" x2="${pl}" y2="${pb}" stroke="#333" stroke-width="0.2"/>`;
  svg += `<line x1="${pl}" y1="${pb}" x2="${pr}" y2="${pb}" stroke="#333" stroke-width="0.2"/>`;
  for (let i=0; i<=5; i++) {
    const v=(ym/5)*i, ty=pb-(i/5)*plotH;
    svg += `<text x="${pl-1.5}" y="${ty+0.7}" font-size="2.0" fill="#666" text-anchor="end">${v===0?'0':fmtYTick(v)}</text>`;
    if (i>0 && i<5) svg += `<line x1="${pl}" y1="${ty}" x2="${pr}" y2="${ty}" stroke="#e0e0e0" stroke-width="0.1"/>`;
  }

  // Per-plasmid groups
  plasmidOrder.forEach((recKey, pIdx) => {
    const plasmid = plasmidMap[recKey];
    const groupX = pl + pIdx * (plasmidPlotW + plasmidGap);
    const barXAt = (plIdx, wi) => groupX + plIdx * (nBarsPerPlatform * step + platGap) + wi * step;
    const barCXAt = (plIdx, wi) => barXAt(plIdx, wi) + step/2;

    // Background bands (gpcr only)
    if (isGpcr) {
      platforms.forEach((plat, pi) => {
        condDisplay.forEach((cond, ci) => {
          const cat = cond.startsWith('antagonist') ? 'atg' : cond.startsWith('agonist') ? 'ag' : null;
          if (!cat) return;
          const fill = cat === 'atg' ? '#EBEBEB' : '#F8DFB1';
          const sx = barXAt(pi, ci*lightsPerCond) - step*0.14;
          const sw = step*lightsPerCond + step*0.28;
          svg += `<rect x="${sx}" y="${pt}" width="${sw}" height="${plotH}" fill="${fill}"/>`;
        });
      });
    }

    // Platform dividers
    for (let p=1; p<platforms.length; p++) {
      const dx = barXAt(p, 0) - platGap/2;
      svg += `<line x1="${dx}" y1="${pt}" x2="${dx}" y2="${pb}" stroke="#BCBCBB" stroke-width="0.1" stroke-dasharray="0.8,0.5"/>`;
    }

    // Group divider (between plasmids)
    if (pIdx > 0) {
      const gx = groupX - plasmidGap/2;
      svg += `<line x1="${gx}" y1="${pt}" x2="${gx}" y2="${pb+1.2}" stroke="#9ca3af" stroke-width="0.15"/>`;
    }

    // Bars
    const topY = {};
    platforms.forEach((plat, pi) => {
      const d = plasmid.byPlat[plat];
      condDisplay.forEach((cond, ci) => {
        const c = d?.conditions?.[cond];
        if (isNonOpto) {
          const wi = ci, sv = c?.seap || 0;
          const bH = ym>0 ? (sv/ym)*plotH : 0;
          const x = barXAt(pi, wi) + (step-barW)/2;
          topY[`${pi}-${wi}`] = bH>0 ? (pb-bH) : pb;
          if (bH>0) svg += `<rect x="${x}" y="${pb-bH}" width="${barW}" height="${bH}" fill="url(#gB)" stroke="#444" stroke-width="0.1"/>`;
        } else {
          const wiD=ci*2, wiB=ci*2+1, dv=c?.dark||0, bv=c?.blue||0;
          const bHD = ym>0 ? (dv/ym)*plotH : 0;
          const bHB = ym>0 ? (bv/ym)*plotH : 0;
          const xD = barXAt(pi, wiD) + (step-barW)/2;
          const xB = barXAt(pi, wiB) + (step-barW)/2;
          topY[`${pi}-${wiD}`] = bHD>0 ? (pb-bHD) : pb;
          topY[`${pi}-${wiB}`] = bHB>0 ? (pb-bHB) : pb;
          if (bHD>0) svg += `<rect x="${xD}" y="${pb-bHD}" width="${barW}" height="${bHD}" fill="url(#gD)" stroke="#444" stroke-width="0.1"/>`;
          if (bHB>0) svg += `<rect x="${xB}" y="${pb-bHB}" width="${barW}" height="${bHB}" fill="url(#gB)" stroke="#444" stroke-width="0.1"/>`;
        }
      });
    });

    // Fold brackets
    const lvSpacing=4.0, lvOffset=2.5, foldFont=2.6;
    if (isGpcr) {
      platforms.forEach((plat, pi) => {
        const d = plasmid.byPlat[plat]; if (!d?.ratios) return;
        const ratios = d.ratios;
        const atgPos = condDisplay.findIndex(c => c.startsWith('antagonist'));
        const agPos  = condDisplay.findIndex(c => c.startsWith('agonist'));
        const ctrlPos= condDisplay.findIndex(c => c.startsWith('control'));
        const tD=atgPos>=0?atgPos*2:-1, tB=atgPos>=0?atgPos*2+1:-1;
        const aD=agPos>=0?agPos*2:-1, aB=agPos>=0?agPos*2+1:-1;
        const cD=ctrlPos>=0?ctrlPos*2:-1, cB=ctrlPos>=0?ctrlPos*2+1:-1;
        const pairs=[];
        if (tD>=0&&aB>=0) pairs.push({l:'AG-B/ATG-D',c:'#d32f2f',f:tD,t:aB});
        if (tB>=0&&aB>=0) pairs.push({l:'AG-B/ATG-B',c:'#1976d2',f:tB,t:aB});
        if (atgPos<0&&cD>=0&&aB>=0) pairs.push({l:'AG-B/CTRL-D',c:'#d32f2f',f:cD,t:aB});
        if (atgPos<0&&cB>=0&&aB>=0) pairs.push({l:'AG-B/CTRL-B',c:'#1976d2',f:cB,t:aB});
        if (aD>=0&&aB>=0) pairs.push({l:'AG-B/AG-D',c:'#388e3c',f:aD,t:aB});
        const gWis=[]; if(tD>=0)gWis.push(tD,tB); if(aD>=0)gWis.push(aD,aB); if(atgPos<0&&cD>=0)gWis.push(cD,cB);
        const gTop = gWis.length ? Math.min(...gWis.map(wi=>topY[`${pi}-${wi}`]??pb)) : pb;
        pairs.forEach((bp, idx) => {
          const r = ratios[bp.l]||0; if (!r) return;
          const by = gTop - lvOffset - idx*lvSpacing;
          const cf=barCXAt(pi,bp.f), ct=barCXAt(pi,bp.t);
          const yf=topY[`${pi}-${bp.f}`]??pb, yt=topY[`${pi}-${bp.t}`]??pb;
          svg += `<polyline points="${cf},${yf} ${cf},${by} ${ct},${by} ${ct},${yt}" fill="none" stroke="${bp.c}" stroke-width="0.15"/>`;
          const mx=(cf+ct)/2, fs=r>=100?Math.round(r)+'x':r.toFixed(1)+'x';
          svg += `<text x="${mx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="${foldFont}" fill="${bp.c}">${fs}</text>`;
        });
      });
    } else if (chartType === 'opto-other') {
      platforms.forEach((plat, pi) => {
        const d = plasmid.byPlat[plat]; if (!d) return;
        condDisplay.forEach((cond, ci) => {
          const c = d?.conditions?.[cond];
          const dv=c?.dark||0, bv=c?.blue||0;
          if (!dv || !bv) return;
          const fold=bv/dv, wiD=ci*2, wiB=ci*2+1;
          const cf=barCXAt(pi,wiD), ct=barCXAt(pi,wiB);
          const yf=topY[`${pi}-${wiD}`]??pb, yt=topY[`${pi}-${wiB}`]??pb;
          const by=Math.min(yf,yt) - lvOffset;
          svg += `<polyline points="${cf},${yf} ${cf},${by} ${ct},${by} ${ct},${yt}" fill="none" stroke="#1976d2" stroke-width="0.15"/>`;
          const mx=(cf+ct)/2, fs=fold>=100?Math.round(fold)+'x':fold.toFixed(1)+'x';
          svg += `<text x="${mx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="${foldFont}" fill="#1976d2">${fs}</text>`;
        });
      });
    }

    // X-axis bar labels (Dark/Blue mini-labels only when bar wide enough)
    const xLY = pb + 2.0;
    if (!isNonOpto && barW >= 3.0) {
      for (let pi=0; pi<platforms.length; pi++) {
        for (let wi=0; wi<nBarsPerPlatform; wi++) {
          svg += `<text x="${barCXAt(pi,wi)}" y="${xLY}" font-size="1.2" fill="#666" text-anchor="middle">${wi%2===0?'D':'B'}</text>`;
        }
      }
    }

    // Platform brackets + labels
    const platLY = (!isNonOpto && barW >= 3.0) ? xLY + 2.5 : xLY;
    platforms.forEach((plat, pi) => {
      const lL = barXAt(pi, 0) + step*0.1;
      const lR = barXAt(pi, nBarsPerPlatform-1) + step*0.9;
      svg += bracketDown(lL, lR, platLY - 0.5, 0.5);
      svg += `<text x="${(lL+lR)/2}" y="${platLY + 2.0}" font-size="1.6" fill="#333" text-anchor="middle">${plat}</text>`;
    });

    // Plasmid name centered under group (2-line via splitLabel)
    const plasmidLY = platLY + 5.0;
    const gcx = groupX + plasmidPlotW / 2;
    const lp = splitLabel(plasmid.label);
    svg += `<text x="${gcx}" y="${plasmidLY}" font-size="2.0" fill="#1a1a2e" text-anchor="middle" font-weight="600">${lp.line1}</text>`;
    if (lp.line2) svg += `<text x="${gcx}" y="${plasmidLY + 2.4}" font-size="2.0" fill="#1a1a2e" text-anchor="middle" font-weight="600">${lp.line2}</text>`;
  });

  svg += '</svg>';
  return svg;
}

function generateSVG(tableData, vizMode, ctrlMode, chartFormat) {
  const W = 210, ML = 7, MR = 7, MT = 9, MB = 3, GAP = 3.5, COLS = 4;
  const includeCtrl = (ctrlMode === 'include');
  _isLab = (chartFormat === 'lab-meeting');
  _globalYMax = _isLab ? computeGlobalYMax(tableData, includeCtrl) : 0;

  // Lab-meeting: single combined chart with shared X/Y axes
  if (_isLab) return generateCombinedSVG(tableData, includeCtrl);

  // Determine chart type from first entry
  const first = tableData[0] || {};
  const chartType = !first.isOpto ? 'non-opto' : (first.optoSystem === 'gpcr' ? 'gpcr' : 'opto-other');

  const dataMap = {}, labelMap = {};
  tableData.forEach(d => { if (!dataMap[d.receptor]) dataMap[d.receptor] = {}; dataMap[d.receptor][d.platform] = d; labelMap[d.receptor] = d.graphLabel || d.receptor; });

  // Platforms present in the data (preserve canonical LNC order, then any custom platforms)
  const platSet = new Set(); tableData.forEach(d => platSet.add(d.platform));
  const platforms = ['LNC1.0','LNC2.0'].filter(p => platSet.has(p));
  tableData.forEach(d => { if (!platforms.includes(d.platform)) platforms.push(d.platform); });
  if (!platforms.length) platforms.push('LNC1.0');

  let panelList;
  if (vizMode === 'A') { panelList = [...GPCR_FULL_ORDER]; }
  else { const present = Object.keys(dataMap); panelList = GPCR_FULL_ORDER.filter(g => g && present.includes(g)); present.forEach(g => { if (!panelList.includes(g)) panelList.push(g); }); }

  const ROWS = Math.ceil(panelList.length / COLS) || 1;
  while (panelList.length < ROWS * COLS) panelList.push('');

  const pw = (W - ML - MR - GAP * (COLS - 1)) / COLS;
  const phRef = (297 - MT - MB - GAP * 5) / 6;
  const H = vizMode === 'A' ? 297 : Math.max(80, MT + MB + ROWS * phRef + (ROWS - 1) * GAP);
  const ph = (H - MT - MB - GAP * (ROWS - 1)) / ROWS;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, sans-serif" style="background:#fff">
<defs>
  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5B9BD5"/><stop offset="100%" stop-color="#EDF4FB"/></linearGradient>
  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E8E8E8"/><stop offset="100%" stop-color="#333"/></linearGradient>
</defs>\n`;

  if (chartType === 'gpcr') svg += renderLegendGpcr(W);
  else if (chartType === 'opto-other') svg += renderLegendOptoSimple(W);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      const g = panelList[idx]; if (!g) continue;
      const ox = ML + col * (pw + GAP), oy = MT + row * (ph + GAP);
      if (chartType === 'gpcr') svg += panelGpcr(g, dataMap[g], ox, oy, pw, ph, includeCtrl, labelMap[g], platforms);
      else if (chartType === 'opto-other') svg += panelOptoSimple(g, dataMap[g], ox, oy, pw, ph, labelMap[g], platforms);
      else svg += panelNonOpto(g, dataMap[g], ox, oy, pw, ph, labelMap[g]);
    }
  }
  svg += '</svg>';
  return svg;
}

/* ── Legends ─────────────────────────────────────────────── */
function renderLegendGpcr(W) {
  const lx=W-7-52,ly=1.5,lw=52,lh=8;
  let s=`<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="0.8" fill="#fff" stroke="#C0C0C0" stroke-width="0.353"/>`;
  [{l:'Antagonist',f:'#EBEBEB',x:lx+2},{l:'Agonist',f:'#F8DFB1',x:lx+15},{l:'DARK',f:'url(#gD)',x:lx+27},{l:'BLUE',f:'url(#gB)',x:lx+37}].forEach(it=>{
    s+=`<rect x="${it.x}" y="${ly+1.5}" width="3" height="2" rx="0.3" fill="${it.f}" stroke="#444" stroke-width="0.088"/>`;
    s+=`<text x="${it.x+3.8}" y="${ly+3.2}" font-size="2.117" fill="#333">${it.l}</text>`;
  });
  s+=`<text x="${lx+lw/2}" y="${ly+6.5}" font-size="1.058" fill="#888" text-anchor="middle">2h ON / 28h OFF</text>`;
  return s;
}
function renderLegendOptoSimple(W) {
  const lx=W-7-30,ly=1.5,lw=30,lh=6;
  let s=`<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="0.8" fill="#fff" stroke="#C0C0C0" stroke-width="0.353"/>`;
  [{l:'DARK',f:'url(#gD)',x:lx+2},{l:'BLUE',f:'url(#gB)',x:lx+15}].forEach(it=>{
    s+=`<rect x="${it.x}" y="${ly+1.2}" width="3" height="2" rx="0.3" fill="${it.f}" stroke="#444" stroke-width="0.088"/>`;
    s+=`<text x="${it.x+3.8}" y="${ly+2.9}" font-size="2.117" fill="#333">${it.l}</text>`;
  });
  return s;
}

/* ── Shared: axes ────────────────────────────────────────── */
function renderAxes(ox,pl,pr,pt,pb,plotH,ym) {
  let s='';
  s+=`<text x="${ox+1.5}" y="${(pt+pb)/2}" font-size="2.117" fill="#333" text-anchor="middle" transform="rotate(-90,${ox+1.5},${(pt+pb)/2})">SEAP (Vmax)</text>`;
  s+=`<line x1="${pl}" y1="${pt}" x2="${pl}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;
  s+=`<line x1="${pl}" y1="${pb}" x2="${pr}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;
  for(let i=0;i<=5;i++){const v=(ym/5)*i,y=pb-(i/5)*plotH;
    s+=`<text x="${pl-1.0}" y="${y+0.4}" font-size="1.058" fill="#666" text-anchor="end">${v===0?'0':fmtYTick(v)}</text>`;
    if(i>0&&i<5)s+=`<line x1="${pl}" y1="${y}" x2="${pr}" y2="${y}" stroke="#e0e0e0" stroke-width="0.088"/>`;
  }
  return s;
}

/* ============================================================
   ① GPCR-iTango Panel — ATG/AG bands, fold brackets, Dark/Blue
   ============================================================ */
function panelGpcr(gpcr, recData, ox, oy, pw, ph, includeCtrl, graphLabel, platforms) {
  let s='';
  const pl=ox+5.8,pr=ox+pw-0.6,pt=oy+1.0,pb=oy+ph-10.0;
  const plotW=pr-pl,plotH=pb-pt; if(plotH<=0)return s;

  // Determine condition categories actually present in this receptor's data
  const condUnion=new Set();
  if(recData){Object.values(recData).forEach(d=>{Object.keys(d.conditions||{}).forEach(c=>condUnion.add(c));});}
  const condCat=c=>c.startsWith('control')?0:c.startsWith('antagonist')?1:c.startsWith('agonist')?2:3;
  let condList=[...condUnion].sort((a,b)=>condCat(a)-condCat(b));
  // Fallback layout for empty panels
  if(!condList.length) condList = includeCtrl?['control','antagonist','agonist']:['antagonist','agonist'];
  const condDisplay=condList.filter(c=>includeCtrl||!c.startsWith('control'));
  if(!condDisplay.length) condDisplay.push('agonist');

  const nPlat=platforms.length;
  const nPG=condDisplay.length*2, totalBars=nPG*nPlat;
  const gapMid=nPlat>1?2.5:0, totalGap=gapMid*(nPlat-1);
  const step=(plotW-totalGap)/totalBars, barW=step*0.60;

  const bars=[],barValues=[];
  platforms.forEach((plat,pi)=>{const bo=pi*nPG;
    let bi=bo;
    condDisplay.forEach(cond=>{
      const c=recData?.[plat]?.conditions?.[cond];
      const dv=c?.dark||0, bv=c?.blue||0;
      bars.push({idx:bi++,value:dv,type:'dark'},{idx:bi++,value:bv,type:'blue'});
      if(!cond.startsWith('control')) barValues.push(dv,bv);
    });
  });

  const ym=(_isLab && _globalYMax>0) ? _globalYMax : ceilYMax((barValues.length>0?Math.max(...barValues):1)*HEADROOM_PAPER);
  s+=renderAxes(ox,pl,pr,pt,pb,plotH,ym);

  const barX=idx=>pl+idx*step+Math.floor(idx/nPG)*gapMid;
  const barCX=idx=>barX(idx)+step/2;

  // Background bands per condition category (control: none, antagonist: gray, agonist: orange)
  for(let p=0;p<nPlat;p++){const base=p*nPG;
    condDisplay.forEach((cond,ci)=>{
      const cat=cond.startsWith('antagonist')?'atg':cond.startsWith('agonist')?'ag':null;
      if(!cat)return;
      const fill=cat==='atg'?'#EBEBEB':'#F8DFB1';
      s+=`<rect x="${barX(base+ci*2)-step*0.14}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="${fill}"/>`;
    });
  }

  // Platform dividers
  for(let p=1;p<nPlat;p++){s+=`<line x1="${barX(p*nPG)-gapMid/2}" y1="${pt}" x2="${barX(p*nPG)-gapMid/2}" y2="${pb}" stroke="#BCBCBB" stroke-width="0.088" stroke-dasharray="0.8,0.5"/>`;}

  // Bars
  const barTopY={};
  bars.forEach(bar=>{const x=barX(bar.idx)+(step-barW)/2,bH=ym>0?(bar.value/ym)*plotH:0;barTopY[bar.idx]=bH>0?(pb-bH):pb;if(bH>0)s+=`<rect x="${x}" y="${pb-bH}" width="${barW}" height="${bH}" fill="${bar.type==='dark'?'url(#gD)':'url(#gB)'}" stroke="#444" stroke-width="0.088"/>`;});

  // Fold brackets — only applicable ones
  let bLines='';const fGroups=[];
  const lvSpacing=_isLab?4.0:2.0, lvOffset=_isLab?2.5:1.2, foldFont=_isLab?2.6:0.882;
  if(recData){platforms.forEach((plat,pi)=>{if(!recData[plat]?.ratios)return;const ratios=recData[plat].ratios,base=pi*nPG;
    const atgPos=condDisplay.findIndex(c=>c.startsWith('antagonist'));
    const agPos=condDisplay.findIndex(c=>c.startsWith('agonist'));
    const ctrlPos=condDisplay.findIndex(c=>c.startsWith('control'));
    const tDI=atgPos>=0?base+atgPos*2:-1, tBI=atgPos>=0?base+atgPos*2+1:-1;
    const aDI=agPos>=0?base+agPos*2:-1, aBI=agPos>=0?base+agPos*2+1:-1;
    const cDI=ctrlPos>=0?base+ctrlPos*2:-1, cBI=ctrlPos>=0?base+ctrlPos*2+1:-1;
    const pairs=[];
    if(tDI>=0&&aBI>=0) pairs.push({l:'AG-B/ATG-D',c:'#d32f2f',f:tDI,t:aBI});
    if(tBI>=0&&aBI>=0) pairs.push({l:'AG-B/ATG-B',c:'#1976d2',f:tBI,t:aBI});
    // Fallback to control as baseline when no antagonist (chimera screening)
    if(atgPos<0 && cDI>=0 && aBI>=0) pairs.push({l:'AG-B/CTRL-D',c:'#d32f2f',f:cDI,t:aBI});
    if(atgPos<0 && cBI>=0 && aBI>=0) pairs.push({l:'AG-B/CTRL-B',c:'#1976d2',f:cBI,t:aBI});
    if(aDI>=0&&aBI>=0) pairs.push({l:'AG-B/AG-D',c:'#388e3c',f:aDI,t:aBI});
    const gBars=[]; if(tDI>=0)gBars.push(tDI,tBI); if(aDI>=0)gBars.push(aDI,aBI); if(atgPos<0&&cDI>=0)gBars.push(cDI,cBI);
    const gTop=gBars.length?Math.min(...gBars.map(i=>barTopY[i]??pb)):pb;
    pairs.forEach((bp,i)=>{const r=ratios[bp.l]||0;if(!r)return;const by=gTop-lvOffset-i*lvSpacing,cf=barCX(bp.f),ct=barCX(bp.t),yf=barTopY[bp.f]??pb,yt=barTopY[bp.t]??pb;
      bLines+=`<polyline points="${cf},${yf} ${cf},${by} ${ct},${by} ${ct},${yt}" fill="none" stroke="${bp.c}" stroke-width="0.088"/>`;
      const mx=(cf+ct)/2,fs=r>=100?Math.round(r)+'x':r.toFixed(1)+'x';
      if(_isLab){
        fGroups.push(`<text x="${mx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="${foldFont}" fill="${bp.c}">${fs}</text>`);
      } else {
        const tw=fs.length*0.45+0.2;
        fGroups.push(`<g><rect x="${mx-tw/2}" y="${by-0.6}" width="${tw}" height="1.2" fill="white"/><text x="${mx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="${foldFont}" fill="${bp.c}">${fs}</text></g>`);
      }
    });
  });}
  s+=bLines;fGroups.forEach(g=>{s+=g;});

  // X axis
  const xLY=pb+2.0;
  for(let i=0;i<totalBars;i++)s+=`<text x="${barCX(i)}" y="${xLY}" font-size="1.411" fill="#333" text-anchor="middle">${i%2===0?'Dark':'Blue'}</text>`;

  // Platform brackets + labels
  const lY=xLY+2.0;
  platforms.forEach((plat,pi)=>{
    const lL=barX(pi*nPG)+step*0.1, lR=barX(pi*nPG+nPG-1)+step*0.9;
    s+=bracketDown(lL,lR,lY-0.5,0.5);
    const platLabel=plat.replace(/^LNC([0-9])/,'LNC $1');
    s+=`<text x="${(lL+lR)/2}" y="${lY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">${platLabel}</text>`;
  });

  const rY=lY+3.6,rL=pl+step*0.05,rR=pr-step*0.05;
  s+=bracketDown(rL,rR,rY-0.5,0.5);
  const lbl=graphLabel||(DISPLAY_NAME[gpcr]||gpcr),lp=splitLabel(lbl);
  s+=`<text x="${(rL+rR)/2}" y="${rY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">${lp.line1}</text>`;
  if(lp.line2)s+=`<text x="${(rL+rR)/2}" y="${rY+3.5}" font-size="1.411" fill="#333" text-anchor="middle">${lp.line2}</text>`;
  return s;
}

/* ============================================================
   ② Opto non-GPCR Panel — Dark/Blue, LNC, white bg, no bands
   ============================================================ */
function panelOptoSimple(gpcr, recData, ox, oy, pw, ph, graphLabel, platforms) {
  let s='';
  const pl=ox+5.8,pr=ox+pw-0.6,pt=oy+1.0,pb=oy+ph-10.0;
  const plotW=pr-pl,plotH=pb-pt; if(plotH<=0)return s;

  const nPlat=platforms.length;
  let condNames=[];
  if(recData){const fp=platforms.find(p=>recData[p])||Object.keys(recData)[0];if(fp&&recData[fp])condNames=Object.keys(recData[fp].conditions);}
  const nPerCond=2;
  const nPG=condNames.length*nPerCond||2;
  const totalBars=nPG*nPlat;
  const gapMid=nPlat>1?2.5:0, totalGap=gapMid*(nPlat-1);
  const step=(plotW-totalGap)/totalBars,barW=step*0.60;

  const bars=[],barValues=[],foldPairs=[];
  platforms.forEach((plat,pi)=>{const bo=pi*nPG;
    if(!recData||!recData[plat]){for(let i=0;i<nPG;i++)bars.push({idx:bo+i,value:0,type:i%2===0?'dark':'blue'});}
    else{const d=recData[plat];let bi=bo;
      condNames.forEach(cond=>{
        const dv=d.conditions[cond]?.dark||0,bv=d.conditions[cond]?.blue||0;
        const dIdx=bi++,bIdx=bi++;
        bars.push({idx:dIdx,value:dv,type:'dark'},{idx:bIdx,value:bv,type:'blue'});
        barValues.push(dv,bv);
        if(dv>0) foldPairs.push({dIdx,bIdx,fold:bv/dv});
      });
    }
  });

  const ym=(_isLab && _globalYMax>0) ? _globalYMax : ceilYMax((barValues.length>0?Math.max(...barValues):1)*HEADROOM_PAPER);
  s+=renderAxes(ox,pl,pr,pt,pb,plotH,ym);

  const barX=idx=>pl+idx*step+Math.floor(idx/nPG)*gapMid;
  const barCX=idx=>barX(idx)+step/2;

  // Platform dividers
  for(let p=1;p<nPlat;p++){s+=`<line x1="${barX(p*nPG)-gapMid/2}" y1="${pt}" x2="${barX(p*nPG)-gapMid/2}" y2="${pb}" stroke="#BCBCBB" stroke-width="0.088" stroke-dasharray="0.8,0.5"/>`;}

  // Bars
  const barTopY={};
  bars.forEach(bar=>{const x=barX(bar.idx)+(step-barW)/2,bH=ym>0?(bar.value/ym)*plotH:0;barTopY[bar.idx]=bH>0?(pb-bH):pb;if(bH>0)s+=`<rect x="${x}" y="${pb-bH}" width="${barW}" height="${bH}" fill="${bar.type==='dark'?'url(#gD)':'url(#gB)'}" stroke="#444" stroke-width="0.088"/>`;});

  // Fold brackets (blue/dark) per condition
  let bLines='';const fGroups=[];
  const lvOffset=_isLab?2.5:1.2, foldFont=_isLab?2.6:0.882;
  foldPairs.forEach(({dIdx,bIdx,fold})=>{
    if(!fold)return;
    const cf=barCX(dIdx),ct=barCX(bIdx);
    const yf=barTopY[dIdx]??pb,yt=barTopY[bIdx]??pb;
    const by=Math.min(yf,yt)-lvOffset;
    bLines+=`<polyline points="${cf},${yf} ${cf},${by} ${ct},${by} ${ct},${yt}" fill="none" stroke="#1976d2" stroke-width="0.088"/>`;
    const mx=(cf+ct)/2,fs=fold>=100?Math.round(fold)+'x':fold.toFixed(1)+'x';
    if(_isLab){
      fGroups.push(`<text x="${mx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="${foldFont}" fill="#1976d2">${fs}</text>`);
    } else {
      const tw=fs.length*0.45+0.2;
      fGroups.push(`<g><rect x="${mx-tw/2}" y="${by-0.6}" width="${tw}" height="1.2" fill="white"/><text x="${mx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="${foldFont}" fill="#1976d2">${fs}</text></g>`);
    }
  });
  s+=bLines;fGroups.forEach(g=>{s+=g;});

  // X axis: Dark/Blue per condition
  const xLY=pb+2.0;
  for(let i=0;i<totalBars;i++)s+=`<text x="${barCX(i)}" y="${xLY}" font-size="1.411" fill="#333" text-anchor="middle">${i%2===0?'Dark':'Blue'}</text>`;

  // Platform brackets + labels
  const lY=xLY+2.0;
  platforms.forEach((plat,pi)=>{
    const lL=barX(pi*nPG)+step*0.1, lR=barX(pi*nPG+nPG-1)+step*0.9;
    s+=bracketDown(lL,lR,lY-0.5,0.5);
    const platLabel=plat.replace(/^LNC([0-9])/,'LNC $1');
    s+=`<text x="${(lL+lR)/2}" y="${lY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">${platLabel}</text>`;
  });

  // Target name
  const rY=lY+3.6,rL=pl+step*0.05,rR=pr-step*0.05;
  s+=bracketDown(rL,rR,rY-0.5,0.5);
  const lbl=graphLabel||gpcr,lp=splitLabel(lbl);
  s+=`<text x="${(rL+rR)/2}" y="${rY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">${lp.line1}</text>`;
  if(lp.line2)s+=`<text x="${(rL+rR)/2}" y="${rY+3.5}" font-size="1.411" fill="#333" text-anchor="middle">${lp.line2}</text>`;
  return s;
}

/* ============================================================
   ③ Non-opto Panel — single bars per condition, no LNC
   ============================================================ */
function panelNonOpto(gpcr, recData, ox, oy, pw, ph, graphLabel) {
  let s='';
  const pl=ox+5.8,pr=ox+pw-0.6,pt=oy+1.0,pb=oy+ph-10.0;
  const plotW=pr-pl,plotH=pb-pt; if(plotH<=0)return s;

  let conditions=[],vals=[];
  if(recData){const fp=Object.keys(recData)[0];if(fp&&recData[fp]){const d=recData[fp];conditions=Object.keys(d.conditions);vals=conditions.map(c=>d.conditions[c]?.seap||0);}}
  const nBars=conditions.length||1;
  const step=plotW/nBars,barW=step*0.55;

  const ym=(_isLab && _globalYMax>0) ? _globalYMax : ceilYMax((vals.length>0?Math.max(...vals):1)*HEADROOM_PAPER);
  s+=renderAxes(ox,pl,pr,pt,pb,plotH,ym);

  // No background — white only
  // Bars (blue gradient)
  vals.forEach((v,i)=>{const x=pl+i*step+(step-barW)/2,bH=ym>0?(v/ym)*plotH:0;if(bH>0)s+=`<rect x="${x}" y="${pb-bH}" width="${barW}" height="${bH}" fill="url(#gB)" stroke="#444" stroke-width="0.088"/>`;});

  // X axis: condition names
  const xLY=pb+2.0;
  conditions.forEach((c,i)=>{const cx=pl+i*step+step/2;const label=c.length>12?c.substring(0,11)+'…':c;s+=`<text x="${cx}" y="${xLY}" font-size="1.411" fill="#333" text-anchor="middle">${label}</text>`;});

  // Target name
  const rY=xLY+2.0;
  const rL=pl+step*0.05,rR=pl+(nBars-1)*step+step*0.95;
  s+=bracketDown(rL,rR,rY-0.5,0.5);
  s+=`<text x="${(rL+rR)/2}" y="${rY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">${graphLabel||gpcr}</text>`;
  return s;
}

/* ── Helpers ─────────────────────────────────────────────── */
function splitLabel(label){
  if(label.includes('-iTango-')){const i=label.indexOf('-iTango-');return{line1:`${label.substring(0,i)}-<tspan font-style="italic">i</tspan>Tango-`,line2:label.substring(i+8)};}
  if(label.includes('-LAUNCHER')){const i=label.indexOf('-LAUNCHER');return{line1:label.substring(0,i)+'-',line2:'LAUNCHER'};}
  if(label.length>15){const mid=Math.ceil(label.length/2),sp=label.indexOf('-',mid-5);if(sp>0)return{line1:label.substring(0,sp+1),line2:label.substring(sp+1)};}
  return{line1:label,line2:null};
}
function bracketDown(x1,x2,y,h){return`<path d="M${x1},${y} L${x1},${y+h} L${x2},${y+h} L${x2},${y}" fill="none" stroke="#333" stroke-width="0.088"/>`;}
function escXml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function generateRankingSVG(tableData, chartFormat){
  if(!tableData||!tableData.length) return '';
  const opto = !!tableData[0].isOpto;
  const isLab = (chartFormat === 'lab-meeting');

  // Build metric specs: {title, ylabel, isFold, getValue}
  const metrics = [];
  if(opto){
    metrics.push({
      title: 'AG-Blue SEAP (Activated signal)',
      ylabel: 'SEAP (Vmax)',
      isFold: false,
      getValue: d => {
        const agK = Object.keys(d.conditions||{}).find(c => c.startsWith('agonist'));
        return agK ? (d.conditions[agK]?.blue || 0) : 0;
      }
    });
    const foldKeys = new Set();
    tableData.forEach(d => { if(d.ratios) Object.keys(d.ratios).forEach(k => foldKeys.add(k)); });
    [...foldKeys].forEach(key => {
      metrics.push({title: key+' (fold)', ylabel: 'Fold (x)', isFold: true, getValue: d => d.ratios?.[key] || 0});
    });
  } else {
    const conds = Object.keys(tableData[0].conditions || {});
    conds.forEach(c => {
      metrics.push({title: c+' SEAP', ylabel: 'SEAP (Vmax)', isFold: false, getValue: d => d.conditions[c]?.seap || 0});
    });
  }
  if(!metrics.length) return '';

  // Layout
  const W = 210, padding = 8;
  const titleH = 7, plotH = 45, xLabelH = 22, sectionGap = 6;
  const H = padding + metrics.length * (titleH + plotH + xLabelH + sectionGap) + padding;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, sans-serif" style="background:#fff">
<defs>
  <linearGradient id="rB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5B9BD5"/><stop offset="100%" stop-color="#EDF4FB"/></linearGradient>
  <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#D1FAE5"/></linearGradient>
</defs>`;

  let y = padding;
  metrics.forEach(metric => {
    const rows = tableData.map(d => ({
      label: d.graphLabel || d.receptor,
      platform: d.platform,
      value: metric.getValue(d)
    })).sort((a,b) => b.value - a.value);

    // Title
    svg += `<text x="${padding}" y="${y+titleH-1}" font-size="3.2" font-weight="bold" fill="#1a1a2e">${escXml(metric.title)} — higher is better</text>`;
    y += titleH;

    // Plot area
    const pl = padding + 14, pr = W - padding - 2, pt = y, pb = y + plotH;
    const plotW = pr - pl;

    const maxVal = Math.max(...rows.map(r => r.value), 0.001);
    const ym = ceilYMax(maxVal * (isLab ? HEADROOM_LAB : HEADROOM_PAPER));

    // Y-axis label
    svg += `<text x="${pl-9}" y="${(pt+pb)/2}" font-size="2.117" fill="#333" text-anchor="middle" transform="rotate(-90,${pl-9},${(pt+pb)/2})">${metric.ylabel}</text>`;

    // Axes + grid
    svg += `<line x1="${pl}" y1="${pt}" x2="${pl}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;
    svg += `<line x1="${pl}" y1="${pb}" x2="${pr}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;
    for(let i=0;i<=5;i++){
      const v=(ym/5)*i, ty=pb-(i/5)*plotH;
      const lbl = metric.isFold ? (v >= 100 ? Math.round(v)+'x' : (v===0?'0':v.toFixed(1)+'x')) : (v===0?'0':fmtYTick(v));
      svg += `<text x="${pl-1}" y="${ty+0.5}" font-size="1.4" fill="#666" text-anchor="end">${lbl}</text>`;
      if(i>0 && i<5) svg += `<line x1="${pl}" y1="${ty}" x2="${pr}" y2="${ty}" stroke="#e0e0e0" stroke-width="0.088"/>`;
    }

    // Bars (vertical)
    const nBars = rows.length;
    const step = plotW / nBars;
    const barW = step * 0.60;
    const xLabelFont = nBars > 18 ? 1.0 : nBars > 12 ? 1.2 : 1.4;
    const valLabelFont = isLab ? 1.6 : 1.2;

    rows.forEach((r,i) => {
      const cx = pl + i*step + step/2;
      const x = cx - barW/2;
      const bH = ym > 0 ? (r.value / ym) * plotH : 0;
      if(bH > 0){
        const fill = r.platform === 'LNC2.0' ? 'url(#rG)' : 'url(#rB)';
        svg += `<rect x="${x}" y="${pb-bH}" width="${barW}" height="${bH}" fill="${fill}" stroke="#444" stroke-width="0.088"/>`;
        const valStr = metric.isFold
          ? (r.value >= 100 ? Math.round(r.value)+'x' : r.value.toFixed(1)+'x')
          : (r.value >= 1000 ? (r.value/1000).toFixed(1)+'k' : r.value.toFixed(0));
        svg += `<text x="${cx}" y="${pb-bH-0.6}" font-size="${valLabelFont}" text-anchor="middle" font-weight="bold" fill="#333">${valStr}</text>`;
      }
      // X label: rank. name (platform), rotated -45°
      const lh = pb + 1.5;
      const labelText = `${i+1}. ${r.label}${r.platform?' ('+r.platform+')':''}`;
      svg += `<text x="${cx}" y="${lh}" font-size="${xLabelFont}" fill="#333" text-anchor="end" transform="rotate(-45,${cx},${lh})">${escXml(labelText)}</text>`;
    });

    y = pb + xLabelH + sectionGap;
  });

  svg += '</svg>';
  return svg;
}
function ceilYMax(m){if(m<=0)return 1;if(m<=2)return Math.ceil(m*2)/2;if(m<=5)return Math.ceil(m);if(m<=10)return Math.ceil(m/2)*2;if(m<=50)return Math.ceil(m/10)*10;if(m<=100)return Math.ceil(m/20)*20;if(m<=500)return Math.ceil(m/100)*100;if(m<=1000)return Math.ceil(m/200)*200;if(m<=2000)return Math.ceil(m/400)*400;if(m<=5000)return Math.ceil(m/1000)*1000;return Math.ceil(m/2000)*2000;}
function fmtYTick(v){if(v>=1000)return(v/1000).toFixed(v%1000===0?0:1)+'k';if(Number.isInteger(v))return v.toString();return v.toFixed(1);}
