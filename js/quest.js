/* ============================================================
 *  quest.js  —— 任务系统
 * ============================================================ */

const Quest = {
  refreshPool(force){
    const now = Date.now();
    if(!force && now - Game.quest.refreshTs < QUEST_POOL_CD) return;
    Game.quest.refreshTs = now;
    Game.quest.avail = [];
    for(let i=0;i<5;i++) Game.quest.avail.push(this.gen());
  },
  cdLeft(){ return Math.max(0, Math.ceil((Game.quest.refreshTs + QUEST_POOL_CD - Date.now())/1000)); },
  gen(){
    const types = ['killMonster','collectItem','reachFloor','payGold','wearEquip'];
    const t = types[rnd(0, types.length-1)];
    const ar = AREAS[rnd(0, AREAS.length-1)];
    const fi = rnd(0, 2);
    const mon = pick(ar.floors[fi].pool);
    const eqName = pick(Object.keys(EQUIP_BASE));
    const q = {
      qid: uid(), type: t,
      targetId: mon.id, targetName: mon.name,
      areaId: ar.id, floorIdx: fi,
      equipName: eqName,
      needCount: rnd(2,5),
      progress: 0, finished: false,
      goldReward: rnd(200,600), expReward: rnd(300,900)
    };
    if(t === 'reachFloor' || t === 'wearEquip') q.needCount = 1;
    return q;
  },
  desc(q){
    switch(q.type){
      case 'killMonster': return `击杀 ${q.needCount} 只「${q.targetName}」 (${q.progress}/${q.needCount})`;
      case 'collectItem': return `收集 ${q.needCount} 件「${q.equipName}」 (${q.progress}/${q.needCount})`;
      case 'reachFloor':  return `到达【${AREA_MAP[q.areaId].name}】第 ${q.floorIdx+1} 层 ${q.finished?'✔':''}`;
      case 'payGold':     return `上交 ${q.needCount*100} 金币 ${q.finished?'✔':''}`;
      case 'wearEquip':   return `穿戴「${q.equipName}」 ${q.finished?'✔':''}`;
    }
    return '';
  },
  accept(i){
    if(Game.quest.doing.length >= 3) return toast("最多 3 个任务");
    const q = Game.quest.avail.splice(i, 1)[0];
    Game.quest.doing.push(q);
    if(q.type === 'reachFloor' && Game.ui.areaId === q.areaId && Game.ui.floorIdx === q.floorIdx) q.finished = true;
    if(q.type === 'collectItem') this.recheckCollect(q);
    if(q.type === 'wearEquip'){
      for(const s in Game.worn){ if(Game.worn[s] && Game.worn[s].name === q.equipName){ q.finished = true; break; } }
    }
    Save.auto(); Nav._show('quest');
  },
  abandon(i){
    confirmBox("确定放弃该任务？", ()=>{
      Game.quest.doing.splice(i, 1);
      Save.auto(); Nav._show('quest');
    });
  },
  claim(i){
    const q = Game.quest.doing[i]; if(!q || !q.finished) return;
    Game.player.gold += q.goldReward;
    addExp(q.expReward);
    Game.quest.doing.splice(i, 1);
    toast(`任务完成 +${q.goldReward}金`);
    Save.auto(); Nav._show('quest'); Render.top();
  },
  payGold(i){
    const q = Game.quest.doing[i]; if(!q) return;
    const cost = q.needCount * 100;
    if(Game.player.gold < cost) return toast("金币不足");
    Game.player.gold -= cost;
    q.finished = true;
    Save.auto(); Nav._show('quest'); Render.top();
  },
  onKill(protoId){
    let changed = false;
    Game.quest.doing.forEach(q=>{
      if(q.type === 'killMonster' && q.targetId === protoId && !q.finished){
        q.progress++;
        if(q.progress >= q.needCount) q.finished = true;
        changed = true;
      }
    });
    if(changed) Save.auto();
  },
  onReachFloor(areaId, fi){
    let changed = false;
    Game.quest.doing.forEach(q=>{
      if(q.type === 'reachFloor' && q.areaId === areaId && q.floorIdx === fi && !q.finished){
        q.finished = true; changed = true;
      }
    });
    if(changed) Save.auto();
  },
  onWear(eqName){
    let changed = false;
    Game.quest.doing.forEach(q=>{
      if(q.type === 'wearEquip' && q.equipName === eqName && !q.finished){
        q.finished = true; changed = true;
      }
    });
    if(changed) Save.auto();
  },
  onBagChange(){
    let changed = false;
    Game.quest.doing.forEach(q=>{
      if(q.type === 'collectItem'){
        const before = q.progress;
        this.recheckCollect(q);
        if(q.progress !== before) changed = true;
      }
    });
    if(changed) Save.auto();
  },
  recheckCollect(q){
    let n = 0;
    Game.bag.forEach(e=>{ if(e.name === q.equipName) n++; });
    for(const s in Game.worn){ if(Game.worn[s] && Game.worn[s].name === q.equipName) n++; }
    q.progress = Math.min(n, q.needCount);
    if(q.progress >= q.needCount) q.finished = true;
  }
};