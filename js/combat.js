/* ============================================================
 *  combat.js  —— 战斗系统
 *  本轮调整：
 *   - 宠物受伤机制（随机目标 + 群攻全体反击）
 *   - 宠物攻击飘字带头像
 *   - 宠物技能 CD（heal=3, group=2）
 *   - 宠物下场冷却 30 秒
 *   - 战斗结束宠物回满血
 * ============================================================ */

function showBattleDrop(text){
  const el = $('bDrop');
  if(!el) return;
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('on'), 2000);
}

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
      buff:{ zhanshen:0 }, cds:{}
    };
    // 战斗开场：所有上阵宠物回满血 + 重置 CD
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
      behavior: 'normal', elite: false, affixes: [],
      dead: false, deathTs: 0, vamp: 0, pois: 0,
      isBoss: true,
      dropEquip: def.dropEquip || null,
      unlockDragon: def.unlockDragon || false
    };
    Game.battle = {
      kind:'boss', monsters:[boss], boss, group:null,
      auto:false, pendingSkill:null, roundCount:0,
      buff:{ zhanshen:0 }, cds:{}
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
    const rage = Game.player.rage || 0;
    const buffActive = b.buff.zhanshen > 0;

    const rawAtk = a.atk, rawDef = a.def;
    const showAtk = buffActive ? Math.floor(rawAtk * 1.3) : rawAtk;
    const showDef = buffActive ? Math.floor(rawDef * 1.3) : rawDef;
    const atkHtml = buffActive ? `${showAtk} <span class="up">▲</span>` : `${showAtk}`;
    const defHtml = buffActive ? `${showDef} <span class="up">▲</span>` : `${showDef}`;

    let buffTag = '';
    if(buffActive) buffTag = `<div class="buff-tag">战神祝福 ${b.buff.zhanshen}</div>`;

    // 宠物列表（显示 HP 条 + 复活倒计时）
    const activePetObjs = Game.activePets
      .map(u => Game.pets.find(p=>p.uid === u))
      .filter(Boolean);
    let petHtml = '';
    if(activePetObjs.length > 0){
      petHtml = `<div class="pet-box">`;
      activePetObjs.forEach(p=>{
        const maxHp = petStatFor(p).hp;
        const hpPct = clamp(p.hp/maxHp, 0, 1) * 100;
        if(petAlive(p)){
          petHtml += `<div class="pet-item"><span class="pa">${p.avatar}</span><div class="pb"><i style="width:${hpPct}%"></i></div><span class="dim">Lv.${p.lv}</span></div>`;
        }else{
          const left = Math.ceil((p.downUntil - Date.now())/1000);
          petHtml += `<div class="pet-item" style="opacity:.4;"><span class="pa">${p.avatar}</span><div class="pb"><i style="width:0%"></i></div><span class="dim">${left}s</span></div>`;
        }
      });
      petHtml += `</div>`;
    }

    $('bLeft').innerHTML = `
      <div class="p-avatar">🧙</div>
      <div class="p-name">Lv.${Game.player.lv}</div>
      <div class="bar"><i style="width:${hpP}%"></i><div class="txt">${Math.floor(Game.player.hp)}/${mHp}</div></div>
      <div class="bar mp"><i style="width:${mpP}%"></i><div class="txt">${Math.floor(Game.player.mp)}/${mMp}</div></div>
      <div class="rage-line">怒 ${rage}/${RAGE_MAX}</div>
      <div class="p-stats">攻<b>${atkHtml}</b><br>防<b>${defHtml}</b><br>速<b>${a.spd}</b></div>
      ${buffTag}
      ${petHtml}
    `;

    const grid = $('bGrid');
    grid.innerHTML = '';
    b.monsters.forEach((m, i)=>{
      const card = document.createElement('div');
      card.className = 'mon-unit';
      if(m.dead) card.classList.add('dead');
      if(m.elite) card.classList.add('elite');
      if(m.isBoss) card.classList.add('boss');
      card.id = 'mon-' + m.mid;
      const hP = clamp(m.hp/m.maxHp,0,1)*100;
      const affixStr = (m.affixes && m.affixes.length)
        ? m.affixes.map(k=>ELITE_AFFIXES.find(a=>a.k===k).name).join('·')
        : '';
      const bhv = MON_BEHAVIOR[m.behavior] ? MON_BEHAVIOR[m.behavior].name : '';
      const infoParts = [`攻${m.atk}`];
      if(bhv && bhv !== '普通') infoParts.push(bhv);
      if(affixStr) infoParts.push(affixStr);
      card.innerHTML = `
        <div class="m-top">
          <span class="m-name">${m.isBoss?'👹':m.elite?'★':'🐾'} ${m.name}</span>
          <span class="dim" style="font-size:9px;">速${m.spd}</span>
        </div>
        <div class="bar mon m-bar"><i style="width:${hP}%"></i><div class="txt">${Math.max(0,Math.floor(m.hp))}/${m.maxHp}</div></div>
        <div class="m-info">${infoParts.join(' ')}</div>
      `;
      if(!m.dead) card.onclick = ()=>this.clickMonster(i);
      grid.appendChild(card);
    });

    this._refreshSkillBtn('bSkill1', 'liehuo');
    this._refreshSkillBtn('bSkill2', 'banyue');
    this._refreshSkillBtn('bSkill3', 'zhiyu');
    this._refreshSkillBtn('bSkill4', 'zhanshen');
    $('bRageBtn').disabled = (Game.player.rage || 0) < RAGE_MAX;
    $('bAutoBtn').textContent = b.auto ? '停止' : '自动';

    if(b.pendingSkill) $('bTip').textContent = `点击目标释放 ${SKILLS[b.pendingSkill].name}`;
    else if(b.auto) $('bTip').textContent = '自动战斗中…';
    else $('bTip').textContent = '点击怪物发起攻击';
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
    const el = document.getElementById('mon-'+m.mid);
    floatText(el, text, FC[cls] || FC.normal);
  },
  _floatPlayer(text, cls){
    floatText($('bLeft'), text, FC[cls] || FC.normal);
  },
  _floatPetAvatar(p, text, cls){
    // 找到该宠物对应的 DOM（左侧玩家区的 pet-item）
    const boxes = document.querySelectorAll('#bLeft .pet-item');
    const idx = Game.activePets.indexOf(p.uid);
    // 找到与 p 对应的 item（按 uid 无法直接匹配，这里按头像字符匹配 + 顺序近似）
    let el = null;
    for(const box of boxes){
      if(box.querySelector('.pa') && box.querySelector('.pa').textContent === p.avatar){ el = box; break; }
    }
    if(!el) el = $('bLeft');
    floatText(el, text, FC[cls] || FC.normal);
  },

  attack(){
    const b = Game.battle; if(!b || b.pendingSkill) return;
    const alive = b.monsters.filter(m=>!m.dead);
    if(alive.length === 0) return;
    alive.sort((a,b)=>a.hp - b.hp);
    this._resolveRound({ type:'attack', target: alive[0] });
  },
  clickMonster(i){
    const b = Game.battle; if(!b) return;
    const m = b.monsters[i];
    if(!m || m.dead) return;
    if(b.pendingSkill){
      const skKey = b.pendingSkill;
      b.pendingSkill = null;
      this._resolveRound({ type:'skill', skill: skKey, target: m });
    }else{
      this._resolveRound({ type:'attack', target: m });
    }
  },
  useSkill(key){
    const b = Game.battle; if(!b) return;
    const sk = SKILLS[key]; if(!sk) return;
    if(Game.player.lv < sk.unlock) return toast(`需 Lv.${sk.unlock}`);
    if(b.cds && b.cds[key] > 0) return toast("冷却中");
    if(Game.player.mp < sk.mp) return toast("蓝量不足");
    if(key === 'liehuo'){
      b.pendingSkill = key;
      this.render();
      return;
    }
    this._resolveRound({ type:'skill', skill: key, target: null });
  },
  useRage(){
    const b = Game.battle; if(!b) return;
    if((Game.player.rage||0) < RAGE_MAX) return toast("怒气不足");
    const alive = b.monsters.filter(m=>!m.dead);
    if(alive.length === 0) return;
    alive.sort((a,b)=>a.hp-b.hp);
    this._resolveRound({ type:'rage', target: alive[0] });
  },
  potion(){
    const b = Game.battle; if(!b) return;
    if(Game.player.potion <= 0) return toast("没有红药");
    Game.player.potion--;
    const heal = Math.floor(playerMaxHp() * 0.35);
    Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + heal);
    this._floatPlayer(`+${heal}`, 'heal');
    this._monsterPhaseOnly();
  },
  potionMp(){
    const b = Game.battle; if(!b) return;
    if(Game.player.potionMp <= 0) return toast("没有蓝药");
    Game.player.potionMp--;
    const heal = Math.floor(playerMaxMp() * 0.30);
    Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + heal);
    this._floatPlayer(`+${heal}MP`, 'heal');
    this._monsterPhaseOnly();
  },
  flee(){
    const b = Game.battle; if(!b) return;
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
        const t = Game.battle.monsters.filter(m=>!m.dead).sort((a,b)=>a.hp-b.hp)[0];
        if(t) this._resolveRound({type:'skill', skill:'liehuo', target:t});
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

  /* ====== 回合结算 ====== */
  _resolveRound(action){
    const b = Game.battle; if(!b) return;
    if(!b.cds) b.cds = {};
    b.roundCount++;

    // 记录本回合玩家是否使用了群攻（用于怪物反击逻辑）
    let playerAOE = false;
    if(action.type === 'skill' && action.skill === 'banyue') playerAOE = true;

    const units = [];
    const pa = calcAttr();
    let atkMul = 1, defMul = 1;
    if(b.buff.zhanshen > 0){ atkMul = 1.3; defMul = 1.3; }

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

    for(const u of units){
      if(!Game.battle) return;
      if(u.side === 'me') this._doPlayerAction(action, atkMul);
      else if(u.side === 'pet') this._doPetAction(u.pet);
      else { if(u.m.dead) continue; this._doMonsterAction(u.m, defMul); }
      if(Game.player.hp <= 0) break;
      if(b.monsters.every(x=>x.dead)) break;
    }

    if(Game.player.hp <= 0){ this._onPlayerDead(); return; }
    if(b.monsters.every(x=>x.dead)){ this._onGroupCleared(); return; }

    Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + 3 + Math.floor(playerMaxMp()*0.03));
    if(b.buff.zhanshen > 0) b.buff.zhanshen--;
    for(const k in b.cds){ if(b.cds[k] > 0) b.cds[k]--; }

    // 宠物技能 CD 每回合递减
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && p.skillCd){
        for(const k in p.skillCd){ if(p.skillCd[k] > 0) p.skillCd[k]--; }
      }
    });

    this.render(); Render.top(); Save.auto();
  },

  _monsterPhaseOnly(){
    const b = Game.battle; if(!b) return;
    const defMul = b.buff.zhanshen > 0 ? 1.3 : 1.0;
    const order = b.monsters.filter(m=>!m.dead).sort((a,b)=>b.spd - a.spd);
    for(const m of order){
      if(!Game.battle) return;
      if(m.dead) continue;
      this._doMonsterAction(m, defMul);
      if(Game.player.hp <= 0) break;
    }
    if(Game.player.hp <= 0){ this._onPlayerDead(); return; }
    for(const k in b.cds){ if(b.cds[k] > 0) b.cds[k]--; }
    if(b.buff.zhanshen > 0) b.buff.zhanshen--;
    // 宠物技能 CD 递减
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && p.skillCd){
        for(const k in p.skillCd){ if(p.skillCd[k] > 0) p.skillCd[k]--; }
      }
    });
    Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + 3 + Math.floor(playerMaxMp()*0.03));
    this.render(); Render.top(); Save.auto();
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
      }
      else if(key === 'banyue'){
        b.monsters.filter(m=>!m.dead).forEach(t=>{
          this._dealDamage(t, a.atk * atkMul * 0.9, 'normal', true);
        });
      }
      else if(key === 'zhiyu'){
        const heal = Math.floor(playerMaxHp() * 0.25);
        Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + heal);
        this._floatPlayer(`+${heal}`, 'heal');
      }
      else if(key === 'zhanshen'){
        b.buff.zhanshen = 3;
        this._floatPlayer('祝福', 'heal');
      }
      Game.player.rage = Math.min(RAGE_MAX, (Game.player.rage||0) + 1);
    }
    else if(action.type === 'rage'){
      const t = action.target;
      if(!t || t.dead) return;
      Game.player.rage = 0;
      this._dealDamage(t, a.atk * atkMul * 3.0, 'crit', true);
    }
  },

  _dealDamage(target, baseAtk, forceType, fromMe){
    const a = calcAttr();
    let dmg = Math.max(1, Math.floor(baseAtk - target.def));
    let isCrit = false;
    if(forceType === 'crit') isCrit = true;
    else if(Math.random() < a.crit){ dmg = Math.floor(dmg * a.critD); isCrit = true; }
    target.hp -= dmg;
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

  _doPetAction(p){
    const b = Game.battle; if(!b || !p) return;
    if(!petAlive(p)) return;   // 下场宠物不出手
    const pst = petStatFor(p);
    const ps = petSkillStateFor(p);
    const alive = b.monsters.filter(m=>!m.dead);
    if(alive.length === 0) return;

    // 治疗技能（走 CD）
    if(ps.heal && (!p.skillCd.heal || p.skillCd.heal <= 0)){
      const heal = Math.floor(playerMaxHp() * ps.heal);
      Game.player.hp = Math.min(playerMaxHp(), Game.player.hp + heal);
      this._floatPlayer(`+${heal}`, 'heal');
      p.skillCd.heal = PET_SKILL_CD.heal;
    }

    // 攻击目标（随机）
    const target = pick(alive);

    // 群攻技能（走 CD）
    const canGroup = ps.group && (!p.skillCd.group || p.skillCd.group <= 0);
    if(canGroup){
      alive.forEach(t=>{
        let dmg = Math.max(1, Math.floor(pst.atk * 0.22 - t.def * 0.5));
        let isCrit = Math.random() < (0.10 + ps.crit);
        if(isCrit) dmg = Math.floor(dmg * 1.3);
        t.hp -= dmg;
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

  _doMonsterAction(m, defMul){
    const b = Game.battle; if(!b) return;
    if(m.dead) return;

    // 治疗怪
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
    // 召唤怪
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

    // 计算伤害基数
    let atkVal = m.atk;
    if(m.behavior === 'rage' && m.hp/m.maxHp < 0.5) atkVal = Math.floor(atkVal * 1.5);
    const a = calcAttr();
    const defMulFinal = defMul > 1 ? 1.3 : 1;

    // ========== 目标选择：50% 玩家 / 50% 随机宠物 ==========
    const alivePets = getActivePetObjects();
    let targetIsPet = false;
    let targetPet = null;
    if(alivePets.length > 0 && Math.random() < 0.5){
      targetIsPet = true;
      targetPet = pick(alivePets);
    }

    if(targetIsPet){
      // 打宠物
      const pst = petStatFor(targetPet);
      let dmg = Math.max(1, Math.floor(atkVal - pst.def * defMulFinal * 0.9));
      let isCrit = Math.random() < 0.08;
      if(isCrit) dmg = Math.floor(dmg * 1.25);
      petTakeDamage(targetPet, dmg);
      this._floatPetAvatar(targetPet, `-${dmg}`, isCrit ? 'crit' : 'normal');
      // 显示宠物被击倒
      if(!petAlive(targetPet)){
        this._floatPetAvatar(targetPet, `${targetPet.avatar}倒下`, 'bad');
        toast(`${targetPet.name} 倒下，30 秒后复活`);
      }
      // 主人反伤（宠物反伤技能对宠物被击时也生效，按设计走）
      const ps = petSkillStateFor(targetPet);
      if(ps.reflect){
        const rdmg = Math.max(1, Math.floor(dmg * ps.reflect));
        m.hp -= rdmg;
        this._floatMon(m, `-${rdmg}`, 'reflect');
        if(m.hp <= 0 && !m.dead) this._killMonster(m);
      }
    }else{
      // 打玩家
      let dmg = Math.max(1, Math.floor(atkVal - a.def * defMulFinal * 0.9));
      let isCrit = Math.random() < 0.08;
      if(isCrit) dmg = Math.floor(dmg * 1.25);
      Game.player.hp -= dmg;
      this._floatPlayer(`-${dmg}`, isCrit ? 'crit' : 'normal');

      // 反伤（所有上阵宠物反伤累加）
      let totalReflect = 0;
      alivePets.forEach(p=>{
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

    // 吸血词缀 / 剧毒词缀（依然按原逻辑，只对玩家生效时算剧毒）
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
    Game.player.mp = Math.min(playerMaxMp(), Game.player.mp + 5);

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
        showBattleDrop(`✨ 爆出 ${eq.name}[${QUALITY[eq.quality].name}] +${gold}金`);
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
      showBattleDrop(`🥚 精英掉落宠物蛋！孵化出 ${pet.name}`);
    }
    if(m.isBoss){
      if(Math.random() < 0.25 && Game.pets.length < PET_WAREHOUSE_MAX){
        const tpl = pick(Object.keys(PET_TEMPLATES));
        const q = pick(['fine','epic']);
        const pet = makePet(tpl, q);
        Pet.tryAdd(pet);
        showBattleDrop(`🥚 BOSS 掉落宠物蛋！孵化出 ${pet.name}`);
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
    // 战斗结束：所有宠物回满血（复活除外）
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && petAlive(p)){ p.hp = petStatFor(p).hp; p.skillCd = {}; }
    });
    Save.auto();
    setTimeout(()=>this.end(), 700);
  },
  _onPlayerDead(){
    toast('💀 死亡！损失 10% 金币');
    Game.player.gold = Math.floor(Game.player.gold * 0.9);
    Game.player.hp = playerMaxHp();
    Game.player.mp = playerMaxMp();
    Game.stats.deaths++;
    this.stopAuto();
    // 战斗结束：所有宠物回满血
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
    // 退出战斗也恢复宠物
    Game.activePets.forEach(u=>{
      const p = Game.pets.find(x=>x.uid === u);
      if(p && petAlive(p)){ p.hp = petStatFor(p).hp; p.skillCd = {}; }
    });
    Nav.home();
    Render.top();
  }
};
