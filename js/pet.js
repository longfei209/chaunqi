/* ============================================================
 *  pet.js  —— 宠物系统
 *  本轮调整：
 *   - 宠物新增 HP / downUntil / skillCd 字段
 *   - 加宠物受伤、复活倒计时、CD 检查工具
 * ============================================================ */

/* 上阵上限 */
function petSlotLimit(){
  const lv = Game.player ? Game.player.lv : 1;
  if(lv >= 30) return 4;
  if(lv >= 20) return 3;
  if(lv >= 10) return 2;
  return 1;
}

/* 生成宠物 */
function makePet(tplKey, quality){
  const t = PET_TEMPLATES[tplKey];
  const q = quality || 'normal';
  const skillCount = PET_SKILL_COUNT[q];
  const pool = Object.keys(PET_SKILLS);
  const skills = [];
  for(let i=0; i<skillCount && pool.length > 0; i++){
    const idx = Math.floor(Math.random() * pool.length);
    skills.push(pool[idx]);
    pool.splice(idx, 1);
  }
  const p = {
    uid: uid(),
    tpl: tplKey, name: t.name, avatar: t.avatar,
    quality: q, lv:1, exp:0,
    baseAtk: t.base.atk, baseDef: t.base.def,
    baseHp: t.base.hp, baseSpd: t.base.spd,
    skills: skills,
    hp: 0,             // 战斗 HP（下场/死亡后重置）
    downUntil: 0,      // 下场后复活时间戳（0 = 正常）
    skillCd: {}        // 技能 CD 计数
  };
  p.hp = petStatFor(p).hp;
  return p;
}

function petStatFor(p){
  const q = QUALITY[p.quality];
  const g = 1 + (p.lv-1)*0.18;
  const atk = Math.floor(p.baseAtk * q.mult * g);
  const def = Math.floor(p.baseDef * q.mult * g);
  const hp  = Math.floor(p.baseHp  * q.mult * g);
  const spd = Math.floor(p.baseSpd * q.mult * (1+(p.lv-1)*0.08));
  return { atk, def, hp, spd, pAtk:Math.floor(atk*0.15), pDef:Math.floor(def*0.15), pSpd:Math.floor(spd*0.15) };
}

function petSkillStateFor(p){
  const st = { crit:0, ls:0, group:false, heal:0, spdBonus:0, defBonus:0, pSpdBonus:0, pDefBonus:0, pois:false, reflect:0 };
  if(!p.skills || p.skills.length === 0) return st;
  p.skills.forEach(key=>{
    const sk = PET_SKILLS[key];
    if(sk && sk.apply) sk.apply(st);
  });
  return st;
}

/* 宠物是否可出战（未在冷却中） */
function petAlive(p){
  return p.downUntil === 0;
}

/* 宠物受伤 */
function petTakeDamage(p, dmg){
  if(!petAlive(p)) return;
  p.hp -= dmg;
  if(p.hp <= 0){
    p.hp = 0;
    p.downUntil = Date.now() + PET_DOWN_MS;
  }
}

/* 宠物复活检查（1 秒 tick） */
function tickPetRespawn(){
  const now = Date.now();
  let changed = false;
  Game.pets.forEach(p=>{
    if(p.downUntil && now >= p.downUntil){
      p.downUntil = 0;
      p.hp = petStatFor(p).hp;
      // 复活时重置 CD
      p.skillCd = {};
      changed = true;
    }
  });
  return changed;
}

function petAddExp(p, v){
  p.exp += v;
  while(p.exp >= p.lv * 150){
    p.exp -= p.lv * 150;
    p.lv++;
    p.hp = petStatFor(p).hp;   // 升级回满
    toast(`${p.name} 升级 Lv.${p.lv}`);
  }
}

/* 只返回真正可以出手的宠物（在阵上 + 未冷却） */
function getActivePetObjects(){
  return Game.activePets
    .map(u => Game.pets.find(p=>p.uid === u))
    .filter(p => p && petAlive(p));
}

const Pet = {
  toggle(uid){
    const idx = Game.activePets.indexOf(uid);
    if(idx >= 0){
      Game.activePets.splice(idx, 1);
      toast("已下阵");
    }else{
      if(Game.activePets.length >= petSlotLimit()) return toast("上阵已满");
      const p = Game.pets.find(x=>x.uid === uid);
      if(p && !petAlive(p)) return toast(`复活中（${Math.ceil((p.downUntil - Date.now())/1000)}s）`);
      Game.activePets.push(uid);
      toast("已上阵");
    }
    Save.auto();
    Render.petPage(); Render.top();
  },
  release(uid){
    confirmBox("确定放生该宠物？", ()=>{
      const idx = Game.activePets.indexOf(uid);
      if(idx >= 0) Game.activePets.splice(idx, 1);
      Game.pets = Game.pets.filter(p=>p.uid !== uid);
      Save.auto();
      Render.petPage(); Render.top();
    });
  },
  tryAdd(pet){
    if(Game.pets.length >= PET_WAREHOUSE_MAX){
      toast("宠物仓库已满");
      return false;
    }
    Game.pets.push(pet);
    if(Game.activePets.length < petSlotLimit()){
      Game.activePets.push(pet.uid);
      toast(`获得 ${pet.name} [${QUALITY[pet.quality].name}] · 已上阵`);
    }else{
      toast(`获得 ${pet.name} [${QUALITY[pet.quality].name}] · 已存仓库`);
    }
    return true;
  }
};
