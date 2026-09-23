/* ============================================================
 *  state.js  —— Game 状态 + 装备生成 + 存档
 *
 *  本轮改动：
 *   - 装备生成带 min/max（atkMax = atkMin × 2.2，defMax = defMin × 2.0）
 *   - calcAttr 返回 atkMin/atkMax / defMin/defMax 区间
 *   - 攻击加成（词条/宝石）只加到 max
 *   - 每回合固定回蓝 2
 *   - 掉落按区域分档
 * ============================================================ */

const Game = {
  player:null, bag:[], worn:null,
  mat:0, areaState:{}, flags:{ dragonCity:false },
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
    baseAtkMin:10, baseAtkMax:15,baseDefMin:5,baseDefMax:8, baseSpd:10,
    gold:100, potion:5, potionMp:3, bagMax:30, rage:0
  };
  Game.bag = [];
  Game.worn = { weapon:null, helmet:null, cloth:null, shoe:null, belt:null, ring:null, neck:null };
  Game.mat = 0;
  Game.areaState = {};
  Game.flags = { dragonCity:false };
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

/* ---- 品质 ---- */
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

/* ---- 装备生成（带 min/max） ---- */
function makeEquip(name, quality){
  const base = EQUIP_BASE[name];
  if(!base) return null;
  const q = quality || rollQuality();
  const qc = QUALITY[q];
  // 品质影响 min（优秀 +15% / 精良 +30% / 史诗 +55%）
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
  // 词条
  const chance = AFFIX_CHANCE[q] || 0;
  if(Math.random() < chance){
    const a = pick(AFFIXES);
    const v = a.roll();
    eq.affix = a.k;
    eq.affixVal = v;
  }
  return eq;
}

/* ---- 装备基础区间（含词条、不含宝石） ----
 * 攻击、防御词条只加到 max
 */
function equipBaseRange(eq){
  if(!eq) return { atkMin:0, atkMax:0, defMin:0, defMax:0, spd:0, hp:0 };
  let atkMin = eq.atkMin, atkMax = eq.atkMax;
  let defMin = eq.defMin, defMax = eq.defMax;
  let spd = eq.spd || 0;
  let hp  = eq.hp  || 0;
  // 洗练加成（加到 min 和 max 两端）
  atkMin += eq.refineAtk || 0;
  atkMax += eq.refineAtk || 0;
  defMin += eq.refineDef || 0;
  defMax += eq.refineDef || 0;
  hp += eq.refineHp || 0;
  // 词条
  if(eq.affix){
    const v = eq.affixVal || 0;
    switch(eq.affix){
      case 'atk':    atkMax += v; break;   // 只加 max
      case 'def':    defMax += v; break;
      case 'spd':    spd += v; break;
      case 'hp':     hp += v; break;
      // 其他（暴击/连击/吸血）在别处处理
    }
  }
  return { atkMin, atkMax, defMin, defMax, spd, hp };
}

/* ---- 宝石加成（离散值，不加到区间，直接叠加到 max） ---- */
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

/* ---- 装备最终区间（基础 + 宝石） ----
 * 宝石攻击只加到 max
 */
function equipFullRange(eq){
  const b = equipBaseRange(eq);
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

/* 词条描述 */
function equipAffixDesc(eq){
  if(!eq || !eq.affix) return '';
  const a = AFFIXES.find(x=>x.k===eq.affix);
  return a ? a.desc(eq.affixVal) : '';
}

/* ---- 玩家属性（区间） ---- */
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
    // 词条：暴击率/暴伤/连击/反击/吸血/固吸
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
  // 套装
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
  // 宠物被动
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

/* 取当前 min~max 随机攻击 */
function rollPlayerAtk(){
  const a = calcAttr();
  return rnd(a.atkMin, a.atkMax);
}
function rollPlayerDef(){
  const a = calcAttr();
  return rnd(a.defMin, a.defMax);
}

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
    p.baseAtkMax += 4;      // 升级时 max 涨得比 min 快一点（比如 +3/+4）
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

/* ---- 区域状态 ---- */
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
      dead: false, deathTs: 0, vamp: 0, pois: 0
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

/* ============================================================
 *  掉落装备：按区域分档
 * ============================================================ */
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
 *  宝石/碎片
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

/* ============================================================
 *  存档
 * ============================================================ */
const Save = {
  KEY: 'legend_bw_v10',
  pack(){
    return {
      v:10,
      player: Game.player, bag: Game.bag, worn: Game.worn,
      mat: Game.mat, areaState: Game.areaState, flags: Game.flags,
      quest: Game.quest, pets: Game.pets, activePets: Game.activePets,
      gems: Game.gems, fragments: Game.fragments,
      stats: Game.stats, ui: Game.ui
    };
  },
  write(silent){
    try{ localStorage.setItem(this.KEY, JSON.stringify(this.pack())); if(!silent) toast("已存档"); }
    catch(e){ toast("存档失败"); }
  },
  manual(){ this.write(false); },
  auto(){ this.write(true); },
  load(){
    const s = localStorage.getItem(this.KEY);
    if(!s){
      const old = localStorage.getItem('legend_bw_v9') || localStorage.getItem('legend_bw_v8') || localStorage.getItem('legend_bw_v6');
      if(old){ return this._migrate(old); }
      return toast("无存档");
    }
    try{
      const d = JSON.parse(s);
      if(d.v !== 10) return toast("存档版本不符");
      Object.assign(Game, {
        player: d.player, bag: d.bag, worn: d.worn,
        mat: d.mat, areaState: d.areaState, flags: d.flags,
        quest: d.quest, pets: d.pets || [], activePets: d.activePets || [],
        gems: d.gems || [], fragments: d.fragments || {},
        stats: d.stats, ui: d.ui || { areaId:null, floorIdx:null },
        battle: null
      });
      if(Game.player.mp == null){ Game.player.mp = 50; Game.player.maxMp = 50; }
      if(Game.player.potionMp == null) Game.player.potionMp = 0;
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
  /* 兼容旧存档：把旧 atk/def/baseAtk 转成 min/max */
  _fixEquipData(){
    const convert = (e)=>{
      if(!e) return;
      if(e.atkMin === undefined){
        // 旧数据只有 baseAtk / baseDef
        const base = EQUIP_BASE[e.name] || { atk: 0, def: 0 };
        const qc = QUALITY[e.quality] || QUALITY.normal;
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
  _migrate(raw){
    try{
      const d = JSON.parse(raw);
      // v9 存档
      if(d.v === 9){
        initGame();
        Object.assign(Game.player, d.player || {});
        Game.bag = d.bag || [];
        Game.worn = d.worn || { weapon:null, helmet:null, cloth:null, shoe:null, belt:null, ring:null, neck:null };
        Game.mat = d.mat || 0;
        Game.areaState = d.areaState || {};
        Game.flags = d.flags || { dragonCity:false };
        Game.quest = d.quest || Game.quest;
        Game.pets = d.pets || [];
        Game.activePets = d.activePets || [];
        Game.gems = d.gems || [];
        Game.fragments = d.fragments || {};
        Game.stats = d.stats || { kills:0, deaths:0 };
        Game.ui = d.ui || { areaId:null, floorIdx:null };
        this._fixEquipData();
        Object.keys(GEMS).forEach(k=>{
          if(!Game.fragments[k]) Game.fragments[k] = { normal:0, rare:0, legend:0 };
        });
        Save.auto();
        Nav.home(); Render.top(); Render.home();
        toast("v9 存档已升级到 v10");
        return;
      }
      // v8
      if(d.v === 8){
        initGame();
        Object.assign(Game.player, d.player || {});
        Game.bag = d.bag || [];
        Game.worn = d.worn || { weapon:null, helmet:null, cloth:null, shoe:null, belt:null, ring:null, neck:null };
        Game.mat = d.mat || 0;
        Game.areaState = d.areaState || {};
        Game.flags = d.flags || { dragonCity:false };
        Game.quest = d.quest || Game.quest;
        Game.pets = d.pets || [];
        Game.activePets = d.activePets || [];
        Game.stats = d.stats || { kills:0, deaths:0 };
        Game.ui = d.ui || { areaId:null, floorIdx:null };
        this._fixEquipData();
        Save.auto();
        Nav.home(); Render.top(); Render.home();
        toast("v8 存档已升级到 v10");
        return;
      }
      // v6
      if(d.v === 6){
        const oldPet = d.pet;
        initGame();
        if(d.player) Object.assign(Game.player, d.player);
        if(d.bag) Game.bag = d.bag;
        if(d.worn) Game.worn = d.worn;
        if(d.mat != null) Game.mat = d.mat;
        if(d.areaState) Game.areaState = d.areaState;
        if(d.flags) Game.flags = d.flags;
        if(d.quest) Game.quest = d.quest;
        if(d.stats) Game.stats = d.stats;
        if(d.ui) Game.ui = d.ui;
        if(oldPet){
          const skills = oldPet.skill ? [oldPet.skill] : [];
          const newPet = {
            uid: uid(),
            tpl: oldPet.tpl, name: oldPet.name, avatar: oldPet.avatar,
            quality: oldPet.quality, lv: oldPet.lv, exp: oldPet.exp,
            baseAtk: oldPet.baseAtk, baseDef: oldPet.baseDef,
            baseHp: oldPet.baseHp, baseSpd: oldPet.baseSpd,
            skills: skills, hp: petStatFor({quality:oldPet.quality, lv:oldPet.lv, baseHp:oldPet.baseHp}).hp,
            downUntil: 0, skillCd: {}
          };
          Game.pets = [newPet];
          Game.activePets = [newPet.uid];
        }
        this._fixEquipData();
        Save.auto();
        Nav.home(); Render.top(); Render.home();
        toast("v6 存档已迁移到 v10");
        return;
      }
      toast("存档版本过旧，无法迁移");
    }catch(e){ toast("存档迁移失败"); }
  },
  reset(){
    confirmBox("确定全部重置？", ()=>{
      localStorage.removeItem(this.KEY);
      localStorage.removeItem('legend_bw_v9');
      localStorage.removeItem('legend_bw_v8');
      localStorage.removeItem('legend_bw_v6');
      initGame();
      Nav.home(); Render.top(); Render.home();
      toast("已重置");
    });
  }
};