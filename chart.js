/* ============================================================
   GPCR SVG Chart Generator — v7
   Mode A: all 23 GPCRs (4x6)
   Mode B: only provided GPCRs (4 cols, auto rows)
   ============================================================ */

const GPCR_FULL_ORDER = [
  'CHRM1','CHRM2','CHRM3','CHRM4',
  'CHRM5','HRH1','HRH2','HRH3',
  'HRH4','ADORA1','ADORA2A','ADORA2B',
  'ADORA3','HTR1A','HTR2A','HTR4',
  'HTR2C','ADRA1B','ADRA2B','ADRA2C',
  'ADRB2','Oxytocin','PACAP',''
];

const DISPLAY_NAME = { 'PACAP':'ADCYAP1', 'Oxytocin':'Oxytocin' };

function generateSVG(tableData, vizMode) {
  const W = 210;
  const ML = 7, MR = 7, MT = 9, MB = 3, GAP = 3.5;
  const COLS = 4;

  // Build data map
  const dataMap = {};
  tableData.forEach(d => { if (!dataMap[d.receptor]) dataMap[d.receptor] = {}; dataMap[d.receptor][d.platform] = d; });

  // Determine panel list
  let panelList;
  if (vizMode === 'A') {
    panelList = GPCR_FULL_ORDER;
  } else {
    // Mode B: only receptors in data, order by GPCR_FULL_ORDER
    const present = Object.keys(dataMap);
    panelList = GPCR_FULL_ORDER.filter(g => g && present.includes(g));
    // Add any not in GPCR_FULL_ORDER
    present.forEach(g => { if (!panelList.includes(g)) panelList.push(g); });
  }

  const ROWS = Math.ceil(panelList.length / COLS) || 1;
  // Pad to fill grid
  while (panelList.length < ROWS * COLS) panelList.push('');

  const pw = (W - ML - MR - GAP * (COLS - 1)) / COLS;
  const H_full = MT + MB + ROWS * ((297 - MT - MB - GAP * 5) / 6) + (ROWS - 1) * GAP;
  const ph = (H_full - MT - MB - GAP * (ROWS - 1)) / ROWS;
  const H = vizMode === 'A' ? 297 : Math.max(80, H_full);

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
      const ox = ML + col * (pw + GAP);
      const oy = MT + row * (ph + GAP);
      svg += renderPanel(gpcr, dataMap[gpcr], ox, oy, pw, ph);
    }
  }

  svg += '</svg>';
  return svg;
}

/* ── Legend ──────────────────────────────────────────────── */
function renderLegend(W) {
  const lx = W - 7 - 52, ly = 1.5, lw = 52, lh = 8;
  let s = `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="0.8" fill="#fff" stroke="#C0C0C0" stroke-width="0.353"/>`;
  const items = [
    { label:'Antagonist', color:'#EBEBEB', x:lx+2 },
    { label:'Agonist', color:'#F8DFB1', x:lx+15 },
    { label:'DARK', fill:'url(#gD)', x:lx+27 },
    { label:'BLUE', fill:'url(#gB)', x:lx+37 },
  ];
  items.forEach(it => {
    s += `<rect x="${it.x}" y="${ly+1.5}" width="3" height="2" rx="0.3" fill="${it.fill||it.color}" stroke="#444" stroke-width="0.088"/>`;
    s += `<text x="${it.x+3.8}" y="${ly+3.2}" font-size="2.117" fill="#333">${it.label}</text>`;
  });
  s += `<text x="${lx+lw/2}" y="${ly+6.5}" font-size="1.058" fill="#888" text-anchor="middle">2h ON / 28h OFF</text>`;
  return s;
}

/* ── Panel ──────────────────────────────────────────────── */
function renderPanel(gpcr, recData, ox, oy, pw, ph) {
  let s = '';
  const pl = ox + 5.8, pr = ox + pw - 0.6;
  const pt = oy + 1.0, pb = oy + ph - 10.0;
  const plotW = pr - pl, plotH = pb - pt;
  if (plotH <= 0) return s;

  const platforms = ['LNC1.0', 'LNC2.0'];
  const barData = []; // [{dark,blue,condType,platform}]
  const barValues = [];

  platforms.forEach(plat => {
    if (!recData || !recData[plat]) {
      barData.push({ dark:0, blue:0, condType:'atg', platform:plat });
      barData.push({ dark:0, blue:0, condType:'ag', platform:plat });
    } else {
      const d = recData[plat], conds = Object.keys(d.conditions);
      const atgC = conds.find(c => c.startsWith('antagonist'));
      const agC = conds.find(c => c.startsWith('agonist'));
      const atgD = atgC ? (d.conditions[atgC]?.dark||0) : 0;
      const atgB = atgC ? (d.conditions[atgC]?.blue||0) : 0;
      const agD = agC ? (d.conditions[agC]?.dark||0) : 0;
      const agB = agC ? (d.conditions[agC]?.blue||0) : 0;
      barData.push({ dark:atgD, blue:atgB, condType:'atg', platform:plat });
      barData.push({ dark:agD, blue:agB, condType:'ag', platform:plat });
      barValues.push(atgD, atgB, agD, agB);
    }
  });

  const dataMax = barValues.length > 0 ? Math.max(...barValues) : 1;
  const ym = ceilYMax(dataMax * 1.55);
  const v2y = v => pb - (v / ym) * plotH;

  // Y axis label
  s += `<text x="${ox+2.8}" y="${(pt+pb)/2}" font-size="2.117" fill="#333" text-anchor="middle" transform="rotate(-90,${ox+2.8},${(pt+pb)/2})">SEAP (Vmax)</text>`;
  // L-axis
  s += `<line x1="${pl}" y1="${pt}" x2="${pl}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;
  s += `<line x1="${pl}" y1="${pb}" x2="${pr}" y2="${pb}" stroke="#333" stroke-width="0.088"/>`;

  // Y ticks
  for (let i = 0; i <= 5; i++) {
    const val = (ym / 5) * i, y = pb - (i / 5) * plotH;
    s += `<text x="${pl-0.5}" y="${y+0.4}" font-size="1.058" fill="#666" text-anchor="end">${val===0?'0':fmtYTick(val)}</text>`;
    if (i > 0 && i < 5) s += `<line x1="${pl}" y1="${y}" x2="${pr}" y2="${y}" stroke="#e0e0e0" stroke-width="0.088"/>`;
  }

  // Bars: 8 per panel
  const gapMid = 2.5;
  const step = (plotW - gapMid) / 8;
  const barW = step * 0.72;

  // Flatten bars: [ATG-D, ATG-B, AG-D, AG-B] x 2 platforms
  const bars = [];
  barData.forEach((bd, gi) => {
    const platOff = gi < 2 ? 0 : 4;
    const condOff = gi % 2 === 0 ? 0 : 2;
    const base = platOff + condOff;
    bars.push({ idx:base, value:bd.dark, type:'dark' });
    bars.push({ idx:base+1, value:bd.blue, type:'blue' });
  });

  // Background bands
  [0,2,4,6].forEach(si => {
    const x1 = pl + si * step + (si >= 4 ? gapMid : 0) - step * 0.14;
    const w = step * 2 + step * 0.28;
    s += `<rect x="${x1}" y="${pt}" width="${w}" height="${plotH}" fill="${(si===0||si===4)?'#EBEBEB':'#F8DFB1'}"/>`;
  });

  // LNC divider
  s += `<line x1="${pl+4*step+gapMid/2}" y1="${pt}" x2="${pl+4*step+gapMid/2}" y2="${pb}" stroke="#BCBCBB" stroke-width="0.088" stroke-dasharray="0.8,0.5"/>`;

  // Draw bars & record tops
  const barTopY = {}; // idx -> y top of bar
  bars.forEach(bar => {
    const x = pl + bar.idx * step + (bar.idx >= 4 ? gapMid : 0) + (step - barW) / 2;
    const barH = ym > 0 ? (bar.value / ym) * plotH : 0;
    const y = pb - barH;
    barTopY[bar.idx] = y;
    if (barH > 0) s += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${bar.type==='dark'?'url(#gD)':'url(#gB)'}" stroke="#444" stroke-width="0.088"/>`;
    else barTopY[bar.idx] = pb;
  });

  // Bar center X helper
  const barCX = idx => pl + idx * step + (idx >= 4 ? gapMid : 0) + step / 2;

  // ── Fold brackets ────────────────────────────────────────
  if (recData) {
    platforms.forEach((plat, pi) => {
      if (!recData[plat] || !recData[plat].ratios) return;
      const ratios = recData[plat].ratios;
      const base = pi * 4;

      // AG-B = base+3, AG-D = base+2, ATG-B = base+1, ATG-D = base+0
      const agBIdx = base + 3;
      const pairs = [
        { label:'AG-B/ATG-D', color:'#d32f2f', fromIdx:base+0, toIdx:agBIdx, level:0 },
        { label:'AG-B/ATG-B', color:'#1976d2', fromIdx:base+1, toIdx:agBIdx, level:1 },
        { label:'AG-B/AG-D',  color:'#388e3c', fromIdx:base+2, toIdx:agBIdx, level:2 },
      ];

      // Group top = min of all bar tops in this platform group
      const groupTop = Math.min(barTopY[base]||pb, barTopY[base+1]||pb, barTopY[base+2]||pb, barTopY[base+3]||pb);

      pairs.forEach(bp => {
        const ratio = ratios[bp.label] || 0;
        if (ratio === 0) return;

        const bracketY = groupTop - 1.2 - bp.level * 2.0;
        const cf = barCX(bp.fromIdx), ct_x = barCX(bp.toIdx);
        const yFrom = barTopY[bp.fromIdx] || pb;
        const yTo = barTopY[bp.toIdx] || pb;

        // Polyline: from bar top → up → across → down → to bar top
        s += `<polyline points="${cf},${yFrom} ${cf},${bracketY} ${ct_x},${bracketY} ${ct_x},${yTo}" fill="none" stroke="${bp.color}" stroke-width="0.088"/>`;

        // Fold value (ABOVE bracket line)
        const midX = (cf + ct_x) / 2;
        const foldStr = ratio >= 100 ? Math.round(ratio) + 'x' : ratio.toFixed(1) + 'x';
        s += `<g>`;
        s += `<rect x="${midX-3.5}" y="${bracketY-2.0}" width="7" height="1.6" fill="#fff"/>`;
        s += `<text x="${midX}" y="${bracketY-0.6}" font-size="0.882" font-weight="bold" fill="${bp.color}" text-anchor="middle">${foldStr}</text>`;
        s += `</g>`;
        // Stars placeholder (BELOW bracket line) — shown only if ANOVA data present
        // s += `<text x="${midX}" y="${bracketY+1.0}" font-size="0.706" fill="${bp.color}" text-anchor="middle">**</text>`;
      });
    });
  }

  // ── X axis labels ────────────────────────────────────────
  const xLabelY = pb + 2.0;

  // "Dark" / "Blue" labels (full text, not D/B)
  for (let i = 0; i < 8; i++) {
    const x = barCX(i);
    const label = (i % 2 === 0) ? 'Dark' : 'Blue';
    s += `<text x="${x}" y="${xLabelY}" font-size="1.411" fill="#333" text-anchor="middle">${label}</text>`;
  }

  // LNC brackets
  const lncY = xLabelY + 2.0;
  const lnc1L = pl + step * 0.15, lnc1R = pl + 3 * step + step * 0.85;
  const lnc2L = pl + 4 * step + gapMid + step * 0.15, lnc2R = pl + 7 * step + gapMid + step * 0.85;
  s += bracketDown(lnc1L, lnc1R, lncY - 0.5, 0.5);
  s += bracketDown(lnc2L, lnc2R, lncY - 0.5, 0.5);
  s += `<text x="${(lnc1L+lnc1R)/2}" y="${lncY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">LNC 1.0</text>`;
  s += `<text x="${(lnc2L+lnc2R)/2}" y="${lncY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">LNC 2.0</text>`;

  // Receptor bracket
  const recY = lncY + 3.6;
  const recL = pl + step * 0.05, recR = pr - step * 0.05;
  s += bracketDown(recL, recR, recY - 0.5, 0.5);
  const displayName = DISPLAY_NAME[gpcr] || gpcr;
  s += `<text x="${(recL+recR)/2}" y="${recY+2.0}" font-size="1.411" fill="#333" text-anchor="middle">${displayName}-<tspan font-style="italic">i</tspan>Tango-</text>`;
  s += `<text x="${(recL+recR)/2}" y="${recY+3.5}" font-size="1.411" fill="#333" text-anchor="middle">LAUNCHER</text>`;

  return s;
}

function bracketDown(x1, x2, y, h) {
  return `<path d="M${x1},${y} L${x1},${y+h} L${x2},${y+h} L${x2},${y}" fill="none" stroke="#333" stroke-width="0.088"/>`;
}

/* ── Y max ceiling ──────────────────────────────────────── */
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
