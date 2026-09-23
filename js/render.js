/* ============================================================
 *  render.js  —— 导航 + 各页面渲染
 * ============================================================ */

/* 导航栈 */
const Nav = {
  stack: ['home'],
  go(pageName, opts){
    if(this.stack[this.stack.length-1] === pageName){
      this._show(pageName, opts);
      return;
    }
    this.stack.push(pageName);
    this._show(pageName, opts);
  },
  back(){
    if(this.stack.length <= 1) return this.home();
    this.stack.pop();
    const prev = this.stack[this.stack.length-1];
    this._show(prev);
  },
  home(){
    this.stack = ['home'];
    this._show('home');
  },
  _show(pageName, opts){
    document.querySelectorAll('.page').forEach(el=>el.classList.add('hidden'));
    $('page-'+pageName).classList.remove('hidden');
    switch(pageName){
      case 'home':   Render.home(); break;
      case 'area':   Render.areaPage(); break;
      case 'floor':  Render.floorPage(); break;
      case 'worn':   Render.wornPage(); break;
      case 'bag':    Render.bagPage(opts && opts.page || 1); break;
      case 'refine': Render.refinePage(opts && opts.idx); break;
      case 'shop':   Render.shopPage(opts && opts.page || 1); break;
      case 'quest':  Render.questPage(opts && opts.page || 1); break;
      case 'pet':    Render.petPage(); break;
      case 'battle': Combat.render(); break;
    }
  }
};

const Render = {
  top(){
    const p = Game.player, a = calcAttr();
    const mHp = playerMaxHp(), mMp = playerMaxMp();
    $('tLv').textContent = p.lv;
    $('tGold').textContent = fmt(p.gold);
    $('tPotion').textContent = p.potion;
    $('tPotionMp').textContent = p.potionMp;
    $('tMat').textContent = Game.mat;
    $('tRage').textContent = p.rage || 0;
    $('tAtk').textContent = a.atk;
    $('tDef').textContent = a.def;
    $('tSpd').textContent = a.spd;
    $('tHpBar').style.width = clamp(p.hp/mHp,0,1)*100 + '%';
    $('tHpTxt').textContent = Math.floor(p.hp) + '/' + mHp;
    $('tMpBar').style.width = clamp(p.mp/mMp,0,1)*100 + '%';
    $('tMpTxt').textContent = Math.floor(p.mp) + '/' + mMp;
    const need = p.lv * 120;
    $('tExpBar').style.width = clamp(p.exp/need,0,1)*100 + '%';
    $('tExpTxt').textContent = p.exp + '/' + need;
    $('tPet').textContent = `宠:${Game.activePets.length}/${petSlotLimit()}`;
  },

  home(){
    const box = $('homeMain');
    if(Game.ui.areaId == null || Game.ui.floorIdx == null){
      box.innerHTML = `<div class="dim" style="text-align:center;padding:20px;font-size:12px;">点击「地图」选择区域开始冒险</div>`;
      return;
    }
    const ar = AREA_MAP[Game.ui.areaId];
    const fi = Game.ui.floorIdx;
    tickRespawn(ar.id, fi);
    const st = areaState(ar.id).floors[fi];
    if(!st.spawned) spawnFloor(ar.id, fi);
    const def = ar.floors[fi];

    let html = `<div class="floor-header"><span>📍 ${ar.name} · 第${fi+1}层</span><span>印记:${st.mark?'✔':'✘'}</span></div>`;

    const aliveGroups = st.groups.map((g,gi)=>({g,gi})).filter(x=>x.g.alive);
    if(aliveGroups.length > 0){
      html += `<div class="groups-row" id="groupsRow">`;
      aliveGroups.forEach(({g, gi})=>{
        html += `<button class="btn group-btn" onclick="Combat.startGroup(${gi})" data-gi="${gi}">第${gi+1}组</button>`;
      });
      html += `</div>`;
    } else {
      html += `<div class="dim" style="text-align:center;font-size:12px;padding:8px;">全部清空，等待复活中…</div>`;
    }

    const boss = def.boss;
    const bDead = !!st.bossDeath;
    html += `<div class="boss-block ${bDead?'dead':''}">
      <div class="boss-name">👹 ${boss.name}</div>
      <div class="boss-meta">HP${fmt(boss.hp)} 攻${boss.atk} 防${boss.def} 速${boss.spd} 经${boss.exp}</div>
      ${bDead?'<div class="dim" style="font-size:11px;">等待复活</div>':'<button class="btn primary" onclick="Combat.startBoss()">挑战 BOSS</button>'}
    </div>`;

    box.innerHTML = html;
  },

  areaPage(){
    let html = '';
    AREAS.forEach(ar=>{
      const locked = !ar.unlock && !(ar.id==='dragonCity' && Game.flags.dragonCity);
      if(locked) return;
      html += `<button class="btn primary" style="padding:14px;" onclick="Render._pickArea('${ar.id}')">${ar.name}</button>`;
    });
    $('areaBody').innerHTML = html;
  },
  _pickArea(id){
    Game.ui.areaId = id;
    Game.ui.floorIdx = 0;
    const st = areaState(id);
    if(!st.floors[0].spawned) spawnFloor(id, 0);
    Nav.go('floor');
  },

  floorPage(){
    if(!Game.ui.areaId) return Nav.back();
    const ar = AREA_MAP[Game.ui.areaId];
    const ast = areaState(ar.id);
    $('floorTitle').textContent = ar.name;
    let html = '';
    ar.floors.forEach((f, i)=>{
      let locked = false, lockMsg = '';
      if(i > 0 && !ast.floors[i-1].mark){
        locked = true;
        lockMsg = `需点亮第${i}层`;
      }
      const s = ast.floors[i];
      html += `<button class="btn ${locked?'':'primary'}" style="padding:14px;" ${locked?'disabled':''} onclick="Render._enterFloor(${i})">
        第${i+1}层 ${s.mark?'✔':'✘'} <span class="dim" style="font-size:11px;">${locked?'🔒 '+lockMsg:'可进入'}</span>
      </button>`;
    });
    $('floorBody').innerHTML = html;
  },
  _enterFloor(i){
    const ast = areaState(Game.ui.areaId);
    if(i > 0 && !ast.floors[i-1].mark){
      toast(`请先点亮第${i}层印记`);
      return;
    }
    if(!ast.floors[i].spawned) spawnFloor(Game.ui.areaId, i);
    Game.ui.floorIdx = i;
    Quest.onReachFloor(Game.ui.areaId, i);
    Nav.home();
    Save.auto();
    Events.maybeTrigger();
  },

  wornPage(){
    const a = calcAttr();
    let html = `<div class="card">
      <div class="card-title">Lv.${Game.player.lv}</div>
      <div class="card-meta">攻${a.atk} 防${a.def} 速${a.spd} | 暴击${(a.crit*100).toFixed(1)}% 暴伤${(a.critD*100).toFixed(0)}% 吸血${(a.ls*100).toFixed(0)}%</div>
      <div class="card-meta">HP ${Math.floor(Game.player.hp)}/${playerMaxHp()} · MP ${Math.floor(Game.player.mp)}/${playerMaxMp()}</div>
      <div class="card-actions"><button class="btn" onclick="Equip.autoBest()">一键最强</button></div>
    </div>`;
    SLOT_ORDER.forEach(s=>{
      const e = Game.worn[s];
      if(e){
        const t = equipStat(e), q = QUALITY[e.quality];
        const afx = equipAffixDesc(e);
        html += `<div class="card">
          <div class="card-title ${q.cls}">${e.name} <span class="dim">[${q.name}] ${SLOT_NAME[s]}</span></div>
          <div class="card-meta">基础 攻${e.baseAtk} 防${e.baseDef} | 最终 攻${t.atk} 防${t.def} 速${t.spd} HP+${t.hp} ${afx?'· '+afx:''}</div>
          <div class="card-actions"><button class="btn" onclick="Equip.unwear('${s}')">卸下</button></div>
        </div>`;
      }else{
        html += `<div class="card"><div class="card-meta">${SLOT_NAME[s]}：空</div></div>`;
      }
    });
    $('wornBody').innerHTML = html;
  },

  bagPage(page){
    page = page || 1;
    const list = Game.bag;
    const total = Math.max(1, Math.ceil(list.length / PAGE_SIZE.bag));
    page = clamp(page, 1, total);
    const start = (page-1) * PAGE_SIZE.bag;
    const slice = list.slice(start, start + PAGE_SIZE.bag);
    let html = `<div class="dim" style="font-size:11px;padding:0 0 4px;">背包 ${list.length}/${Game.player.bagMax}</div>`;
    if(list.length === 0){
      html += `<div class="card dim">空空如也</div>`;
    }else{
      slice.forEach((e, i)=>{
        const idx = start + i;
        const t = equipStat(e), q = QUALITY[e.quality];
        const wornEq = Game.worn[e.slot];
        let cmp = '';
        if(wornEq){
          const wt = equipStat(wornEq);
          const dA = t.atk-wt.atk, dD = t.def-wt.def, dS = t.spd-wt.spd;
          if(dA||dD||dS) cmp = ` (差 攻${dA>=0?'+':''}${dA} 防${dD>=0?'+':''}${dD} 速${dS>=0?'+':''}${dS})`;
        }
        const afx = equipAffixDesc(e);
        html += `<div class="card">
          <div class="card-title ${q.cls}">${e.name} <span class="dim">[${q.name}]</span></div>
          <div class="card-meta">基础 攻${e.baseAtk} 防${e.baseDef} | 最终 攻${t.atk} 防${t.def} 速${t.spd} HP+${t.hp} 洗${e.refineTimes}/3 ${afx?'· '+afx:''}${cmp}</div>
          <div class="card-actions">
            <button class="btn" onclick="Equip.wear(${idx})">穿戴</button>
            <button class="btn" onclick="Nav.go('refine',{idx:${idx}})">洗练</button>
            <button class="btn" onclick="Equip.sell(${idx})">出售</button>
            <button class="btn" onclick="Equip.decompose(${idx})">分解</button>
          </div>
        </div>`;
      });
    }
    $('bagList').innerHTML = html;
    $('bagPager').innerHTML = total > 1
      ? `<button ${page<=1?'disabled':''} onclick="Render.bagPage(${page-1})">◀</button><span>${page} / ${total}</span><button ${page>=total?'disabled':''} onclick="Render.bagPage(${page+1})">▶</button>`
      : '';
  },

  refinePage(idx){
    if(idx == null || !Game.bag[idx]) { Nav.back(); return; }
    const e = Game.bag[idx];
    const t = equipStat(e), q = QUALITY[e.quality];
    const risk = Equip.refineRisk(e);
    const afx = equipAffixDesc(e);
    let html = `<div class="card">
      <div class="card-title ${q.cls}">${e.name} [${q.name}]</div>
      <div class="card-meta">基础 攻${e.baseAtk} 防${e.baseDef}</div>
      <div class="card-meta">当前 攻${t.atk} 防${t.def} 速${t.spd} HP+${t.hp} ${afx?'· '+afx:''}</div>
      <div class="card-meta">洗练次数 ${e.refineTimes}/3 · 持有材料 ${Game.mat}</div>
      <div class="card-meta">本次风险：${(risk*100).toFixed(1)}% 破损</div>
      <div class="card-actions">
        <button class="btn primary" onclick="Equip.refine(${idx})">执行洗练(耗1材料)</button>
      </div>
    </div>`;
    $('refineBody').innerHTML = html;
  },

  shopPage(page){
    page = page || 1;
    const items = [];
    items.push({label:`红药 ×1`, sub:`${POTION_PRICE}金 · 回35%HP`, action:`Shop.buyPotion(1)`});
    items.push({label:`红药 ×10`, sub:`${POTION_PRICE*10}金`, action:`Shop.buyPotion(10)`});
    items.push({label:`蓝药 ×1`, sub:`${POTION_MP_PRICE}金 · 回30%MP`, action:`Shop.buyPotionMp(1)`});
    items.push({label:`蓝药 ×10`, sub:`${POTION_MP_PRICE*10}金`, action:`Shop.buyPotionMp(10)`});
    items.push({label:`宠物蛋`, sub:`500金 · 随机普通/优秀`, action:`Shop.buyPetEgg()`});
    SHOP_LIST.forEach(name=>{
      const b = EQUIP_BASE[name];
      items.push({label:name, sub:`[${SLOT_NAME[b.slot]}] 基础攻${b.atk} 防${b.def} · ${b.buy}金`, action:`Shop.buyEquip('${name}')`});
    });

    const total = Math.ceil(items.length / PAGE_SIZE.shop);
    page = clamp(page, 1, total);
    const start = (page-1) * PAGE_SIZE.shop;
    const slice = items.slice(start, start + PAGE_SIZE.shop);
    let html = '';
    slice.forEach(it=>{
      html += `<div class="card">
        <div class="card-title">${it.label}</div>
        <div class="card-meta">${it.sub}</div>
        <div class="card-actions"><button class="btn" onclick="${it.action}">购买</button></div>
      </div>`;
    });
    $('shopList').innerHTML = html;
    $('shopPager').innerHTML = total > 1
      ? `<button ${page<=1?'disabled':''} onclick="Render.shopPage(${page-1})">◀</button><span>${page} / ${total}</span><button ${page>=total?'disabled':''} onclick="Render.shopPage(${page+1})">▶</button>`
      : '';
  },

  questPage(page){
    page = page || 1;
    Quest.refreshPool(false);
    const items = [];
    Game.quest.doing.forEach((q, i)=>{
      const desc = Quest.desc(q);
      const canPay = q.type==='payGold' && !q.finished && Game.player.gold >= q.needCount*100;
      let actions = '';
      if(q.finished) actions += `<button class="btn primary" onclick="Quest.claim(${i})">领取</button>`;
      if(q.type==='payGold' && !q.finished) actions += `<button class="btn ${canPay?'':'ghost'}" onclick="Quest.payGold(${i})" ${canPay?'':'disabled'}>上交</button>`;
      actions += `<button class="btn ghost" onclick="Quest.abandon(${i})">放弃</button>`;
      items.push({label:`[进行] ${desc}`, sub:`奖励 ${q.goldReward}金 · ${q.expReward}经验`, actions});
    });
    Game.quest.avail.forEach((q, i)=>{
      items.push({
        label:`[可接] ${Quest.desc(q)}`,
        sub:`奖励 ${q.goldReward}金 · ${q.expReward}经验`,
        actions:`<button class="btn" onclick="Quest.accept(${i})">接取</button>`
      });
    });
    const cdLeft = Quest.cdLeft();
    const total = Math.max(1, Math.ceil(items.length / PAGE_SIZE.quest));
    page = clamp(page, 1, total);
    const start = (page-1) * PAGE_SIZE.quest;
    const slice = items.slice(start, start + PAGE_SIZE.quest);
    let html = `<div class="dim" style="font-size:11px;padding:0 0 4px;">进行中 ${Game.quest.doing.length}/3 · 刷新 ${cdLeft}s</div>`;
    if(slice.length === 0) html += `<div class="card dim">暂无任务</div>`;
    slice.forEach(it=>{
      html += `<div class="card">
        <div class="card-title">${it.label}</div>
        <div class="card-meta">${it.sub}</div>
        <div class="card-actions">${it.actions}</div>
      </div>`;
    });
    $('questList').innerHTML = html;
    $('questPager').innerHTML = total > 1
      ? `<button ${page<=1?'disabled':''} onclick="Render.questPage(${page-1})">◀</button><span>${page} / ${total}</span><button ${page>=total?'disabled':''} onclick="Render.questPage(${page+1})">▶</button>`
      : '';
  },

  petPage(){
    const limit = petSlotLimit();
    const activeCount = Game.activePets.length;
    let html = `<div class="dim" style="font-size:12px;padding:0 0 6px;">上阵 ${activeCount}/${limit} · 仓库 ${Game.pets.length}/${PET_WAREHOUSE_MAX}</div>`;
    if(Game.pets.length === 0){
      html += `<div class="card dim">暂无宠物，去商店买宠物蛋吧。</div>`;
    }else{
      Game.pets.forEach(p=>{
        const q = QUALITY[p.quality];
        const st = petStatFor(p);
        const isActive = Game.activePets.includes(p.uid);
        const skills = p.skills && p.skills.length
          ? p.skills.map(k=>PET_SKILLS[k].name).join(' / ')
          : '无';
        const skillDesc = p.skills && p.skills.length
          ? p.skills.map(k=>`<div class="dim" style="font-size:10px;">· ${PET_SKILLS[k].name}：${PET_SKILLS[k].desc}</div>`).join('')
          : '';
        html += `<div class="card">
          <div class="card-title">${p.avatar} <span class="${q.cls}">${p.name}</span> <span class="dim">[${q.name}] Lv.${p.lv}</span>${isActive?' <span style="color:#8f8;font-size:10px;">[已上阵]</span>':''}</div>
          <div class="card-meta">攻${st.atk} 防${st.def} HP${st.hp} 速${st.spd} | 被动 攻+${st.pAtk} 防+${st.pDef} 速+${st.pSpd}</div>
          <div class="card-meta">技能(${p.skills.length}): ${skills}</div>
          ${skillDesc}
          <div class="card-meta">经验 ${p.exp}/${p.lv*150}</div>
          <div class="card-actions">
            ${isActive
              ? `<button class="btn ghost" onclick="Pet.toggle('${p.uid}')">下阵</button>`
              : `<button class="btn" onclick="Pet.toggle('${p.uid}')" ${activeCount>=limit?'disabled':''}>${activeCount>=limit?'已满':'上阵'}</button>`}
            <button class="btn danger" onclick="Pet.release('${p.uid}')">放生</button>
          </div>
        </div>`;
      });
    }
    $('petBody').innerHTML = html;
  }
};