/* ============================================================
   SynBio SVG Chart Generator — v8.1
   Opto mode: DARK/BLUE bars, LNC groups, fold brackets
   Non-opto mode: single bars per condition, no LNC/DARK/BLUE
   ============================================================ */

const GPCR_FULL_ORDER = [
  'CHRM1','CHRM2','CHRM3','CHRM4','CHRM5','HRH1','HRH2','HRH3',
  'HRH4','ADORA1','ADORA2A','ADORA2B','ADORA3','HTR1A','HTR2A','HTR4',
  'HTR2C','ADRA1B','ADRA2B','ADRA2C','ADRB2','Oxytocin','PACAP',''
];
const DISPLAY_NAME = { 'PACAP':'ADCYAP1', 'Oxytocin':'Oxytocin' };

function generateSVG(tableData, vizMode, ctrlMode) {
  const W = 210, ML = 7, MR = 7, MT = 9, MB = 3, GAP = 3.5, COLS = 4;
  const includeCtrl = (ctrlMode === 'include');
  const opto = tableData.length > 0 && tableData[0].isOpto;

  const dataMap = {}, labelMap = {};
  tableData.forEach(d => { if (!dataMap[d.receptor]) dataMap[d.receptor] = {}; dataMap[d.receptor][d.platform] = d; labelMap[d.receptor] = d.graphLabel || d.receptor; });

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

  if (opto) svg += renderLegend(W);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      const gpcr = panelList[idx];
      if (!gpcr) continue;
      const ox = ML + col * (pw + GAP), oy = MT + row * (ph + GAP);
      if (opto) svg += renderOptoPanel(gpcr, dataMap[gpcr], ox, oy, pw, ph, includeCtrl, labelMap[gpcr]);
      else svg += renderNonOptoPanel(gpcr, dataMap[gpcr], ox, oy, pw, ph, labelMap[gpcr]);
    }
  }
  svg += '</svg>';
  return svg;
}

/* ── Legend (opto only) ──────────────────────────────────── */
function renderLegend(W) {
  const lx = W - 7 - 52, ly = 1.5, lw = 52, lh = 8;
  let s = `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="0.8" fill="#fff" stroke="#C0C0C0" stroke-width="0.353"/>`;
  [{l:'Antagonist',f:'#EBEBEB',x:lx+2},{l:'Agonist',f:'#F8DFB1',x:lx+15},{l:'DARK',f:'url(#gD)',x:lx+27},{l:'BLUE',f:'url(#gB)',x:lx+37}].forEach(it=>{
    s+=`<rect x="${it.x}" y="${ly+1.5}" width="3" height="2" rx="0.3" fill="${it.f}" stroke="#444" stroke-width="0.088"/>`;
    s+=`<text x="${it.x+3.8}" y="${ly+3.2}" font-size="2.117" fill="#333">${it.l}</text>`;
  });
  s += `<text x="${lx+lw/2}" y="${ly+6.5}" font-size="1.058" fill="#888" text-anchor="middle">2h ON / 28h OFF</text>`;
  return s;
}

/* ============================================================
   OPTO PANEL — full DARK/BLUE, LNC, fold brackets
   ============================================================ */
function renderOptoPanel(gpcr, recData, ox, oy, pw, ph, includeCtrl, graphLabel) {
  let s = '';
  const pl = ox + 5.8, pr = ox + pw - 0.6;
  const pt = oy + 1.0, pb = oy + ph - 10.0;
  const plotW = pr - pl, plotH = pb - pt;
  if (plotH <= 0) return s;

  const platforms = ['LNC1.0', 'LNC2.0'];
  const nPerGroup = includeCtrl ? 6 : 4;
  const totalBars = nPerGroup * 2;
  const gapMid = 2.5;
  const step = (plotW - gapMid) / totalBars;
  const barW = step * 0.72;

  const bars = [], barValues = [];
  platforms.forEach((plat, pi) => {
    const baseOff = pi * nPerGroup;
    if (!recData || !recData[plat]) {
      for (let i = 0; i < nPerGroup; i++) bars.push({ idx: baseOff + i, value: 0, type: i % 2 === 0 ? 'dark' : 'blue' });
    } else {
      const d = recData[plat], conds = Object.keys(d.conditions);
      const ctrlC = conds.find(c => c.startsWith('control'));
      const atgC = conds.find(c => c.startsWith('antagonist'));
      const agC = conds.find(c => c.startsWith('agonist'));
      let bi = baseOff;
      if (includeCtrl) { const cD=ctrlC?(d.conditions[ctrlC]?.dark||0):0,cB=ctrlC?(d.conditions[ctrlC]?.blue||0):0;bars.push({idx:bi++,value:cD,type:'dark'});bars.push({idx:bi++,value:cB,type:'blue'});barValues.push(cD,cB); }
      const atgD=atgC?(d.conditions[atgC]?.dark||0):0,atgB=atgC?(d.conditions[atgC]?.blue||0):0;bars.push({idx:bi++,value:atgD,type:'dark'});bars.push({idx:bi++,value:atgB,type:'blue'});
      const agD=agC?(d.conditions[agC]?.dark||0):0,agB=agC?(d.conditions[agC]?.blue||0):0;bars.push({idx:bi++,value:agD,type:'dark'});bars.push({idx:bi++,value:agB,type:'blue'});
      barValues.push(atgD,atgB,agD,agB);
    }
  });

  const ym = ceilYMax((barValues.length > 0 ? Math.max(...barValues) : 1) * 1.55);
  s += renderAxes(ox, pl, pr, pt, pb, plotH, ym);

  const barX = idx => pl + idx * step + (idx >= nPerGroup ? gapMid : 0);
  const barCX = idx => barX(idx) + step / 2;

  // Background bands
  if (includeCtrl) {
    [0, nPerGroup].forEach(base => {
      s += `<rect x="${barX(base+2)-step*0.14}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#EBEBEB"/>`;
      s += `<rect x="${barX(base+4)-step*0.14}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#F8DFB1"/>`;
    });
  } else {
    [0, nPerGroup].forEach(base => {
      s += `<rect x="${barX(base)-step*0.14}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#EBEBEB"/>`;
      s += `<rect x="${barX(base+2)-step*0.14}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#F8DFB1"/>`;
    });
  }

  // LNC divider
  s += `<line x1="${barX(nPerGroup)-gapMid/2}" y1="${pt}" x2="${barX(nPerGroup)-gapMid/2}" y2="${pb}" stroke="#BCBCBB" stroke-width="0.088" stroke-dasharray="0.8,0.5"/>`;

  // Bars
  const barTopY = {};
  bars.forEach(bar => {
    const x = barX(bar.idx) + (step - barW) / 2;
    const barH = ym > 0 ? (bar.value / ym) * plotH : 0;
    barTopY[bar.idx] = barH > 0 ? (pb - barH) : pb;
    if (barH > 0) s += `<rect x="${x}" y="${pb-barH}" width="${barW}" height="${barH}" fill="${bar.type==='dark'?'url(#gD)':'url(#gB)'}" stroke="#444" stroke-width="0.088"/>`;
  });

  // Fold brackets
  let bracketLines = '';
  const foldGroups = [];
  if (recData) {
    platforms.forEach((plat, pi) => {
      if (!recData[plat]?.ratios) return;
      const ratios = recData[plat].ratios, base = pi * nPerGroup;
      const atgDI=includeCtrl?base+2:base,atgBI=includeCtrl?base+3:base+1,agDI=includeCtrl?base+4:base+2,agBI=includeCtrl?base+5:base+3;
      const pairs=[{label:'AG-B/ATG-D',color:'#d32f2f',from:atgDI,to:agBI,lv:0},{label:'AG-B/ATG-B',color:'#1976d2',from:atgBI,to:agBI,lv:1},{label:'AG-B/AG-D',color:'#388e3c',from:agDI,to:agBI,lv:2}];
      const gBars=includeCtrl?[base+2,base+3,base+4,base+5]:[base,base+1,base+2,base+3];
      const gTop=Math.min(...gBars.map(i=>barTopY[i]??pb));
      pairs.forEach(bp=>{const ratio=ratios[bp.label]||0;if(!ratio)return;const by=gTop-1.2-bp.lv*2.0,cf=barCX(bp.from),ct=barCX(bp.to),yf=barTopY[bp.from]??pb,yt=barTopY[bp.to]??pb;
        bracketLines+=`<polyline points="${cf},${yf} ${cf},${by} ${ct},${by} ${ct},${yt}" fill="none" stroke="${bp.color}" stroke-width="0.088"/>`;
        const mx=(cf+ct)/2,fs=ratio>=100?Math.round(ratio)+'x':ratio.toFixed(1)+'x',tw=fs.length*0.45+0.2;
        foldGroups.push(`<g><rect x="${mx-tw/2}" y="${by-0.6}" width="${tw}" height="1.2" fill="white"/><text x="${mx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="0.882" fill="${bp.color}">${fs}</text></g>`);
      });
    });
  }
  s += bracketLines;
  foldGroups.forEach(g => { s += g; });

  // X axis: Dark/Blue labels
  const xLY = pb + 2.0;
  for (let i = 0; i < totalBars; i++) s += `<text x="${barCX(i)}" y="${xLY}" font-size="1.411" fill="#333" text-anchor="middle">${i%2===0?'Dark':'Blue'}</text>`;

  // LNC brackets
  const lY = xLY + 2.0;
  const l1L=barX(0)+step*0.1,l1R=barX(nPerGroup-1)+step*0.9,l2L=barX(nPerGroup)+step*0.1,l2R=barX(totalBars-1)+step*0.9;
  s += bracketDown(l1L,l1R,lY-0.5,0.5)+bracketDown(l2L,l2R,lY-0.5,0.5);
  s += `<text x="${(l1L+l1R)/2}" y="${lY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">LNC 1.0</text>`;
  s += `<text x="${(l2L+l2R)/2}" y="${lY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">LNC 2.0</text>`;

  // Receptor label
  const rY=lY+3.6,rL=pl+step*0.05,rR=pr-step*0.05;
  s += bracketDown(rL,rR,rY-0.5,0.5);
  const lbl=graphLabel||(DISPLAY_NAME[gpcr]||gpcr),lp=splitLabel(lbl);
  s += `<text x="${(rL+rR)/2}" y="${rY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">${lp.line1}</text>`;
  if (lp.line2) s += `<text x="${(rL+rR)/2}" y="${rY+3.5}" font-size="1.411" fill="#333" text-anchor="middle">${lp.line2}</text>`;

  return s;
}

/* ============================================================
   NON-OPTO PANEL — single bars, no LNC, no DARK/BLUE, white bg
   ============================================================ */
function renderNonOptoPanel(gpcr, recData, ox, oy, pw, ph, graphLabel) {
  let s = '';
  const pl = ox + 5.8, pr = ox + pw - 0.6;
  const pt = oy + 1.0, pb = oy + ph - 10.0;
  const plotW = pr - pl, plotH = pb - pt;
  if (plotH <= 0) return s;

  // Gather conditions and values from first available platform
  let conditions = [], vals = [];
  if (recData) {
    const firstPlat = Object.keys(recData)[0];
    if (firstPlat && recData[firstPlat]) {
      const d = recData[firstPlat];
      conditions = Object.keys(d.conditions);
      vals = conditions.map(c => d.conditions[c]?.seap || 0);
    }
  }
  const nBars = conditions.length || 1;
  const step = plotW / nBars;
  const barW = step * 0.65;

  const ym = ceilYMax((vals.length > 0 ? Math.max(...vals) : 1) * 1.55);
  s += renderAxes(ox, pl, pr, pt, pb, plotH, ym);

  // No background bands — white only

  // Bars (single color: blue gradient)
  const barTopY = {};
  vals.forEach((v, i) => {
    const x = pl + i * step + (step - barW) / 2;
    const barH = ym > 0 ? (v / ym) * plotH : 0;
    barTopY[i] = barH > 0 ? (pb - barH) : pb;
    if (barH > 0) s += `<rect x="${x}" y="${pb-barH}" width="${barW}" height="${barH}" fill="url(#gB)" stroke="#444" stroke-width="0.088"/>`;
  });

  // X axis: condition names
  const xLY = pb + 2.0;
  conditions.forEach((c, i) => {
    const cx = pl + i * step + step / 2;
    // Truncate long names
    const label = c.length > 12 ? c.substring(0, 11) + '...' : c;
    s += `<text x="${cx}" y="${xLY}" font-size="1.411" fill="#333" text-anchor="middle">${label}</text>`;
  });

  // Target name bracket
  const rY = xLY + 2.0;
  const rL = pl + step * 0.05, rR = pl + (nBars - 1) * step + step * 0.95;
  s += bracketDown(rL, rR, rY - 0.5, 0.5);
  const lbl = graphLabel || gpcr;
  s += `<text x="${(rL+rR)/2}" y="${rY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">${lbl}</text>`;

  return s;
}

/* ── Shared: axes ────────────────────────────────────────── */
function renderAxes(ox, pl, pr, pt, pb, plotH, ym) {
  let s = '';
  s += `<text x="${ox+1.5}" y="${(pt+pb)/2}" font-size="2.117" fill="#333" text-anchor="middle" transform="rotate(-90,${ox+1.5},${(pt+pb)/2})">SEAP (Vmax)</text>`;
  s += `<line x1="${pl}" y1="${pt}" x2="${pl}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;
  s += `<line x1="${pl}" y1="${pb}" x2="${pr}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;
  for (let i = 0; i <= 5; i++) {
    const val = (ym / 5) * i, y = pb - (i / 5) * plotH;
    s += `<text x="${pl-1.0}" y="${y+0.4}" font-size="1.058" fill="#666" text-anchor="end">${val === 0 ? '0' : fmtYTick(val)}</text>`;
    if (i > 0 && i < 5) s += `<line x1="${pl}" y1="${y}" x2="${pr}" y2="${y}" stroke="#e0e0e0" stroke-width="0.088"/>`;
  }
  return s;
}

/* ── Helpers ─────────────────────────────────────────────── */
function splitLabel(label) {
  if (label.includes('-iTango-')) { const i=label.indexOf('-iTango-');return{line1:`${label.substring(0,i)}-<tspan font-style="italic">i</tspan>Tango-`,line2:label.substring(i+8)}; }
  if (label.includes('-LAUNCHER')) { const i=label.indexOf('-LAUNCHER');return{line1:label.substring(0,i)+'-',line2:'LAUNCHER'}; }
  if (label.length > 15) { const mid=Math.ceil(label.length/2),sp=label.indexOf('-',mid-5);if(sp>0)return{line1:label.substring(0,sp+1),line2:label.substring(sp+1)}; }
  return { line1: label, line2: null };
}

function bracketDown(x1, x2, y, h) {
  return `<path d="M${x1},${y} L${x1},${y+h} L${x2},${y+h} L${x2},${y}" fill="none" stroke="#333" stroke-width="0.088"/>`;
}

function ceilYMax(mxh) {
  if(mxh<=0)return 1;if(mxh<=2)return Math.ceil(mxh*2)/2;if(mxh<=5)return Math.ceil(mxh);
  if(mxh<=10)return Math.ceil(mxh/2)*2;if(mxh<=50)return Math.ceil(mxh/10)*10;if(mxh<=100)return Math.ceil(mxh/20)*20;
  if(mxh<=500)return Math.ceil(mxh/100)*100;if(mxh<=1000)return Math.ceil(mxh/200)*200;if(mxh<=2000)return Math.ceil(mxh/400)*400;
  if(mxh<=5000)return Math.ceil(mxh/1000)*1000;return Math.ceil(mxh/2000)*2000;
}

function fmtYTick(v) {
  if(v>=1000)return(v/1000).toFixed(v%1000===0?0:1)+'k';if(Number.isInteger(v))return v.toString();return v.toFixed(1);
}
