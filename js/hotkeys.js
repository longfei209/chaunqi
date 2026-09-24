/* ============================================================
 *  hotkeys.js  —— 全局快捷键
 *  战斗：1攻击 Q烈火 W半月 E治愈 T毒术 R战神 空格怒斩 Z红药 X蓝药 Tab自动
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
  else if(kl === 't'){ e.preventDefault(); Combat.useSkill('du'); }
  else if(kl === 'r'){ e.preventDefault(); Combat.useSkill('zhanshen'); }
  else if(kl === 'z'){ e.preventDefault(); Combat.potion(); }
  else if(kl === 'x'){ e.preventDefault(); Combat.potionMp(); }
});