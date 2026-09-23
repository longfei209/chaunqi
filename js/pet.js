/* ============================================================
 *  pet.js  —— 宠物系统
 * ============================================================ */

/* 上阵上限（按等级） */
function petSlotLimit(){
  const lv = Game.player ? Game.player.lv : 1;
  if(lv >= 30) return 4;
  if(lv >= 20) return 3;
  if(lv >= 10) return 2;
  return 1;
}

/* 生成宠物（品质决定技能数量） */
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
  return {
    uid: uid(),
    tpl: tplKey, name: t.name, avatar: t.avatar,
    quality: q, lv:1, exp:0,
    baseAtk: t.base.atk, baseDef: t.base.def,
    baseHp: t.base.hp, baseSpd: t.base.spd,
    skills: skills,
    hp: t.base.hp
  };
}

function petStatFor(p){
  const q = QUALITY[p.quality];
  const g = 1 + (p.lv-1)*0.18;
  const atk = Math.floor(p.baseAtk * q.mult * g);
  const def = Math.floor(p.baseDef * q.mult * g);
  const hp  = Math.floor(p.baseHp  * q.mult * g);
  const spd = Math.floor(p.baseSpd * q.mult * (1+(p.lv-1)*0.08));
  return { atk, def, hp, spd, pAtk:Math.floor(atk*0.2), pDef:Math.floor(def*0.2), pSpd:Math.floor(spd*0.2) };
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

function petAddExp(p, v){
  p.exp += v;
  while(p.exp >= p.lv * 150){
    p.exp -= p.lv * 150;
    p.lv++;
    toast(`${p.name} 升级 Lv.${p.lv}`);
  }
}

function getActivePetObjects(){
  return Game.activePets.map(u => Game.pets.find(p=>p.uid === u)).filter(Boolean);
}

/* 宠物操作 */
const Pet = {
  toggle(uid){
    const idx = Game.activePets.indexOf(uid);
    if(idx >= 0){
      Game.activePets.splice(idx, 1);
      toast("已下阵");
    }else{
      if(Game.activePets.length >= petSlotLimit()) return toast("上阵已满");
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