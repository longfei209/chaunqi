/* ============================================================
 *  config.js  —— 所有可调数值都在这里
 *
 *  本轮改动：
 *   - 装备表换为 35 件（7 槽 × 5 档），含 min 值
 *   - 每件装备掉落按区域分档
 *   - 技能蓝耗：烈火 15 / 半月 28 / 治愈 22 / 战神 35
 *   - 攻击 max = min × 2.2，防御 max = min × 2.0
 * ============================================================ */

/* 品质 */
const QUALITY = {
  normal:{ k:'normal', name:'普通', cls:'q-normal', rate:0,    bMin:1.0, bMax:1.0, mult:1.0 },
  good:  { k:'good',   name:'优秀', cls:'q-good',   rate:0.15, bMin:1.0, bMax:1.5, mult:1.3 },
  fine:  { k:'fine',   name:'精良', cls:'q-fine',   rate:0.30, bMin:1.2, bMax:2.2, mult:1.7 },
  epic:  { k:'epic',   name:'史诗', cls:'q-epic',   rate:0.55, bMin:1.5, bMax:3.5, mult:2.2 }
};
const DECOMP_MAT = { normal:1, good:2, fine:4, epic:8 };

/* 槽位 */
const SLOT_NAME = { weapon:"武器", helmet:"帽子", cloth:"衣服", shoe:"鞋子", belt:"腰带", ring:"戒指", neck:"项链" };
const SLOT_ORDER = ['weapon','helmet','cloth','shoe','belt','ring','neck'];

/* ============================================================
 *  装备基础表（35 件，7 槽 × 5 档）
 *  每件只写 min 值；max 由代码按比例算：
 *    atkMax = round(atkMin × 2.2)
 *    defMax = round(defMin × 2.0)
 *  spd / hp 固定
 *  档位 tier：1~5（掉落池用）
 * ============================================================ */
const EQUIP_BASE = {
  /* 武器 */
  "木剑":     {slot:"weapon", tier:1, atk:5,  def:0,  spd:0, hp:0, buy:200,  sell:80},
  "铁剑":     {slot:"weapon", tier:2, atk:8,  def:1,  spd:0, hp:0, buy:600,  sell:240},
  "精钢剑":   {slot:"weapon", tier:3, atk:14, def:3,  spd:0, hp:0, buy:1800, sell:700},
  "屠龙":     {slot:"weapon", tier:4, atk:22, def:5,  spd:0, hp:0, buy:4500, sell:1800},
  "魔龙斩":   {slot:"weapon", tier:5, atk:30, def:7,  spd:2, hp:0, buy:9000, sell:3600},

  /* 帽子 */
  "布帽":     {slot:"helmet", tier:1, atk:0,  def:2,  spd:1, hp:0,  buy:120,  sell:48},
  "皮帽":     {slot:"helmet", tier:2, atk:0,  def:4,  spd:1, hp:10, buy:400,  sell:160},
  "铁盔":     {slot:"helmet", tier:3, atk:2,  def:7,  spd:1, hp:25, buy:1200, sell:480},
  "战神头盔": {slot:"helmet", tier:4, atk:4,  def:11, spd:1, hp:45, buy:2800, sell:1100},
  "龙鳞头盔": {slot:"helmet", tier:5, atk:6,  def:15, spd:1, hp:70, buy:6000, sell:2400},

  /* 衣服 */
  "布衣":     {slot:"cloth", tier:1, atk:0,  def:3,  spd:0, hp:10, buy:180,  sell:72},
  "皮甲":     {slot:"cloth", tier:2, atk:0,  def:6,  spd:0, hp:20, buy:500,  sell:200},
  "锁子甲":   {slot:"cloth", tier:3, atk:3,  def:10, spd:0, hp:40, buy:1600, sell:640},
  "战神铠甲": {slot:"cloth", tier:4, atk:5,  def:15, spd:0, hp:70, buy:3500, sell:1400},
  "龙鳞铠甲": {slot:"cloth", tier:5, atk:7,  def:21, spd:0, hp:110,buy:7500, sell:3000},

  /* 鞋子 */
  "草鞋":     {slot:"shoe", tier:1, atk:0,  def:1,  spd:1, hp:0,  buy:80,   sell:32},
  "布鞋":     {slot:"shoe", tier:2, atk:0,  def:2,  spd:2, hp:0,  buy:200,  sell:80},
  "皮靴":     {slot:"shoe", tier:3, atk:0,  def:4,  spd:3, hp:5,  buy:800,  sell:320},
  "战神战靴": {slot:"shoe", tier:4, atk:2,  def:7,  spd:4, hp:10, buy:2000, sell:800},
  "龙鳞战靴": {slot:"shoe", tier:5, atk:3,  def:10, spd:5, hp:20, buy:5000, sell:2000},

  /* 腰带 */
  "麻绳":     {slot:"belt", tier:1, atk:0,  def:1,  spd:0, hp:0,  buy:70,   sell:28},
  "兽皮腰带": {slot:"belt", tier:2, atk:0,  def:2,  spd:1, hp:10, buy:200,  sell:80},
  "铁腰带":   {slot:"belt", tier:3, atk:2,  def:5,  spd:1, hp:25, buy:900,  sell:360},
  "战神腰带": {slot:"belt", tier:4, atk:3,  def:8,  spd:3, hp:45, buy:2200, sell:880},
  "龙鳞腰带": {slot:"belt", tier:5, atk:5,  def:12, spd:3, hp:75, buy:5500, sell:2200},

  /* 戒指 */
  "木戒":     {slot:"ring", tier:1, atk:1,  def:0,  spd:1, hp:0,  buy:90,   sell:36},
  "青铜戒指": {slot:"ring", tier:2, atk:3,  def:1,  spd:2, hp:0,  buy:300,  sell:120},
  "银戒":     {slot:"ring", tier:3, atk:5,  def:3,  spd:2, hp:0,  buy:1100, sell:440},
  "力量戒指": {slot:"ring", tier:4, atk:8,  def:5,  spd:3, hp:0,  buy:2600, sell:1040},
  "龙鳞戒指": {slot:"ring", tier:5, atk:12, def:8,  spd:3, hp:20, buy:6000, sell:2400},

  /* 项链 */
  "草链":     {slot:"neck", tier:1, atk:1,  def:0,  spd:0, hp:0,  buy:80,   sell:32},
  "木项链":   {slot:"neck", tier:2, atk:2,  def:1,  spd:1, hp:0,  buy:250,  sell:100},
  "银链":     {slot:"neck", tier:3, atk:4,  def:3,  spd:1, hp:15, buy:1000, sell:400},
  "魔龙项链": {slot:"neck", tier:4, atk:7,  def:5,  spd:4, hp:30, buy:3000, sell:1200},
  "龙鳞项链": {slot:"neck", tier:5, atk:11, def:8,  spd:4, hp:50, buy:6500, sell:2600}
};

/* 按档位分组（掉落池用） */
const EQUIP_BY_TIER = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: []
};
Object.keys(EQUIP_BASE).forEach(name=>{
  const t = EQUIP_BASE[name].tier;
  if(EQUIP_BY_TIER[t]) EQUIP_BY_TIER[t].push(name);
});

/* 商店出售的装备（只卖 1~2 档基础装备） */
const SHOP_LIST = ["木剑","铁剑","布帽","皮帽","布衣","皮甲","草鞋","布鞋","麻绳","兽皮腰带","木戒","青铜戒指","草链","木项链"];

/* 套装（保留，扩展后部分名字变了） */
const SETS = {
  "战神": { name:"战神套", members:["战神头盔","战神铠甲","战神战靴","战神腰带"], bonus3:{atk:15,def:10}, bonus4:{atk:30,def:25,hp:80,spd:5} },
  "魔龙": { name:"魔龙套", members:["魔龙斩","魔龙项链"], bonus2:{atk:20,def:15,spd:5} },
  "龙鳞": { name:"龙鳞套", members:["龙鳞头盔","龙鳞铠甲","龙鳞战靴","龙鳞腰带","龙鳞戒指","龙鳞项链"], bonus3:{atk:30,def:20}, bonus6:{atk:60,def:45,hp:200,spd:8} }
};

/* 特色词条池 */
const AFFIXES = [
  {k:'atk',   name:'锋利', unit:'',   roll:()=>rnd(2,6),    desc:v=>`+${v}攻击`},
  {k:'def',   name:'坚固', unit:'',   roll:()=>rnd(1,4),    desc:v=>`+${v}防御`},
  {k:'spd',   name:'疾风', unit:'',   roll:()=>rnd(2,6),    desc:v=>`+${v}速度`},
  {k:'hp',    name:'坚韧', unit:'',   roll:()=>rnd(10,40),  desc:v=>`+${v}HP`},
  {k:'crit',  name:'精准', unit:'%',  roll:()=>rnd(3,10),   desc:v=>`+${v}%暴击`},
  {k:'critd', name:'致命', unit:'%',  roll:()=>rnd(15,50),  desc:v=>`+${v}%暴伤`},
  {k:'combo', name:'连击', unit:'%',  roll:()=>rnd(1,3),    desc:v=>`+${v}%连击`},
  {k:'counter',name:'反击',unit:'%',  roll:()=>rnd(1,3),    desc:v=>`+${v}%反击`},
  {k:'lsPct', name:'吸血', unit:'%',  roll:()=>rnd(1,3),    desc:v=>`+${v}%吸血`},
  {k:'lsFlat',name:'嗜血', unit:'',   roll:()=>rnd(1,4),    desc:v=>`+${v}固吸血`}
];
const AFFIX_CHANCE = { normal:0, good:0.05, fine:0.15, epic:0.40 };

/* 主角技能（蓝耗加大） */
const SKILLS = {
  liehuo:   {name:'烈火剑法', cd:5, unlock:1, mp:15, desc:'单体 ×1.8'},
  banyue:   {name:'半月弯刀', cd:6, unlock:3, mp:28, desc:'全体 ×0.9'},
  zhiyu:    {name:'治愈术',   cd:6, unlock:5, mp:22, desc:'回复 25% HP'},
  zhanshen: {name:'战神祝福', cd:8, unlock:8, mp:35, desc:'3回合攻防+30%'}
};

/* 宠物 */
const PET_TEMPLATES = {
  wolf:  {name:'影狼',  avatar:'🐺', base:{atk:10,def:3,hp:50,spd:10}},
  bear:  {name:'山熊',  avatar:'🐻', base:{atk:5,def:10,hp:100,spd:5}},
  eagle: {name:'迅鹰',  avatar:'🦅', base:{atk:8,def:4,hp:45,spd:18}}
};
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

const MON_BEHAVIOR = {
  normal:{name:'普通'}, ranged:{name:'远程'}, tank:{name:'坦克'},
  healer:{name:'治疗'}, rage:{name:'狂暴'}, summon:{name:'召唤'}
};

/* ============================================================
 *  宝石系统
 * ============================================================ */
const GEM_QUALITY = {
  normal:{ k:'normal', name:'普通', cls:'q-normal', color:'#aaa' },
  rare:  { k:'rare',   name:'稀有', cls:'q-fine',   color:'#89d' },
  legend:{ k:'legend', name:'传说', cls:'q-epic',   color:'#ffd700' }
};

const GEMS = {
  red:    { k:'red',    name:'红宝石', color:'#c85a5a', icon:'🔴', stat:'atk',    val:[3,6,12],   type:'num', desc:'攻击' },
  blue:   { k:'blue',   name:'蓝宝石', color:'#5a7ac8', icon:'🔵', stat:'def',    val:[2,5,10],   type:'num', desc:'防御' },
  green:  { k:'green',  name:'绿宝石', color:'#5ac87a', icon:'🟢', stat:'hp',     val:[15,30,60], type:'num', desc:'生命' },
  purple: { k:'purple', name:'紫宝石', color:'#a05ac8', icon:'🟣', stat:'combo',  val:[1,2,4],    type:'pct', desc:'连击率' },
  orange: { k:'orange', name:'橙宝石', color:'#d89a4a', icon:'🟠', stat:'counter',val:[1,2,4],    type:'pct', desc:'反击率' },
  black:  { k:'black',  name:'黑宝石', color:'#555',    icon:'⚫', stat:'lsPct',  val:[1,2,4],    type:'pct', desc:'吸血率' },
  yellow: { k:'yellow', name:'黄宝石', color:'#d8d84a', icon:'🟡', stat:'lsFlat', val:[2,5,10],   type:'num', desc:'固定吸血' },
  white:  { k:'white',  name:'白宝石', color:'#e8e8e8', icon:'⚪', stat:'crit',   val:[1,2,4],    type:'pct', desc:'暴击率' }
};
const GEM_QUALITY_ORDER = ['normal','rare','legend'];
const GEM_SHOP_PRICE = 200;
const GEM_REMOVE_COST = { normal:200, rare:500, legend:1000 };
const FRAG_PER_GEM = 3;
const FRAG_UPGRADE_RARE = 0.10;
const FRAG_TIER_UP = 3;
const FRAG_MAX_STACK = 999;
const GEM_DROP_RATE = { normalMon: 0.05, elite: 0.10, boss: 0.20 };
const GEM_DROP_SPLIT = 0.50;
const EQUIP_SOCKETS = 3;

/* ============================================================
 *  区域配置（每个区域记录掉落档位）
 * ============================================================ */
const AREAS = [
  { id:"grass", name:"新手草原", unlock:true, dropTier:{ normal:1, elite:[1,2], boss:2 }, floors:[
      { pool:[
          {id:"wolf",name:"野狼",hp:130,atk:16,def:5,spd:9,exp:55,gMin:15,gMax:50,behavior:'normal'},
          {id:"rabbit",name:"野兔",hp:91,atk:12,def:3,spd:14,exp:40,gMin:10,gMax:35,behavior:'ranged'},
          {id:"boar",name:"野猪",hp:182,atk:18,def:9,spd:6,exp:70,gMin:20,gMax:60,behavior:'tank'}],
        boss:{id:"wolfKing",name:"狼王",hp:520,atk:26,def:10,spd:11,exp:200,gMin:80,gMax:160} },
      { pool:[
          {id:"hyena",name:"鬣狗",hp:221,atk:26,def:10,spd:10,exp:100,gMin:30,gMax:80,behavior:'normal'},
          {id:"vulture",name:"秃鹫",hp:169,atk:29,def:7,spd:15,exp:95,gMin:25,gMax:70,behavior:'ranged'},
          {id:"rhino",name:"犀牛",hp:338,atk:23,def:18,spd:5,exp:130,gMin:40,gMax:95,behavior:'tank'},
          {id:"shaman",name:"萨满",hp:195,atk:21,def:8,spd:9,exp:110,gMin:35,gMax:85,behavior:'healer'}],
        boss:{id:"grassBoss",name:"草原霸主",hp:910,atk:39,def:18,spd:10,exp:380,gMin:150,gMax:300} },
      { pool:[
          {id:"lion",name:"狂狮",hp:416,atk:39,def:16,spd:12,exp:180,gMin:55,gMax:130,behavior:'rage'},
          {id:"elephant",name:"战象",hp:676,atk:34,def:26,spd:4,exp:220,gMin:70,gMax:150,behavior:'tank'},
          {id:"hunter",name:"猎手",hp:299,atk:44,def:10,spd:14,exp:170,gMin:50,gMax:120,behavior:'ranged'},
          {id:"priest",name:"祭司",hp:338,atk:26,def:13,spd:8,exp:190,gMin:60,gMax:140,behavior:'healer'}],
        boss:{id:"beastKing",name:"兽王",hp:1300,atk:55,def:26,spd:13,exp:600,gMin:250,gMax:450} }
  ]},
  { id:"orc", name:"兽人古墓", unlock:true, dropTier:{ normal:2, elite:[2,3], boss:3 }, floors:[
      { pool:[
          {id:"orcSlave",name:"兽人奴隶",hp:416,atk:36,def:16,spd:8,exp:180,gMin:60,gMax:140,behavior:'normal'},
          {id:"orcArcher",name:"兽人弓手",hp:338,atk:39,def:10,spd:13,exp:170,gMin:55,gMax:130,behavior:'ranged'},
          {id:"orcBrute",name:"兽人壮汉",hp:624,atk:34,def:23,spd:5,exp:220,gMin:70,gMax:160,behavior:'tank'}],
        boss:{id:"orcGuard",name:"兽人守卫长",hp:1170,atk:52,def:23,spd:10,exp:450,gMin:200,gMax:350} },
      { pool:[
          {id:"orcWar",name:"兽人战士",hp:546,atk:47,def:20,spd:10,exp:240,gMin:80,gMax:180,behavior:'rage'},
          {id:"orcSham",name:"兽人术士",hp:442,atk:55,def:13,spd:9,exp:260,gMin:90,gMax:200,behavior:'healer'},
          {id:"orcSpear",name:"兽人枪兵",hp:494,atk:49,def:18,spd:12,exp:250,gMin:85,gMax:190,behavior:'normal'},
          {id:"orcNecro",name:"兽人巫师",hp:390,atk:49,def:10,spd:11,exp:270,gMin:95,gMax:210,behavior:'summon'}],
        boss:{id:"orcCaptain",name:"兽人队长",hp:1430,atk:60,def:29,spd:11,exp:550,gMin:240,gMax:420} },
      { pool:[
          {id:"orcKingGr",name:"兽人近卫",hp:676,atk:57,def:26,spd:10,exp:320,gMin:110,gMax:230,behavior:'normal'},
          {id:"orcChamp",name:"兽人冠军",hp:884,atk:65,def:31,spd:9,exp:400,gMin:140,gMax:280,behavior:'rage'},
          {id:"orcPriest",name:"兽人祭司",hp:624,atk:62,def:21,spd:11,exp:360,gMin:130,gMax:260,behavior:'healer'},
          {id:"orcSummoner",name:"兽人召唤师",hp:546,atk:60,def:16,spd:12,exp:380,gMin:135,gMax:270,behavior:'summon'}],
        boss:{id:"orcKing",name:"兽人之王",hp:2080,atk:73,def:36,spd:12,exp:800,gMin:320,gMax:550} }
  ]},
  { id:"pig", name:"猪洞", unlock:true, dropTier:{ normal:3, elite:[3,4], boss:4 }, floors:[
      { pool:[
          {id:"pigSoldier",name:"黑猪",hp:715,atk:52,def:23,spd:9,exp:320,gMin:110,gMax:240,behavior:'normal'},
          {id:"pigArcher",name:"猪弓手",hp:546,atk:57,def:16,spd:13,exp:300,gMin:100,gMax:220,behavior:'ranged'},
          {id:"pigTank",name:"铁猪",hp:1040,atk:47,def:36,spd:5,exp:380,gMin:130,gMax:270,behavior:'tank'}],
        boss:{id:"pigBoss1",name:"红猪统领",hp:1950,atk:68,def:39,spd:11,exp:800,gMin:340,gMax:600} },
      { pool:[
          {id:"pigAx",name:"白猪",hp:884,atk:62,def:29,spd:10,exp:400,gMin:140,gMax:290,behavior:'rage'},
          {id:"pigMag",name:"猪法师",hp:676,atk:73,def:21,spd:12,exp:420,gMin:150,gMax:300,behavior:'healer'},
          {id:"pigSummon",name:"猪召唤者",hp:780,atk:65,def:26,spd:11,exp:440,gMin:160,gMax:320,behavior:'summon'},
          {id:"pigBrute",name:"巨猪",hp:1170,atk:68,def:39,spd:6,exp:500,gMin:180,gMax:360,behavior:'tank'}],
        boss:{id:"pigBoss2",name:"白猪王",hp:2340,atk:78,def:44,spd:12,exp:950,gMin:400,gMax:700} },
      { pool:[
          {id:"pigDemon",name:"魔猪",hp:975,atk:81,def:31,spd:12,exp:520,gMin:190,gMax:380,behavior:'rage'},
          {id:"pigLord",name:"猪魔卫",hp:1170,atk:75,def:42,spd:9,exp:580,gMin:210,gMax:420,behavior:'normal'},
          {id:"pigHealer",name:"猪魔祭",hp:806,atk:78,def:23,spd:13,exp:560,gMin:200,gMax:400,behavior:'healer'},
          {id:"pigSummon2",name:"猪魔召",hp:884,atk:78,def:29,spd:12,exp:600,gMin:215,gMax:430,behavior:'summon'}],
        boss:{id:"zhuDemon",name:"猪魔教主",hp:2860,atk:88,def:49,spd:13,exp:1200,gMin:480,gMax:820} }
  ]},
  { id:"zuma", name:"祖玛神殿", unlock:true, dropTier:{ normal:3, elite:[3,4], boss:4 }, floors:[
      { pool:[
          {id:"zumaGuard",name:"祖玛卫士",hp:1014,atk:70,def:36,spd:10,exp:520,gMin:200,gMax:380,behavior:'normal'},
          {id:"zumaArcher",name:"祖玛弓手",hp:806,atk:78,def:26,spd:14,exp:500,gMin:190,gMax:360,behavior:'ranged'},
          {id:"zumaTank",name:"祖玛铁壁",hp:1430,atk:62,def:55,spd:5,exp:600,gMin:230,gMax:440,behavior:'tank'}],
        boss:{id:"zumaCap",name:"祖玛队长",hp:2600,atk:88,def:52,spd:12,exp:1100,gMin:460,gMax:780} },
      { pool:[
          {id:"zumaPriest",name:"祖玛祭司",hp:1144,atk:86,def:39,spd:12,exp:640,gMin:250,gMax:480,behavior:'healer'},
          {id:"zumaWar",name:"祖玛战将",hp:1300,atk:91,def:44,spd:11,exp:700,gMin:270,gMax:520,behavior:'rage'},
          {id:"zumaSummon",name:"祖玛召唤者",hp:1040,atk:83,def:34,spd:13,exp:680,gMin:260,gMax:500,behavior:'summon'},
          {id:"zumaShield",name:"祖玛盾卫",hp:1820,atk:78,def:65,spd:6,exp:780,gMin:300,gMax:560,behavior:'tank'}],
        boss:{id:"zumaPriestBoss",name:"祖玛祭司长",hp:2990,atk:96,def:55,spd:13,exp:1300,gMin:520,gMax:880} },
      { pool:[
          {id:"zumaLord",name:"祖玛领主",hp:1495,atk:101,def:49,spd:12,exp:820,gMin:320,gMax:600,behavior:'rage'},
          {id:"zumaAssassin",name:"祖玛刺客",hp:1170,atk:114,def:34,spd:16,exp:800,gMin:310,gMax:580,behavior:'ranged'},
          {id:"zumaHeal",name:"祖玛医者",hp:1300,atk:91,def:42,spd:12,exp:760,gMin:300,gMax:560,behavior:'healer'},
          {id:"zumaSummon2",name:"祖玛唤灵者",hp:1235,atk:99,def:39,spd:13,exp:790,gMin:305,gMax:570,behavior:'summon'}],
        boss:{id:"zumaDemon",name:"祖玛教主",hp:3640,atk:112,def:62,spd:14,exp:1600,gMin:620,gMax:1050,unlockDragon:true} }
  ]},
  { id:"redMoon", name:"赤月巢穴", unlock:true, dropTier:{ normal:4, elite:[4,5], boss:5 }, floors:[
      { pool:[
          {id:"spider1",name:"月魔蜘蛛",hp:1235,atk:91,def:44,spd:12,exp:720,gMin:300,gMax:520,behavior:'rage'},
          {id:"spiderRanged",name:"毒蜘蛛",hp:1014,atk:99,def:34,spd:15,exp:700,gMin:290,gMax:500,behavior:'ranged'},
          {id:"spiderTank",name:"钢甲蜘蛛",hp:1820,atk:81,def:73,spd:5,exp:820,gMin:340,gMax:580,behavior:'tank'}],
        boss:{id:"spiderBoss1",name:"血魔",hp:3380,atk:114,def:60,spd:13,exp:1400,gMin:600,gMax:980} },
      { pool:[
          {id:"spider2",name:"钢牙蜘蛛",hp:1430,atk:101,def:49,spd:13,exp:820,gMin:340,gMax:580,behavior:'rage'},
          {id:"spiderHeal",name:"巢穴蛛母",hp:1300,atk:96,def:44,spd:11,exp:800,gMin:330,gMax:560,behavior:'healer'},
          {id:"spiderSummon",name:"蜘蛛祭司",hp:1196,atk:104,def:39,spd:13,exp:830,gMin:345,gMax:590,behavior:'summon'},
          {id:"spiderBrute",name:"巨蛛",hp:2080,atk:109,def:65,spd:7,exp:950,gMin:380,gMax:640,behavior:'tank'}],
        boss:{id:"spiderBoss2",name:"金刚",hp:3770,atk:122,def:68,spd:14,exp:1600,gMin:680,gMax:1100} },
      { pool:[
          {id:"spider3",name:"恶魔蜘蛛",hp:1625,atk:112,def:55,spd:14,exp:920,gMin:380,gMax:640,behavior:'rage'},
          {id:"spiderLord",name:"赤月蛛王",hp:1820,atk:122,def:60,spd:13,exp:1000,gMin:400,gMax:680,behavior:'rage'},
          {id:"spiderNecro",name:"赤月死灵",hp:1430,atk:117,def:49,spd:14,exp:960,gMin:390,gMax:660,behavior:'healer'},
          {id:"spiderCaller",name:"赤月召唤者",hp:1365,atk:114,def:47,spd:15,exp:980,gMin:395,gMax:670,behavior:'summon'}],
        boss:{id:"redMoonBoss",name:"赤月恶魔",hp:4680,atk:135,def:75,spd:15,exp:2000,gMin:800,gMax:1300,unlockDragon:true} }
  ]},
  { id:"dragonCity", name:"魔龙城", unlock:false, dropTier:{ normal:5, elite:[5], boss:5 }, floors:[
      { pool:[
          {id:"dragonSoldier",name:"魔龙刀兵",hp:1430,atk:68,def:29,spd:12,exp:1300,gMin:800,gMax:1300,behavior:'normal'},
          {id:"dragonArcher",name:"魔龙弓手",hp:1235,atk:73,def:26,spd:16,exp:1250,gMin:780,gMax:1250,behavior:'ranged'},
          {id:"dragonTank",name:"魔龙铁卫",hp:2340,atk:62,def:78,spd:6,exp:1450,gMin:900,gMax:1450,behavior:'tank'}],
        boss:{id:"dragonMinBoss",name:"魔龙守卫",hp:3640,atk:91,def:44,spd:14,exp:2700,gMin:1400,gMax:2200} },
      { pool:[
          {id:"dragonKnight",name:"魔龙骑士",hp:1690,atk:78,def:34,spd:14,exp:1450,gMin:900,gMax:1450,behavior:'rage'},
          {id:"dragonMage",name:"魔龙法师",hp:1300,atk:91,def:26,spd:14,exp:1400,gMin:880,gMax:1400,behavior:'healer'},
          {id:"dragonSummon",name:"魔龙召唤者",hp:1365,atk:83,def:31,spd:15,exp:1420,gMin:890,gMax:1420,behavior:'summon'},
          {id:"dragonVice2",name:"魔龙副将",hp:2600,atk:86,def:57,spd:13,exp:1600,gMin:1000,gMax:1600,behavior:'tank'}],
        boss:{id:"dragonVice",name:"魔龙副将·真",hp:4160,atk:99,def:49,spd:15,exp:3000,gMin:1500,gMax:2400} },
      { pool:[
          {id:"dragonLord",name:"魔龙领主",hp:1950,atk:96,def:42,spd:15,exp:1700,gMin:1050,gMax:1700,behavior:'rage'},
          {id:"dragonAssn",name:"魔龙刺客",hp:1430,atk:114,def:31,spd:18,exp:1650,gMin:1020,gMax:1650,behavior:'ranged'},
          {id:"dragonPriest",name:"魔龙祭师",hp:1625,atk:91,def:39,spd:14,exp:1620,gMin:1010,gMax:1620,behavior:'healer'},
          {id:"dragonCaller",name:"魔龙唤魔者",hp:1495,atk:104,def:36,spd:15,exp:1680,gMin:1030,gMax:1680,behavior:'summon'}],
        boss:{id:"dragonMaster",name:"魔龙教主",hp:3640,atk:104,def:44,spd:15,exp:3500,gMin:1800,gMax:3000,dropEquip:["魔龙斩","魔龙项链"]} }
  ]}
];
const AREA_MAP = Object.fromEntries(AREAS.map(a=>[a.id,a]));

/* 全局常量 */
const RESPAWN_MON = 60*1000;
const RESPAWN_BOSS = 180*1000;
const QUEST_POOL_CD = 120*1000;
const POTION_PRICE = 50;
const POTION_MP_PRICE = 40;
const AUTO_POTION_THRESHOLD = 0.30;
const RAGE_MAX = 10;
const ELITE_CHANCE = 0.15;
const PAGE_SIZE = { shop:5, bag:6, quest:4, gems:20 };
const PET_WAREHOUSE_MAX = 10;
const PET_DOWN_MS = 30*1000;

/* 每回合固定回蓝 */
const MP_REGEN_PER_TURN = 2;
/* 击杀回蓝 */
const MP_REGEN_PER_KILL = 5;