/* ============================================================
 *  config.js  —— 所有可调数值都在这里
 *  本轮调整：
 *   - 技能蓝耗提升、CD 延长（方案 B）
 *   - 装备基础 atk/def 数值 × 0.6
 * ============================================================ */

/* 品质 */
const QUALITY = {
  normal:{ k:'normal', name:'普通', cls:'q-normal', rate:0,    bMin:1.0, bMax:1.0, mult:1.0 },
  good:  { k:'good',   name:'优秀', cls:'q-good',   rate:0.15, bMin:1.0, bMax:1.5, mult:1.3 },
  fine:  { k:'fine',   name:'精良', cls:'q-fine',   rate:0.30, bMin:1.2, bMax:2.2, mult:1.7 },
  epic:  { k:'epic',   name:'史诗', cls:'q-epic',   rate:0.55, bMin:1.5, bMax:3.5, mult:2.2 }
};
const DECOMP_MAT = { normal:1, good:2, fine:4, epic:8 };

/* 装备槽位 */
const SLOT_NAME = { weapon:"武器", helmet:"帽子", cloth:"衣服", shoe:"鞋子", belt:"腰带", ring:"戒指", neck:"项链" };
const SLOT_ORDER = ['weapon','helmet','cloth','shoe','belt','ring','neck'];

/* 装备基础表（atk/def 已 × 0.6 并四舍五入） */
const EQUIP_BASE = {
  "木剑":     {slot:"weapon", atk:5,  def:0,  spd:0, hp:0, buy:200,  sell:80},
  "铁剑":     {slot:"weapon", atk:10, def:1,  spd:0, hp:0, buy:600,  sell:240},
  "屠龙":     {slot:"weapon", atk:23, def:5,  spd:0, hp:0, buy:4500, sell:1800},
  "魔龙斩":   {slot:"weapon", atk:29, def:7,  spd:2, hp:0, buy:6000, sell:3000},
  "布帽":     {slot:"helmet", atk:0,  def:2,  spd:1, hp:0, buy:120,  sell:48},
  "战神头盔": {slot:"helmet", atk:4,  def:8,  spd:1, hp:20, buy:2200, sell:880},
  "布衣":     {slot:"cloth",  atk:0,  def:4,  spd:0, hp:10, buy:180,  sell:72},
  "战神铠甲": {slot:"cloth",  atk:5,  def:13, spd:0, hp:50, buy:3200, sell:1280},
  "布鞋":     {slot:"shoe",   atk:0,  def:2,  spd:2, hp:0, buy:100,  sell:40},
  "战神战靴": {slot:"shoe",   atk:2,  def:7,  spd:4, hp:10, buy:1800, sell:720},
  "兽皮腰带": {slot:"belt",   atk:0,  def:2,  spd:1, hp:0, buy:110,  sell:44},
  "战神腰带": {slot:"belt",   atk:3,  def:8,  spd:3, hp:20, buy:2000, sell:800},
  "青铜戒指": {slot:"ring",   atk:2,  def:1,  spd:2, hp:0, buy:140,  sell:56},
  "力量戒指": {slot:"ring",   atk:8,  def:5,  spd:3, hp:0, buy:2600, sell:1040},
  "木项链":   {slot:"neck",   atk:2,  def:1,  spd:1, hp:0, buy:130,  sell:52},
  "魔龙项链": {slot:"neck",   atk:11, def:8,  spd:4, hp:30, buy:4800, sell:2400}
};
const SHOP_LIST = ["木剑","铁剑","布帽","战神头盔","布衣","战神铠甲","布鞋","战神战靴","兽皮腰带","战神腰带","青铜戒指","力量戒指","木项链"];

/* 套装 */
const SETS = {
  "战神": { name:"战神套", members:["战神头盔","战神铠甲","战神战靴","战神腰带"], bonus3:{atk:15,def:10}, bonus4:{atk:30,def:25,hp:80,spd:5} },
  "魔龙": { name:"魔龙套", members:["魔龙斩","魔龙项链"], bonus2:{atk:20,def:15,spd:5} }
};

/* 装备词缀池 */
const AFFIXES = [
  {k:'spd',  name:'疾风', apply:(eq,v)=>{eq.affixSpd=v;},   roll:()=>rnd(2,6),   desc:v=>`+${v}速度`},
  {k:'crit', name:'精准', apply:(eq,v)=>{eq.affixCrit=v;},  roll:()=>rnd(3,10),  desc:v=>`+${v}%暴击`},
  {k:'critd',name:'致命', apply:(eq,v)=>{eq.affixCritD=v;}, roll:()=>rnd(15,50), desc:v=>`+${v}%暴伤`},
  {k:'ls',   name:'吸血', apply:(eq,v)=>{eq.affixLs=v;},    roll:()=>rnd(3,10),  desc:v=>`吸血${v}%`},
  {k:'hp',   name:'坚韧', apply:(eq,v)=>{eq.affixHp=v;},    roll:()=>rnd(10,40), desc:v=>`+${v}HP`}
];

/* 主角技能（本轮调整：蓝耗提升 + CD 延长） */
const SKILLS = {
  liehuo:   {name:'烈火剑法', cd:5, unlock:1, mp:15, desc:'单体 ×1.8'},
  banyue:   {name:'半月弯刀', cd:6, unlock:3, mp:28, desc:'全体 ×0.9'},
  zhiyu:    {name:'治愈术',   cd:6, unlock:5, mp:22, desc:'回复 25% HP'},
  zhanshen: {name:'战神祝福', cd:8, unlock:8, mp:35, desc:'3回合攻防+30%'}
};

/* 宠物模板 */
const PET_TEMPLATES = {
  wolf:  {name:'影狼',  avatar:'🐺', base:{atk:10,def:3,hp:50,spd:10}},
  bear:  {name:'山熊',  avatar:'🐻', base:{atk:5,def:10,hp:100,spd:5}},
  eagle: {name:'迅鹰',  avatar:'🦅', base:{atk:8,def:4,hp:45,spd:18}}
};

/* 宠物技能池 */
const PET_SKILLS = {
  crit:  {name:'锐爪', desc:'暴击+12%',           apply:st=>{st.crit += 0.12;}},
  ls:    {name:'嗜血', desc:'吸血12%',            apply:st=>{st.ls += 0.12;}},
  group: {name:'撕咬', desc:'每2回合群攻×0.22',   apply:st=>{st.group=true;}},
  heal:  {name:'守护', desc:'每3回合回主人10%',   apply:st=>{st.heal=0.10;}},
  swift: {name:'迅捷', desc:'宠速+20% 主速+8%',   apply:st=>{st.spdBonus=0.20; st.pSpdBonus=0.08;}},
  iron:  {name:'铁壁', desc:'宠防+40% 主防+8%',   apply:st=>{st.defBonus=0.40; st.pDefBonus=0.08;}},
  pois:  {name:'剧毒', desc:'攻击附带剧毒',       apply:st=>{st.pois=true;}},
  refle: {name:'反伤', desc:'主人受击反12%',      apply:st=>{st.reflect=0.12;}}
};

const PET_SKILL_CD = { heal: 3, group: 2 };
const PET_SKILL_COUNT = { normal:0, good:1, fine:2, epic:3 };

/* 精英词缀 */
const ELITE_AFFIXES = [
  {k:'rage',  name:'狂暴', apply:m=>{m.atk = Math.floor(m.atk*1.5);}},
  {k:'iron',  name:'铁壁', apply:m=>{m.def = Math.floor(m.def*1.8);}},
  {k:'swift', name:'迅捷', apply:m=>{m.spd = Math.floor(m.spd*1.5);}},
  {k:'vamp',  name:'吸血', apply:m=>{m.vamp = 0.3;}},
  {k:'pois',  name:'剧毒', apply:m=>{m.pois = Math.floor(m.atk*0.3);}}
];

/* 怪物行为 */
const MON_BEHAVIOR = {
  normal:{name:'普通'}, ranged:{name:'远程'}, tank:{name:'坦克'},
  healer:{name:'治疗'}, rage:{name:'狂暴'}, summon:{name:'召唤'}
};

/* 区域（沿用上轮 ×1.3 之后的数值，此处省略 —— 保留你现有 AREAS 不变） */
/* ⚠️ 这一整段 AREAS 与上一版完全相同，保持原样即可。 */

/* 全局常量 */
const RESPAWN_MON = 60*1000;
const RESPAWN_BOSS = 180*1000;
const QUEST_POOL_CD = 120*1000;
const POTION_PRICE = 50;
const POTION_MP_PRICE = 40;
const AUTO_POTION_THRESHOLD = 0.30;
const RAGE_MAX = 10;
const GROUPS_PER_FLOOR = 4;
const ELITE_CHANCE = 0.15;
const PAGE_SIZE = { shop:5, bag:6, quest:4 };
const PET_WAREHOUSE_MAX = 10;
const PET_DOWN_MS = 30*1000;
