/* ============================================================
 *  utils.js  —— 工具函数
 * ============================================================ */

const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2,9);
const rnd = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.floor(n).toLocaleString('en-US');

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

function floatText(targetEl, text, color){
  if(!targetEl) return;
  const r = targetEl.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'float-text';
  div.textContent = text;
  div.style.color = color;
  div.style.left = (r.left + r.width/2) + 'px';
  div.style.top = (r.top + r.height/2) + 'px';
  document.body.appendChild(div);
  setTimeout(()=>{ if(div.parentNode) div.parentNode.removeChild(div); }, 1100);
}

/* 飘字颜色 */
const FC = { normal:'#e8e8e8', crit:'#e66', poison:'#c8a', reflect:'#888', heal:'#6e6' };