/* ============================================================
 *  hotkeys.js  —— 全局快捷键
 *
 *  战斗中：
 *    1 攻击 / Q 烈火 / W 半月 / E 治愈 / R 战神
 *    空格 怒斩 / Z 红药 / X 蓝药 / Tab 自动
 *    战斗中禁用 ESC（防止误退出）
 *  非战斗：
 *    ESC 返回上一页
 * ============================================================ */

document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    if(Game.battle) return;
    if(Nav.stack.length > 1){
      e.preventDefault();
      Nav.back();
    }
    return;
  }

  if(!Game.battle) return;
  if($('page-battle').classList.contains('hidden')) return;
  if(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

  const k = e.key;
  const kl = k.toLowerCase();

  if(k === 'Tab'){ e.preventDefault(); Combat.toggleAuto(); return; }
  if(k === ' ' || k === 'Spacebar'){ e.preventDefault(); Combat.useRage(); return; }

  if(k === '1'){ e.preventDefault(); Combat.attack(); }
  else if(kl === 'q'){ e.preventDefault(); Combat.useSkill('liehuo'); }
  else if(kl === 'w'){ e.preventDefault(); Combat.useSkill('banyue'); }
  else if(kl === 'e'){ e.preventDefault(); Combat.useSkill('zhiyu'); }
  else if(kl === 'r'){ e.preventDefault(); Combat.useSkill('zhanshen'); }
  else if(kl === 'z'){ e.preventDefault(); Combat.potion(); }
  else if(kl === 'x'){ e.preventDefault(); Combat.potionMp(); }
});