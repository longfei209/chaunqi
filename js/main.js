/* ============================================================
 *  main.js  —— 启动入口
 * ============================================================ */

/* 每秒检查怪物组复活 + 宠物复活 */
setInterval(() => {
  // 怪物组复活
  if(Game.ui.areaId != null && Game.ui.floorIdx != null){
    const changed = tickRespawn(Game.ui.areaId, Game.ui.floorIdx);
    if(!$('page-home').classList.contains('hidden')){
      if(changed) Render.home();
    }
  }
  // 宠物复活
  const petChanged = tickPetRespawn();
  if(petChanged){
    // 若在宠物页或战斗页，刷新对应 UI
    if(!$('page-pet').classList.contains('hidden')) Render.petPage();
    if(Game.battle) Combat.render();
    Render.top();
  }
}, 1000);

/* 启动游戏 */
initGame();
Render.top();
Render.home();
