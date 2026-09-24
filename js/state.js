/* ============================================================
 *  state.js  —— Game 状态 + 装备生成 + 存档
 *  新增：书页 Game.pages / 技能等级 Game.skillLv
 *  存档 v11（旧存档自动清空重来）
 * ============================================================ */

const Game = {
  player:null, bag:[], worn:null,
  mat:0, pages:0,
  skillLv:{},
  areaState:{}, flags:{ dragonCity:false, niumo:false, ghost:false },
  quest:{ doing:[], avail:[], refreshTs:0 },
  ui:{ areaId:null, floorIdx:null },
  battle:null,
  pets:[], activePets:[],
  gems:[], fragments:{},
  stats:{ kills:0, deaths:0 }
};

function initGame(){
  Game.player = {
    lv:1, exp:0, hp:100, maxHp:100, mp:50, maxMp:50,
    baseAtkMin:10, baseAtkMax:15,
    baseDefMin:5,  baseDefMax:8,
    baseSpd:10,
    gold:100, potion:5, potionMp:3, bagMax:30, rage:0
  };
  Game.bag = [];
  Game.worn = { weapon:null, helmet:null, cloth:null, shoe:null, belt:null, ring:null, neck:null };
  Game.mat = 0;
  Game.pages = 0;
  Game.skillLv = {};
  Object.keys(SKILLS).forEach(k=>{ Game.skillLv[k] = 1; });
  Game.areaState = {};
  Game.flags = { dragonCity:false, niumo:false, ghost:false };
  Game.quest = { doing:[], avail:[], refreshTs: Date.now() - QUEST_POOL_CD - 1000 };
  Game.ui = { areaId:null, floorIdx:null };
  Game.battle = null;
  Game.pets = [];
  Game.activePets = [];
  Game.gems = [];
  Game.fragments = {};
  Object.keys(GEMS).forEach(k=>{
    Game.fragments[k] = { normal:0, rare:0, legend:0 };
  });
  Game.stats = { kills:0, deaths:0 };
  Quest.refreshPool(true);
}

function rollQuality(boost){
  const r = Math.random();
  const epicC = 0.03 + (boost||0);
  const fineC = 0.15 + (boost||0);
  const goodC = 0.40 + (boost||0)*1.5;
  if(r < epicC) return 'epic';
  if(r < fineC) return 'fine';
  if(r < goodC) return 'good';
  return 'normal';
}

function makeEquip(name, quality){
  const base = EQUIP_BASE[name];
  if(!base) return null;
  const q = quality || rollQuality();
  const qc = QUALITY[q];
  const qMin = 1 + qc.rate;
  const atkMin = Math.round(base.atk * qMin);
  const defMin = Math.round(base.def * qMin);
  const atkMax = Math.round(atkMin * 2.2);
  const defMax = Math.round(defMin * 2.0);
  const eq = {
    uid: uid(), name, slot: base.slot, tier: base.tier,
    atkMin, atkMax, defMin, defMax,
    spd: base.spd || 0,
    hp:  base.hp  || 0,
    quality: q,
    refineAtk:0, refineDef:0, refineHp:0, refineTimes:0,
    affix:null, affixVal:0,
    sockets: [null, null, null]
  };
  const chance = AFFIX_CHANCE[q] || 0;
  if(Math.random() < chance){
    const a = pick(AFFIXES);
    const v = a.roll();
    eq.affix = a.k;
    eq.affixVal = v;
  }
  return eq;
}

function equipBaseRange(eq){
  if(!eq) return { atkMin:0, atkMax:0, defMin:0, defMax:0, spd:0, hp:0 };
  let atkMin = eq.atkMin, atkMax = eq.atkMax;
  let defMin = eq.defMin, defMax = eq.defMax;
  let spd = eq.spd || 0;
  let hp  = eq.hp  || 0;
  if(eq.affix){
    const v = eq.affixVal || 0;
    switch(eq.affix){
      case 'atk':    atkMax += v; break;
      case 'def':    defMax += v; break;
      case 'spd':    spd += v; break;
      case 'hp':     hp += v; break;
    }
  }
  return { atkMin, atkMax, defMin, defMax, spd, hp };
}

function equipWithRefineRange(eq){
  const b = equipBaseRange(eq);
  if(!eq) return b;
  return {
    atkMin: b.atkMin,
    atkMax: b.atkMax + (eq.refineAtk || 0),
    defMin: b.defMin,
    defMax: b.defMax + (eq.refineDef || 0),
    spd: b.spd,
    hp: b.hp + (eq.refineHp || 0)
  };
}

function equipGemBonus(eq){
  const bonus = { atk:0, def:0, hp:0, spd:0,
                  combo:0, counter:0, lsPct:0, lsFlat:0, crit:0 };
  if(!eq || !eq.sockets) return bonus;
  eq.sockets.forEach(gem=>{
    if(!gem) return;
    const cfg = getGemCfg(gem.key, gem.quality);
    if(!cfg) return;
    bonus[cfg.stat] = (bonus[cfg.stat] || 0) + cfg.value;
  });
  return bonus;
}

function equipFullRange(eq){
  const b = equipWithRefineRange(eq);
  const g = equipGemBonus(eq);
  return {
    atkMin: b.atkMin,
    atkMax: b.atkMax + g.atk,
    defMin: b.defMin,
    defMax: b.defMax + g.def,
    spd: b.spd + g.spd,
    hp:  b.hp + g.hp,
    combo: g.combo,
    counter: g.counter,
    lsPct: g.lsPct,
    lsFlat: g.lsFlat,
    crit: g.crit
  };
}

function equipFullBonus(eq){
  const r = equipFullRange(eq);
  return {
    atk: r.atkMax, def: r.defMax, spd: r.spd, hp: r.hp,
    combo: r.combo, counter: r.counter,
    lsPct: r.lsPct, lsFlat: r.lsFlat, crit: r.crit, critd: 0
  };
}

function equipCompareStat(eq){
  if(!eq) return { atk:0, def:0, spd:0, hp:0, combo:0, counter:0, lsPct:0, lsFlat:0, crit:0, critd:0 };
  const r = equipBaseRange(eq);
  let combo = 0, counter = 0, lsPct = 0, lsFlat = 0, crit = 0, critd = 0;
  if(eq.affix){
    const v = eq.affixVal || 0;
    switch(eq.affix){
      case 'crit':   crit += v; break;
      case 'critd':  critd += v; break;
      case 'combo':  combo += v; break;
      case 'counter':counter += v; break;
      case 'lsPct':  lsPct += v; break;
      case 'lsFlat': lsFlat += v; break;
    }
  }
  return { atk: r.atkMax, def: r.defMax, spd: r.spd, hp: r.hp, combo, counter, lsPct, lsFlat, crit, critd };
}

function equipAffixDesc(eq){
  if(!eq || !eq.affix) return '';
  const a = AFFIXES.find(x=>x.k===eq.affix);
  return a ? a.desc(eq.affixVal) : '';
}

function calcAttr(){
  let atkMin = Game.player.baseAtkMin, atkMax = Game.player.baseAtkMax;
  let defMin = Game.player.baseDefMin, defMax = Game.player.baseDefMax;
  let spd = Game.player.baseSpd, addHp = 0;
  let combo = 0, counter = 0, lsPct = 0, lsFlat = 0;
  let crit = 0.12, critD = 1.3;
  for(const s in Game.worn){
    const e = Game.worn[s]; if(!e) continue;
    const r = equipFullRange(e);
    atkMin += r.atkMin; atkMax += r.atkMax;
    defMin += r.defMin; defMax += r.defMax;
    spd += r.spd; addHp += r.hp;
    combo += r.combo; counter += r.counter;
    lsPct += r.lsPct; lsFlat += r.lsFlat;
    crit += r.crit / 100;
    if(e.affix){
      const v = e.affixVal || 0;
      switch(e.affix){
        case 'crit':   crit += v/100; break;
        case 'critd':  critD += v/100; break;
        case 'combo':  combo += v; break;
        case 'counter':counter += v; break;
        case 'lsPct':  lsPct += v; break;
        case 'lsFlat': lsFlat += v; break;
      }
    }
  }
  for(const sk in SETS){
    const set = SETS[sk];
    let cnt = 0;
    set.members.forEach(nm=>{
      for(const s in Game.worn){ if(Game.worn[s] && Game.worn[s].name === nm){ cnt++; break; } }
    });
    if(cnt>=3 && set.bonus3){ atkMin += set.bonus3.atk||0; atkMax += set.bonus3.atk||0; defMin += set.bonus3.def||0; defMax += set.bonus3.def||0; }
    if(cnt>=4 && set.bonus4){ atkMin += set.bonus4.atk||0; atkMax += set.bonus4.atk||0; defMin += set.bonus4.def||0; defMax += set.bonus4.def||0; addHp += set.bonus4.hp||0; spd += set.bonus4.spd||0; }
    if(cnt>=6 && set.bonus6){ atkMin += set.bonus6.atk||0; atkMax += set.bonus6.atk||0; defMin += set.bonus6.def||0; defMax += set.bonus6.def||0; addHp += set.bonus6.hp||0; spd += set.bonus6.spd||0; }
    if(cnt>=2 && set.bonus2){ atkMin += set.bonus2.atk||0; atkMax += set.bonus2.atk||0; defMin += set.bonus2.def||0; defMax += set.bonus2.def||0; spd += set.bonus2.spd||0; }
  }
  const activePetObjs = getActivePetObjects();
  activePetObjs.forEach(p=>{
    const pst = petStatFor(p);
    atkMin += pst.pAtk||0; atkMax += pst.pAtk||0;
    defMin += pst.pDef||0; defMax += pst.pDef||0;
    spd += pst.pSpd||0;
    const st = petSkillStateFor(p);
    if(st.pSpdBonus) spd = Math.floor(spd * (1 + st.pSpdBonus));
    if(st.pDefBonus){
      defMin = Math.floor(defMin * (1 + st.pDefBonus));
      defMax = Math.floor(defMax * (1 + st.pDefBonus));
    }
  });
  return {
    atkMin, atkMax, defMin, defMax,
    spd, addHp,
    combo: combo/100,
    counter: counter/100,
    lsPct: lsPct/100,
    lsFlat,
    crit, critD
  };
}

/* 技能等级系数 */
function getSkillLv(key){
  return (Game.skillLv && Game.skillLv[key]) || 1;
}
/* 伤害倍率：每级 +15% */
function skillDmgMul(key, base){
  const lv = getSkillLv(key);
  return base * (1 + 0.15 * (lv - 1));
}
/* 治愈比例：每级 +5% */
function skillHealRate(key, base){
  const lv = getSkillLv(key);
  return base * (1 + 0.05 * (lv - 1));
}
/* 战神加成：每级 +2% */
function skillBuffMul(key, base){
  const lv = getSkillLv(key);
  return base + 0.02 * (lv - 1);
}
/* 毒术每回合扣血 */
const POISON_DMG = [0, 20, 30, 40, 50, 60];
function skillPoisonDmg(){
  const lv = getSkillLv('du');
  return POISON_DMG[lv] || 20;
}

function rollPlayerAtk(){ const a = calcAttr(); return rnd(a.atkMin, a.atkMax); }
function rollPlayerDef(){ const a = calcAttr(); return rnd(a.defMin, a.defMax); }

function playerMaxHp(){ return Game.player.maxHp + calcAttr().addHp; }
function playerMaxMp(){ return Game.player.maxMp; }

function addExp(v){
  const p = Game.player;
  const oldLv = p.lv;
  p.exp += v;
  let leveled = false;
  while(p.exp >= p.lv * 120){
    p.exp -= p.lv * 120;
    p.lv++;
    p.baseAtkMin += 3;
    p.baseAtkMax += 4;
    p.baseDefMin += 1;
    p.baseDefMax += 2;
    p.maxHp  += 15;
    p.baseSpd += 1;
    p.maxMp  += 8;
    leveled = true;
  }
  if(leveled){
    p.hp = playerMaxHp(); p.mp = playerMaxMp();
    toast("升级！Lv." + p.lv);
    if(oldLv < 10 && p.lv >= 10) toast("🆕 可携带宠物 2 只");
    if(oldLv < 20 && p.lv >= 20) toast("🆕 可携带宠物 3 只");
    if(oldLv < 30 && p.lv >= 30) toast("🆕 可携带宠物 4 只");
    Save.auto();
  }
  Render.top();
}

function areaState(id){
  if(!Game.areaState[id]){
    const def = AREA_MAP[id];
    Game.areaState[id] = {
      floors: def.floors.map(()=>({ groups:[], bossDeath:0, spawned:false }))
    };
  }
  return Game.areaState[id];
}

function spawnGroup(areaId, fi){
  const ar = AREA_MAP[areaId];
  const pool = ar.floors[fi].pool;
  const count = rnd(1,4);
  const members = [];
  let groupName = '';
  for(let i=0;i<count;i++){
    const proto = pick(pool);
    const isElite = Math.random() < ELITE_CHANCE;
    const m = {
      mid: uid(), protoId: proto.id, name: proto.name,
      hp: proto.hp, maxHp: proto.hp,
      atk: proto.atk, def: proto.def, spd: proto.spd,
      exp: proto.exp, gMin: proto.gMin, gMax: proto.gMax,
      behavior: proto.behavior,
      elite: isElite, affixes: [],
      dead: false, deathTs: 0, vamp: 0, pois: 0,
      summonCount: 0
    };
    if(i === 0) groupName = proto.name;
    if(isElite){
      m.name = "精英·" + m.name;
      m.hp = Math.floor(m.hp*1.6); m.maxHp = m.hp;
      m.atk = Math.floor(m.atk*1.3);
      m.def = Math.floor(m.def*1.3);
      m.exp = Math.floor(m.exp*1.8);
      m.gMin = Math.floor(m.gMin*2); m.gMax = Math.floor(m.gMax*2);
      const n = rnd(1,2);
      const chosen = [...ELITE_AFFIXES].sort(()=>Math.random()-0.5).slice(0, n);
      chosen.forEach(af=>{ af.apply(m); m.affixes.push(af.k); });
    }
    members.push(m);
  }
  return { gid: uid(), name: groupName, members, alive:true, deathTs:0 };
}

function spawnFloor(areaId, fi){
  const st = areaState(areaId).floors[fi];
  st.groups = [];
  const n = rnd(4, 8);
  for(let g=0; g<n; g++) st.groups.push(spawnGroup(areaId, fi));
  st.spawned = true;
}

function tickRespawn(areaId, fi){
  const st = areaState(areaId).floors[fi];
  const now = Date.now();
  let changed = false;
  st.groups.forEach((g, gi)=>{
    if(!g.alive && g.deathTs && now - g.deathTs >= RESPAWN_MON){
      const ng = spawnGroup(areaId, fi);
      st.groups[gi] = ng;
      changed = true;
    }
  });
  if(st.bossDeath && now - st.bossDeath >= RESPAWN_BOSS) st.bossDeath = 0;
  return changed;
}

function rollDropEquip(areaId, monType){
  const ar = AREA_MAP[areaId];
  if(!ar || !ar.dropTier) return null;
  const dt = ar.dropTier;
  let tier;
  if(monType === 'boss') tier = dt.boss;
  else if(monType === 'elite'){
    const arr = dt.elite;
    tier = Array.isArray(arr) ? pick(arr) : arr;
  } else {
    tier = dt.normal;
  }
  const pool = EQUIP_BY_TIER[tier] || [];
  if(pool.length === 0) return null;
  const name = pick(pool);
  const boost = monType === 'boss' ? 0.15 : (monType === 'elite' ? 0.08 : 0);
  return makeEquip(name, rollQuality(boost));
}

/* ============================================================
 *  宝石 / 碎片
 * ============================================================ */
function dropGem(boost){
  const key = randomGemKey();
  const q = rollGemQuality(boost);
  return makeGem(key, q);
}
function dropFragment(){
  const key = randomGemKey();
  const r = Math.random();
  const q = r < 0.02 ? 'legend' : (r < 0.10 ? 'rare' : 'normal');
  const frag = Game.fragments[key];
  if(!frag) return null;
  frag[q] = Math.min(FRAG_MAX_STACK, (frag[q] || 0) + 1);
  return { key, quality: q };
}
function craftGem(key){
  const frag = Game.fragments[key];
  if(!frag || (frag.normal||0) < FRAG_PER_GEM) return null;
  frag.normal -= FRAG_PER_GEM;
  const up = Math.random() < FRAG_UPGRADE_RARE;
  const quality = up ? 'rare' : 'normal';
  const gem = makeGem(key, quality);
  Game.gems.push(gem);
  return gem;
}
function upgradeFragment(key, fromQ, toQ){
  const frag = Game.fragments[key];
  if(!frag) return false;
  if((frag[fromQ]||0) < FRAG_TIER_UP) return false;
  frag[fromQ] -= FRAG_TIER_UP;
  frag[toQ] = Math.min(FRAG_MAX_STACK, (frag[toQ]||0) + 1);
  return true;
}
function craftLegendGem(key){
  const frag = Game.fragments[key];
  if(!frag || (frag.legend||0) < 3) return null;
  frag.legend -= 3;
  const gem = makeGem(key, 'legend');
  Game.gems.push(gem);
  return gem;
}
function decomposeGem(gemUid){
  const idx = Game.gems.findIndex(g=>g.uid === gemUid);
  if(idx < 0) return null;
  const gem = Game.gems[idx];
  Game.gems.splice(idx, 1);
  const frag = Game.fragments[gem.key];
  if(frag){
    frag[gem.quality] = Math.min(FRAG_MAX_STACK, (frag[gem.quality] || 0) + 2);
  }
  return gem;
}
function decomposeGemsByKeyQuality(key, quality, count){
  const matches = Game.gems.filter(g => g.key === key && g.quality === quality);
  const actual = Math.min(count, matches.length);
  if(actual <= 0) return 0;
  let removed = 0;
  for(let i = Game.gems.length - 1; i >= 0 && removed < actual; i--){
    const g = Game.gems[i];
    if(g.key === key && g.quality === quality){
      Game.gems.splice(i, 1);
      removed++;
    }
  }
  const frag = Game.fragments[key];
  if(frag){
    frag[quality] = Math.min(FRAG_MAX_STACK, (frag[quality] || 0) + actual * 2);
  }
  return actual;
}

/* ============================================================
 *  存档 v11（旧存档自动清空重来）
 * ============================================================ */
const Save = {
  KEY_AUTO: 'legend_bw_v11_auto',
  KEY_M1:   'legend_bw_v11_m1',
  KEY_M2:   'legend_bw_v11_m2',
  KEY_OLD_V10: 'legend_bw_v10_auto',
  KEY_OLD_OLD: 'legend_bw_v10',

  pack(){
    return {
      v:11,
      ts: Date.now(),
      player: Game.player, bag: Game.bag, worn: Game.worn,
      mat: Game.mat, pages: Game.pages, skillLv: Game.skillLv,
      areaState: Game.areaState, flags: Game.flags,
      quest: Game.quest, pets: Game.pets, activePets: Game.activePets,
      gems: Game.gems, fragments: Game.fragments,
      stats: Game.stats, ui: Game.ui
    };
  },

  _writeTo(key, silent){
    try{
      localStorage.setItem(key, JSON.stringify(this.pack()));
      if(!silent) toast("已存档");
      return true;
    }catch(e){ toast("存档失败"); return false; }
  },

  auto(){ this._writeTo(this.KEY_AUTO, true); },
  manual(slot){
    const key = slot === 1 ? this.KEY_M1 : this.KEY_M2;
    return this._writeTo(key, false);
  },

  getSummary(key){
    const s = localStorage.getItem(key);
    if(!s) return null;
    try{
      const d = JSON.parse(s);
      return {
        lv: (d.player && d.player.lv) || 1,
        gold: (d.player && d.player.gold) || 0,
        ts: d.ts || 0,
        v: d.v
      };
    }catch(e){ return null; }
  },

  load(slot){
    let key;
    if(slot === 'auto') key = this.KEY_AUTO;
    else if(slot === 1) key = this.KEY_M1;
    else if(slot === 2) key = this.KEY_M2;
    else return toast("无效槽位");

    const s = localStorage.getItem(key);
    if(!s) return toast("该槽位无存档");

    try{
      const d = JSON.parse(s);
      if(d.v !== 11) return toast("存档版本不符");
      Object.assign(Game, {
        player: d.player, bag: d.bag, worn: d.worn,
        mat: d.mat || 0,
        pages: d.pages || 0,
        skillLv: d.skillLv || {},
        areaState: d.areaState, flags: d.flags || { dragonCity:false, niumo:false, ghost:false },
        quest: d.quest, pets: d.pets || [], activePets: d.activePets || [],
        gems: d.gems || [], fragments: d.fragments || {},
        stats: d.stats, ui: d.ui || { areaId:null, floorIdx:null },
        battle: null
      });
      // 补全缺失字段
      if(Game.player.mp == null){ Game.player.mp = 50; Game.player.maxMp = 50; }
      if(Game.player.potionMp == null) Game.player.potionMp = 0;
      if(Game.player.baseAtkMin == null){
        Game.player.baseAtkMin = Game.player.baseAtk || 10;
        Game.player.baseAtkMax = Game.player.baseAtk ? Math.round(Game.player.baseAtk * 1.5) : 15;
        delete Game.player.baseAtk;
      }
      if(Game.player.baseDefMin == null){
        Game.player.baseDefMin = Game.player.baseDef || 5;
        Game.player.baseDefMax = Game.player.baseDef ? Math.round(Game.player.baseDef * 1.6) : 8;
        delete Game.player.baseDef;
      }
      if(!Game.flags.niumo) Game.flags.niumo = false;
      if(!Game.flags.ghost) Game.flags.ghost = false;
      Object.keys(SKILLS).forEach(k=>{
        if(!Game.skillLv[k]) Game.skillLv[k] = 1;
      });
      this._fixEquipData();
      Object.keys(GEMS).forEach(k=>{
        if(!Game.fragments[k]) Game.fragments[k] = { normal:0, rare:0, legend:0 };
      });
      Game.pets.forEach(p=>{
        if(p.hp == null) p.hp = petStatFor(p).hp;
        if(p.downUntil == null) p.downUntil = 0;
        if(p.skillCd == null) p.skillCd = {};
      });
      Nav.home(); Render.top(); Render.home();
      toast("读档完成");
    }catch(e){ toast("读档失败"); }
  },

  _fixEquipData(){
    const convert = (e)=>{
      if(!e) return;
      if(e.atkMin === undefined){
        const base = EQUIP_BASE[e.name] || { atk: 0, def: 0 };
        const atk0 = e.baseAtk || base.atk || 0;
        const def0 = e.baseDef || base.def || 0;
        e.atkMin = Math.round(atk0);
        e.atkMax = Math.round(atk0 * 2.2);
        e.defMin = Math.round(def0);
        e.defMax = Math.round(def0 * 2.0);
        e.spd = e.baseSpd || base.spd || 0;
        e.hp  = e.baseHp  || base.hp  || 0;
        e.tier = base.tier || 1;
        delete e.baseAtk; delete e.baseDef; delete e.baseSpd; delete e.baseHp;
      }
      if(!e.sockets) e.sockets = [null, null, null];
      while(e.sockets.length < 3) e.sockets.push(null);
    };
    Game.bag.forEach(convert);
    for(const s in Game.worn) convert(Game.worn[s]);
  },

  reset(){
    confirmBox("确定全部重置？（所有存档槽都会清空）", ()=>{
      localStorage.removeItem(this.KEY_AUTO);
      localStorage.removeItem(this.KEY_M1);
      localStorage.removeItem(this.KEY_M2);
      localStorage.removeItem(this.KEY_OLD_V10);
      localStorage.removeItem(this.KEY_OLD_OLD);
      localStorage.removeItem('legend_bw_v10_m1');
      localStorage.removeItem('legend_bw_v10_m2');
      localStorage.removeItem('legend_bw_v9');
      localStorage.removeItem('legend_bw_v8');
      localStorage.removeItem('legend_bw_v6');
      initGame();
      Nav.home(); Render.top(); Render.home();
      toast("已重置");
    });
  }
};

/* 旧版本存档自动清空（打开即重来） */
(function clearOldSave(){
  const oldKeys = [
    'legend_bw_v10_auto','legend_bw_v10_m1','legend_bw_v10_m2','legend_bw_v10',
    'legend_bw_v9','legend_bw_v8','legend_bw_v6'
  ];
  let hadOld = false;
  oldKeys.forEach(k=>{ if(localStorage.getItem(k)){ localStorage.removeItem(k); hadOld = true; } });
  if(hadOld) console.log("[Legend] 旧存档已清空（v11 不兼容）");
})();