/* ============================================================
 *  shop.js  —— 商店
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
  }
};