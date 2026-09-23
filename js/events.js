/* ============================================================
 *  events.js  —— 随机事件（进层 15% 概率触发）
 * ============================================================ */

const Events = {
  maybeTrigger(){
    if(Math.random() > 0.15) return;
    const t = pick(['chest','trader','trap']);
    const p = Game.player;
    if(t === 'chest'){
      confirmBox("🎁 发现宝箱！是否打开？", ()=>{
        const name = pick(SHOP_LIST);
        const eq = makeEquip(name, rollQuality(0.1));
        if(Game.bag.length < p.bagMax){
          Game.bag.push(eq); Quest.onBagChange();
          toast(`宝箱获得 ${eq.name} [${QUALITY[eq.quality].name}]`);
        }else toast("背包已满");
        Save.auto();
      });
    }else if(t === 'trader'){
      confirmBox("🧙 流浪商人：100金换2洗练材料？", ()=>{
        if(p.gold < 100) return toast("金币不足");
        p.gold -= 100; Game.mat += 2;
        toast("交易成功"); Render.top(); Save.auto();
      });
    }else if(t === 'trap'){
      const dmg = Math.floor(playerMaxHp() * 0.15);
      p.hp = Math.max(1, p.hp - dmg);
      toast(`⚠️ 陷阱 -${dmg}HP`);
      Render.top(); Save.auto();
    }
  }
};