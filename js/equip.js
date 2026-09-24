/* ============================================================
 *  equip.js  —— 装备操作
 *  对比只看基础+词条；出售/分解提醒
 * ============================================================ */

const Equip = {
  wear(idx){
    const e = Game.bag[idx]; if(!e) return;
    const old = Game.worn[e.slot];
    Game.worn[e.slot] = e;
    Game.bag.splice(idx, 1);
    if(old) Game.bag.push(old);
    Quest.onWear(e.name);
    Save.auto();
    Nav._show('bag'); Render.top();
  },
  unwear(slot){
    const e = Game.worn[slot]; if(!e) return;
    if(Game.bag.length >= Game.player.bagMax) return toast("背包已满");
    Game.bag.push(e); Game.worn[slot] = null;
    Save.auto();
    Nav._show('worn'); Render.top();
  },

  sell(idx){
  const e = Game.bag[idx]; if(!e) return;
  const hasGem = e.sockets && e.sockets.some(x=>x);
  const refined = e.refineTimes > 0;

  const doSell = ()=>{
    const price = Math.floor((EQUIP_BASE[e.name]?.sell || 10) * (1 + QUALITY[e.quality].rate*2) * (e.affix?1.3:1));
    Game.player.gold += price;
    Game.bag.splice(idx, 1);
    toast("出售 +" + price + " 金币");
    Quest.onBagChange();
    Save.auto();
    Nav._show('bag'); Render.top();
  };

  if(hasGem || refined){
    const parts = [];
    if(hasGem) parts.push('装备上有宝石');
    if(refined) parts.push(`装备已洗练 ${e.refineTimes} 次`);
    confirmBox(parts.join('，') + '，出售会一起丢失，确定吗？', doSell);
  }else{
    doSell();
  }
},

  decompose(idx){
  const e = Game.bag[idx]; if(!e) return;
  const hasGem = e.sockets && e.sockets.some(x=>x);
  const refined = e.refineTimes > 0;

  const doDecompose = ()=>{
    Game.mat += DECOMP_MAT[e.quality];
    Game.bag.splice(idx, 1);
    toast("分解 +" + DECOMP_MAT[e.quality] + " 材料");
    Quest.onBagChange();
    Save.auto();
    Nav._show('bag'); Render.top();
  };

  if(hasGem || refined){
    const parts = [];
    if(hasGem) parts.push('装备上有宝石');
    if(refined) parts.push(`装备已洗练 ${e.refineTimes} 次`);
    confirmBox(parts.join('，') + '，分解会一起丢失，确定吗？', doDecompose);
  }else{
    doDecompose();
  }
},

  autoBest(){
    const pool = Game.bag.slice();
    SLOT_ORDER.forEach(s=>{ if(Game.worn[s]) pool.push(Game.worn[s]); });
    SLOT_ORDER.forEach(s=>{
      const cands = pool.filter(e=>e.slot===s);
      if(cands.length === 0){ Game.worn[s] = null; return; }
      cands.sort((a,b)=>{
        const ta = equipFullRange(a), tb = equipFullRange(b);
        const sa = ta.atkMax*1.5 + ta.defMax*1.2 + ta.spd*2 + ta.hp*0.3
                 + ta.combo*8 + ta.counter*8 + ta.lsPct*8 + ta.lsFlat*2;
        const sb = tb.atkMax*1.5 + tb.defMax*1.2 + tb.spd*2 + tb.hp*0.3
                 + tb.combo*8 + tb.counter*8 + tb.lsPct*8 + tb.lsFlat*2;
        return sb - sa;
      });
      Game.worn[s] = cands[0];
    });
    const used = new Set(SLOT_ORDER.map(s=>Game.worn[s]).filter(Boolean).map(e=>e.uid));
    Game.bag = pool.filter(e=>!used.has(e.uid));
    while(Game.bag.length > Game.player.bagMax) Game.bag.pop();
    Save.auto();
    Nav._show('worn'); Render.top();
    toast("已装备最强");
  },

  refineRisk(e){
    let risk = 0.12 + (e.refineAtk + e.refineDef + e.refineHp) * 0.004;
    return clamp(risk, 0, 0.9);
  },
  refine(eqOrIdx){
    let e;
    if(typeof eqOrIdx === 'number') e = Game.bag[eqOrIdx];
    else e = eqOrIdx;
    if(!e) return;
    if(e.refineTimes >= 3) return toast("已达洗练上限");
    if(Game.mat < 1) return toast("缺少洗练材料");
    const risk = this.refineRisk(e);
    Game.mat -= 1;
    if(Math.random() < risk){
      e.refineAtk = 0; e.refineDef = 0; e.refineHp = 0;
      toast("💥 洗练破损");
    }else{
      e.refineAtk += rnd(1,6);
      e.refineDef += rnd(1,4);
      if(Math.random() < 0.35) e.refineHp += rnd(2,12);
      e.refineTimes++;
      toast("洗练成功");
    }
    Save.auto();
    Render.top();
    Nav._show('refine', Nav._lastOpts);
  },

  /* 对比：只看基础+词条，不含洗练/宝石 */
  compareToWorn(eq){
    const old = Game.worn[eq.slot];
    const nB = equipCompareStat(eq);
    const oB = old ? equipCompareStat(old) : { atk:0,def:0,spd:0,hp:0,combo:0,counter:0,lsPct:0,lsFlat:0,crit:0,critd:0 };
    return {
      atk:     { n: nB.atk,     o: oB.atk },
      def:     { n: nB.def,     o: oB.def },
      spd:     { n: nB.spd,     o: oB.spd },
      hp:      { n: nB.hp,      o: oB.hp },
      combo:   { n: nB.combo,   o: oB.combo },
      counter: { n: nB.counter, o: oB.counter },
      lsPct:   { n: nB.lsPct,   o: oB.lsPct },
      lsFlat:  { n: nB.lsFlat,  o: oB.lsFlat },
      crit:    { n: nB.crit,    o: oB.crit },
      critd:   { n: nB.critd||0,o: oB.critd||0 }
    };
  },

  socketGem(eq, socketIdx, gemId){
    if(!eq || !eq.sockets) return;
    if(socketIdx < 0 || socketIdx >= 3) return;
    if(eq.sockets[socketIdx]) return toast("该孔已有宝石");
    const gIdx = Game.gems.findIndex(g=>g.uid === gemId);
    if(gIdx < 0) return;
    const gem = Game.gems[gIdx];
    eq.sockets[socketIdx] = { uid: gem.uid, key: gem.key, quality: gem.quality };
    Game.gems.splice(gIdx, 1);
    toast("镶嵌成功");
    Save.auto();
    Render.top();
  },
  unsocketGem(eq, socketIdx){
    if(!eq || !eq.sockets) return;
    const g = eq.sockets[socketIdx];
    if(!g) return;
    const cost = GEM_REMOVE_COST[g.quality] || 200;
    if(Game.player.gold < cost){
      return toast(`金币不足（需 ${cost}）`);
    }
    Game.player.gold -= cost;
    eq.sockets[socketIdx] = null;
    Game.gems.push({ uid: gemUid(), key: g.key, quality: g.quality });
    toast(`取下成功 -${cost} 金`);
    Save.auto();
    Render.top();
  },
  findEquipByRef(ref){
    if(!ref) return null;
    if(ref.type === 'worn') return Game.worn[ref.slot];
    if(ref.type === 'bag')  return Game.bag[ref.idx];
    return null;
  }
};