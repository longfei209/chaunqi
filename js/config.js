/* ============================================================
 *  config.js  —— 所有可调数值都在这里
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

/* 装备基础表（baseAtk 为普通品质基准值） */
const EQUIP_BASE = {
  "木剑":     {slot:"weapon", atk:8,  def:0,  spd:0, hp:0, buy:200,  sell:80},
  "铁剑":     {slot:"weapon", atk:16, def:2,  spd:0, hp:0, buy:600,  sell:240},
  "屠龙":     {slot:"weapon", atk:38, def:8,  spd:0, hp:0, buy:4500, sell:1800},
  "魔龙斩":   {slot:"weapon", atk:48, def:12, spd:2, hp:0, buy:6000, sell:3000},
  "布帽":     {slot:"helmet", atk:0,  def:4,  spd:1, hp:0, buy:120,  sell:48},
  "战神头盔": {slot:"helmet", atk:6,  def:14, spd:1, hp:20, buy:2200, sell:880},
  "布衣":     {slot:"cloth",  atk:0,  def:6,  spd:0, hp:10, buy:180,  sell:72},
  "战神铠甲": {slot:"cloth",  atk:8,  def:22, spd:0, hp:50, buy:3200, sell:1280},
  "布鞋":     {slot:"shoe",   atk:0,  def:3,  spd:2, hp:0, buy:100,  sell:40},
  "战神战靴": {slot:"shoe",   atk:4,  def:12, spd:4, hp:10, buy:1800, sell:720},
  "兽皮腰带": {slot:"belt",   atk:0,  def:4,  spd:1, hp:0, buy:110,  sell:44},
  "战神腰带": {slot:"belt",   atk:5,  def:13, spd:3, hp:20, buy:2000, sell:800},
  "青铜戒指": {slot:"ring",   atk:4,  def:2,  spd:2, hp:0, buy:140,  sell:56},
  "力量戒指": {slot:"ring",   atk:14, def:8,  spd:3, hp:0, buy:2600, sell:1040},
  "木项链":   {slot:"neck",   atk:3,  def:2,  spd:1, hp:0, buy:130,  sell:52},
  "魔龙项链": {slot:"neck",   atk:18, def:14, spd:4, hp:30, buy:4800, sell:2400}
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

/* 主角技能 */
const SKILLS = {
  liehuo:   {name:'烈火剑法', cd:3, unlock:1, mp:5,  desc:'单体 ×1.8'},
  banyue:   {name:'半月弯刀', cd:3, unlock:3, mp:10, desc:'全体 ×0.9'},
  zhiyu:    {name:'治愈术',   cd:4, unlock:5, mp:8,  desc:'回复 25% HP'},
  zhanshen: {name:'战神祝福', cd:5, unlock:8, mp:12, desc:'3回合攻防+30%'}
};

/* 宠物模板 */
const PET_TEMPLATES = {
  wolf:  {name:'影狼',  avatar:'🐺', base:{atk:8,def:2,hp:40,spd:10}},
  bear:  {name:'山熊',  avatar:'🐻', base:{atk:4,def:8,hp:90,spd:5}},
  eagle: {name:'迅鹰',  avatar:'🦅', base:{atk:6,def:3,hp:35,spd:16}}
};

/* 宠物技能池 */
const PET_SKILLS = {
  crit:  {name:'锐爪', desc:'暴击+15%',           apply:st=>{st.crit += 0.15;}},
  ls:    {name:'嗜血', desc:'吸血20%',            apply:st=>{st.ls += 0.20;}},
  group: {name:'撕咬', desc:'群攻30%',            apply:st=>{st.group=true;}},
  heal:  {name:'守护', desc:'每回合回主人8%HP',   apply:st=>{st.heal=0.08;}},
  swift: {name:'迅捷', desc:'宠速+20% 主速+10%',  apply:st=>{st.spdBonus=0.20; st.pSpdBonus=0.10;}},
  iron:  {name:'铁壁', desc:'宠防+50% 主防+10%',  apply:st=>{st.defBonus=0.50; st.pDefBonus=0.10;}},
  pois:  {name:'剧毒', desc:'攻击附带剧毒',       apply:st=>{st.pois=true;}},
  refle: {name:'反伤', desc:'主人受击反20%',      apply:st=>{st.reflect=0.20;}}
};

/* 品质 → 宠物技能数量 */
const PET_SKILL_COUNT = { normal:0, good:1, fine:2, epic:3 };

/* 精英词缀 */
const ELITE_AFFIXES = [
  {k:'rage',  name:'狂暴', apply:m=>{m.atk = Math.floor(m.atk*1.5);}},
  {k:'iron',  name:'铁壁', apply:m=>{m.def = Math.floor(m.def*1.8);}},
  {k:'swift', name:'迅捷', apply:m=>{m.spd = Math.floor(m.spd*1.5);}},
  {k:'vamp',  name:'吸血', apply:m=>{m.vamp = 0.3;}},
  {k:'pois',  name:'剧毒', apply:m=>{m.pois = Math.floor(m.atk*0.3);}}
];

/* 怪物行为类型 */
const MON_BEHAVIOR = {
  normal:{name:'普通'}, ranged:{name:'远程'}, tank:{name:'坦克'},
  healer:{name:'治疗'}, rage:{name:'狂暴'}, summon:{name:'召唤'}
};

/* 区域配置 */
const AREAS = [
  { id:"grass", name:"新手草原", unlock:true, floors:[
      { pool:[
          {id:"wolf",name:"野狼",hp:100,atk:12,def:4,spd:9,exp:55,gMin:15,gMax:50,behavior:'normal'},
          {id:"rabbit",name:"野兔",hp:70,atk:9,def:2,spd:14,exp:40,gMin:10,gMax:35,behavior:'ranged'},
          {id:"boar",name:"野猪",hp:140,atk:14,def:7,spd:6,exp:70,gMin:20,gMax:60,behavior:'tank'}],
        boss:{id:"wolfKing",name:"狼王",hp:400,atk:20,def:8,spd:11,exp:200,gMin:80,gMax:160} },
      { pool:[
          {id:"hyena",name:"鬣狗",hp:170,atk:20,def:8,spd:10,exp:100,gMin:30,gMax:80,behavior:'normal'},
          {id:"vulture",name:"秃鹫",hp:130,atk:22,def:5,spd:15,exp:95,gMin:25,gMax:70,behavior:'ranged'},
          {id:"rhino",name:"犀牛",hp:260,atk:18,def:14,spd:5,exp:130,gMin:40,gMax:95,behavior:'tank'},
          {id:"shaman",name:"萨满",hp:150,atk:16,def:6,spd:9,exp:110,gMin:35,gMax:85,behavior:'healer'}],
        boss:{id:"grassBoss",name:"草原霸主",hp:700,atk:30,def:14,spd:10,exp:380,gMin:150,gMax:300} },
      { pool:[
          {id:"lion",name:"狂狮",hp:320,atk:30,def:12,spd:12,exp:180,gMin:55,gMax:130,behavior:'rage'},
          {id:"elephant",name:"战象",hp:520,atk:26,def:20,spd:4,exp:220,gMin:70,gMax:150,behavior:'tank'},
          {id:"hunter",name:"猎手",hp:230,atk:34,def:8,spd:14,exp:170,gMin:50,gMax:120,behavior:'ranged'},
          {id:"priest",name:"祭司",hp:260,atk:20,def:10,spd:8,exp:190,gMin:60,gMax:140,behavior:'healer'}],
        boss:{id:"beastKing",name:"兽王",hp:1000,atk:42,def:20,spd:13,exp:600,gMin:250,gMax:450} }
  ]},
  { id:"orc", name:"兽人古墓", unlock:true, floors:[
      { pool:[
          {id:"orcSlave",name:"兽人奴隶",hp:320,atk:28,def:12,spd:8,exp:180,gMin:60,gMax:140,behavior:'normal'},
          {id:"orcArcher",name:"兽人弓手",hp:260,atk:30,def:8,spd:13,exp:170,gMin:55,gMax:130,behavior:'ranged'},
          {id:"orcBrute",name:"兽人壮汉",hp:480,atk:26,def:18,spd:5,exp:220,gMin:70,gMax:160,behavior:'tank'}],
        boss:{id:"orcGuard",name:"兽人守卫长",hp:900,atk:40,def:18,spd:10,exp:450,gMin:200,gMax:350} },
      { pool:[
          {id:"orcWar",name:"兽人战士",hp:420,atk:36,def:15,spd:10,exp:240,gMin:80,gMax:180,behavior:'rage'},
          {id:"orcSham",name:"兽人术士",hp:340,atk:42,def:10,spd:9,exp:260,gMin:90,gMax:200,behavior:'healer'},
          {id:"orcSpear",name:"兽人枪兵",hp:380,atk:38,def:14,spd:12,exp:250,gMin:85,gMax:190,behavior:'normal'},
          {id:"orcNecro",name:"兽人巫师",hp:300,atk:38,def:8,spd:11,exp:270,gMin:95,gMax:210,behavior:'summon'}],
        boss:{id:"orcCaptain",name:"兽人队长",hp:1100,atk:46,def:22,spd:11,exp:550,gMin:240,gMax:420} },
      { pool:[
          {id:"orcKingGr",name:"兽人近卫",hp:520,atk:44,def:20,spd:10,exp:320,gMin:110,gMax:230,behavior:'normal'},
          {id:"orcChamp",name:"兽人冠军",hp:680,atk:50,def:24,spd:9,exp:400,gMin:140,gMax:280,behavior:'rage'},
          {id:"orcPriest",name:"兽人祭司",hp:480,atk:48,def:16,spd:11,exp:360,gMin:130,gMax:260,behavior:'healer'},
          {id:"orcSummoner",name:"兽人召唤师",hp:420,atk:46,def:12,spd:12,exp:380,gMin:135,gMax:270,behavior:'summon'}],
        boss:{id:"orcKing",name:"兽人之王",hp:1600,atk:56,def:28,spd:12,exp:800,gMin:320,gMax:550} }
  ]},
  { id:"pig", name:"猪洞", unlock:true, floors:[
      { pool:[
          {id:"pigSoldier",name:"黑猪",hp:550,atk:40,def:18,spd:9,exp:320,gMin:110,gMax:240,behavior:'normal'},
          {id:"pigArcher",name:"猪弓手",hp:420,atk:44,def:12,spd:13,exp:300,gMin:100,gMax:220,behavior:'ranged'},
          {id:"pigTank",name:"铁猪",hp:800,atk:36,def:28,spd:5,exp:380,gMin:130,gMax:270,behavior:'tank'}],
        boss:{id:"pigBoss1",name:"红猪统领",hp:1500,atk:52,def:30,spd:11,exp:800,gMin:340,gMax:600} },
      { pool:[
          {id:"pigAx",name:"白猪",hp:680,atk:48,def:22,spd:10,exp:400,gMin:140,gMax:290,behavior:'rage'},
          {id:"pigMag",name:"猪法师",hp:520,atk:56,def:16,spd:12,exp:420,gMin:150,gMax:300,behavior:'healer'},
          {id:"pigSummon",name:"猪召唤者",hp:600,atk:50,def:20,spd:11,exp:440,gMin:160,gMax:320,behavior:'summon'},
          {id:"pigBrute",name:"巨猪",hp:900,atk:52,def:30,spd:6,exp:500,gMin:180,gMax:360,behavior:'tank'}],
        boss:{id:"pigBoss2",name:"白猪王",hp:1800,atk:60,def:34,spd:12,exp:950,gMin:400,gMax:700} },
      { pool:[
          {id:"pigDemon",name:"魔猪",hp:750,atk:62,def:24,spd:12,exp:520,gMin:190,gMax:380,behavior:'rage'},
          {id:"pigLord",name:"猪魔卫",hp:900,atk:58,def:32,spd:9,exp:580,gMin:210,gMax:420,behavior:'normal'},
          {id:"pigHealer",name:"猪魔祭",hp:620,atk:60,def:18,spd:13,exp:560,gMin:200,gMax:400,behavior:'healer'},
          {id:"pigSummon2",name:"猪魔召",hp:680,atk:60,def:22,spd:12,exp:600,gMin:215,gMax:430,behavior:'summon'}],
        boss:{id:"zhuDemon",name:"猪魔教主",hp:2200,atk:68,def:38,spd:13,exp:1200,gMin:480,gMax:820} }
  ]},
  { id:"zuma", name:"祖玛神殿", unlock:true, floors:[
      { pool:[
          {id:"zumaGuard",name:"祖玛卫士",hp:780,atk:54,def:28,spd:10,exp:520,gMin:200,gMax:380,behavior:'normal'},
          {id:"zumaArcher",name:"祖玛弓手",hp:620,atk:60,def:20,spd:14,exp:500,gMin:190,gMax:360,behavior:'ranged'},
          {id:"zumaTank",name:"祖玛铁壁",hp:1100,atk:48,def:42,spd:5,exp:600,gMin:230,gMax:440,behavior:'tank'}],
        boss:{id:"zumaCap",name:"祖玛队长",hp:2000,atk:68,def:40,spd:12,exp:1100,gMin:460,gMax:780} },
      { pool:[
          {id:"zumaPriest",name:"祖玛祭司",hp:880,atk:66,def:30,spd:12,exp:640,gMin:250,gMax:480,behavior:'healer'},
          {id:"zumaWar",name:"祖玛战将",hp:1000,atk:70,def:34,spd:11,exp:700,gMin:270,gMax:520,behavior:'rage'},
          {id:"zumaSummon",name:"祖玛召唤者",hp:800,atk:64,def:26,spd:13,exp:680,gMin:260,gMax:500,behavior:'summon'},
          {id:"zumaShield",name:"祖玛盾卫",hp:1400,atk:60,def:50,spd:6,exp:780,gMin:300,gMax:560,behavior:'tank'}],
        boss:{id:"zumaPriestBoss",name:"祖玛祭司长",hp:2300,atk:74,def:42,spd:13,exp:1300,gMin:520,gMax:880} },
      { pool:[
          {id:"zumaLord",name:"祖玛领主",hp:1150,atk:78,def:38,spd:12,exp:820,gMin:320,gMax:600,behavior:'rage'},
          {id:"zumaAssassin",name:"祖玛刺客",hp:900,atk:88,def:26,spd:16,exp:800,gMin:310,gMax:580,behavior:'ranged'},
          {id:"zumaHeal",name:"祖玛医者",hp:1000,atk:70,def:32,spd:12,exp:760,gMin:300,gMax:560,behavior:'healer'},
          {id:"zumaSummon2",name:"祖玛唤灵者",hp:950,atk:76,def:30,spd:13,exp:790,gMin:305,gMax:570,behavior:'summon'}],
        boss:{id:"zumaDemon",name:"祖玛教主",hp:2800,atk:86,def:48,spd:14,exp:1600,gMin:620,gMax:1050,unlockDragon:true} }
  ]},
  { id:"redMoon", name:"赤月巢穴", unlock:true, floors:[
      { pool:[
          {id:"spider1",name:"月魔蜘蛛",hp:950,atk:70,def:34,spd:12,exp:720,gMin:300,gMax:520,behavior:'rage'},
          {id:"spiderRanged",name:"毒蜘蛛",hp:780,atk:76,def:26,spd:15,exp:700,gMin:290,gMax:500,behavior:'ranged'},
          {id:"spiderTank",name:"钢甲蜘蛛",hp:1400,atk:62,def:56,spd:5,exp:820,gMin:340,gMax:580,behavior:'tank'}],
        boss:{id:"spiderBoss1",name:"血魔",hp:2600,atk:88,def:46,spd:13,exp:1400,gMin:600,gMax:980} },
      { pool:[
          {id:"spider2",name:"钢牙蜘蛛",hp:1100,atk:78,def:38,spd:13,exp:820,gMin:340,gMax:580,behavior:'rage'},
          {id:"spiderHeal",name:"巢穴蛛母",hp:1000,atk:74,def:34,spd:11,exp:800,gMin:330,gMax:560,behavior:'healer'},
          {id:"spiderSummon",name:"蜘蛛祭司",hp:920,atk:80,def:30,spd:13,exp:830,gMin:345,gMax:590,behavior:'summon'},
          {id:"spiderBrute",name:"巨蛛",hp:1600,atk:84,def:50,spd:7,exp:950,gMin:380,gMax:640,behavior:'tank'}],
        boss:{id:"spiderBoss2",name:"金刚",hp:2900,atk:94,def:52,spd:14,exp:1600,gMin:680,gMax:1100} },
      { pool:[
          {id:"spider3",name:"恶魔蜘蛛",hp:1250,atk:86,def:42,spd:14,exp:920,gMin:380,gMax:640,behavior:'rage'},
          {id:"spiderLord",name:"赤月蛛王",hp:1400,atk:94,def:46,spd:13,exp:1000,gMin:400,gMax:680,behavior:'rage'},
          {id:"spiderNecro",name:"赤月死灵",hp:1100,atk:90,def:38,spd:14,exp:960,gMin:390,gMax:660,behavior:'healer'},
          {id:"spiderCaller",name:"赤月召唤者",hp:1050,atk:88,def:36,spd:15,exp:980,gMin:395,gMax:670,behavior:'summon'}],
        boss:{id:"redMoonBoss",name:"赤月恶魔",hp:3600,atk:104,def:58,spd:15,exp:2000,gMin:800,gMax:1300,unlockDragon:true} }
  ]},
  { id:"dragonCity", name:"魔龙城", unlock:false, floors:[
      { pool:[
          {id:"dragonSoldier",name:"魔龙刀兵",hp:1100,atk:52,def:22,spd:12,exp:1300,gMin:800,gMax:1300,behavior:'normal'},
          {id:"dragonArcher",name:"魔龙弓手",hp:950,atk:56,def:20,spd:16,exp:1250,gMin:780,gMax:1250,behavior:'ranged'},
          {id:"dragonTank",name:"魔龙铁卫",hp:1800,atk:48,def:60,spd:6,exp:1450,gMin:900,gMax:1450,behavior:'tank'}],
        boss:{id:"dragonMinBoss",name:"魔龙守卫",hp:2800,atk:70,def:34,spd:14,exp:2700,gMin:1400,gMax:2200} },
      { pool:[
          {id:"dragonKnight",name:"魔龙骑士",hp:1300,atk:60,def:26,spd:14,exp:1450,gMin:900,gMax:1450,behavior:'rage'},
          {id:"dragonMage",name:"魔龙法师",hp:1000,atk:70,def:20,spd:14,exp:1400,gMin:880,gMax:1400,behavior:'healer'},
          {id:"dragonSummon",name:"魔龙召唤者",hp:1050,atk:64,def:24,spd:15,exp:1420,gMin:890,gMax:1420,behavior:'summon'},
          {id:"dragonVice2",name:"魔龙副将",hp:2000,atk:66,def:44,spd:13,exp:1600,gMin:1000,gMax:1600,behavior:'tank'}],
        boss:{id:"dragonVice",name:"魔龙副将·真",hp:3200,atk:76,def:38,spd:15,exp:3000,gMin:1500,gMax:2400} },
      { pool:[
          {id:"dragonLord",name:"魔龙领主",hp:1500,atk:74,def:32,spd:15,exp:1700,gMin:1050,gMax:1700,behavior:'rage'},
          {id:"dragonAssn",name:"魔龙刺客",hp:1100,atk:88,def:24,spd:18,exp:1650,gMin:1020,gMax:1650,behavior:'ranged'},
          {id:"dragonPriest",name:"魔龙祭师",hp:1250,atk:70,def:30,spd:14,exp:1620,gMin:1010,gMax:1620,behavior:'healer'},
          {id:"dragonCaller",name:"魔龙唤魔者",hp:1150,atk:80,def:28,spd:15,exp:1680,gMin:1030,gMax:1680,behavior:'summon'}],
        boss:{id:"dragonMaster",name:"魔龙教主",hp:2800,atk:80,def:34,spd:15,exp:3500,gMin:1800,gMax:3000,dropEquip:["魔龙斩","魔龙项链"]} }
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
const GROUPS_PER_FLOOR = 4;
const ELITE_CHANCE = 0.15;
const PAGE_SIZE = { shop:5, bag:6, quest:4 };
const PET_WAREHOUSE_MAX = 10;