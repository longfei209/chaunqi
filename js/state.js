/* ============================================================
 *  state.js  —— Game 状态 + 装备生成 + 存档
 *
 *  本轮新增：
 *   - Game.gems：所有宝石（数组）
 *   - Game.fragments：碎片数量（{ gemKey: { normal: n, rare: n, legend: n } }）
 *   - 装备新增 sockets: [null, null, null]（3 孔）
 *   - 装备新增 affix（唯一特色词条，含新属性）
 *   - calcAttr() 增加 连击率/反击率/吸血率/固定吸血/暴击率 计算（含宝石加成）
 * ============================================================ */

const Game = {
  player:null, bag:[], worn:null,
  mat:0, areaState:{}, flags:{ dragonCity:false },
  quest:{ doing:[], avail:[], refreshTs:0 },
  ui:{ areaId:null, floorIdx:null },
  battle:null,
  pets:[], activePets:[],
  gems:[],           // 所有宝石（对象数组）
  fragments:{},      // 碎片：{ red: {normal:0, rare:0, legend:0}, ... }
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
  Game.gems = [];
  Game.fragments = {};
  Object.keys(GEMS).forEach(k=>{
    Game.fragments[k] = { normal:0, rare:0, legend:0 };
  });
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
    affix:null, affixVal:0,
    sockets: [null, null, null]       // 3 孔，null 或 { uid, key, quality }
  };
  // 特色词条：品质决定概率（优秀 5% / 精良 15% / 史诗 40%）
  const chance = AFFIX_CHANCE[q] || 0;
  if(Math.random() < chance){
    const a = pick(AFFIXES);
    const v = a.roll();
    eq.affix = a.k;
    eq.affixVal = v;
  }
  return eq;
}

/* 装备本身属性（不含宝石） */
function equipStat(eq){
  const r = QUALITY[eq.quality].rate;
  return {
    atk: Math.floor((eq.baseAtk + eq.refineAtk) * (1 + r)),
    def: Math.floor((eq.baseDef + eq.refineDef) * (1 + r)),
    spd: Math.floor((eq.baseSpd||0) * (1 + r*0.5)),
    hp:  (eq.baseHp||0) + eq.refineHp
  };
}

/* 装备的宝石加成（累加） */
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

/* 装备 + 宝石 的完整加成 */
function equipFullBonus(eq){
  const base = equipStat(eq);
  const gem = equipGemBonus(eq);
  // 词条附加
  let affixStat = {};
  if(eq && eq.affix){
    affixStat[eq.affix] = eq.affixVal;
  }
  return {
    atk:    base.atk    + (gem.atk || 0)    + (affixStat.atk || 0),
    def:    base.def    + (gem.def || 0)    + (affixStat.def || 0),
    spd:    base.spd    + (gem.spd || 0)    + (affixStat.spd || 0),
    hp:     base.hp     + (gem.hp || 0)     + (affixStat.hp || 0),
    combo:  (gem.combo || 0)   + (affixStat.combo || 0),
    counter:(gem.counter || 0) + (affixStat.counter || 0),
    lsPct:  (gem.lsPct || 0)   + (affixStat.lsPct || 0),
    lsFlat: (gem.lsFlat || 0)  + (affixStat.lsFlat || 0),
    crit:   (gem.crit || 0)    + (affixStat.crit || 0),
    critd:  (affixStat.critd || 0)
  };
}

/* 词条描述 */
function equipAffixDesc(eq){
  if(!eq || !eq.affix) return '';
  const a = AFFIXES.find(x=>x.k===eq.affix);
  return a ? a.desc(eq.affixVal) : '';
}

/* ---- 属性计算（含宝石、词条、宠物被动） ---- */
function calcAttr(){
  let atk = Game.player.baseAtk, def = Game.player.baseDef, spd = Game.player.baseSpd, addHp = 0;
  let combo = 0, counter = 0, lsPct = 0, lsFlat = 0;
  let crit = 0.12, critD = 1.3;
  for(const s in Game.worn){
    const e = Game.worn[s]; if(!e) continue;
    const b = equipFullBonus(e);
    atk += b.atk; def += b.def; spd += b.spd; addHp += b.hp;
    combo += b.combo; counter += b.counter;
    lsPct += b.lsPct; lsFlat += b.lsFlat;
    crit += b.crit / 100;
    critD += (b.critd || 0) / 100;
  }
  // 套装
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
  // 宠物被动
  const activePetObjs = getActivePetObjects();
  activePetObjs.forEach(p=>{
    const pst = petStatFor(p);
    atk += pst.pAtk||0; def += pst.pDef||0; spd += pst.pSpd||0;
    const st = petSkillStateFor(p);
    if(st.pSpdBonus) spd = Math.floor(spd * (1 + st.pSpdBonus));
    if(st.pDefBonus) def = Math.floor(def * (1 + st.pDefBonus));
  });
  return {
    atk, def, spd, addHp,
    combo: combo/100,      // 存为小数（0.05 = 5%）
    counter: counter/100,
    lsPct: lsPct/100,
    lsFlat,
    crit, critD
  };
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
    p.baseAtk += 3;
    p.baseDef += 1;
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
 *  宝石/碎片操作
 * ============================================================ */

/* 掉落：生成一颗随机品质的随机宝石 */
function dropGem(boost){
  const key = randomGemKey();
  const q = rollGemQuality(boost);
  return makeGem(key, q);
}

/* 掉落：生成碎片 */
function dropFragment(){
  const key = randomGemKey();
  // 品质：普通 90% / 稀有 8% / 传说 2%
  const r = Math.random();
  const q = r < 0.02 ? 'legend' : (r < 0.10 ? 'rare' : 'normal');
  const frag = Game.fragments[key];
  if(!frag) return null;
  frag[q] = Math.min(FRAG_MAX_STACK, (frag[q] || 0) + 1);
  return { key, quality: q };
}

/* 合成：3 普通碎片 → 1 普通宝石（10% 出稀有） */
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

/* 分级升级碎片：3 普通碎片 → 1 稀有碎片 */
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
  KEY: 'legend_bw_v9',
  pack(){
    return {
      v:9,
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
      const old = localStorage.getItem('legend_bw_v8') || localStorage.getItem('legend_bw_v6');
      if(old){ return this._migrate(old); }
      return toast("无存档");
    }
    try{
      const d = JSON.parse(s);
      if(d.v !== 9) return toast("存档版本不符");
      Object.assign(Game, {
        player: d.player, bag: d.bag, worn: d.worn,
        mat: d.mat, areaState: d.areaState, flags: d.flags,
        quest: d.quest, pets: d.pets || [], activePets: d.activePets || [],
        gems: d.gems || [], fragments: d.fragments || {},
        stats: d.stats, ui: d.ui || { areaId:null, floorIdx:null },
        battle: null
      });
      // 兼容旧数据
      if(Game.player.mp == null){ Game.player.mp = 50; Game.player.maxMp = 50; }
      if(Game.player.potionMp == null) Game.player.potionMp = 0;
      // 装备补 sockets
      const fixEquip = (e)=>{
        if(!e) return;
        if(!e.sockets) e.sockets = [null, null, null];
        else while(e.sockets.length < 3) e.sockets.push(null);
      };
      Game.bag.forEach(fixEquip);
      for(const s in Game.worn) fixEquip(Game.worn[s]);
      // 碎片补全
      Object.keys(GEMS).forEach(k=>{
        if(!Game.fragments[k]) Game.fragments[k] = { normal:0, rare:0, legend:0 };
      });
      // 宠物补全
      Game.pets.forEach(p=>{
        if(p.hp == null) p.hp = petStatFor(p).hp;
        if(p.downUntil == null) p.downUntil = 0;
        if(p.skillCd == null) p.skillCd = {};
      });
      Nav.home(); Render.top(); Render.home();
      toast("读档完成");
    }catch(e){ toast("读档失败"); }
  },
  _migrate(raw){
    try{
      const d = JSON.parse(raw);
      // v8 存档
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
        // 装备补 sockets
        const fixEquip = (e)=>{
          if(!e) return;
          if(!e.sockets) e.sockets = [null, null, null];
        };
        Game.bag.forEach(fixEquip);
        for(const s in Game.worn) fixEquip(Game.worn[s]);
        Save.auto();
        Nav.home(); Render.top(); Render.home();
        toast("v8 存档已升级到 v9");
        return;
      }
      // v6 老存档
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
        const fixEquip = (e)=>{
          if(!e) return;
          if(!e.sockets) e.sockets = [null, null, null];
        };
        Game.bag.forEach(fixEquip);
        for(const s in Game.worn) fixEquip(Game.worn[s]);
        Save.auto();
        Nav.home(); Render.top(); Render.home();
        toast("v6 存档已迁移到 v9");
        return;
      }
      toast("存档版本过旧，无法迁移");
    }catch(e){ toast("存档迁移失败"); }
  },
  reset(){
    confirmBox("确定全部重置？", ()=>{
      localStorage.removeItem(this.KEY);
      localStorage.removeItem('legend_bw_v8');
      localStorage.removeItem('legend_bw_v6');
      initGame();
      Nav.home(); Render.top(); Render.home();
      toast("已重置");
    });
  }
};