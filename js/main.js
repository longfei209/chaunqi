/* ============================================================
 *  main.js  —— 启动入口
 * ============================================================ */

/* 每秒检查怪物组复活 */
setInterval(() => {
  if(Game.ui.areaId == null || Game.ui.floorIdx == null) return;
  const changed = tickRespawn(Game.ui.areaId, Game.ui.floorIdx);
  if(!$('page-home').classList.contains('hidden')){
    if(changed) Render.home();
  }
}, 1000);

/* 启动游戏 */
initGame();
Render.top();
Render.home();