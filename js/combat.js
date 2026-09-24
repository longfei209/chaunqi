/* ============================================================
 *  combat.js —— 战斗系统
 *  本轮：BOSS 带 2 精英小弟 + 召唤限制 + 死亡惩罚 +
 *       牛魔洞/幽灵船解锁 + 毒术 + 书页掉落 + 技能等级生效
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
  el._t = setTimeout(()=>el.classList.remove('on'), 2400);
}

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
  const el = $('pBox');
  if(!el) return;
  el.classList.remove('anim-hit-shake');
  void el.offsetWidth;
  el.classList.add('anim-hit-shake');
  setTimeout(()=>el.classList.remove('anim-hit-shake'), 450);
}
function _healPlayerAnim(){
  const el = $('pBox');
  if(!el) return;
  el.classList.remove('anim-heal-glow');
  void el.offsetWidth;
  el.classList.add('anim-heal-glow');
  setTimeout(()=>el.classList.remove('anim-heal-glow'), 700);
}
function _buffPlayerAnim(){
  const el = $('pBox');
  if(!el) return;
  el.classList.remove('anim-buff-glow');
  void el.offsetWidth;
  el.classList.add('anim-buff-glow');
  setTimeout(()=>el.classList.remove('anim-buff-glow'), 800);
}

async function _chargeTo(attackerEl, targetEl, moveMs){
  if(!attackerEl || !targetEl) return;
  const a = attackerEl.getBoundingClientRect();
  const t = targetEl.getBoundingClientRect();
  const aCx = a.left + a.width/2;
  const aCy = a.top  + a.height/2;
  const tCx = t.left + t.width/2;
  const tCy = t.top  + t.height/2;
  const dx = tCx - aCx;
  const dy = tCy - aCy;
  const sign = dx >= 0 ? 1 : -1;
  const stopDist = (a.width/2 + t.width/2 + 4);
  const realDx = dx - sign * stopDist;
  const realDy = dy;
  attackerEl.style.zIndex = 200;
  attackerEl.style.transition = `transform ${moveMs}ms cubic-bezier(.4,0,.25,1)`;
  attackerEl.style.transform = `translate(${realDx}px, ${realDy}px)`;
  await _sleep(moveMs);
  attackerEl.style.transition = `transform 90ms cubic-bezier(.2,0,.5,1)`;
  attackerEl.style.transform = `translate(${realDx + sign * 8}px, ${realDy}px)`;
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

function _popSkillEmoji(targetEl, emoji, fromTop, small){
  if(!targetEl || !emoji) return;
  const r = targetEl.getBoundingClientRect();
  const span = document.createElement('div');
  span.className = 'skill-emoji' + (small ? ' small' : '');
  span.textContent = emoji;
  span.style.left = (r.left + r.width/2) + 'px';
  span.style.top = fromTop ? (r.top - 40) + 'px' : (r.top + r.height/2) + 'px';
  document.body.appendChild(span);
  setTimeout(()=>{ if(span.parentNode) span.parentNode.removeChild(span); }, 950);
}
function _pulseCard(m, cls){
  const card = document.getElementById('mon-' + m.mid);
  if(!card) return;
  card.classList.remove(cls);
  void card.offsetWidth;
  card.classList.add(cls);
  setTimeout(()=>card.classList.remove(cls), 700);
}

/* 生成 BOSS 的 2 只精英守卫 */
function _makeBossGuards(bossDef){
  const guards = [];
  for(let i=0;i<2;i++){
    const g = {
      mid: uid(), protoId: bossDef.id + '_guard_' + i,
      name: '精英·' + bossDef.name + '守卫',
      hp: Math.floor(bossDef.hp * 0.4),
      maxHp: Math.floor(bossDef.hp * 0.4),
      atk: Math.floor(bossDef.atk * 0.4),
      def: Math.floor(bossDef.def * 0.4),
      spd: bossDef.spd,
      exp: Math.floor(bossDef.exp * 0.5),
      gMin: Math.floor(bossDef.gMin * 0.5),
      gMax: Math.floor(bossDef.gMax * 0.5),
      behavior: 'normal',
      elite: true,
      isBossGuard: true,
      affixes: [],
      dead: false, deathTs: 0,
      vamp: 0, pois: 0, summonCount: 0
    };
    // 加 1 个随机精英词缀
    const af = pick(ELITE_AFFIXES);
    af.apply(g);
    g.affixes.push(af.k);
    guards.push(g);
  }
  return guards;
}

const Combat = {
  startGroup(gi){
    const st = areaState(Game.ui.areaId).floors[Game.ui.floorIdx];
    const group = st.groups[gi];
    if(!group || !group.alive) return toast("该组已清空");
    if(group.members.every(m=>m.dead)) return toast("该组已清空");
    // 重置召唤计数
    group.members.forEach(m=>{ m.summonCount = 0; });
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
      dead:false, deathTs:0, vamp:0, pois:0, summonCount:0,
      isBoss:true,
      dropEquip: def.dropEquip || null,
      unlockDragon: def.unlockDragon || false,
      unlockNiumo: def.unlockNiumo || false,
      unlockGhost: def.unlockGhost || false
    };
    // BOSS 带 2 只精英小弟
    const guards = _makeBossGuards(def);
    Game.battle = {
      kind:'boss', monsters:[boss, ...guards], boss, group:null,
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
      : `${ar.name} 第${fi+1}层 · ${b.group ? b.group.name : ''}`;

    const a = calcAttr();
    const mHp = playerMaxHp(), mMp = playerMaxMp();
    const hpP = clamp(Game.player.hp/mHp,0,1)*100;
    const mpP = clamp(Game.player.mp/mMp,0,1)*100;
    const rage = Game.player.rage || 0;
    const zsActive = b.buff.zhanshen > 0;

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
      <div class="unit-box p-box ${zsActive?'zs-active':''}" id="pBox">
        <div class="u-emoji">🧙</div>
        <div class="u-lv">Lv.${Game.player.lv}</div>
        <div class="u-bar hp">
          <i style="width:${hpP}%"></i>
          <span class="u-num">${Math.floor(Game.player.hp)}</span>
        </div>
        <div class="u-bar mp">
          <i style="width:${mpP}%"></i>
          <span class="u-num">${Math.floor(Game.player.mp)}</span>
        </div>
      </div>
      <div class="rage-line">怒 ${rage}/${RAGE_MAX}</div>
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
    this._refreshSkillBtn('bSkill4', 'du');
    this._refreshSkillBtn('bSkill5', 'zhanshen');
    $('bRageBtn').disabled = (Game.player.rage || 0) < RAGE_MAX;
    $('bAutoBtn').textContent = b.auto ? '停止' : '自动';

    const tipEl = $('bTip');
    if(zsActive){
      const zsAtkMin = Math.floor(a.atkMin * 1.3);
      const zsAtkMax = Math.floor(a.atkMax * 1.3);
      const zsDefMin = Math.floor(a.defMin * 1.3);
      const zsDefMax = Math.floor(a.defMax * 1.3);
      tipEl.classList.add('zs-tip');
      tipEl.textContent = `怒 ${rage}/${RAGE_MAX} · 🛡️战神祝福(${b.buff.zhanshen}) 攻 ${zsAtkMin}-${zsAtkMax} 防 ${zsDefMin}-${zsDefMax}`;
    }else{
      tipEl.classList.remove('zs-tip');
      if(b.pendingSkill) tipEl.textContent = `点击怪物释放 ${SKILLS[b.pendingSkill].name}`;
      else if(b.auto) tipEl.textContent = '自动战斗中…';
      else tipEl.textContent = `点击怪物攻击 · 怒 ${rage}/${RAGE_MAX} · 攻 ${a.atkMin}-${a.atkMax} 防 ${a.defMin}-${a.defMax}`;
    }
  },

  _refreshSkillBtn(id, key){
    const sk = SKILLS[key];
    const btn = $(id);
    if(!btn) return;
    const b = Game.battle;
    const cd = b.cds ? (b.cds[key] || 0) : 0;
    const lv = getSkillLv(key);
    const shortName = sk.name.slice(0,2);
    const kbd = btn.querySelector('.kbd-tag');
    const kbdText = kbd ? kbd.outerHTML : '';
    if(Game.player.lv < sk.unlock){
      btn.innerHTML = `${kbdText}${shortName}(${sk.unlock})`;
      btn.disabled = true;
    }else if(cd > 0){
      btn.innerHTML = `${kbdText}${shortName}${lv}(${cd})`;
      btn.disabled = true;
    }else if(Game.player.mp < sk.mp){
      btn.innerHTML = `${kbdText}${shortName}${lv}(${sk.mp}蓝)`;
      btn.disabled = true;
    }else{
      btn.innerHTML = `${kbdText}${shortName}${lv}`;
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

    if(key === 'liehuo' || key === 'du'){
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
      }else if(Game.player.lv >= 6 && (!b.cds.du) && Game.player.mp >= SKILLS.du.mp){
        let target = null;
        if(b.lastTarget) target = Game.battle.monsters.find(m => m.mid === b.lastTarget && !m.dead) || null;
        if(!target){
          const list = Game.battle.monsters.filter(m=>!m.dead);
          list.sort((a,b)=>a.hp-b.hp);
          target = list[0];
        }
        if(target){ b.lastTarget = target.mid; this._resolveRound({ type:'skill', skill:'du', target }); }
        else this.attack();
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

  async _resolveRound(action){
    const b = Game.battle; if(!b || b.resolving) return;
    b.resolving = true;
    try {
      if(!b.cds) b.cds = {};
      b.roundCount++;

      const pa = calcAttr();
      let atkMul = 1, defMul = 1;
      if(b.buff.zhanshen > 0){
        atkMul = skillBuffMul('zhanshen', 1.3);
        defMul = skillBuffMul('zhanshen', 1.3);
      }

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

      // 中毒结算（在怪物行动后统一扣毒伤）
      this._tickPoison();

      if(Game.player.hp <= 0){ this._onPlayerDead(); return; }
      if(b.monsters.every(x=>x.dead)){ this._onGroupCleared(); return; }

      Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + MP_REGEN_PER_TURN);
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

  /* 中毒结算 */
  _tickPoison(){
    const b = Game.battle; if(!b) return;
    b.monsters.forEach(m=>{
      if(m.dead || !m.poison || m.poison.turns <= 0) return;
      const dmg = m.poison.dmg;
      m.hp -= dmg;
      this._floatMon(m, `☠-${dmg}`, 'poison');
      m.poison.turns--;
      if(m.poison.turns <= 0) m.poison = null;
      if(m.hp <= 0 && !m.dead) this._killMonster(m);
    });
  },

  async _monsterPhaseOnly(){
    const b = Game.battle; if(!b || b.resolving) return;
    b.resolving = true;
    try {
      const defMul = b.buff.zhanshen > 0 ? skillBuffMul('zhanshen', 1.3) : 1.0;
      const isAuto = b.auto;
      const order = b.monsters.filter(m=>!m.dead).sort((a,b)=>b.spd - a.spd);
      for(const m of order){
        if(!Game.battle) return;
        if(m.dead) continue;
        await this._doMonsterActionAnimated(m, defMul, isAuto);
        if(Game.player.hp <= 0) break;
      }
      if(Game.player.hp <= 0){ this._onPlayerDead(); return; }
      this._tickPoison();
      if(Game.player.hp <= 0){ this._onPlayerDead(); return; }
      if(b.monsters.every(x=>x.dead)){ this._onGroupCleared(); return; }
      for(const k in b.cds){ if(b.cds[k] > 0) b.cds[k]--; }
      if(b.buff.zhanshen > 0) b.buff.zhanshen--;
      Game.activePets.forEach(u=>{
        const p = Game.pets.find(x=>x.uid === u);
        if(p && p.skillCd){ for(const k in p.skillCd){ if(p.skillCd[k] > 0) p.skillCd[k]--; } }
      });
      Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + MP_REGEN_PER_TURN);
      this.render();
      Render.top();
      Save.auto();
    } finally {
      if(Game.battle) Game.battle.resolving = false;
    }
  },

  async _doPlayerActionAnimated(action, atkMul, isAuto){
    const playerEl = $('pBox');
    let targetM = action.target;
    if(!targetM || targetM.dead){
      const alive = Game.battle.monsters.filter(m=>!m.dead);
      targetM = alive[0] || null;
    }
    const targetEl = targetM ? document.getElementById('mon-' + targetM.mid) : null;

    if(!isAuto && playerEl && targetEl){
      await _chargeTo(playerEl, targetEl, 260);
      this._doPlayerAction(action, atkMul);
      _returnFromCharge(playerEl, 220);
      await _sleep(240);
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
      const baseAtk = rnd(a.atkMin, a.atkMax) * atkMul;
      this._playerHit(t, baseAtk);
      if(Math.random() < a.combo && !t.dead){
        const baseAtk2 = rnd(a.atkMin, a.atkMax) * atkMul * 0.6;
        this._playerHit(t, baseAtk2, '连击');
      }
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
        const mul = skillDmgMul('liehuo', 1.8);
        const baseAtk = rnd(a.atkMin, a.atkMax) * atkMul * mul;
        this._playerHit(t, baseAtk);
        _popSkillEmoji(document.getElementById('mon-'+t.mid), '🔥', true, true);
        _pulseCard(t, 'anim-fire-pulse');
        if(Math.random() < a.combo && !t.dead){
          const baseAtk2 = rnd(a.atkMin, a.atkMax) * atkMul * mul * 0.6;
          this._playerHit(t, baseAtk2, '连击');
        }
      }
      else if(key === 'banyue'){
        _popSkillEmoji($('bGrid'), '⚔️', false, false);
        const mul = skillDmgMul('banyue', 0.9);
        b.monsters.filter(m=>!m.dead).forEach(t=>{
          const baseAtk = rnd(a.atkMin, a.atkMax) * atkMul * mul;
          this._playerHit(t, baseAtk);
        });
      }
      else if(key === 'zhiyu'){
        const rate = skillHealRate('zhiyu', 0.25);
        const heal = Math.floor(playerMaxHp() * rate);
        Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + heal);
        this._floatPlayer(`+${heal}`, 'heal');
        _popSkillEmoji($('pBox'), '💚', false, false);
        _healPlayerAnim();
        getActivePetObjects().forEach(p=>{
          const pMax = petStatFor(p).hp;
          const pHeal = Math.floor(pMax * rate);
          if(pHeal > 0 && p.hp < pMax){
            p.hp = Math.min(pMax, p.hp + pHeal);
            this._floatPet(p, `+${pHeal}`, 'heal');
            const petEl = document.getElementById('pet-' + p.uid);
            if(petEl){
              petEl.classList.remove('anim-heal-glow');
              void petEl.offsetWidth;
              petEl.classList.add('anim-heal-glow');
              setTimeout(()=>petEl.classList.remove('anim-heal-glow'), 700);
            }
          }
        });
      }
      else if(key === 'du'){
        const t = action.target;
        if(!t || t.dead) return;
        const dmg = skillPoisonDmg();
        t.poison = { turns: 3, dmg: dmg };
        _popSkillEmoji(document.getElementById('mon-'+t.mid), '☠️', true, true);
        this._floatMon(t, `中毒`, 'poison');
        toast(`☠️ ${t.name} 中毒 3 回合（每回合 -${dmg}）`);
      }
      else if(key === 'zhanshen'){
        b.buff.zhanshen = 3;
        _popSkillEmoji($('pBox'), '🛡️', false, false);
        _buffPlayerAnim();
        const bonus = Math.floor((skillBuffMul('zhanshen', 1.3) - 1) * 100);
        toast(`🛡️ 战神祝福！攻防+${bonus}%`);
      }
      Game.player.rage = Math.min(RAGE_MAX, (Game.player.rage||0) + 1);
    }
    else if(action.type === 'rage'){
      const t = action.target;
      if(!t || t.dead) return;
      Game.player.rage = 0;
      const baseAtk = rnd(a.atkMin, a.atkMax) * atkMul * 3.0;
      this._playerHit(t, baseAtk, '怒斩', true);
      _popSkillEmoji(document.getElementById('mon-'+t.mid), '⚡', false, false);
      _pulseCard(t, 'anim-rage-hit');
    }
  },

  _playerHit(target, baseAtk, tag, forceCrit){
    const a = calcAttr();
    let dmg = Math.max(1, Math.floor(baseAtk - target.def));
    let isCrit = false;
    if(forceCrit) isCrit = true;
    else if(Math.random() < a.crit){ dmg = Math.floor(dmg * a.critD); isCrit = true; }
    target.hp -= dmg;

    const tagTxt = tag ? `[${tag}]` : '';
    _hitMonsterAnim(target, isCrit);
    this._floatMon(target, `${tagTxt}-${dmg}`, isCrit ? 'crit' : 'normal');

    this._applyLifesteal(dmg, 'player');

    if(target.hp <= 0 && !target.dead) this._killMonster(target);
  },

  _applyLifesteal(dmg, who){
    if(who === 'player'){
      const a = calcAttr();
      let totalHeal = 0;
      if(a.lsPct > 0) totalHeal += Math.floor(dmg * a.lsPct);
      if(a.lsFlat > 0) totalHeal += a.lsFlat;
      if(totalHeal > 0){
        Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + totalHeal);
        this._floatPlayer(`+${totalHeal}`, 'heal');
      }
    }
  },

  _petLifesteal(p, dmg){
    const pst = petStatFor(p);
    const ps = petSkillStateFor(p);
    if(ps.ls > 0){
      const heal = Math.floor(dmg * ps.ls);
      if(heal > 0) p.hp = Math.min(pst.hp, p.hp + heal);
    }
  },

  async _doPetActionAnimated(p, isAuto){
    const petEl = document.getElementById('pet-' + p.uid);
    const alive = Game.battle.monsters.filter(m=>!m.dead);
    const targetM = alive.sort((a,b)=>a.hp-b.hp)[0] || null;
    const targetEl = targetM ? document.getElementById('mon-' + targetM.mid) : null;

    if(!isAuto && petEl && targetEl){
      await _chargeTo(petEl, targetEl, 220);
      this._doPetAction(p);
      _returnFromCharge(petEl, 180);
      await _sleep(200);
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

    // 怒火：主人低血时攻击 +50%
    let petAtkBonus = 1;
    if(ps.ragePet && Game.player.hp / playerMaxHp() < 0.3){
      petAtkBonus = 1.5;
    }

    const target = pick(alive);

    const canGroup = ps.group && (!p.skillCd.group || p.skillCd.group <= 0);
    if(canGroup){
      alive.forEach(t=>{
        let dmg = Math.max(1, Math.floor((pst.atk * 0.22 * petAtkBonus) - t.def * 0.5));
        let isCrit = Math.random() < (0.10 + ps.crit);
        if(isCrit) dmg = Math.floor(dmg * 1.3);
        t.hp -= dmg;
        _hitMonsterAnim(t, isCrit);
        this._floatMon(t, `${p.avatar}-${dmg}`, isCrit ? 'crit' : 'normal');
        this._petLifesteal(p, dmg);
        if(ps.pois){
          const pd = Math.max(1, Math.floor(pst.atk * 0.15));
          t.hp -= pd;
          this._floatMon(t, `${p.avatar}-${pd}`, 'poison');
        }
        if(t.hp <= 0 && !t.dead) this._killMonster(t);
      });
      p.skillCd.group = PET_SKILL_CD.group;
    }else{
      let dmg = Math.max(1, Math.floor((pst.atk * petAtkBonus) - target.def));
      // 重击：15% 概率 1.8 倍
      let isHeavy = ps.heavy && Math.random() < ps.heavy;
      if(isHeavy) dmg = Math.floor(dmg * 1.8);
      let isCrit = Math.random() < (0.10 + ps.crit);
      if(isCrit) dmg = Math.floor(dmg * 1.3);
      target.hp -= dmg;
      _hitMonsterAnim(target, isCrit || isHeavy);
      const tag = isHeavy ? '重击' : '';
      this._floatMon(target, `${p.avatar}${tag}-${dmg}`, (isCrit || isHeavy) ? 'crit' : 'normal');
      this._petLifesteal(p, dmg);
      if(ps.pois){
        const pd = Math.max(1, Math.floor(pst.atk * 0.15));
        target.hp -= pd;
        this._floatMon(target, `${p.avatar}-${pd}`, 'poison');
      }
      if(target.hp <= 0 && !target.dead) this._killMonster(target);
      // 连咬：15% 概率追加 60% 伤害
      if(ps.double && Math.random() < ps.double && !target.dead){
        let dmg2 = Math.max(1, Math.floor((pst.atk * petAtkBonus * 0.6) - target.def * 0.6));
        target.hp -= dmg2;
        _hitMonsterAnim(target, false);
        this._floatMon(target, `${p.avatar}[连咬]-${dmg2}`, 'normal');
        this._petLifesteal(p, dmg2);
        if(target.hp <= 0 && !target.dead) this._killMonster(target);
      }
    }
  },

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
      await _chargeTo(card, targetEl, 220);
      this._doMonsterAction(m, defMul, { targetIsPet, targetPet });
      _returnFromCharge(card, 180);
      await _sleep(200);
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
    // 召唤：一生最多 2 只
    if(m.behavior === 'summon' && b.roundCount % 2 === 0){
      if(!m.summonCount) m.summonCount = 0;
      const aliveCount = b.monsters.filter(x=>!x.dead).length;
      if(m.summonCount < 2 && aliveCount < 5){
        const nm = {
          mid: uid(), protoId: m.protoId+'_sum_'+m.summonCount, name:'召唤小怪',
          hp: Math.floor(m.maxHp*0.3), maxHp: Math.floor(m.maxHp*0.3),
          atk: Math.floor(m.atk*0.5), def: Math.floor(m.def*0.5),
          spd: m.spd+2, exp: Math.floor(m.exp*0.2),
          gMin:1, gMax:5, behavior:'normal',
          elite:false, affixes:[], dead:false, deathTs:0, vamp:0, pois:0,
          summonCount: 0
        };
        b.monsters.push(nm);
        m.summonCount++;
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
      const playerDef = rnd(a.defMin, a.defMax);
      let dmg = Math.max(1, Math.floor(atkVal - playerDef * defMulFinal * 0.9));
      let isCrit = Math.random() < 0.08;
      if(isCrit) dmg = Math.floor(dmg * 1.25);

      // 护主：宠物替主人承担伤害
      let guardPets = getActivePetObjects().filter(p=>{
        const ps = petSkillStateFor(p);
        return ps.guard && petAlive(p);
      });
      if(guardPets.length > 0){
        const totalGuard = guardPets.reduce((s,p)=>s + petSkillStateFor(p).guard, 0);
        const shared = Math.floor(dmg * Math.min(0.6, totalGuard));
        // 平均分给带护主的宠物
        const per = Math.floor(shared / guardPets.length);
        guardPets.forEach(p=>{
          const pst = petStatFor(p);
          const actual = Math.min(per, p.hp);
          petTakeDamage(p, per);
          this._floatPet(p, `护-${per}`, 'reflect');
        });
        dmg -= shared;
      }

      Game.player.hp -= dmg;
      if(dmg > 0){
        _hitPlayerAnim();
        this._floatPlayer(`-${dmg}`, isCrit ? 'crit' : 'normal');
      }

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

      if(!m.dead && Math.random() < a.counter){
        const counterDmg = Math.max(1, Math.floor(rnd(a.atkMin, a.atkMax) - m.def));
        m.hp -= counterDmg;
        _hitMonsterAnim(m, false);
        this._floatMon(m, `[反击]-${counterDmg}`, 'normal');
        if(m.hp <= 0 && !m.dead) this._killMonster(m);
      }
    }

    if(m.vamp) m.hp = Math.min(m.maxHp, m.hp + Math.floor(atkVal * m.vamp * 0.5));
    if(m.pois && !targetIsPet){
      Game.player.hp -= m.pois;
      this._floatPlayer(`-${m.pois}`, 'poison');
    }
  },

  _killMonster(m){
    if(m.dead) return;
    m.dead = true;
    m.hp = 0;
    m.deathTs = Date.now();
    Game.stats.kills++;
    Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + MP_REGEN_PER_KILL);

    const card = document.getElementById('mon-' + m.mid);
    if(card){ card.classList.add('dead'); card.onclick = null; }

    const gold = rnd(m.gMin, m.gMax);
    Game.player.gold += gold;
    addExp(m.exp);
    getActivePetObjects().forEach(p=>petAddExp(p, Math.floor(m.exp * 0.5)));
    Quest.onKill(m.protoId);

    let dropChance = m.isBoss ? 0.85 : (m.elite ? 0.55 : 0.18);
    if(Math.random() < dropChance){
      const monType = m.isBoss ? 'boss' : (m.elite ? 'elite' : 'normal');
      const eq = rollDropEquip(Game.ui.areaId, monType);
      if(eq){
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
    }else{
      showBattleDrop(`+${gold} 金币`);
    }

    this._tryDropGemOrFrag(m);

    // 书页掉落
    let pageRate = PAGE_DROP.normalMon;
    if(m.isBoss) pageRate = PAGE_DROP.boss;
    else if(m.elite) pageRate = PAGE_DROP.elite;
    if(Math.random() < pageRate){
      Game.pages = (Game.pages || 0) + 1;
      showBattleDrop(`📖 掉落 书页 ×1`);
    }

    if(m.elite && !m.isBossGuard && Math.random() < 0.08 && Game.pets.length < PET_WAREHOUSE_MAX){
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
      if(m.unlockNiumo){
        Game.flags.niumo = true;
        showBattleDrop('🐂 牛魔洞已解锁！');
      }
      if(m.unlockGhost){
        Game.flags.ghost = true;
        showBattleDrop('👻 幽灵船已解锁！');
      }
      areaState(Game.ui.areaId).floors[Game.ui.floorIdx].bossDeath = Date.now();
      showBattleDrop(`👑 ${m.name} 已被击杀！下一层已解锁`);
    }
    Save.auto();
  },

  _tryDropGemOrFrag(m){
    let rate = GEM_DROP_RATE.normalMon;
    if(m.isBoss) rate = GEM_DROP_RATE.boss;
    else if(m.elite) rate = GEM_DROP_RATE.elite;
    if(Math.random() >= rate) return;
    const isGem = Math.random() < GEM_DROP_SPLIT;
    if(isGem){
      const boost = m.isBoss ? 0.15 : (m.elite ? 0.05 : 0);
      const gem = dropGem(boost);
      Game.gems.push(gem);
      const gq = GEM_QUALITY[gem.quality];
      showBattleDrop(`💎 掉落 ${GEMS[gem.key].name}（${gq.name}）`);
    }else{
      const r = dropFragment();
      if(r){
        showBattleDrop(`🧩 掉落 ${GEMS[r.key].name}碎片`);
      }
    }
  },

  _onGroupCleared(){
    const b = Game.battle; if(!b) return;
    this.stopAuto();
    if(b.kind === 'group' && b.group){
      b.group.alive = false;
      b.group.deathTs = Date.now();
    }
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && petAlive(p)){ p.hp = petStatFor(p).hp; p.skillCd = {}; }
    });
    Save.auto();
    setTimeout(()=>this.end(), 700);
  },

  /* ============================================================
   *  死亡惩罚
   * ============================================================ */
  _onPlayerDead(){
    const p = Game.player;
    const isProtected = p.lv <= 3;

    let lines = ['💀 你死亡了'];

    if(isProtected){
      lines.push('（3 级以下保护，无损失）');
    }else{
      // 1. 随机掉 1 件穿戴装备
      const slots = SLOT_ORDER.filter(s => Game.worn[s]);
      let lostEquipName = null;
      if(slots.length > 0){
        const slot = pick(slots);
        const eq = Game.worn[slot];
        lostEquipName = eq.name;
        Game.worn[slot] = null;
      }
      // 2. 扣经验 15%
      const need = p.lv * 120;
      const expLoss = Math.min(p.exp, Math.floor(need * 0.15));
      p.exp -= expLoss;
      // 3. 金币 5~20%
      const lossPct = rnd(5, 20);
      const goldLost = Math.floor(p.gold * lossPct / 100);
      p.gold -= goldLost;

      lines.push('');
      if(lostEquipName) lines.push(`掉落装备：${lostEquipName}`);
      else lines.push('掉落装备：（无可掉落）');
      lines.push(`损失经验：${expLoss}`);
      lines.push(`损失金币：${goldLost}（-${lossPct}%）`);
    }

    Game.player.hp = playerMaxHp();
    Game.player.mp = playerMaxMp();
    Game.stats.deaths++;
    this.stopAuto();
    Game.activePets.forEach(u=>{
      const pet = Game.pets.find(x=>x.uid === u);
      if(pet && petAlive(pet)){ pet.hp = petStatFor(pet).hp; pet.skillCd = {}; }
    });
    Save.auto();

    // 先关闭战斗界面，回到主页
    this.end();

    // 再弹窗展示死亡结算
    setTimeout(()=>{
      confirmBox(lines.join('\n'), ()=>{ Render.top(); Render.home(); });
    }, 200);
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