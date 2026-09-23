/* ============================================================
 *  shop.js  —— 商店
 *
 *  本轮新增：
 *   - 卖 8 种普通宝石（200 金/颗）
 *   - 提供"镶嵌"入口（跳转到镶嵌页）
 * ============================================================ */

const Shop = {
  buyPotion(n){
    const cost = n * POTION_PRICE;
    if(Game.player.gold < cost) return toast("金币不足");
    Game.player.gold -= cost;
    Game.player.potion += n;
    toast(`购得红药 ×${n}`);
    Save.auto(); Nav._show('shop'); Render.top();
  },
  buyPotionMp(n){
    const cost = n * POTION_MP_PRICE;
    if(Game.player.gold < cost) return toast("金币不足");
    Game.player.gold -= cost;
    Game.player.potionMp += n;
    toast(`购得蓝药 ×${n}`);
    Save.auto(); Nav._show('shop'); Render.top();
  },
  buyEquip(name){
    const b = EQUIP_BASE[name];
    if(Game.player.gold < b.buy) return toast("金币不足");
    if(Game.bag.length >= Game.player.bagMax) return toast("背包已满");
    Game.player.gold -= b.buy;
    Game.bag.push(makeEquip(name, 'normal'));
    Quest.onBagChange();
    toast("购买成功");
    Save.auto(); Nav._show('shop'); Render.top();
  },
  buyPetEgg(){
    if(Game.player.gold < 500) return toast("金币不足");
    if(Game.pets.length >= PET_WAREHOUSE_MAX) return toast("宠物仓库已满");
    Game.player.gold -= 500;
    const tpl = pick(Object.keys(PET_TEMPLATES));
    const q = Math.random() < 0.5 ? 'normal' : 'good';
    const pet = makePet(tpl, q);
    Pet.tryAdd(pet);
    Save.auto(); Nav._show('shop'); Render.top();
  },

  /* ---- 宝石 ---- */
  buyGem(gemKey){
    if(Game.player.gold < GEM_SHOP_PRICE) return toast("金币不足");
    Game.player.gold -= GEM_SHOP_PRICE;
    const gem = makeGem(gemKey, 'normal');
    Game.gems.push(gem);
    toast(`购得 ${GEMS[gemKey].name}（普通）`);
    Save.auto(); Nav._show('shop'); Render.top();
  },

  /* ---- 打开镶嵌界面 ---- */
  openSocketPage(){
    Nav.go('socket');
  }
};