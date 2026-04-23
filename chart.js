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
  'HTR2C','ADRA1B','ADRA2B','ADRA2C','ADRB2','Oxytocin','PACAP',''
];
const DISPLAY_NAME = { 'PACAP':'ADCYAP1', 'Oxytocin':'Oxytocin' };

function generateSVG(tableData, vizMode, ctrlMode) {
  const W = 210, ML = 7, MR = 7, MT = 9, MB = 3, GAP = 3.5, COLS = 4;
  const includeCtrl = (ctrlMode === 'include');

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

  const nPlat=platforms.length;
  const nPG=includeCtrl?6:4, totalBars=nPG*nPlat;
  const gapMid=nPlat>1?2.5:0, totalGap=gapMid*(nPlat-1);
  const step=(plotW-totalGap)/totalBars, barW=step*0.72;

  const bars=[],barValues=[];
  platforms.forEach((plat,pi)=>{const bo=pi*nPG;
    if(!recData||!recData[plat]){for(let i=0;i<nPG;i++)bars.push({idx:bo+i,value:0,type:i%2===0?'dark':'blue'});}
    else{const d=recData[plat],conds=Object.keys(d.conditions);
      const ctrlC=conds.find(c=>c.startsWith('control')),atgC=conds.find(c=>c.startsWith('antagonist')),agC=conds.find(c=>c.startsWith('agonist'));
      let bi=bo;
      if(includeCtrl){const cD=ctrlC?(d.conditions[ctrlC]?.dark||0):0,cB=ctrlC?(d.conditions[ctrlC]?.blue||0):0;bars.push({idx:bi++,value:cD,type:'dark'},{idx:bi++,value:cB,type:'blue'});barValues.push(cD,cB);}
      const tD=atgC?(d.conditions[atgC]?.dark||0):0,tB=atgC?(d.conditions[atgC]?.blue||0):0;bars.push({idx:bi++,value:tD,type:'dark'},{idx:bi++,value:tB,type:'blue'});
      const aD=agC?(d.conditions[agC]?.dark||0):0,aB=agC?(d.conditions[agC]?.blue||0):0;bars.push({idx:bi++,value:aD,type:'dark'},{idx:bi++,value:aB,type:'blue'});
      barValues.push(tD,tB,aD,aB);
    }
  });

  const ym=ceilYMax((barValues.length>0?Math.max(...barValues):1)*1.25);
  s+=renderAxes(ox,pl,pr,pt,pb,plotH,ym);

  const barX=idx=>pl+idx*step+Math.floor(idx/nPG)*gapMid;
  const barCX=idx=>barX(idx)+step/2;

  // Background bands (per platform group)
  for(let p=0;p<nPlat;p++){const base=p*nPG;
    if(includeCtrl){s+=`<rect x="${barX(base+2)-step*0.14}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#EBEBEB"/>`;s+=`<rect x="${barX(base+4)-step*0.14}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#F8DFB1"/>`;}
    else{s+=`<rect x="${barX(base)-step*0.14}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#EBEBEB"/>`;s+=`<rect x="${barX(base+2)-step*0.14}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#F8DFB1"/>`;}
  }

  // Platform dividers
  for(let p=1;p<nPlat;p++){s+=`<line x1="${barX(p*nPG)-gapMid/2}" y1="${pt}" x2="${barX(p*nPG)-gapMid/2}" y2="${pb}" stroke="#BCBCBB" stroke-width="0.088" stroke-dasharray="0.8,0.5"/>`;}

  // Bars
  const barTopY={};
  bars.forEach(bar=>{const x=barX(bar.idx)+(step-barW)/2,bH=ym>0?(bar.value/ym)*plotH:0;barTopY[bar.idx]=bH>0?(pb-bH):pb;if(bH>0)s+=`<rect x="${x}" y="${pb-bH}" width="${barW}" height="${bH}" fill="${bar.type==='dark'?'url(#gD)':'url(#gB)'}" stroke="#444" stroke-width="0.088"/>`;});

  // Fold brackets
  let bLines='';const fGroups=[];
  if(recData){platforms.forEach((plat,pi)=>{if(!recData[plat]?.ratios)return;const ratios=recData[plat].ratios,base=pi*nPG;
    const tDI=includeCtrl?base+2:base,tBI=includeCtrl?base+3:base+1,aDI=includeCtrl?base+4:base+2,aBI=includeCtrl?base+5:base+3;
    const pairs=[{l:'AG-B/ATG-D',c:'#d32f2f',f:tDI,t:aBI,lv:0},{l:'AG-B/ATG-B',c:'#1976d2',f:tBI,t:aBI,lv:1},{l:'AG-B/AG-D',c:'#388e3c',f:aDI,t:aBI,lv:2}];
    const gBars=includeCtrl?[base+2,base+3,base+4,base+5]:[base,base+1,base+2,base+3];
    const gTop=Math.min(...gBars.map(i=>barTopY[i]??pb));
    pairs.forEach(bp=>{const r=ratios[bp.l]||0;if(!r)return;const by=gTop-1.2-bp.lv*2.0,cf=barCX(bp.f),ct=barCX(bp.t),yf=barTopY[bp.f]??pb,yt=barTopY[bp.t]??pb;
      bLines+=`<polyline points="${cf},${yf} ${cf},${by} ${ct},${by} ${ct},${yt}" fill="none" stroke="${bp.c}" stroke-width="0.088"/>`;
      const mx=(cf+ct)/2,fs=r>=100?Math.round(r)+'x':r.toFixed(1)+'x',tw=fs.length*0.45+0.2;
      fGroups.push(`<g><rect x="${mx-tw/2}" y="${by-0.6}" width="${tw}" height="1.2" fill="white"/><text x="${mx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="0.882" fill="${bp.c}">${fs}</text></g>`);
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
  const step=(plotW-totalGap)/totalBars,barW=step*0.72;

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

  const ym=ceilYMax((barValues.length>0?Math.max(...barValues):1)*1.25);
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
  foldPairs.forEach(({dIdx,bIdx,fold})=>{
    if(!fold)return;
    const cf=barCX(dIdx),ct=barCX(bIdx);
    const yf=barTopY[dIdx]??pb,yt=barTopY[bIdx]??pb;
    const by=Math.min(yf,yt)-1.2;
    bLines+=`<polyline points="${cf},${yf} ${cf},${by} ${ct},${by} ${ct},${yt}" fill="none" stroke="#1976d2" stroke-width="0.088"/>`;
    const mx=(cf+ct)/2,fs=fold>=100?Math.round(fold)+'x':fold.toFixed(1)+'x',tw=fs.length*0.45+0.2;
    fGroups.push(`<g><rect x="${mx-tw/2}" y="${by-0.6}" width="${tw}" height="1.2" fill="white"/><text x="${mx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="0.882" fill="#1976d2">${fs}</text></g>`);
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
  const step=plotW/nBars,barW=step*0.65;

  const ym=ceilYMax((vals.length>0?Math.max(...vals):1)*1.25);
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
function ceilYMax(m){if(m<=0)return 1;if(m<=2)return Math.ceil(m*2)/2;if(m<=5)return Math.ceil(m);if(m<=10)return Math.ceil(m/2)*2;if(m<=50)return Math.ceil(m/10)*10;if(m<=100)return Math.ceil(m/20)*20;if(m<=500)return Math.ceil(m/100)*100;if(m<=1000)return Math.ceil(m/200)*200;if(m<=2000)return Math.ceil(m/400)*400;if(m<=5000)return Math.ceil(m/1000)*1000;return Math.ceil(m/2000)*2000;}
function fmtYTick(v){if(v>=1000)return(v/1000).toFixed(v%1000===0?0:1)+'k';if(Number.isInteger(v))return v.toString();return v.toFixed(1);}
