/* ============================================================
 *  shop.js  —— 商店（含书页）
 * ============================================================ */

const Shop = {
  _refresh(){
    Nav._show('shop', Nav._lastOpts || {});
    Render.top();
  },

  buyPotion(n){
    const cost = n * POTION_PRICE;
    if(Game.player.gold < cost) return toast("金币不足");
    Game.player.gold -= cost;
    Game.player.potion += n;
    toast(`购得红药 ×${n}`);
    Save.auto(); this._refresh();
  },
  buyPotionMp(n){
    const cost = n * POTION_MP_PRICE;
    if(Game.player.gold < cost) return toast("金币不足");
    Game.player.gold -= cost;
    Game.player.potionMp += n;
    toast(`购得蓝药 ×${n}`);
    Save.auto(); this._refresh();
  },
  buyEquip(name){
    const b = EQUIP_BASE[name];
    if(Game.player.gold < b.buy) return toast("金币不足");
    if(Game.bag.length >= Game.player.bagMax) return toast("背包已满");
    Game.player.gold -= b.buy;
    Game.bag.push(makeEquip(name, 'normal'));
    Quest.onBagChange();
    toast("购买成功");
    Save.auto(); this._refresh();
  },
  buyPetEgg(){
    if(Game.player.gold < 500) return toast("金币不足");
    if(Game.pets.length >= PET_WAREHOUSE_MAX) return toast("宠物仓库已满");
    Game.player.gold -= 500;
    const tpl = pick(Object.keys(PET_TEMPLATES));
    const q = Math.random() < 0.5 ? 'normal' : 'good';
    const pet = makePet(tpl, q);
    Pet.tryAdd(pet);
    Save.auto(); this._refresh();
  },
  buyGem(gemKey){
    if(Game.player.gold < GEM_SHOP_PRICE) return toast("金币不足");
    Game.player.gold -= GEM_SHOP_PRICE;
    Game.gems.push(makeGem(gemKey, 'normal'));
    toast(`购得 ${GEMS[gemKey].name}（普通）`);
    Save.auto(); this._refresh();
  },
  buyPage(n){
    const cost = n * PAGE_PRICE;
    if(Game.player.gold < cost) return toast("金币不足");
    Game.player.gold -= cost;
    Game.pages = (Game.pages || 0) + n;
    toast(`购得书页 ×${n}`);
    Save.auto(); this._refresh();
  },
  sellPage(n){
    if((Game.pages||0) < n) return toast("书页不足");
    Game.pages -= n;
    Game.player.gold += n * PAGE_SELL;
    toast(`出售书页 ×${n} +${n*PAGE_SELL}金`);
    Save.auto(); this._refresh();
  }
};