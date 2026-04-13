/* ============================================================
   GPCR SVG Chart Generator — v8
   - Mode A/B layout
   - Control include (12 bars) / exclude (8 bars)
   - Fold text centered ON bracket line with tight-fit white box
   - Y-axis: label ox+1.5, numbers pl-1.0
   - Fold <g> rendered last (z-order topmost)
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

  // Data map + label map
  const dataMap = {}, labelMap = {};
  tableData.forEach(d => { if (!dataMap[d.receptor]) dataMap[d.receptor] = {}; dataMap[d.receptor][d.platform] = d; labelMap[d.receptor] = d.graphLabel || d.receptor; });

  // Panel list
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
  svg += renderLegend(W);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      const gpcr = panelList[idx];
      if (!gpcr) continue;
      svg += renderPanel(gpcr, dataMap[gpcr], ML + col * (pw + GAP), MT + row * (ph + GAP), pw, ph, includeCtrl, labelMap[gpcr]);
    }
  }
  svg += '</svg>';
  return svg;
}

/* ── Legend ───────────────────────────────────────────────── */
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

/* ── Panel ───────────────────────────────────────────────── */
function renderPanel(gpcr, recData, ox, oy, pw, ph, includeCtrl, graphLabel) {
  let s = '';
  const pl = ox + 5.8, pr = ox + pw - 0.6;
  const pt = oy + 1.0, pb = oy + ph - 10.0;
  const plotW = pr - pl, plotH = pb - pt;
  if (plotH <= 0) return s;

  const platforms = ['LNC1.0', 'LNC2.0'];
  const nPerGroup = includeCtrl ? 6 : 4; // bars per LNC group
  const totalBars = nPerGroup * 2;
  const gapMid = 2.5;
  const step = (plotW - gapMid) / totalBars;
  const barW = step * 0.72;

  // Collect bar data
  // includeCtrl: [Ctrl-D, Ctrl-B, ATG-D, ATG-B, AG-D, AG-B] x 2
  // no ctrl:     [ATG-D, ATG-B, AG-D, AG-B] x 2
  const bars = []; // {idx, value, type:'dark'|'blue', condKey}
  const barValues = [];

  platforms.forEach((plat, pi) => {
    const baseOff = pi * nPerGroup;
    if (!recData || !recData[plat]) {
      for (let i = 0; i < nPerGroup; i++) bars.push({ idx: baseOff + i, value: 0, type: i % 2 === 0 ? 'dark' : 'blue', condKey: '' });
    } else {
      const d = recData[plat], conds = Object.keys(d.conditions);
      const ctrlC = conds.find(c => c.startsWith('control'));
      const atgC = conds.find(c => c.startsWith('antagonist'));
      const agC = conds.find(c => c.startsWith('agonist'));

      let barIdx = baseOff;
      if (includeCtrl) {
        const cD = ctrlC ? (d.conditions[ctrlC]?.dark || 0) : 0;
        const cB = ctrlC ? (d.conditions[ctrlC]?.blue || 0) : 0;
        bars.push({ idx: barIdx++, value: cD, type: 'dark', condKey: 'ctrl' });
        bars.push({ idx: barIdx++, value: cB, type: 'blue', condKey: 'ctrl' });
        barValues.push(cD, cB);
      }
      const atgD = atgC ? (d.conditions[atgC]?.dark || 0) : 0;
      const atgB = atgC ? (d.conditions[atgC]?.blue || 0) : 0;
      bars.push({ idx: barIdx++, value: atgD, type: 'dark', condKey: 'atg' });
      bars.push({ idx: barIdx++, value: atgB, type: 'blue', condKey: 'atg' });
      const agD = agC ? (d.conditions[agC]?.dark || 0) : 0;
      const agB = agC ? (d.conditions[agC]?.blue || 0) : 0;
      bars.push({ idx: barIdx++, value: agD, type: 'dark', condKey: 'ag' });
      bars.push({ idx: barIdx++, value: agB, type: 'blue', condKey: 'ag' });
      barValues.push(atgD, atgB, agD, agB);
    }
  });

  const dataMax = barValues.length > 0 ? Math.max(...barValues) : 1;
  const ym = ceilYMax(dataMax * 1.55);
  const v2y = v => pb - (v / ym) * plotH;

  // Y axis label — ox+1.5
  s += `<text x="${ox+1.5}" y="${(pt+pb)/2}" font-size="2.117" fill="#333" text-anchor="middle" transform="rotate(-90,${ox+1.5},${(pt+pb)/2})">SEAP (Vmax)</text>`;
  // L-axis
  s += `<line x1="${pl}" y1="${pt}" x2="${pl}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;
  s += `<line x1="${pl}" y1="${pb}" x2="${pr}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;

  // Y ticks — numbers at pl-1.0
  for (let i = 0; i <= 5; i++) {
    const val = (ym / 5) * i, y = pb - (i / 5) * plotH;
    s += `<text x="${pl-1.0}" y="${y+0.4}" font-size="1.058" fill="#666" text-anchor="end">${val === 0 ? '0' : fmtYTick(val)}</text>`;
    if (i > 0 && i < 5) s += `<line x1="${pl}" y1="${y}" x2="${pr}" y2="${y}" stroke="#e0e0e0" stroke-width="0.088"/>`;
  }

  // Bar X helper
  const barX = idx => pl + idx * step + (idx >= nPerGroup ? gapMid : 0);
  const barCX = idx => barX(idx) + step / 2;

  // Background bands
  if (includeCtrl) {
    // Per LNC group: ctrl(0,1) = no band, atg(2,3) = #EBEBEB, ag(4,5) = #F8DFB1
    [0, nPerGroup].forEach(base => {
      const atgStart = base + 2, agStart = base + 4;
      const xAtg = barX(atgStart) - step * 0.14;
      s += `<rect x="${xAtg}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#EBEBEB"/>`;
      const xAg = barX(agStart) - step * 0.14;
      s += `<rect x="${xAg}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#F8DFB1"/>`;
    });
  } else {
    // atg(0,1 / 4,5) = #EBEBEB, ag(2,3 / 6,7) = #F8DFB1
    [0, nPerGroup].forEach(base => {
      const xAtg = barX(base) - step * 0.14;
      s += `<rect x="${xAtg}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#EBEBEB"/>`;
      const xAg = barX(base + 2) - step * 0.14;
      s += `<rect x="${xAg}" y="${pt}" width="${step*2+step*0.28}" height="${plotH}" fill="#F8DFB1"/>`;
    });
  }

  // LNC divider
  const divX = barX(nPerGroup) - gapMid / 2;
  s += `<line x1="${divX}" y1="${pt}" x2="${divX}" y2="${pb}" stroke="#BCBCBB" stroke-width="0.088" stroke-dasharray="0.8,0.5"/>`;

  // Draw bars & record tops
  const barTopY = {};
  bars.forEach(bar => {
    const x = barX(bar.idx) + (step - barW) / 2;
    const barH = ym > 0 ? (bar.value / ym) * plotH : 0;
    const y = pb - barH;
    barTopY[bar.idx] = barH > 0 ? y : pb;
    if (barH > 0) s += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${bar.type === 'dark' ? 'url(#gD)' : 'url(#gB)'}" stroke="#444" stroke-width="0.088"/>`;
  });

  // ── Fold brackets (rendered as polylines first, then <g> on top) ──
  let bracketLines = '';
  const foldGroups = []; // collect for z-order last

  if (recData) {
    platforms.forEach((plat, pi) => {
      if (!recData[plat] || !recData[plat].ratios) return;
      const ratios = recData[plat].ratios;
      const base = pi * nPerGroup;

      // Determine bar indices for ATG-D, ATG-B, AG-D, AG-B
      const atgDIdx = includeCtrl ? base + 2 : base + 0;
      const atgBIdx = includeCtrl ? base + 3 : base + 1;
      const agDIdx = includeCtrl ? base + 4 : base + 2;
      const agBIdx = includeCtrl ? base + 5 : base + 3;

      const pairs = [
        { label: 'AG-B/ATG-D', color: '#d32f2f', fromIdx: atgDIdx, toIdx: agBIdx, level: 0 },
        { label: 'AG-B/ATG-B', color: '#1976d2', fromIdx: atgBIdx, toIdx: agBIdx, level: 1 },
        { label: 'AG-B/AG-D',  color: '#388e3c', fromIdx: agDIdx,  toIdx: agBIdx, level: 2 },
      ];

      // Group top for bracket placement
      const groupBars = includeCtrl
        ? [base+2, base+3, base+4, base+5]
        : [base, base+1, base+2, base+3];
      const groupTop = Math.min(...groupBars.map(i => barTopY[i] ?? pb));

      pairs.forEach(bp => {
        const ratio = ratios[bp.label] || 0;
        if (ratio === 0) return;

        const bracketY = groupTop - 1.2 - bp.level * 2.0;
        const cf = barCX(bp.fromIdx), ct = barCX(bp.toIdx);
        const yFrom = barTopY[bp.fromIdx] ?? pb;
        const yTo = barTopY[bp.toIdx] ?? pb;

        // Polyline: from bar top → up → across → down → to bar top
        bracketLines += `<polyline points="${cf},${yFrom} ${cf},${bracketY} ${ct},${bracketY} ${ct},${yTo}" fill="none" stroke="${bp.color}" stroke-width="0.088"/>`;

        // Fold text — centered ON bracket line
        const midX = (cf + ct) / 2;
        const foldStr = ratio >= 100 ? Math.round(ratio) + 'x' : ratio.toFixed(1) + 'x';
        const tw = foldStr.length * 0.45 + 0.2; // tight fit width
        const th = 1.2; // text height

        foldGroups.push(`<g><rect x="${midX - tw/2}" y="${bracketY - th/2}" width="${tw}" height="${th}" fill="white"/><text x="${midX}" y="${bracketY}" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-size="0.882" fill="${bp.color}">${foldStr}</text></g>`);
      });
    });
  }

  s += bracketLines;
  // Fold <g> groups: z-order LAST (topmost)
  foldGroups.forEach(g => { s += g; });

  // ── X axis labels ─────────────────────────────────────────
  const xLabelY = pb + 2.0;
  for (let i = 0; i < totalBars; i++) {
    const label = (i % 2 === 0) ? 'Dark' : 'Blue';
    s += `<text x="${barCX(i)}" y="${xLabelY}" font-size="1.411" fill="#333" text-anchor="middle">${label}</text>`;
  }

  // LNC brackets
  const lncY = xLabelY + 2.0;
  const lnc1L = barX(0) + step * 0.1, lnc1R = barX(nPerGroup - 1) + step * 0.9;
  const lnc2L = barX(nPerGroup) + step * 0.1, lnc2R = barX(totalBars - 1) + step * 0.9;
  s += bracketDown(lnc1L, lnc1R, lncY - 0.5, 0.5);
  s += bracketDown(lnc2L, lnc2R, lncY - 0.5, 0.5);
  s += `<text x="${(lnc1L+lnc1R)/2}" y="${lncY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">LNC 1.0</text>`;
  s += `<text x="${(lnc2L+lnc2R)/2}" y="${lncY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">LNC 2.0</text>`;

  // Receptor bracket
  const recY = lncY + 3.6;
  const recL = pl + step * 0.05, recR = pr - step * 0.05;
  s += bracketDown(recL, recR, recY - 0.5, 0.5);
  // Dynamic label from graphLabel (e.g. "CHRM1-iTango-LAUNCHER", "Target-LAUNCHER", "PromoterA")
  const fullLabel = graphLabel || (DISPLAY_NAME[gpcr] || gpcr);
  const labelParts = splitLabel(fullLabel);
  s += `<text x="${(recL+recR)/2}" y="${recY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">${labelParts.line1}</text>`;
  if (labelParts.line2) s += `<text x="${(recL+recR)/2}" y="${recY+3.5}" font-size="1.411" fill="#333" text-anchor="middle">${labelParts.line2}</text>`;

  return s;
}

function splitLabel(label) {
  // "CHRM1-iTango-LAUNCHER" → line1: "CHRM1-iTango-", line2: "LAUNCHER"
  // "Target-LAUNCHER" → line1: "Target-", line2: "LAUNCHER"
  // "PromoterA" → line1: "PromoterA", line2: null
  if (label.includes('-iTango-')) {
    const i = label.indexOf('-iTango-');
    const name = label.substring(0, i);
    const rest = label.substring(i + 8); // after "-iTango-"
    return { line1: `${name}-<tspan font-style="italic">i</tspan>Tango-`, line2: rest };
  }
  if (label.includes('-LAUNCHER')) {
    const i = label.indexOf('-LAUNCHER');
    return { line1: label.substring(0, i) + '-', line2: 'LAUNCHER' };
  }
  if (label.length > 15) {
    const mid = Math.ceil(label.length / 2);
    const sp = label.indexOf('-', mid - 5);
    if (sp > 0) return { line1: label.substring(0, sp + 1), line2: label.substring(sp + 1) };
  }
  return { line1: label, line2: null };
}

function bracketDown(x1, x2, y, h) {
  return `<path d="M${x1},${y} L${x1},${y+h} L${x2},${y+h} L${x2},${y}" fill="none" stroke="#333" stroke-width="0.088"/>`;
}

function ceilYMax(mxh) {
  if (mxh <= 0) return 1;
  if (mxh <= 2) return Math.ceil(mxh * 2) / 2;
  if (mxh <= 5) return Math.ceil(mxh);
  if (mxh <= 10) return Math.ceil(mxh / 2) * 2;
  if (mxh <= 50) return Math.ceil(mxh / 10) * 10;
  if (mxh <= 100) return Math.ceil(mxh / 20) * 20;
  if (mxh <= 500) return Math.ceil(mxh / 100) * 100;
  if (mxh <= 1000) return Math.ceil(mxh / 200) * 200;
  if (mxh <= 2000) return Math.ceil(mxh / 400) * 400;
  if (mxh <= 5000) return Math.ceil(mxh / 1000) * 1000;
  return Math.ceil(mxh / 2000) * 2000;
}

function fmtYTick(v) {
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
}
