/* ============================================================
 *  utils.js  —— 工具函数
 *  本轮新增：
 *   - 宝石 uid 生成
 *   - 数值格式化（带符号）
 *   - 对比箭头工具
 * ============================================================ */

const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2,9);
const rnd = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.floor(n).toLocaleString('en-US');

/* 生成宝石唯一 id（同名同品质的宝石也能区分） */
const gemUid = () => 'g_' + Math.random().toString(36).slice(2,10);

/* 带符号格式化：+5 / -3 / 0 */
function signed(n){
  if(n > 0) return '+' + n;
  if(n < 0) return '' + n;
  return '0';
}

/* 百分比带符号：+3% / -2% */
function signedPct(n){
  if(n > 0) return '+' + n + '%';
  if(n < 0) return n + '%';
  return '0%';
}

/* 对比箭头 HTML：涨绿↓降红
 *  oldVal: 当前穿戴的值
 *  newVal: 新装备的值
 *  isPct:  是否为百分比
 *  返回带颜色 + 箭头的一小段 HTML；相同则返回空
 */
function compareArrow(newVal, oldVal, isPct){
  if(newVal === oldVal) return '';
  const diff = newVal - oldVal;
  const up = diff > 0;
  const cls = up ? 'cmp-up' : 'cmp-down';
  const arrow = up ? '↑' : '↓';
  const text = isPct ? signedPct(diff) : signed(diff);
  return `<span class="${cls}">${arrow}${text}</span>`;
}

function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove('on'), 1600);
}

function confirmBox(msg, onYes){
  $('cfmMsg').textContent = msg;
  const box = $('confirm'); box.classList.remove('hidden');
  const yes = $('cfmYes'), no = $('cfmNo');
  const close = ()=>{ box.classList.add('hidden'); yes.onclick=null; no.onclick=null; };
  yes.onclick = ()=>{ close(); onYes && onYes(); };
  no.onclick  = ()=>{ close(); };
}

/* ---------- 飘字 ----------
 * 水平随机偏移 ±25~30px，避免同目标多段攻击飘字重叠
 */
function floatText(targetEl, text, color){
  if(!targetEl) return;
  const r = targetEl.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'float-text';
  div.textContent = text;
  div.style.color = color;

  const offsetX = (Math.random() - 0.5) * 56;
  const offsetY = (Math.random() - 0.5) * 8;

  div.style.left = (r.left + r.width/2 + offsetX) + 'px';
  div.style.top  = (r.top  + r.height/2 + offsetY) + 'px';
  document.body.appendChild(div);
  setTimeout(()=>{ if(div.parentNode) div.parentNode.removeChild(div); }, 1100);
}

/* 飘字颜色 */
const FC = { normal:'#e8e8e8', crit:'#e66', poison:'#c8a', reflect:'#888', heal:'#6e6' };

/* ---------- 宝石工具函数 ---------- */

/* 根据 gemKey + quality 取宝石配置 */
function getGemCfg(gemKey, quality){
  const g = GEMS[gemKey];
  if(!g) return null;
  const qIdx = GEM_QUALITY_ORDER.indexOf(quality);
  if(qIdx < 0) return null;
  return {
    ...g,
    quality: quality,
    qualityName: GEM_QUALITY[quality].name,
    qualityCls: GEM_QUALITY[quality].cls,
    value: g.val[qIdx]
  };
}

/* 取宝石在当前品质下提供的属性值 */
function gemValue(gemKey, quality){
  const c = getGemCfg(gemKey, quality);
  return c ? c.value : 0;
}

/* 生成一颗宝石对象 */
function makeGem(gemKey, quality){
  quality = quality || 'normal';
  return {
    uid: gemUid(),
    key: gemKey,
    quality: quality
  };
}

/* 随机品质（掉落用） */
function rollGemQuality(boost){
  const r = Math.random() - (boost || 0);
  if(r < 0.05) return 'legend';
  if(r < 0.30) return 'rare';
  return 'normal';
}

/* 随机宝石 key */
function randomGemKey(){
  return pick(Object.keys(GEMS));
}