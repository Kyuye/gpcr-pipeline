/* ============================================================
   SynBio Data Pipeline – App v8
   12 steps (0..11)
   ============================================================ */

const state = {
  currentStep: 0,
  totalSteps: 12,
  workbook: null, sheetData: {}, sheetNames: [],

  // Q0
  expType: '',           // 'opto' | 'non-opto'
  optoSystem: '',        // 'gpcr' | 'launcher' | 'opto-custom'
  optoCustomName: '',
  targetType: '',        // 'gpcr-list' | 'custom-target'

  q1Description: '',
  q2Platform: '', q2CustomPlatform: '',
  q3CondType: '',
  q3AtgConc: '', q3AgConc: '',
  q3AtgConcs: [], q3AgConcs: [],
  q3CType: '', q3CConc: '',
  q3DConditions: [],
  q6Replicate: '',
  ctrlMode: 'exclude',  // 'include' | 'exclude'
  vizMode: '',
  masterWorkbook: null,

  receptors: [],
  table1Data: null, svgContent: '',

  // Drag-select
  modalActiveSheet: null, activeSlotKey: null,
  dragStart: null, dragEnd: null, isDragging: false,
};

/* ── Helpers ─────────────────────────────────────────────── */
function isOpto(){return state.expType==='opto';}
function colLetter(n){let s='';n++;while(n>0){n--;s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26);}return s;}
function rangeString(r1,c1,r2,c2){const sr=Math.min(r1,r2),er=Math.max(r1,r2),sc=Math.min(c1,c2),ec=Math.max(c1,c2);return sr===er&&sc===ec?`${colLetter(sc)}${sr+1}`:`${colLetter(sc)}${sr+1}:${colLetter(ec)}${er+1}`;}
function getPlatforms(){if(state.q2Platform==='both')return['LNC1.0','LNC2.0'];if(state.q2Platform==='custom')return[state.q2CustomPlatform||'Custom'];return[state.q2Platform||'LNC1.0'];}
function getConditionLabels(){
  const ct=state.q3CondType||'A';
  if(ct==='A')return['control',`antagonist(${state.q3AtgConc||'?'})`,`agonist(${state.q3AgConc||'?'})`];
  if(ct==='B'){const l=['control'];(state.q3AtgConcs||[]).forEach(c=>l.push(`antagonist(${c})`));(state.q3AgConcs||[]).forEach(c=>l.push(`agonist(${c})`));return l;}
  if(ct==='C'){return state.q3CType==='antagonist'?['control',`antagonist(${state.q3CConc||'?'})`]:['control',`agonist(${state.q3CConc||'?'})`];}
  return state.q3DConditions.length?state.q3DConditions:['control'];
}
function readQ3Values(){
  const ct=document.querySelector('input[name="condition-type"]:checked');if(ct)state.q3CondType=ct.value;
  if(state.q3CondType==='A'){state.q3AtgConc=document.getElementById('atg-conc').value.trim();state.q3AgConc=document.getElementById('ag-conc').value.trim();}
  else if(state.q3CondType==='B'){state.q3AtgConcs=document.getElementById('atg-concs').value.split(',').map(s=>s.trim()).filter(Boolean);state.q3AgConcs=document.getElementById('ag-concs').value.split(',').map(s=>s.trim()).filter(Boolean);}
  else if(state.q3CondType==='C'){state.q3CType=document.getElementById('c-type').value;state.q3CConc=document.getElementById('c-conc').value.trim();}
  else if(state.q3CondType==='D'){state.q3DConditions=document.getElementById('d-conditions').value.split(',').map(s=>s.trim()).filter(Boolean);}
}

/* ── DOM ─────────────────────────────────────────────────── */
const $steps=document.querySelectorAll('.wizard-step');
const $progSteps=document.querySelectorAll('.progress-bar .step');
const $btnPrev=document.getElementById('btn-prev');
const $btnNext=document.getElementById('btn-next');

/* ── Navigation ──────────────────────────────────────────── */
function goToStep(n){
  if(n<0||n>=state.totalSteps)return;
  $steps.forEach(s=>s.classList.remove('active'));$steps[n].classList.add('active');
  $progSteps.forEach((s,i)=>{s.classList.toggle('active',i===n);s.classList.toggle('done',i<n);});
  state.currentStep=n;$btnPrev.disabled=(n===0);
  $btnNext.textContent=(n===state.totalSteps-1)?'완료':'다음 →';
  $btnNext.disabled=(n===state.totalSteps-1);
  if(n===7)buildTables();if(n===10)renderChart();
}

function validateStep(n){
  switch(n){
    case 0: return !!state.workbook;
    case 1: {
      const r=document.querySelector('input[name="exp-type"]:checked');if(!r)return false;state.expType=r.value;
      if(r.value==='opto'){const s=document.querySelector('input[name="opto-system"]:checked');if(!s)return false;state.optoSystem=s.value;
        if(s.value==='opto-custom'){state.optoCustomName=document.getElementById('opto-custom-name').value.trim();if(!state.optoCustomName)return false;}
      }
      // Q0-2 target type
      const tt=document.querySelector('input[name="target-type"]:checked');if(!tt)return false;state.targetType=tt.value;
      return true;
    }
    case 2: state.q1Description=document.getElementById('q1-answer').value.trim();return!!state.q1Description;
    case 3: {const r=document.querySelector('input[name="platform"]:checked');if(!r)return false;state.q2Platform=r.value;if(r.value==='custom'){state.q2CustomPlatform=document.getElementById('platform-custom-name').value.trim();return!!state.q2CustomPlatform;}return true;}
    case 4: {
      const ct=document.querySelector('input[name="condition-type"]:checked');if(!ct)return false;state.q3CondType=ct.value;
      if(ct.value==='A'){state.q3AtgConc=document.getElementById('atg-conc').value.trim();state.q3AgConc=document.getElementById('ag-conc').value.trim();return!!(state.q3AtgConc&&state.q3AgConc);}
      if(ct.value==='B'){state.q3AtgConcs=document.getElementById('atg-concs').value.split(',').map(s=>s.trim()).filter(Boolean);state.q3AgConcs=document.getElementById('ag-concs').value.split(',').map(s=>s.trim()).filter(Boolean);return state.q3AtgConcs.length>0||state.q3AgConcs.length>0;}
      if(ct.value==='C'){state.q3CType=document.getElementById('c-type').value;state.q3CConc=document.getElementById('c-conc').value.trim();return!!(state.q3CType&&state.q3CConc);}
      state.q3DConditions=document.getElementById('d-conditions').value.split(',').map(s=>s.trim()).filter(Boolean);return state.q3DConditions.length>=1;
    }
    case 5: return state.receptors.length>0;
    case 6: {const r=document.querySelector('input[name="replicate"]:checked');if(!r)return false;state.q6Replicate=r.value;return true;}
    case 7: return!!state.table1Data;
    case 8: {const r=document.querySelector('input[name="ctrl-mode"]:checked');if(!r)return false;state.ctrlMode=r.value;return true;}
    case 9: {const r=document.querySelector('input[name="viz-mode"]:checked');if(!r)return false;state.vizMode=r.value;return true;}
    case 10: return!!state.svgContent;
    default: return true;
  }
}

$btnNext.addEventListener('click',()=>{if(!validateStep(state.currentStep)){alert('필수 항목을 모두 입력해주세요.');return;}goToStep(state.currentStep+1);});
$btnPrev.addEventListener('click',()=>goToStep(state.currentStep-1));

/* ── Q0 toggles ──────────────────────────────────────────── */
document.querySelectorAll('input[name="exp-type"]').forEach(r=>r.addEventListener('change',()=>{
  document.getElementById('opto-subtype').classList.toggle('hidden',r.value!=='opto');
  document.getElementById('target-type-section').classList.remove('hidden'); // always show Q0-2
  updateLabelPreview();
}));
document.querySelectorAll('input[name="opto-system"]').forEach(r=>r.addEventListener('change',()=>{document.getElementById('opto-custom-field').classList.toggle('hidden',r.value!=='opto-custom');updateLabelPreview();}));
document.querySelectorAll('input[name="target-type"]').forEach(r=>r.addEventListener('change',()=>{updateLabelPreview();}));

function getGraphLabel(targetName){
  const et=state.expType||document.querySelector('input[name="exp-type"]:checked')?.value||'opto';
  const os=state.optoSystem||document.querySelector('input[name="opto-system"]:checked')?.value||'gpcr';
  const ocn=state.optoCustomName||document.getElementById('opto-custom-name')?.value?.trim()||'System';
  if(et==='non-opto') return targetName;
  if(os==='gpcr') return `${targetName}-iTango-LAUNCHER`;
  if(os==='launcher') return `${targetName}-LAUNCHER`;
  return `${targetName}-${ocn}`;
}

function updateLabelPreview(){
  const tt=document.querySelector('input[name="target-type"]:checked')?.value;
  const preview=document.getElementById('target-label-preview');
  const previewText=document.getElementById('label-preview-text');
  if(!tt){preview.classList.add('hidden');return;}
  preview.classList.remove('hidden');
  const exName=tt==='gpcr-list'?'CHRM1':'TargetName';
  previewText.textContent=getGraphLabel(exName);
}

/* ── Q2 custom ───────────────────────────────────────────── */
document.querySelectorAll('input[name="platform"]').forEach(r=>r.addEventListener('change',()=>{document.getElementById('platform-custom').classList.toggle('hidden',r.value!=='custom');}));

/* ── Q3 toggle ───────────────────────────────────────────── */
document.querySelectorAll('input[name="condition-type"]').forEach(r=>r.addEventListener('change',()=>{['cond-A','cond-B','cond-C','cond-D'].forEach(id=>document.getElementById(id).classList.add('hidden'));document.getElementById('cond-'+r.value).classList.remove('hidden');}));

/* ── Q9 viz toggle ───────────────────────────────────────── */
document.querySelectorAll('input[name="viz-mode"]').forEach(r=>r.addEventListener('change',()=>{document.getElementById('viz-mode-a-info').classList.toggle('hidden',r.value!=='A');}));

/* ── Master file ─────────────────────────────────────────── */
const $masterUpload=document.getElementById('master-upload-area'),$masterInput=document.getElementById('master-file-input');
$masterUpload.addEventListener('click',()=>$masterInput.click());
$masterInput.addEventListener('change',()=>{if(!$masterInput.files.length)return;const reader=new FileReader();reader.onload=e=>{state.masterWorkbook=XLSX.read(new Uint8Array(e.target.result),{type:'array'});document.getElementById('master-file-info').classList.remove('hidden');document.querySelector('.master-file-name').textContent=$masterInput.files[0].name+' 로드 완료';};reader.readAsArrayBuffer($masterInput.files[0]);});

/* ── File Upload ─────────────────────────────────────────── */
const $uploadArea=document.getElementById('upload-area'),$fileInput=document.getElementById('file-input');
$uploadArea.addEventListener('click',()=>$fileInput.click());
$uploadArea.addEventListener('dragover',e=>{e.preventDefault();$uploadArea.classList.add('dragover');});
$uploadArea.addEventListener('dragleave',()=>$uploadArea.classList.remove('dragover'));
$uploadArea.addEventListener('drop',e=>{e.preventDefault();$uploadArea.classList.remove('dragover');if(e.dataTransfer.files.length)handleFile(e.dataTransfer.files[0]);});
$fileInput.addEventListener('change',()=>{if($fileInput.files.length)handleFile($fileInput.files[0]);});
function handleFile(file){const reader=new FileReader();reader.onload=e=>{const d=new Uint8Array(e.target.result);state.workbook=XLSX.read(d,{type:'array'});state.sheetNames=state.workbook.SheetNames;state.sheetData={};state.sheetNames.forEach(n=>{state.sheetData[n]=XLSX.utils.sheet_to_json(state.workbook.Sheets[n],{header:1,defval:''});});document.getElementById('file-info').classList.remove('hidden');document.querySelector('.file-name').textContent=file.name;document.querySelector('.file-sheets').textContent=`${state.sheetNames.length}개 시트`;document.getElementById('sheet-preview').classList.remove('hidden');renderSheetTabs('sheet-tabs','preview-table',false);renderSheetTable(state.sheetNames[0],'preview-table',false);};reader.readAsArrayBuffer(file);}

/* ── Sheet rendering ─────────────────────────────────────── */
function renderSheetTabs(tabId,tableId,sel){const $t=document.getElementById(tabId);$t.innerHTML='';state.sheetNames.forEach((n,i)=>{const tab=document.createElement('div');tab.className='sheet-tab'+(i===0?' active':'');tab.textContent=n;tab.addEventListener('click',()=>{$t.querySelectorAll('.sheet-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');if(sel)state.modalActiveSheet=n;renderSheetTable(n,tableId,sel);});$t.appendChild(tab);});}
function renderSheetTable(sn,tid,sel){const rows=state.sheetData[sn]||[];const $t=document.getElementById(tid);$t.innerHTML='';if(!rows.length)return;const mc=Math.max(...rows.map(r=>r.length));const hr=document.createElement('tr');hr.innerHTML='<th style="background:#e8eaed;min-width:36px;position:sticky;left:0;z-index:2"></th>';for(let c=0;c<mc;c++)hr.innerHTML+=`<th style="background:#e8eaed;font-size:11px;color:#666">${colLetter(c)}</th>`;$t.appendChild(hr);const mr=Math.min(rows.length,80);for(let r=0;r<mr;r++){const tr=document.createElement('tr');tr.innerHTML=`<td class="row-header" style="font-size:11px;color:#666;min-width:36px">${r+1}</td>`;for(let c=0;c<mc;c++){const v=rows[r][c]!==undefined?rows[r][c]:'';const td=document.createElement('td');td.textContent=v;if(sel){td.dataset.row=r;td.dataset.col=c;}tr.appendChild(td);}$t.appendChild(tr);}}

/* ── Replicate ───────────────────────────────────────────── */
document.querySelectorAll('input[name="replicate"]').forEach(r=>r.addEventListener('change',()=>{const info=document.getElementById('replicate-info');if(r.value==='yes'){info.classList.remove('hidden');renderReplicateUI();}else info.classList.add('hidden');}));
function renderReplicateUI(){const c=document.getElementById('replicate-ranges');c.innerHTML='';state.receptors.forEach((rec,idx)=>{const div=document.createElement('div');div.className='rep-table-wrapper';div.innerHTML=`<div class="rep-header"><h4>${rec.name}</h4><button class="btn btn-outline" style="padding:6px 12px;font-size:12px;" data-idx="${idx}">Rep2 범위 지정</button></div>`;c.appendChild(div);div.querySelector('button').addEventListener('click',()=>openRepModal(idx));});}
function openRepModal(idx){const rec=state.receptors[idx];const slots=[];const lights=isOpto()?['dark','blue']:['seap'];Object.keys(rec.ranges).forEach(plat=>{Object.keys(rec.ranges[plat]).forEach(cond=>{lights.forEach(light=>{const ex=rec.ranges2?.[plat]?.[cond]?.[light];slots.push({plat,cond,light,range:ex?.range||'',vals:ex?.vals||[]});});});});openModalForSlots(slots,`${rec.name} — Replicate 2`,()=>{if(!rec.ranges2)rec.ranges2={};currentModalSlots.forEach(s=>{if(!rec.ranges2[s.plat])rec.ranges2[s.plat]={};if(!rec.ranges2[s.plat][s.cond])rec.ranges2[s.plat][s.cond]={};rec.ranges2[s.plat][s.cond][s.light]={range:s.range,vals:s.vals};});return true;},false);}

/* ============================================================
   MODAL — Drag-Select
   ============================================================ */
const $modal=document.getElementById('receptor-modal'),$targetBar=document.getElementById('selection-target-bar'),$slotsContainer=document.getElementById('modal-slots-side');
let currentModalSlots=[],modalConfirmCallback=null;
function openModalForSlots(slots,title,onConfirm,showRecSel=true){currentModalSlots=slots;modalConfirmCallback=onConfirm;document.getElementById('modal-title').textContent=title;document.getElementById('receptor-select-row').style.display=showRecSel?'':'none';state.activeSlotKey=null;state.modalActiveSheet=state.sheetNames[0];$modal.classList.remove('hidden');renderSheetTabs('modal-sheet-tabs','modal-preview-table',true);renderSheetTable(state.sheetNames[0],'modal-preview-table',true);renderSlots();updateTargetBar();attachDragHandlers();const fe=currentModalSlots.findIndex(s=>!s.range);if(fe>=0)activateSlot(fe);}
document.getElementById('add-receptor-btn').addEventListener('click',()=>{readQ3Values();
  // Toggle receptor select vs custom input based on targetType
  const isCustomTarget=state.targetType==='custom-target';
  document.getElementById('receptor-name-select').classList.toggle('hidden',isCustomTarget);
  document.getElementById('receptor-custom-input').classList.toggle('hidden',!isCustomTarget);
  if(isCustomTarget) document.getElementById('receptor-custom-input').value='';
  else document.getElementById('receptor-name-select').value='';
  const slots=[];const lights=isOpto()?['dark','blue']:['seap'];getPlatforms().forEach(plat=>{getConditionLabels().forEach(cond=>{lights.forEach(light=>{slots.push({plat,cond,light,range:'',vals:[]});});});});openModalForSlots(slots,'대상 추가',()=>{
    const isCustomTarget=state.targetType==='custom-target';
    const name=isCustomTarget?document.getElementById('receptor-custom-input').value.trim():document.getElementById('receptor-name-select').value;
    if(!name){alert('대상 이름을 입력/선택해주세요.');return false;}const entry={name,ranges:{}};currentModalSlots.forEach(s=>{if(!entry.ranges[s.plat])entry.ranges[s.plat]={};if(!entry.ranges[s.plat][s.cond])entry.ranges[s.plat][s.cond]={};entry.ranges[s.plat][s.cond][s.light]={range:s.range,vals:s.vals};});state.receptors.push(entry);renderReceptorList();return true;},true);});
document.getElementById('modal-cancel').addEventListener('click',()=>$modal.classList.add('hidden'));
document.getElementById('modal-close-x').addEventListener('click',()=>$modal.classList.add('hidden'));
$modal.addEventListener('click',e=>{if(e.target===$modal)$modal.classList.add('hidden');});
document.getElementById('modal-confirm').addEventListener('click',()=>{if(modalConfirmCallback){const r=modalConfirmCallback();if(r===false)return;}$modal.classList.add('hidden');});

function renderSlots(){$slotsContainer.innerHTML='';let lp='';currentModalSlots.forEach((s,i)=>{if(s.plat!==lp){lp=s.plat;const h=document.createElement('div');h.className='slot-platform-header';h.textContent=s.plat;$slotsContainer.appendChild(h);}const d=document.createElement('div');d.className='range-slot'+(s.range?' slot-filled':'');d.dataset.slotIdx=i;const ll=s.light==='seap'?'SEAP':s.light==='dark'?'DARK':'BLUE',lc=s.light==='dark'?'#555':s.light==='seap'?'#7c3aed':'#3b82f6';d.innerHTML=`<div class="slot-header"><span class="slot-label" style="color:${lc}">${s.cond} — ${ll}</span><button class="slot-clear" data-idx="${i}" title="초기화">&times;</button></div><div class="slot-value">${s.range?`<span class="range-text">${s.range}</span> <span class="val-text">[${s.vals.map(v=>typeof v==='number'?(Number.isInteger(v)?v:v.toFixed(2)):v).join(', ')}]</span>`:'<span style="color:#d1d5db">표에서 드래그</span>'}</div>`;d.addEventListener('click',e=>{if(!e.target.classList.contains('slot-clear'))activateSlot(i);});d.querySelector('.slot-clear').addEventListener('click',e=>{e.stopPropagation();s.range='';s.vals=[];renderSlots();clearHL();activateSlot(i);});$slotsContainer.appendChild(d);});}
function activateSlot(i){state.activeSlotKey=i;$slotsContainer.querySelectorAll('.range-slot').forEach((el,j)=>el.classList.toggle('slot-active',j===i));updateTargetBar();clearHL();const s=currentModalSlots[i];if(s&&s.range)hlRange(s.range);}
function updateTargetBar(){if(state.activeSlotKey===null){$targetBar.textContent='아래 슬롯을 클릭한 뒤, 표에서 셀을 드래그하세요';$targetBar.classList.remove('active');return;}const s=currentModalSlots[state.activeSlotKey];const ll=s.light==='seap'?'SEAP':s.light==='dark'?'DARK':'BLUE';$targetBar.innerHTML=`현재: <strong>${s.cond} — ${ll}</strong> (${s.plat})`;$targetBar.classList.add('active');}

function attachDragHandlers(){const w=document.getElementById('selectable-table-wrapper');w.onmousedown=e=>{const td=e.target.closest('td[data-row]');if(!td||state.activeSlotKey===null)return;e.preventDefault();state.isDragging=true;state.dragStart={row:+td.dataset.row,col:+td.dataset.col};state.dragEnd={...state.dragStart};hlDrag();};w.onmousemove=e=>{if(!state.isDragging)return;const td=e.target.closest('td[data-row]');if(td){state.dragEnd={row:+td.dataset.row,col:+td.dataset.col};hlDrag();}};w.onmouseup=()=>{if(state.isDragging){state.isDragging=false;finalize();}};w.onmouseleave=()=>{if(state.isDragging){state.isDragging=false;finalize();}};}
function hlDrag(){clearHL();if(!state.dragStart||!state.dragEnd)return;const sr=Math.min(state.dragStart.row,state.dragEnd.row),er=Math.max(state.dragStart.row,state.dragEnd.row),sc=Math.min(state.dragStart.col,state.dragEnd.col),ec=Math.max(state.dragStart.col,state.dragEnd.col);document.getElementById('modal-preview-table').querySelectorAll('td[data-row]').forEach(td=>{const r=+td.dataset.row,c=+td.dataset.col;if(r>=sr&&r<=er&&c>=sc&&c<=ec)td.classList.add('cell-selecting');});}
function clearHL(){document.getElementById('modal-preview-table').querySelectorAll('.cell-selecting,.cell-selected').forEach(td=>td.classList.remove('cell-selecting','cell-selected','cell-selected-flash'));}
function hlRange(rs){const p=parseRC(rs);if(!p)return;document.getElementById('modal-preview-table').querySelectorAll('td[data-row]').forEach(td=>{const r=+td.dataset.row,c=+td.dataset.col;if(r>=p.sr&&r<=p.er&&c>=p.sc&&c<=p.ec)td.classList.add('cell-selected');});}
function parseRC(s){const p=s.split(':'),a=parseCR(p[0]),b=p.length>1?parseCR(p[1]):a;if(!a||!b)return null;return{sr:Math.min(a.row,b.row),er:Math.max(a.row,b.row),sc:Math.min(a.col,b.col),ec:Math.max(a.col,b.col)};}
function parseCR(ref){const m=ref.trim().match(/^([A-Z]+)(\d+)$/i);if(!m)return null;let col=0;for(const ch of m[1].toUpperCase())col=col*26+(ch.charCodeAt(0)-64);return{col:col-1,row:parseInt(m[2])-1};}

function finalize(){if(!state.dragStart||!state.dragEnd||state.activeSlotKey===null)return;const sr=Math.min(state.dragStart.row,state.dragEnd.row),er=Math.max(state.dragStart.row,state.dragEnd.row),sc=Math.min(state.dragStart.col,state.dragEnd.col),ec=Math.max(state.dragStart.col,state.dragEnd.col);const range=rangeString(sr,sc,er,ec);const sheet=state.modalActiveSheet||state.sheetNames[0],data=state.sheetData[sheet]||[];const vals=[];for(let r=sr;r<=er;r++)for(let c=sc;c<=ec;c++){if(data[r]&&data[r][c]!==undefined&&data[r][c]!==''){const v=parseFloat(data[r][c]);vals.push(isNaN(v)?0:v);}}currentModalSlots[state.activeSlotKey].range=range;currentModalSlots[state.activeSlotKey].vals=vals;clearHL();document.getElementById('modal-preview-table').querySelectorAll('td[data-row]').forEach(td=>{const r=+td.dataset.row,c=+td.dataset.col;if(r>=sr&&r<=er&&c>=sc&&c<=ec)td.classList.add('cell-selected','cell-selected-flash');});renderSlots();activateSlot(state.activeSlotKey);const next=currentModalSlots.findIndex((s,i)=>i>state.activeSlotKey&&!s.range);if(next>=0)setTimeout(()=>activateSlot(next),300);}

/* ── Receptor list ───────────────────────────────────────── */
function renderReceptorList(){const $l=document.getElementById('receptor-list');$l.innerHTML='';state.receptors.forEach((rec,idx)=>{const div=document.createElement('div');div.className='receptor-entry';let info='';Object.keys(rec.ranges).forEach(plat=>{info+=`<div style="font-size:12px;color:#6b7280;margin-top:3px"><strong>${plat}:</strong> `;info+=Object.keys(rec.ranges[plat]).map(c=>{if(rec.ranges[plat][c].seap){return`${c} (${rec.ranges[plat][c].seap?.range||'-'})`;}const d=rec.ranges[plat][c].dark,b=rec.ranges[plat][c].blue;return`${c} (D:${d?.range||'-'}, B:${b?.range||'-'})`;}).join(' | ')+'</div>';});div.innerHTML=`<div class="receptor-entry-header"><h4>${rec.name}</h4><button class="btn-remove" data-idx="${idx}">삭제</button></div>${info}`;$l.appendChild(div);});$l.querySelectorAll('.btn-remove').forEach(btn=>btn.addEventListener('click',()=>{state.receptors.splice(+btn.dataset.idx,1);renderReceptorList();}));}

/* ── Table Building ──────────────────────────────────────── */
function gvs(s){if(!s||!s.vals||!s.vals.length)return 0;return s.vals.reduce((a,b)=>a+b,0)/s.vals.length;}
function buildTables(){
  const platforms=getPlatforms(),conditions=getConditionLabels(),isRep=state.q6Replicate==='yes',opto=isOpto();const rows=[];
  state.receptors.forEach(rec=>{platforms.forEach(plat=>{if(!rec.ranges[plat])return;const entry={receptor:rec.name,platform:plat,conditions:{},isOpto:opto,optoSystem:state.optoSystem||'',graphLabel:getGraphLabel(rec.name)};
    conditions.forEach(cond=>{const r=rec.ranges[plat][cond];if(!r)return;
      if(opto){let dv=gvs(r.dark),bv=gvs(r.blue);if(isRep&&rec.ranges2?.[plat]?.[cond]){const r2=rec.ranges2[plat][cond];const d2=gvs(r2.dark),b2=gvs(r2.blue);if(d2)dv=(dv+d2)/2;if(b2)bv=(bv+b2)/2;}entry.conditions[cond]={dark:dv,blue:bv,fold:dv?bv/dv:0};}
      else{let sv=gvs(r.seap);if(isRep&&rec.ranges2?.[plat]?.[cond]){const s2=gvs(rec.ranges2[plat][cond]?.seap);if(s2)sv=(sv+s2)/2;}entry.conditions[cond]={seap:sv};}
    });
    if(opto){const ck=Object.keys(entry.conditions),agK=ck.find(k=>k.startsWith('agonist')),atgK=ck.find(k=>k.startsWith('antagonist'));
      if(agK){const aD=entry.conditions[agK]?.dark||0,aB=entry.conditions[agK]?.blue||0,tD=atgK?(entry.conditions[atgK]?.dark||0):0,tB=atgK?(entry.conditions[atgK]?.blue||0):0;entry.ratios={'AG-B/AG-D':aD?aB/aD:0,'AG-B/ATG-D':tD?aB/tD:0,'AG-B/ATG-B':tB?aB/tB:0};}}
    rows.push(entry);});});
  state.table1Data=rows;renderAT('table1',rows,false);renderAT('table2',rows,true);
  document.querySelectorAll('#table1 .editable-cell').forEach(cell=>{cell.addEventListener('blur',()=>{const d=state.table1Data[+cell.dataset.recIdx];if(!d)return;const key=cell.dataset.row.toLowerCase();d.conditions[cell.dataset.cond][key]=parseFloat(cell.textContent)||0;if(d.isOpto){const c=d.conditions[cell.dataset.cond];c.fold=c.dark?c.blue/c.dark:0;recalc(d);}renderAT('table2',state.table1Data,true);});});
}
function recalc(e){const ck=Object.keys(e.conditions),agK=ck.find(k=>k.startsWith('agonist')),atgK=ck.find(k=>k.startsWith('antagonist'));if(agK){const aD=e.conditions[agK]?.dark||0,aB=e.conditions[agK]?.blue||0,tD=atgK?(e.conditions[atgK]?.dark||0):0,tB=atgK?(e.conditions[atgK]?.blue||0):0;e.ratios={'AG-B/AG-D':aD?aB/aD:0,'AG-B/ATG-D':tD?aB/tD:0,'AG-B/ATG-B':tB?aB/tB:0};}}
function renderAT(tid,data,rd){
  const $t=document.getElementById(tid);$t.innerHTML='';if(!data.length)return;
  const conds=getConditionLabels(),opto=data[0].isOpto;
  const rl=opto?['DARK','BLUE','FOLD']:['SEAP'];
  if(opto&&data[0].ratios)rl.push('AG-B/AG-D','AG-B/ATG-D','AG-B/ATG-B');
  const hr1=document.createElement('tr');hr1.innerHTML='<th></th>';data.forEach(d=>hr1.innerHTML+=`<th colspan="${conds.length}" class="col-header-cell" style="background:#edf2ff">${d.receptor} — ${d.platform}</th>`);$t.appendChild(hr1);
  const hr2=document.createElement('tr');hr2.innerHTML='<th></th>';data.forEach(()=>conds.forEach(c=>hr2.innerHTML+=`<th class="col-header-cell">${c}</th>`));$t.appendChild(hr2);
  rl.forEach(label=>{const tr=document.createElement('tr');tr.innerHTML=`<td class="row-header">${label}</td>`;data.forEach((d,di)=>{conds.forEach(cond=>{let v=0;
    if(label==='SEAP')v=d.conditions[cond]?.seap||0;
    else if(label==='DARK')v=d.conditions[cond]?.dark||0;else if(label==='BLUE')v=d.conditions[cond]?.blue||0;else if(label==='FOLD')v=d.conditions[cond]?.fold||0;else if(d.ratios)v=d.ratios[label]||0;
    const disp=rd?v.toFixed(2):v;
    const editable=!rd&&(label==='DARK'||label==='BLUE'||label==='SEAP');
    if(editable)tr.innerHTML+=`<td contenteditable="true" class="editable-cell" data-row="${label}" data-rec-idx="${di}" data-cond="${cond}">${disp}</td>`;
    else tr.innerHTML+=`<td>${disp}</td>`;});});$t.appendChild(tr);});
}

/* ── Chart ───────────────────────────────────────────────── */
function renderChart(){if(!state.table1Data||!state.table1Data.length)return;state.svgContent=generateSVG(state.table1Data,state.vizMode,state.ctrlMode);document.getElementById('graph-preview').innerHTML=state.svgContent;}

/* ── Downloads ───────────────────────────────────────────── */
document.getElementById('btn-download-svg').addEventListener('click',()=>{if(!state.svgContent)return;saveAs(new Blob([state.svgContent],{type:'image/svg+xml;charset=utf-8'}),`GPCR_chart_${state.q1Description.replace(/\s+/g,'_')||'output'}.svg`);});
document.getElementById('btn-download-excel').addEventListener('click',downloadExcel);
function downloadExcel(){const wb=XLSX.utils.book_new();state.sheetNames.forEach(n=>XLSX.utils.book_append_sheet(wb,state.workbook.Sheets[n],n));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(buildER(state.table1Data,false)),'Table1_Analysis');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(buildER(state.table1Data,true)),'Table2_Rounded');XLSX.writeFile(wb,`GPCR_analysis_${state.q1Description.replace(/\s+/g,'_')||'output'}.xlsx`);}
function buildER(data,rd){if(!data||!data.length)return[['No data']];const conds=getConditionLabels(),opto=data[0].isOpto;const rl=opto?['DARK','BLUE','FOLD']:['SEAP'];if(opto&&data[0].ratios)rl.push('AG-B/AG-D','AG-B/ATG-D','AG-B/ATG-B');const rows=[];const h1=[''];data.forEach(d=>{h1.push(`${d.receptor}-iTango-${d.platform}`);for(let i=1;i<conds.length;i++)h1.push('');});rows.push(h1);const h2=[''];data.forEach(()=>conds.forEach(c=>h2.push(c)));rows.push(h2);rl.forEach(label=>{const row=[label];data.forEach(d=>conds.forEach(cond=>{let v=0;if(label==='SEAP')v=d.conditions[cond]?.seap||0;else if(label==='DARK')v=d.conditions[cond]?.dark||0;else if(label==='BLUE')v=d.conditions[cond]?.blue||0;else if(label==='FOLD')v=d.conditions[cond]?.fold||0;else if(d.ratios)v=d.ratios[label]||0;row.push(rd?parseFloat(v.toFixed(2)):v);}));rows.push(row);});return rows;}

/* ── 2차: 마스터 파일 업데이트 ────────────────────────────── */
const masterFiles={rep:null,analysis:null,anova:null};
['rep','analysis','anova'].forEach(key=>{
  const input=document.getElementById(`master-${key}-input`);
  const status=document.getElementById(`master-${key}-status`);
  const btn=document.getElementById(`btn-update-${key}`);
  input.addEventListener('change',()=>{if(!input.files.length)return;const reader=new FileReader();reader.onload=e=>{masterFiles[key]=XLSX.read(new Uint8Array(e.target.result),{type:'array'});status.textContent=input.files[0].name+' 로드됨';btn.disabled=false;};reader.readAsArrayBuffer(input.files[0]);});
  btn.addEventListener('click',()=>{if(!masterFiles[key]||!state.table1Data)return;
    const wb=masterFiles[key];
    if(key==='rep') updateReplicatesFile(wb);
    else if(key==='analysis') updateAnalysisFile(wb);
    else { XLSX.writeFile(wb,`GPCR_ANOVA_results_updated.xlsx`); }
  });
});

function updateReplicatesFile(wb){
  // Add new data rows to first sheet, highlight yellow
  const wsName=wb.SheetNames[0];const ws=wb.Sheets[wsName];
  const existing=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
  const platforms=getPlatforms(),conditions=getConditionLabels();
  state.table1Data.forEach(d=>{
    conditions.forEach(cond=>{
      const val=d.isOpto?(d.conditions[cond]?.blue||0):(d.conditions[cond]?.seap||0);
      existing.push([d.receptor,d.platform,cond,1,val,val]);
    });
  });
  const newWs=XLSX.utils.aoa_to_sheet(existing);
  wb.Sheets[wsName]=newWs;
  XLSX.writeFile(wb,'GPCR_individual_replicates_updated.xlsx');
}

function updateAnalysisFile(wb){
  let wsName=wb.SheetNames.find(n=>n.includes('Individual'))||wb.SheetNames[0];
  const ws=wb.Sheets[wsName];
  const existing=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
  const RECEPTOR_CAT={CHRM1:'Acetylcholine',CHRM2:'Acetylcholine',CHRM3:'Acetylcholine',CHRM4:'Acetylcholine',CHRM5:'Acetylcholine',HRH1:'Histamine',HRH2:'Histamine',HRH3:'Histamine',HRH4:'Histamine',ADORA1:'Adenosine',ADORA2A:'Adenosine',ADORA2B:'Adenosine',ADORA3:'Adenosine',HTR1A:'Serotonin',HTR2A:'Serotonin',HTR2C:'Serotonin',HTR4:'Serotonin',ADRA1B:'Adrenaline',ADRA2B:'Adrenaline',ADRA2C:'Adrenaline',ADRB2:'Adrenaline',DRD2:'Dopamine',Oxytocin:'Oxytocin',PACAP:'PACAP'};
  const PLAT_MAP={'LNC1.0':'DoubleiLID(LNC1.0)','LNC2.0':'singleiLID(LNC2.0)'};
  const nextExp=existing.length;
  state.table1Data.forEach(d=>{
    const cat=RECEPTOR_CAT[d.receptor]||'Other';
    const plat=PLAT_MAP[d.platform]||d.platform;
    const row=[cat,d.receptor,plat,nextExp];
    const conditions=getConditionLabels();
    conditions.forEach(c=>{if(d.isOpto){row.push(d.conditions[c]?.dark||0);row.push(d.conditions[c]?.blue||0);}else{row.push(d.conditions[c]?.seap||0);}});
    if(d.ratios){row.push(d.ratios['AG-B/AG-D']||0);row.push(d.ratios['AG-B/ATG-D']||0);row.push(d.ratios['AG-B/ATG-B']||0);}
    existing.push(row);
  });
  wb.Sheets[wsName]=XLSX.utils.aoa_to_sheet(existing);
  XLSX.writeFile(wb,'GPCR_analysis_updated.xlsx');
}

goToStep(0);
