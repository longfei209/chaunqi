/* ============================================================
 *  combat.js —— 三栏布局 + 贴脸冲锋攻击 + 血条数字
 *
 *  攻击节奏（手动）：
 *    1. 冲到目标边缘贴脸停下（350ms）
 *    2. 贴脸突刺一下（90ms，向前推 8px + 放大 1.15）
 *    3. 命中瞬间（扣血 + 抖动 + 飘字）
 *    4. 飞回原位（300ms）
 * ============================================================ */

function _sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showBattleDrop(text){
  const el = $('bDrop');
  if(!el) return;
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('on'), 2000);
}

/* ---------- 命中动画 ---------- */
function _hitMonsterAnim(m, isCrit){
  const card = document.getElementById('mon-' + m.mid);
  if(!card) return;
  card.classList.remove('anim-hit-shake','anim-hit-flash','anim-hit-crit');
  void card.offsetWidth;
  card.classList.add('anim-hit-shake');
  card.classList.add(isCrit ? 'anim-hit-crit' : 'anim-hit-flash');
  setTimeout(()=>{
    card.classList.remove('anim-hit-shake','anim-hit-flash','anim-hit-crit');
  }, 500);
}
function _hitPlayerAnim(){
  const el = document.getElementById('pBox');
  if(!el) return;
  el.classList.remove('anim-hit-shake');
  void el.offsetWidth;
  el.classList.add('anim-hit-shake');
  setTimeout(()=>el.classList.remove('anim-hit-shake'), 450);
}
function _healPlayerAnim(){
  const el = document.getElementById('pBox');
  if(!el) return;
  el.classList.remove('anim-heal-glow');
  void el.offsetWidth;
  el.classList.add('anim-heal-glow');
  setTimeout(()=>el.classList.remove('anim-heal-glow'), 700);
}
function _buffPlayerAnim(){
  const el = document.getElementById('pBox');
  if(!el) return;
  el.classList.remove('anim-buff-glow');
  void el.offsetWidth;
  el.classList.add('anim-buff-glow');
  setTimeout(()=>el.classList.remove('anim-buff-glow'), 800);
}

/* ============================================================
 *  冲锋动作：冲到目标跟前贴脸 → 突刺一下
 * ============================================================ */
async function _chargeTo(attackerEl, targetEl, moveMs){
  if(!attackerEl || !targetEl) return;

  const a = attackerEl.getBoundingClientRect();
  const t = targetEl.getBoundingClientRect();
  const aCx = a.left + a.width/2;
  const tCx = t.left + t.width/2;
  const centerDx = tCx - aCx;
  const sign = centerDx >= 0 ? 1 : -1;

  // 攻击方半宽 + 目标半宽 + 4px 间隙 = 停下时正好贴脸不重叠
  const stopDist = (a.width/2 + t.width/2 + 4);
  const realDx = centerDx - sign * stopDist;

  attackerEl.style.zIndex = 200;

  // 第一步：冲到目标跟前（贴脸停下）
  attackerEl.style.transition = `transform ${moveMs}ms cubic-bezier(.4,0,.25,1)`;
  attackerEl.style.transform = `translateX(${realDx}px)`;
  await _sleep(moveMs);

  // 第二步：贴脸突刺一下（向前推 8px + 轻微放大）
  attackerEl.style.transition = `transform 90ms cubic-bezier(.2,0,.5,1)`;
  attackerEl.style.transform = `translateX(${realDx + sign * 8}px) scale(1.15)`;
  await _sleep(90);
}

function _returnFromCharge(attackerEl, backMs){
  if(!attackerEl) return;
  attackerEl.style.transition = `transform ${backMs}ms cubic-bezier(.4,0,.2,1)`;
  attackerEl.style.transform = '';
  setTimeout(() => {
    attackerEl.style.transition = '';
    attackerEl.style.zIndex = '';
  }, backMs + 50);
}

/* ---------- 技能 emoji / 光效 ---------- */
function _popSkillEmoji(targetEl, emoji){
  if(!targetEl || !emoji) return;
  const r = targetEl.getBoundingClientRect();
  const span = document.createElement('div');
  span.className = 'skill-emoji';
  span.textContent = emoji;
  span.style.left = (r.left + r.width/2) + 'px';
  span.style.top  = (r.top + r.height/2) + 'px';
  document.body.appendChild(span);
  setTimeout(()=>{ if(span.parentNode) span.parentNode.removeChild(span); }, 950);
}
function _popSweep(){
  const overlay = document.createElement('div');
  overlay.className = 'skill-sweep';
  document.body.appendChild(overlay);
  setTimeout(()=>{ if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 550);
}
function _pulseCard(m, cls){
  const card = document.getElementById('mon-' + m.mid);
  if(!card) return;
  card.classList.remove(cls);
  void card.offsetWidth;
  card.classList.add(cls);
  setTimeout(()=>card.classList.remove(cls), 700);
}

/* ============================================================
 *  Combat
 * ============================================================ */
const Combat = {
  startGroup(gi){
    const st = areaState(Game.ui.areaId).floors[Game.ui.floorIdx];
    const group = st.groups[gi];
    if(!group || !group.alive) return toast("该组已清空");
    if(group.members.every(m=>m.dead)) return toast("该组已清空");
    Game.battle = {
      kind:'group', gi, group,
      monsters: group.members,
      auto:false, pendingSkill:null, roundCount:0,
      buff:{ zhanshen:0 }, cds:{},
      lastTarget: null, resolving: false
    };
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && petAlive(p)){ p.hp = petStatFor(p).hp; p.skillCd = {}; }
    });
    Nav.go('battle');
  },
  startBoss(){
    const ar = AREA_MAP[Game.ui.areaId];
    const fi = Game.ui.floorIdx;
    const st = areaState(Game.ui.areaId).floors[fi];
    if(st.bossDeath) return toast("BOSS 未复活");
    const def = ar.floors[fi].boss;
    const boss = {
      mid: uid(), protoId: def.id, name: def.name,
      hp: def.hp, maxHp: def.hp,
      atk: def.atk, def: def.def, spd: def.spd,
      exp: def.exp, gMin: def.gMin, gMax: def.gMax,
      behavior:'normal', elite:false, affixes:[],
      dead:false, deathTs:0, vamp:0, pois:0,
      isBoss:true,
      dropEquip: def.dropEquip || null,
      unlockDragon: def.unlockDragon || false
    };
    Game.battle = {
      kind:'boss', monsters:[boss], boss, group:null,
      auto:false, pendingSkill:null, roundCount:0,
      buff:{ zhanshen:0 }, cds:{},
      lastTarget: null, resolving: false
    };
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && petAlive(p)){ p.hp = petStatFor(p).hp; p.skillCd = {}; }
    });
    Nav.go('battle');
  },

  render(){
    const b = Game.battle; if(!b) return;
    const ar = AREA_MAP[Game.ui.areaId];
    const fi = Game.ui.floorIdx;
    $('bLoc').textContent = b.kind === 'boss'
      ? `${ar.name} 第${fi+1}层 · BOSS`
      : `${ar.name} 第${fi+1}层 · 第${b.gi+1}组`;

    const a = calcAttr();
    const mHp = playerMaxHp(), mMp = playerMaxMp();
    const hpP = clamp(Game.player.hp/mHp,0,1)*100;
    const mpP = clamp(Game.player.mp/mMp,0,1)*100;

    const activePetObjs = Game.activePets
      .map(u => Game.pets.find(p=>p.uid === u))
      .filter(Boolean);

    let petHtml = '';
    activePetObjs.forEach(p=>{
      const maxHp = petStatFor(p).hp;
      const hpPct = clamp(p.hp/maxHp, 0, 1) * 100;
      if(petAlive(p)){
        petHtml += `<div class="unit-box pet-box-single" id="pet-${p.uid}">
          <div class="u-emoji">${p.avatar}</div>
          <div class="u-lv">Lv.${p.lv}</div>
          <div class="u-bar hp pet-hp">
            <i style="width:${hpPct}%"></i>
            <span class="u-num">${Math.floor(p.hp)}</span>
          </div>
        </div>`;
      }else{
        const left = Math.ceil((p.downUntil - Date.now())/1000);
        petHtml += `<div class="unit-box pet-box-single down" id="pet-${p.uid}">
          <div class="u-emoji">${p.avatar}</div>
          <div class="u-lv">${left}s</div>
          <div class="u-bar hp pet-hp"><i style="width:0%"></i></div>
        </div>`;
      }
    });

    $('bLeft').innerHTML = `
      <div class="unit-box p-box" id="pBox">
        <div class="u-emoji">🧙</div>
        <div class="u-lv">Lv.${Game.player.lv}</div>
        <div class="u-bar hp">
          <i style="width:${hpP}%"></i>
          <span class="u-num">${Math.floor(Game.player.hp)}</span>
        </div>
        <div class="u-bar mp">
          <i style="width:${mpP}%"></i>
          <span class="u-num" style="font-size:7px;color:#bbb;">${Math.floor(Game.player.mp)}</span>
        </div>
      </div>
      ${petHtml}
    `;

    const grid = $('bGrid');
    grid.innerHTML = '';
    b.monsters.forEach((m, i)=>{
      const card = document.createElement('div');
      card.className = 'unit-box mon-unit clickable';
      if(m.dead) card.classList.add('dead');
      if(m.elite) card.classList.add('elite');
      if(m.isBoss) card.classList.add('boss');
      card.id = 'mon-' + m.mid;
      const hP = clamp(m.hp/m.maxHp,0,1)*100;
      const tag = m.isBoss ? '👹' : (m.elite ? '★' : '🐾');
      const shortName = m.name.length > 4 ? m.name.slice(0,4) : m.name;
      card.innerHTML = `
        <div class="u-emoji">${tag}</div>
        <div class="u-name">${shortName}</div>
        <div class="u-bar hp">
          <i style="width:${hP}%"></i>
          <span class="u-num">${Math.max(0,Math.floor(m.hp))}</span>
        </div>
      `;
      card.onclick = ()=>this.clickMonster(i);
      grid.appendChild(card);
    });

    this._refreshSkillBtn('bSkill1', 'liehuo');
    this._refreshSkillBtn('bSkill2', 'banyue');
    this._refreshSkillBtn('bSkill3', 'zhiyu');
    this._refreshSkillBtn('bSkill4', 'zhanshen');
    $('bRageBtn').disabled = (Game.player.rage || 0) < RAGE_MAX;
    $('bAutoBtn').textContent = b.auto ? '停止' : '自动';

    if(b.pendingSkill) $('bTip').textContent = `点击怪物释放 ${SKILLS[b.pendingSkill].name}`;
    else if(b.auto) $('bTip').textContent = '自动战斗中…';
    else $('bTip').textContent = `点击怪物攻击 · 怒 ${Game.player.rage||0}/${RAGE_MAX} · 攻${a.atk} 防${a.def} 速${a.spd}`;
  },

  _refreshSkillBtn(id, key){
    const sk = SKILLS[key];
    const btn = $(id);
    if(!btn) return;
    const b = Game.battle;
    const cd = b.cds ? (b.cds[key] || 0) : 0;
    const shortName = sk.name.slice(0,2);
    const kbd = btn.querySelector('.kbd-tag');
    const kbdText = kbd ? kbd.outerHTML : '';
    if(Game.player.lv < sk.unlock){
      btn.innerHTML = `${kbdText}${shortName}(${sk.unlock})`;
      btn.disabled = true;
    }else if(cd > 0){
      btn.innerHTML = `${kbdText}${shortName}(${cd})`;
      btn.disabled = true;
    }else if(Game.player.mp < sk.mp){
      btn.innerHTML = `${kbdText}${shortName}(${sk.mp}蓝)`;
      btn.disabled = true;
    }else{
      btn.innerHTML = `${kbdText}${shortName}`;
      btn.disabled = false;
    }
  },

  _floatMon(m, text, cls){
    const el = document.getElementById('mon-' + m.mid);
    floatText(el, text, FC[cls] || FC.normal);
  },
  _floatPlayer(text, cls){
    const el = document.getElementById('pBox') || $('bLeft');
    floatText(el, text, FC[cls] || FC.normal);
  },
  _floatPet(p, text, cls){
    const el = document.getElementById('pet-' + p.uid) || $('bLeft');
    floatText(el, text, FC[cls] || FC.normal);
  },

  attack(){
    const b = Game.battle; if(!b || b.pendingSkill || b.resolving) return;
    const alive = b.monsters.filter(m=>!m.dead);
    if(alive.length === 0) return;
    let target = null;
    if(b.lastTarget) target = b.monsters.find(m => m.mid === b.lastTarget && !m.dead) || null;
    if(!target){
      alive.sort((a,b)=>a.hp - b.hp);
      target = alive[0];
    }
    b.lastTarget = target.mid;
    this._resolveRound({ type:'attack', target });
  },
  clickMonster(i){
    const b = Game.battle; if(!b || b.resolving) return;
    const m = b.monsters[i];
    if(!m || m.dead) return;
    if(b.pendingSkill){
      const skKey = b.pendingSkill;
      b.pendingSkill = null;
      b.lastTarget = m.mid;
      this._resolveRound({ type:'skill', skill: skKey, target: m });
    }else{
      b.lastTarget = m.mid;
      this._resolveRound({ type:'attack', target: m });
    }
  },
  useSkill(key){
    const b = Game.battle; if(!b || b.resolving) return;
    const sk = SKILLS[key]; if(!sk) return;
    if(Game.player.lv < sk.unlock) return toast(`需 Lv.${sk.unlock}`);
    if(b.cds && b.cds[key] > 0) return toast("冷却中");
    if(Game.player.mp < sk.mp) return toast("蓝量不足");

    if(key === 'liehuo'){
      if(!b.lastTarget){ b.pendingSkill = key; this.render(); return; }
      let target = b.monsters.find(m => m.mid === b.lastTarget && !m.dead);
      if(!target){ const alive = b.monsters.filter(m => !m.dead); target = alive[0]; }
      if(!target) return;
      b.lastTarget = target.mid;
      this._resolveRound({ type:'skill', skill: key, target });
      return;
    }
    this._resolveRound({ type:'skill', skill: key, target: null });
  },
  useRage(){
    const b = Game.battle; if(!b || b.resolving) return;
    if((Game.player.rage||0) < RAGE_MAX) return toast("怒气不足");
    const alive = b.monsters.filter(m=>!m.dead);
    if(alive.length === 0) return;
    let target = null;
    if(b.lastTarget) target = b.monsters.find(m => m.mid === b.lastTarget && !m.dead) || null;
    if(!target){ alive.sort((a,b)=>a.hp-b.hp); target = alive[0]; }
    b.lastTarget = target.mid;
    this._resolveRound({ type:'rage', target });
  },
  potion(){
    const b = Game.battle; if(!b || b.resolving) return;
    if(Game.player.potion <= 0) return toast("没有红药");
    Game.player.potion--;
    const heal = Math.floor(playerMaxHp() * 0.35);
    Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + heal);
    this._floatPlayer(`+${heal}`, 'heal');
    _healPlayerAnim();
    Render.top();
    this._monsterPhaseOnly();
  },
  potionMp(){
    const b = Game.battle; if(!b || b.resolving) return;
    if(Game.player.potionMp <= 0) return toast("没有蓝药");
    Game.player.potionMp--;
    const heal = Math.floor(playerMaxMp() * 0.30);
    Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + heal);
    this._floatPlayer(`+${heal}MP`, 'heal');
    Render.top();
    this._monsterPhaseOnly();
  },
  flee(){
    const b = Game.battle; if(!b || b.resolving) return;
    if(Math.random() < 0.45){
      toast('逃跑成功');
      this.stopAuto();
      setTimeout(()=>this.end(), 300);
    }else{
      toast('逃跑失败');
      this._monsterPhaseOnly();
    }
  },
  toggleAuto(){
    const b = Game.battle; if(!b) return;
    b.auto = !b.auto;
    this.render();
    if(b.auto) this._autoTick();
  },
  _autoTick(){
    const b = Game.battle; if(!b || !b.auto) return;
    clearTimeout(b._timer);
    b._timer = setTimeout(()=>{
      if(!Game.battle || !Game.battle.auto) return;
      if(Game.battle.resolving){ this._autoTick(); return; }
      const alive = Game.battle.monsters.filter(m=>!m.dead);
      if(alive.length === 0) return;
      const mHp = playerMaxHp(), mMp = playerMaxMp();
      if(Game.player.potion > 0 && Game.player.hp/mHp < AUTO_POTION_THRESHOLD){
        this.potion();
      }else if(Game.player.potionMp > 0 && Game.player.mp/mMp < 0.2){
        this.potionMp();
      }else if((Game.player.rage||0) >= RAGE_MAX){
        this.useRage();
      }else if(Game.player.lv >= 3 && (!b.cds.banyue) && alive.length >= 2 && Game.player.mp >= SKILLS.banyue.mp){
        this.useSkill('banyue');
      }else if(Game.player.lv >= 5 && (!b.cds.zhiyu) && Game.player.hp/mHp < 0.5 && Game.player.mp >= SKILLS.zhiyu.mp){
        this.useSkill('zhiyu');
      }else if(Game.player.lv >= 8 && (!b.cds.zhanshen) && b.buff.zhanshen === 0 && Game.player.mp >= SKILLS.zhanshen.mp){
        this.useSkill('zhanshen');
      }else if(Game.player.lv >= 1 && (!b.cds.liehuo) && Game.player.mp >= SKILLS.liehuo.mp){
        let target = null;
        if(b.lastTarget) target = Game.battle.monsters.find(m => m.mid === b.lastTarget && !m.dead) || null;
        if(!target){
          const list = Game.battle.monsters.filter(m=>!m.dead);
          list.sort((a,b)=>a.hp-b.hp);
          target = list[0];
        }
        if(target){ b.lastTarget = target.mid; this._resolveRound({ type:'skill', skill:'liehuo', target }); }
        else this.attack();
      }else{
        this.attack();
      }
      if(Game.battle && Game.battle.auto) this._autoTick();
    }, 460);
  },
  stopAuto(){
    const b = Game.battle;
    if(b){ b.auto = false; clearTimeout(b._timer); }
  },

  /* ============================================================
   *  一回合结算
   * ============================================================ */
  async _resolveRound(action){
    const b = Game.battle; if(!b || b.resolving) return;
    b.resolving = true;
    try {
      if(!b.cds) b.cds = {};
      b.roundCount++;

      const pa = calcAttr();
      let atkMul = 1, defMul = 1;
      if(b.buff.zhanshen > 0){ atkMul = 1.3; defMul = 1.3; }

      const units = [];
      units.push({ side:'me', spd: pa.spd });
      const activePetObjs = getActivePetObjects();
      activePetObjs.forEach(p=>{
        const pst = petStatFor(p);
        units.push({ side:'pet', spd: pst.spd, pet: p });
      });
      b.monsters.forEach(m=>{
        if(!m.dead) units.push({ side:'mon', spd: m.spd, m });
      });
      units.sort((a,b)=>b.spd - a.spd);

      const isAuto = b.auto;

      for(const u of units){
        if(!Game.battle) return;
        if(u.side === 'me') await this._doPlayerActionAnimated(action, atkMul, isAuto);
        else if(u.side === 'pet') await this._doPetActionAnimated(u.pet, isAuto);
        else {
          if(u.m.dead) continue;
          await this._doMonsterActionAnimated(u.m, defMul, isAuto);
        }
        if(Game.player.hp <= 0) break;
        if(b.monsters.every(x=>x.dead)) break;
      }

      if(Game.player.hp <= 0){ this._onPlayerDead(); return; }
      if(b.monsters.every(x=>x.dead)){ this._onGroupCleared(); return; }

      Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + 3 + Math.floor(playerMaxMp()*0.03));
      if(b.buff.zhanshen > 0) b.buff.zhanshen--;
      for(const k in b.cds){ if(b.cds[k] > 0) b.cds[k]--; }
      Game.activePets.forEach(u=>{
        const p = Game.pets.find(x=>x.uid === u);
        if(p && p.skillCd){ for(const k in p.skillCd){ if(p.skillCd[k] > 0) p.skillCd[k]--; } }
      });

      this.render();
      Render.top();
      Save.auto();
    } finally {
      if(Game.battle) Game.battle.resolving = false;
    }
  },

  async _monsterPhaseOnly(){
    const b = Game.battle; if(!b || b.resolving) return;
    b.resolving = true;
    try {
      const defMul = b.buff.zhanshen > 0 ? 1.3 : 1.0;
      const isAuto = b.auto;
      const order = b.monsters.filter(m=>!m.dead).sort((a,b)=>b.spd - a.spd);
      for(const m of order){
        if(!Game.battle) return;
        if(m.dead) continue;
        await this._doMonsterActionAnimated(m, defMul, isAuto);
        if(Game.player.hp <= 0) break;
      }
      if(Game.player.hp <= 0){ this._onPlayerDead(); return; }
      for(const k in b.cds){ if(b.cds[k] > 0) b.cds[k]--; }
      if(b.buff.zhanshen > 0) b.buff.zhanshen--;
      Game.activePets.forEach(u=>{
        const p = Game.pets.find(x=>x.uid === u);
        if(p && p.skillCd){ for(const k in p.skillCd){ if(p.skillCd[k] > 0) p.skillCd[k]--; } }
      });
      Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + 3 + Math.floor(playerMaxMp()*0.03));
      this.render();
      Render.top();
      Save.auto();
    } finally {
      if(Game.battle) Game.battle.resolving = false;
    }
  },

  /* ============================================================
   *  玩家行动 —— 冲锋 + 突刺 + 返回
   * ============================================================ */
  async _doPlayerActionAnimated(action, atkMul, isAuto){
    const playerEl = $('pBox');
    let targetM = action.target;
    if(!targetM || targetM.dead){
      const alive = Game.battle.monsters.filter(m=>!m.dead);
      targetM = alive[0] || null;
    }
    const targetEl = targetM ? document.getElementById('mon-' + targetM.mid) : null;

    if(!isAuto && playerEl && targetEl){
      await _chargeTo(playerEl, targetEl, 350);
      this._doPlayerAction(action, atkMul);
      _returnFromCharge(playerEl, 300);
      await _sleep(320);
    }else{
      this._doPlayerAction(action, atkMul);
    }
  },

  _doPlayerAction(action, atkMul){
    const b = Game.battle; if(!b) return;
    const a = calcAttr();

    if(action.type === 'attack'){
      const t = action.target;
      if(!t || t.dead) return;
      this._dealDamage(t, a.atk * atkMul, 'normal', true);
      Game.player.rage = Math.min(RAGE_MAX, (Game.player.rage||0) + 1);
    }
    else if(action.type === 'skill'){
      const key = action.skill;
      const sk = SKILLS[key];
      if(!sk || Game.player.lv < sk.unlock) return;
      if(b.cds[key] > 0) return;
      if(Game.player.mp < sk.mp) return;
      b.cds[key] = sk.cd;
      Game.player.mp -= sk.mp;

      if(key === 'liehuo'){
        const t = action.target;
        if(!t || t.dead) return;
        this._dealDamage(t, a.atk * atkMul * 1.8, 'normal', true);
        _popSkillEmoji(document.getElementById('mon-'+t.mid), '🔥');
        _pulseCard(t, 'anim-fire-pulse');
      }
      else if(key === 'banyue'){
        _popSkillEmoji($('bGrid'), '⚔️');
        _popSweep();
        b.monsters.filter(m=>!m.dead).forEach(t=>{
          this._dealDamage(t, a.atk * atkMul * 0.9, 'normal', true);
        });
      }
      else if(key === 'zhiyu'){
        const heal = Math.floor(playerMaxHp() * 0.25);
        Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + heal);
        this._floatPlayer(`+${heal}`, 'heal');
        _popSkillEmoji($('pBox'), '💚');
        _healPlayerAnim();
      }
      else if(key === 'zhanshen'){
        b.buff.zhanshen = 3;
        this._floatPlayer('祝福', 'heal');
        _popSkillEmoji($('pBox'), '🛡️');
        _buffPlayerAnim();
      }
      Game.player.rage = Math.min(RAGE_MAX, (Game.player.rage||0) + 1);
    }
    else if(action.type === 'rage'){
      const t = action.target;
      if(!t || t.dead) return;
      Game.player.rage = 0;
      this._dealDamage(t, a.atk * atkMul * 3.0, 'crit', true);
      _popSkillEmoji(document.getElementById('mon-'+t.mid), '⚡');
      _pulseCard(t, 'anim-rage-hit');
    }
  },

  _dealDamage(target, baseAtk, forceType, fromMe){
    const a = calcAttr();
    let dmg = Math.max(1, Math.floor(baseAtk - target.def));
    let isCrit = false;
    if(forceType === 'crit') isCrit = true;
    else if(Math.random() < a.crit){ dmg = Math.floor(dmg * a.critD); isCrit = true; }
    target.hp -= dmg;
    _hitMonsterAnim(target, isCrit);
    this._floatMon(target, `-${dmg}`, isCrit ? 'crit' : 'normal');

    if(fromMe && a.ls > 0){
      const heal = Math.floor(dmg * a.ls);
      if(heal > 0){
        Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + heal);
        this._floatPlayer(`+${heal}`, 'heal');
      }
    }
    if(target.hp <= 0 && !target.dead) this._killMonster(target);
  },

  /* ============================================================
   *  宠物行动 —— 冲锋 + 突刺 + 返回
   * ============================================================ */
  async _doPetActionAnimated(p, isAuto){
    const petEl = document.getElementById('pet-' + p.uid);
    const alive = Game.battle.monsters.filter(m=>!m.dead);
    const targetM = alive.sort((a,b)=>a.hp-b.hp)[0] || null;
    const targetEl = targetM ? document.getElementById('mon-' + targetM.mid) : null;

    if(!isAuto && petEl && targetEl){
      await _chargeTo(petEl, targetEl, 300);
      this._doPetAction(p);
      _returnFromCharge(petEl, 250);
      await _sleep(270);
    }else{
      this._doPetAction(p);
    }
  },

  _doPetAction(p){
    const b = Game.battle; if(!b || !p) return;
    if(!petAlive(p)) return;
    const pst = petStatFor(p);
    const ps = petSkillStateFor(p);
    const alive = b.monsters.filter(m=>!m.dead);
    if(alive.length === 0) return;

    if(ps.heal && (!p.skillCd.heal || p.skillCd.heal <= 0)){
      const heal = Math.floor(playerMaxHp() * ps.heal);
      Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + heal);
      this._floatPlayer(`+${heal}`, 'heal');
      _healPlayerAnim();
      p.skillCd.heal = PET_SKILL_CD.heal;
    }

    const target = pick(alive);

    const canGroup = ps.group && (!p.skillCd.group || p.skillCd.group <= 0);
    if(canGroup){
      alive.forEach(t=>{
        let dmg = Math.max(1, Math.floor(pst.atk * 0.22 - t.def * 0.5));
        let isCrit = Math.random() < (0.10 + ps.crit);
        if(isCrit) dmg = Math.floor(dmg * 1.3);
        t.hp -= dmg;
        _hitMonsterAnim(t, isCrit);
        this._floatMon(t, `${p.avatar}-${dmg}`, isCrit ? 'crit' : 'normal');
        if(ps.ls > 0){ Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + Math.floor(dmg * ps.ls)); }
        if(ps.pois){
          const pd = Math.max(1, Math.floor(pst.atk * 0.15));
          t.hp -= pd;
          this._floatMon(t, `${p.avatar}-${pd}`, 'poison');
        }
        if(t.hp <= 0 && !t.dead) this._killMonster(t);
      });
      p.skillCd.group = PET_SKILL_CD.group;
    }else{
      let dmg = Math.max(1, Math.floor(pst.atk - target.def));
      let isCrit = Math.random() < (0.10 + ps.crit);
      if(isCrit) dmg = Math.floor(dmg * 1.3);
      target.hp -= dmg;
      _hitMonsterAnim(target, isCrit);
      this._floatMon(target, `${p.avatar}-${dmg}`, isCrit ? 'crit' : 'normal');
      if(ps.ls > 0){ Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + Math.floor(dmg * ps.ls)); }
      if(ps.pois){
        const pd = Math.max(1, Math.floor(pst.atk * 0.15));
        target.hp -= pd;
        this._floatMon(target, `${p.avatar}-${pd}`, 'poison');
      }
      if(target.hp <= 0 && !target.dead) this._killMonster(target);
    }
  },

  /* ============================================================
   *  怪物行动 —— 冲锋 + 突刺 + 返回
   * ============================================================ */
  async _doMonsterActionAnimated(m, defMul, isAuto){
    const card = document.getElementById('mon-' + m.mid);

    const alivePets = getActivePetObjects();
    let targetEl = null;
    let targetIsPet = false;
    let targetPet = null;
    if(alivePets.length > 0 && Math.random() < 0.5){
      targetIsPet = true;
      targetPet = pick(alivePets);
      targetEl = document.getElementById('pet-' + targetPet.uid);
    }else{
      targetEl = $('pBox');
    }

    if(!isAuto && card && targetEl){
      await _chargeTo(card, targetEl, 300);
      this._doMonsterAction(m, defMul, { targetIsPet, targetPet });
      _returnFromCharge(card, 250);
      await _sleep(270);
    }else{
      this._doMonsterAction(m, defMul, { targetIsPet, targetPet });
    }
  },

  _doMonsterAction(m, defMul, presetTarget){
    const b = Game.battle; if(!b) return;
    if(m.dead) return;

    if(m.behavior === 'healer'){
      const allies = b.monsters.filter(x=>!x.dead && x !== m);
      if(allies.length > 0){
        const worst = allies.sort((a,b)=>a.hp/a.maxHp - b.hp/b.maxHp)[0];
        const heal = Math.floor(worst.maxHp * 0.15);
        worst.hp = Math.min(worst.maxHp, worst.hp + heal);
        this._floatMon(worst, `+${heal}`, 'heal');
        return;
      }
    }
    if(m.behavior === 'summon' && b.roundCount % 2 === 0){
      const aliveCount = b.monsters.filter(x=>!x.dead).length;
      if(aliveCount < 5){
        const nm = {
          mid: uid(), protoId: m.protoId+'_sum', name:'召唤小怪',
          hp: Math.floor(m.maxHp*0.3), maxHp: Math.floor(m.maxHp*0.3),
          atk: Math.floor(m.atk*0.5), def: Math.floor(m.def*0.5),
          spd: m.spd+2, exp: Math.floor(m.exp*0.2),
          gMin:1, gMax:5, behavior:'normal',
          elite:false, affixes:[], dead:false, deathTs:0, vamp:0, pois:0
        };
        b.monsters.push(nm);
        this.render();
      }
    }

    let atkVal = m.atk;
    if(m.behavior === 'rage' && m.hp/m.maxHp < 0.5) atkVal = Math.floor(atkVal * 1.5);
    const a = calcAttr();
    const defMulFinal = defMul > 1 ? 1.3 : 1;

    const targetIsPet = presetTarget && presetTarget.targetIsPet;
    const targetPet = presetTarget && presetTarget.targetPet;

    if(targetIsPet && targetPet && petAlive(targetPet)){
      const pst = petStatFor(targetPet);
      let dmg = Math.max(1, Math.floor(atkVal - pst.def * defMulFinal * 0.9));
      let isCrit = Math.random() < 0.08;
      if(isCrit) dmg = Math.floor(dmg * 1.25);
      petTakeDamage(targetPet, dmg);
      const petEl = document.getElementById('pet-' + targetPet.uid);
      if(petEl){
        petEl.classList.remove('anim-hit-shake');
        void petEl.offsetWidth;
        petEl.classList.add('anim-hit-shake');
        setTimeout(()=>petEl.classList.remove('anim-hit-shake'), 450);
      }
      this._floatPet(targetPet, `-${dmg}`, isCrit ? 'crit' : 'normal');
      if(!petAlive(targetPet)) toast(`${targetPet.name} 倒下，30 秒后复活`);
      const ps = petSkillStateFor(targetPet);
      if(ps.reflect){
        const rdmg = Math.max(1, Math.floor(dmg * ps.reflect));
        m.hp -= rdmg;
        this._floatMon(m, `-${rdmg}`, 'reflect');
        if(m.hp <= 0 && !m.dead) this._killMonster(m);
      }
    }else{
      let dmg = Math.max(1, Math.floor(atkVal - a.def * defMulFinal * 0.9));
      let isCrit = Math.random() < 0.08;
      if(isCrit) dmg = Math.floor(dmg * 1.25);
      Game.player.hp -= dmg;
      _hitPlayerAnim();
      this._floatPlayer(`-${dmg}`, isCrit ? 'crit' : 'normal');

      let totalReflect = 0;
      getActivePetObjects().forEach(p=>{
        const ps = petSkillStateFor(p);
        if(ps.reflect) totalReflect += ps.reflect;
      });
      if(totalReflect > 0){
        const rdmg = Math.max(1, Math.floor(dmg * totalReflect));
        m.hp -= rdmg;
        this._floatMon(m, `-${rdmg}`, 'reflect');
        if(m.hp <= 0 && !m.dead) this._killMonster(m);
      }
    }

    if(m.vamp) m.hp = Math.min(m.maxHp, m.hp + Math.floor(atkVal * m.vamp * 0.5));
    if(m.pois && !targetIsPet){
      Game.player.hp -= m.pois;
      this._floatPlayer(`-${m.pois}`, 'poison');
    }
  },

  /* ============================================================
   *  击杀 / 结束
   * ============================================================ */
  _killMonster(m){
    if(m.dead) return;
    m.dead = true;
    m.hp = 0;
    m.deathTs = Date.now();
    Game.stats.kills++;
    Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + 5);

    const card = document.getElementById('mon-' + m.mid);
    if(card){ card.classList.add('dead'); card.onclick = null; }

    const gold = rnd(m.gMin, m.gMax);
    Game.player.gold += gold;
    addExp(m.exp);
    getActivePetObjects().forEach(p=>petAddExp(p, Math.floor(m.exp * 0.5)));
    Quest.onKill(m.protoId);

    let dropChance = m.isBoss ? 0.85 : (m.elite ? 0.55 : 0.18);
    if(Math.random() < dropChance){
      const pool = ["木剑","铁剑","布帽","布衣","青铜戒指","木项链"];
      if(m.isBoss && m.dropEquip) pool.push(...m.dropEquip);
      const name = pick(pool);
      const boost = m.isBoss ? 0.15 : (m.elite ? 0.08 : 0);
      const eq = makeEquip(name, rollQuality(boost));
      if(Game.bag.length < Game.player.bagMax){
        Game.bag.push(eq);
        showBattleDrop(`✨ ${eq.name}[${QUALITY[eq.quality].name}] +${gold}金`);
        Quest.onBagChange();
      }else{
        showBattleDrop(`+${gold}金 · 背包已满`);
      }
    }else{
      showBattleDrop(`+${gold} 金币`);
    }
    if(m.elite && Math.random() < 0.08 && Game.pets.length < PET_WAREHOUSE_MAX){
      const tpl = pick(Object.keys(PET_TEMPLATES));
      const q = pick(['good','fine','epic']);
      const pet = makePet(tpl, q);
      Pet.tryAdd(pet);
      showBattleDrop(`🥚 精英掉落宠物蛋！`);
    }
    if(m.isBoss){
      if(Math.random() < 0.25 && Game.pets.length < PET_WAREHOUSE_MAX){
        const tpl = pick(Object.keys(PET_TEMPLATES));
        const q = pick(['fine','epic']);
        const pet = makePet(tpl, q);
        Pet.tryAdd(pet);
        showBattleDrop(`🥚 BOSS 掉落宠物蛋！`);
      }
      if(m.unlockDragon){
        Game.flags.dragonCity = true;
        showBattleDrop('🌐 魔龙城已解锁！');
      }
      areaState(Game.ui.areaId).floors[Game.ui.floorIdx].bossDeath = Date.now();
    }
    Save.auto();
  },

  _onGroupCleared(){
    const b = Game.battle; if(!b) return;
    this.stopAuto();
    if(b.kind === 'group' && b.group){
      b.group.alive = false;
      b.group.deathTs = Date.now();
      b.group.clearFlag = true;
    }
    const st = areaState(Game.ui.areaId).floors[Game.ui.floorIdx];
    if(!st.mark && st.groups.every(g=>g.clearFlag)) st.mark = true;
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && petAlive(p)){ p.hp = petStatFor(p).hp; p.skillCd = {}; }
    });
    Save.auto();
    setTimeout(()=>this.end(), 700);
  },
  _onPlayerDead(){
    const lossPct = rnd(5, 20);
    const lost = Math.floor(Game.player.gold * lossPct / 100);
    Game.player.gold -= lost;
    toast(`💀 死亡！损失 ${lossPct}% 金币（-${lost}）`);
    Game.player.hp = playerMaxHp();
    Game.player.mp = playerMaxMp();
    Game.stats.deaths++;
    this.stopAuto();
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && petAlive(p)){ p.hp = petStatFor(p).hp; p.skillCd = {}; }
    });
    Save.auto();
    setTimeout(()=>this.end(), 900);
  },
  quit(){
    if(Game.battle && Game.battle.monsters.some(m=>!m.dead)){
      confirmBox("战斗未结束，确定退出？", ()=>{
        this.stopAuto();
        this.end();
      });
    }else{
      this.stopAuto();
      this.end();
    }
  },
  end(){
    this.stopAuto();
    Game.battle = null;
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && petAlive(p)){ p.hp = petStatFor(p).hp; p.skillCd = {}; }
    });
    Nav.home();
    Render.top();
  }
};
