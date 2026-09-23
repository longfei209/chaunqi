/* ============================================================
 *  equip.js  —— 装备操作（穿/卸/卖/分解/一键最强/洗练）
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
    const price = Math.floor(EQUIP_BASE[e.name].sell * (1 + QUALITY[e.quality].rate*2) * (e.affix?1.3:1));
    Game.player.gold += price;
    Game.bag.splice(idx, 1);
    toast("出售 +" + price + " 金币");
    Quest.onBagChange();
    Save.auto();
    Nav._show('bag'); Render.top();
  },
  decompose(idx){
    const e = Game.bag[idx]; if(!e) return;
    Game.mat += DECOMP_MAT[e.quality];
    Game.bag.splice(idx, 1);
    toast("分解 +" + DECOMP_MAT[e.quality] + " 材料");
    Quest.onBagChange();
    Save.auto();
    Nav._show('bag'); Render.top();
  },
  autoBest(){
    const pool = Game.bag.slice();
    SLOT_ORDER.forEach(s=>{ if(Game.worn[s]) pool.push(Game.worn[s]); });
    SLOT_ORDER.forEach(s=>{
      const cands = pool.filter(e=>e.slot===s);
      if(cands.length === 0){ Game.worn[s] = null; return; }
      cands.sort((a,b)=>{
        const ta = equipStat(a), tb = equipStat(b);
        const sa = ta.atk*1.5 + ta.def*1.2 + ta.spd*2 + ta.hp*0.3;
        const sb = tb.atk*1.5 + tb.def*1.2 + tb.spd*2 + tb.hp*0.3;
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
  refine(idx){
    const e = Game.bag[idx]; if(!e) return;
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
    Nav._show('refine', {idx}); Render.top();
  }
};