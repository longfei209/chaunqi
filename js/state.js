/* ============================================================
 *  state.js  —— Game 状态 + 装备生成 + 存档
 * ============================================================ */

const Game = {
  player:null, bag:[], worn:null,
  mat:0, areaState:{}, flags:{ dragonCity:false },
  quest:{ doing:[], avail:[], refreshTs:0 },
  ui:{ areaId:null, floorIdx:null },
  battle:null,
  pets:[], activePets:[],
  stats:{ kills:0, deaths:0 }
};

function initGame(){
  Game.player = {
    lv:1, exp:0, hp:100, maxHp:100, mp:50, maxMp:50,
    baseAtk:10, baseDef:5, baseSpd:10,
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
  Game.stats = { kills:0, deaths:0 };
  Quest.refreshPool(true);
}

/* ---- 装备生成 ---- */
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
  const q = quality || rollQuality();
  const qc = QUALITY[q];
  const atkMul = qc.bMin + Math.random() * (qc.bMax - qc.bMin);
  const defMul = qc.bMin + Math.random() * (qc.bMax - qc.bMin);
  const eq = {
    uid: uid(), name, slot: base.slot,
    baseAtk: Math.round(base.atk * atkMul),
    baseDef: Math.round(base.def * defMul),
    baseSpd: base.spd||0, baseHp: base.hp||0,
    quality: q,
    refineAtk:0, refineDef:0, refineHp:0, refineTimes:0,
    affix:null, affixVal:0
  };
  const affixChance = q === 'epic' ? 0.6 : (q === 'fine' ? 0.35 : 0.15);
  if(Math.random() < affixChance){
    const a = pick(AFFIXES);
    const v = a.roll();
    eq.affix = a.k; eq.affixVal = v; a.apply(eq, v);
  }
  return eq;
}

function equipStat(eq){
  const r = QUALITY[eq.quality].rate;
  return {
    atk: Math.floor((eq.baseAtk + eq.refineAtk) * (1 + r)),
    def: Math.floor((eq.baseDef + eq.refineDef) * (1 + r)),
    spd: Math.floor((eq.baseSpd||0) * (1 + r*0.5)) + (eq.affixSpd||0),
    hp:  (eq.baseHp||0) + eq.refineHp + (eq.affixHp||0)
  };
}

function equipAffixDesc(eq){
  if(!eq.affix) return '';
  const a = AFFIXES.find(x=>x.k===eq.affix);
  return a ? a.desc(eq.affixVal) : '';
}

/* ---- 属性计算 ---- */
function calcAttr(){
  let atk = Game.player.baseAtk, def = Game.player.baseDef, spd = Game.player.baseSpd, addHp = 0;
  let crit = 0.12, critD = 1.3, ls = 0;
  for(const s in Game.worn){
    const e = Game.worn[s]; if(!e) continue;
    const t = equipStat(e);
    atk += t.atk; def += t.def; spd += t.spd; addHp += t.hp;
    if(e.affixCrit) crit += e.affixCrit/100;
    if(e.affixCritD) critD += e.affixCritD/100;
    if(e.affixLs) ls += e.affixLs/100;
  }
  for(const sk in SETS){
    const set = SETS[sk];
    let cnt = 0;
    set.members.forEach(nm=>{
      for(const s in Game.worn){ if(Game.worn[s] && Game.worn[s].name === nm){ cnt++; break; } }
    });
    if(cnt>=3 && set.bonus3){ atk += set.bonus3.atk||0; def += set.bonus3.def||0; }
    if(cnt>=4 && set.bonus4){ atk += set.bonus4.atk||0; def += set.bonus4.def||0; addHp += set.bonus4.hp||0; spd += set.bonus4.spd||0; }
    if(cnt>=2 && set.bonus2){ atk += set.bonus2.atk||0; def += set.bonus2.def||0; spd += set.bonus2.spd||0; }
  }
  const activePetObjs = getActivePetObjects();
  activePetObjs.forEach(p=>{
    const pst = petStatFor(p);
    atk += pst.pAtk||0; def += pst.pDef||0; spd += pst.pSpd||0;
    const st = petSkillStateFor(p);
    if(st.pSpdBonus) spd = Math.floor(spd * (1 + st.pSpdBonus));
    if(st.pDefBonus) def = Math.floor(def * (1 + st.pDefBonus));
  });
  return { atk, def, spd, addHp, crit, critD, ls };
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
    p.baseAtk += 4; p.baseDef += 2; p.maxHp += 25; p.baseSpd += 1; p.maxMp += 8;
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
      floors: def.floors.map(()=>({ mark:false, groups:[], bossDeath:0, spawned:false }))
    };
  }
  return Game.areaState[id];
}

function spawnGroup(areaId, fi){
  const ar = AREA_MAP[areaId];
  const pool = ar.floors[fi].pool;
  const count = rnd(1,4);
  const members = [];
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
  return { gid: uid(), members, alive:true, deathTs:0, clearFlag:false };
}

function spawnFloor(areaId, fi){
  const st = areaState(areaId).floors[fi];
  st.groups = [];
  for(let g=0; g<GROUPS_PER_FLOOR; g++) st.groups.push(spawnGroup(areaId, fi));
  st.spawned = true;
}

function tickRespawn(areaId, fi){
  const st = areaState(areaId).floors[fi];
  const now = Date.now();
  let changed = false;
  st.groups.forEach((g, gi)=>{
    if(!g.alive && g.deathTs && now - g.deathTs >= RESPAWN_MON){
      const ng = spawnGroup(areaId, fi);
      ng.clearFlag = true;
      st.groups[gi] = ng;
      changed = true;
    }
  });
  if(st.bossDeath && now - st.bossDeath >= RESPAWN_BOSS) st.bossDeath = 0;
  if(!st.mark && st.spawned && st.groups.every(g=>g.clearFlag)) st.mark = true;
  return changed;
}

/* ---- 存档 ---- */
const Save = {
  KEY: 'legend_bw_v8',
  pack(){
    return {
      v:8,
      player: Game.player, bag: Game.bag, worn: Game.worn,
      mat: Game.mat, areaState: Game.areaState, flags: Game.flags,
      quest: Game.quest, pets: Game.pets, activePets: Game.activePets,
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
      const old = localStorage.getItem('legend_bw_v6');
      if(old){ return this._migrateFromV6(old); }
      return toast("无存档");
    }
    try{
      const d = JSON.parse(s);
      if(d.v !== 8) return toast("存档版本不符");
      Object.assign(Game, {
        player: d.player, bag: d.bag, worn: d.worn,
        mat: d.mat, areaState: d.areaState, flags: d.flags,
        quest: d.quest, pets: d.pets || [], activePets: d.activePets || [],
        stats: d.stats, ui: d.ui || { areaId:null, floorIdx:null },
        battle: null
      });
      if(Game.player.mp == null){ Game.player.mp = 50; Game.player.maxMp = 50; }
      if(Game.player.potionMp == null) Game.player.potionMp = 0;
      Nav.home(); Render.top(); Render.home();
      toast("读档完成");
    }catch(e){ toast("读档失败"); }
  },
  _migrateFromV6(raw){
    try{
      const d = JSON.parse(raw);
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
          skills: skills, hp: oldPet.baseHp
        };
        Game.pets = [newPet];
        Game.activePets = [newPet.uid];
      }
      Save.auto();
      Nav.home(); Render.top(); Render.home();
      toast("v6 存档已迁移到 v8");
    }catch(e){ toast("存档迁移失败"); }
  },
  reset(){
    confirmBox("确定全部重置？", ()=>{
      localStorage.removeItem(this.KEY);
      localStorage.removeItem('legend_bw_v6');
      initGame();
      Nav.home(); Render.top(); Render.home();
      toast("已重置");
    });
  }
};