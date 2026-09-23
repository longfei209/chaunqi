/* ============================================================
 *  render.js  —— 导航 + 各页面渲染
 *
 *  本轮改动：
 *   - 商店分两个 tab：道具 | 宝石
 *   - 镶嵌入口只在宝石 tab
 * ============================================================ */

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
    this._lastOpts = opts || {};
    document.querySelectorAll('.page').forEach(el=>el.classList.add('hidden'));
    $('page-'+pageName).classList.remove('hidden');
    switch(pageName){
      case 'home':   Render.home(); break;
      case 'area':   Render.areaPage(); break;
      case 'floor':  Render.floorPage(); break;
      case 'worn':   Render.wornPage(); break;
      case 'bag':    Render.bagPage(opts); break;
      case 'refine': Render.refinePage(opts && opts.idx); break;
      case 'shop':   Render.shopPage(opts); break;
      case 'quest':  Render.questPage(opts && opts.page || 1); break;
      case 'pet':    Render.petPage(); break;
      case 'socket': Render.socketPage(opts); break;
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
    const ext = $('tExt');
    if(ext){
      ext.textContent =
        `连${(a.combo*100).toFixed(0)}% 反${(a.counter*100).toFixed(0)}% ` +
        `吸${(a.lsPct*100).toFixed(0)}% 固${a.lsFlat} 暴${(a.crit*100).toFixed(0)}%`;
    }
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

    const cleared = st.groups.filter(g=>!g.alive).length;
    const total = st.groups.length;
    const bossDead = !!st.bossDeath;

    let html = `<div class="floor-header">
      <span>📍 ${ar.name} · 第${fi+1}层</span>
      <span>已清 ${cleared}/${total} 组</span>
    </div>`;

    const aliveGroups = st.groups.map((g,gi)=>({g,gi})).filter(x=>x.g.alive);
    if(aliveGroups.length > 0){
      html += `<div class="groups-row" style="flex-wrap:wrap;" id="groupsRow">`;
      aliveGroups.forEach(({g, gi})=>{
        const nm = g.name && g.name.length > 4 ? g.name.slice(0,4) : (g.name || '怪物');
        html += `<button class="btn group-btn" style="flex:0 0 calc(33.33% - 4px);" onclick="Combat.startGroup(${gi})" data-gi="${gi}">${nm}</button>`;
      });
      html += `</div>`;
    } else {
      html += `<div class="dim" style="text-align:center;font-size:12px;padding:8px;">全部清空，等待复活中…</div>`;
    }

    const boss = def.boss;
    html += `<div class="boss-block ${bossDead?'dead':''}">
      <div class="boss-name">👹 ${boss.name} ${bossDead?'<span class="dim" style="font-size:11px;">[已击杀]</span>':''}</div>
      <div class="boss-meta">HP${fmt(boss.hp)} 攻${boss.atk} 防${boss.def} 速${boss.spd} 经${boss.exp}</div>
      ${bossDead?'<div class="dim" style="font-size:11px;">等待复活（复活后需重新击杀才能解锁下一层）</div>':'<button class="btn primary" onclick="Combat.startBoss()">挑战 BOSS</button>'}
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
      if(i > 0){
        const prev = ast.floors[i-1];
        if(!prev.bossDeath){
          locked = true;
          lockMsg = `需击杀第${i}层 BOSS`;
        }
      }
      const s = ast.floors[i];
      const bossKilled = !!s.bossDeath;
      html += `<button class="btn ${locked?'':'primary'}" style="padding:14px;" ${locked?'disabled':''} onclick="Render._enterFloor(${i})">
        第${i+1}层 ${bossKilled?'✔':'✘'} <span class="dim" style="font-size:11px;">${locked?'🔒 '+lockMsg:'可进入'}</span>
      </button>`;
    });
    $('floorBody').innerHTML = html;
  },
  _enterFloor(i){
    const ast = areaState(Game.ui.areaId);
    if(i > 0 && !ast.floors[i-1].bossDeath){
      toast(`请先击杀第${i}层 BOSS`);
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
      <div class="card-meta">攻${a.atk} 防${a.def} 速${a.spd} | 暴击${(a.crit*100).toFixed(1)}% 暴伤${(a.critD*100).toFixed(0)}%</div>
      <div class="card-meta">连击${(a.combo*100).toFixed(1)}% 反击${(a.counter*100).toFixed(1)}% 吸血${(a.lsPct*100).toFixed(1)}% 固吸${a.lsFlat}</div>
      <div class="card-meta">HP ${Math.floor(Game.player.hp)}/${playerMaxHp()} · MP ${Math.floor(Game.player.mp)}/${playerMaxMp()}</div>
      <div class="card-actions"><button class="btn" onclick="Equip.autoBest()">一键最强</button></div>
    </div>`;
    SLOT_ORDER.forEach(s=>{
      const e = Game.worn[s];
      if(e){
        const t = equipStat(e), q = QUALITY[e.quality];
        const gemB = equipGemBonus(e);
        const afx = equipAffixDesc(e);
        const socketsTxt = (e.sockets||[]).map(g=>{
          if(!g) return '○';
          return GEMS[g.key] ? GEMS[g.key].icon : '?';
        }).join(' ');
        html += `<div class="card">
          <div class="card-title ${q.cls}">${e.name} <span class="dim">[${q.name}] ${SLOT_NAME[s]}</span></div>
          <div class="card-meta">基础 攻${e.baseAtk} 防${e.baseDef} | 装备 ${t.atk}/${t.def} ${t.spd} HP+${t.hp}</div>
          ${(gemB.atk+gemB.def+gemB.spd+gemB.hp+gemB.combo+gemB.counter+gemB.lsPct+gemB.lsFlat+gemB.crit) > 0
            ? `<div class="card-meta" style="color:#9d9;">宝石：攻+${gemB.atk} 防+${gemB.def} 速+${gemB.spd} HP+${gemB.hp} 连${gemB.combo}% 反${gemB.counter}% 吸${gemB.lsPct}% 固${gemB.lsFlat} 暴${gemB.crit}%</div>`
            : ''}
          ${afx?`<div class="card-meta" style="color:#d8a;">词条：${afx}</div>`:''}
          <div class="card-meta">孔位：${socketsTxt}</div>
          <div class="card-actions">
            <button class="btn" onclick="Nav.go('socket',{type:'worn',slot:'${s}'})">镶嵌</button>
            <button class="btn" onclick="Equip.unwear('${s}')">卸下</button>
          </div>
        </div>`;
      }else{
        html += `<div class="card"><div class="card-meta">${SLOT_NAME[s]}：空</div></div>`;
      }
    });
    $('wornBody').innerHTML = html;
  },

  bagPage(opts){
    opts = opts || {};
    const tab = opts.tab || 'equip';
    const page = opts.page || 1;

    let html = `<div style="display:flex;gap:6px;margin-bottom:6px;">
      <button class="btn ${tab==='equip'?'primary':''}" onclick="Nav._show('bag',{tab:'equip',page:1})">装备</button>
      <button class="btn ${tab==='gem'?'primary':''}" onclick="Nav._show('bag',{tab:'gem',page:1})">宝石</button>
    </div>`;

    if(tab === 'equip'){
      html += Render._bagEquipTab(page);
    }else{
      html += Render._bagGemTab(page);
    }
    $('bagList').innerHTML = html;
    $('bagPager').innerHTML = '';
  },

  _bagEquipTab(page){
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
        const q = QUALITY[e.quality];
        const t = equipStat(e);
        const cmp = Equip.compareToWorn(e);
        const afx = equipAffixDesc(e);

        const cmpLine = (label, nVal, oVal, isPct) => {
          if(nVal === 0 && oVal === 0) return '';
          const arrow = compareArrow(nVal, oVal, isPct);
          return `<span style="margin-right:6px;">${label} ${isPct?nVal+'%':nVal} ${arrow}</span>`;
        };
        const cmpHtml = [
          cmpLine('攻', cmp.atk.n, cmp.atk.o),
          cmpLine('防', cmp.def.n, cmp.def.o),
          cmpLine('速', cmp.spd.n, cmp.spd.o),
          cmpLine('HP', cmp.hp.n, cmp.hp.o),
          cmpLine('连', cmp.combo.n, cmp.combo.o, true),
          cmpLine('反', cmp.counter.n, cmp.counter.o, true),
          cmpLine('吸', cmp.lsPct.n, cmp.lsPct.o, true),
          cmpLine('固', cmp.lsFlat.n, cmp.lsFlat.o),
          cmpLine('暴', cmp.crit.n, cmp.crit.o, true)
        ].filter(x=>x).join('');

        const socketsTxt = (e.sockets||[]).map(g=>g?GEMS[g.key].icon:'○').join(' ');

        html += `<div class="card">
          <div class="card-title ${q.cls}">${e.name} <span class="dim">[${q.name}]</span></div>
          <div class="card-meta">基础 攻${e.baseAtk} 防${e.baseDef} 速${e.baseSpd||0} HP${e.baseHp||0}</div>
          <div class="card-meta" style="font-size:11px;">${cmpHtml || '<span class="dim">无对比</span>'}</div>
          ${afx?`<div class="card-meta" style="color:#d8a;">词条：${afx}</div>`:''}
          <div class="card-meta">孔位：${socketsTxt} · 洗练${e.refineTimes}/3</div>
          <div class="card-actions">
            <button class="btn" onclick="Equip.wear(${idx})">穿戴</button>
            <button class="btn" onclick="Nav.go('socket',{type:'bag',idx:${idx}})">镶嵌</button>
            <button class="btn" onclick="Nav.go('refine',{idx:${idx}})">洗练</button>
            <button class="btn" onclick="Equip.sell(${idx})">出售</button>
            <button class="btn" onclick="Equip.decompose(${idx})">分解</button>
          </div>
        </div>`;
      });
    }
    if(total > 1){
      html += `<div class="pager">
        <button ${page<=1?'disabled':''} onclick="Nav._show('bag',{tab:'equip',page:${page-1}})">◀</button>
        <span>${page} / ${total}</span>
        <button ${page>=total?'disabled':''} onclick="Nav._show('bag',{tab:'equip',page:${page+1}})">▶</button>
      </div>`;
    }
    return html;
  },

  _bagGemTab(page){
    const order = ['red','blue','green','purple','orange','black','yellow','white'];
    const qOrder = ['legend','rare','normal'];

    const groups = {};
    Game.gems.forEach(g=>{
      const k = g.key + '_' + g.quality;
      if(!groups[k]) groups[k] = { key: g.key, quality: g.quality, count: 0 };
      groups[k].count++;
    });
    const fragGroups = [];
    order.forEach(k=>{
      const f = Game.fragments[k];
      if(!f) return;
      qOrder.forEach(q=>{
        if(f[q] > 0) fragGroups.push({ key:k, quality:q, count:f[q] });
      });
    });
    const gemList = Object.values(groups).sort((a,b)=>{
      const ai = order.indexOf(a.key), bi = order.indexOf(b.key);
      if(ai !== bi) return ai - bi;
      return qOrder.indexOf(a.quality) - qOrder.indexOf(b.quality);
    });

    let html = `<div class="dim" style="font-size:11px;padding:0 0 4px;">宝石 ${Game.gems.length} 颗</div>`;

    if(gemList.length === 0){
      html += `<div class="card dim">暂无宝石（怪物掉落或商店购买）</div>`;
    }else{
      gemList.forEach(g=>{
        const cfg = GEMS[g.key];
        const qCfg = GEM_QUALITY[g.quality];
        html += `<div class="card" style="padding:5px 7px;">
          <div class="card-title" style="font-size:12px;">
            <span style="color:${cfg.color};font-size:15px;">${cfg.icon}</span>
            ${cfg.name}
            <span class="dim">[${qCfg.name}]</span>
            <span style="float:right;color:#9d9;">×${g.count}</span>
          </div>
          <div class="card-meta">效果：${cfg.desc} ${cfg.type==='pct'?gemValue(g.key,g.quality)+'%':'+'+gemValue(g.key,g.quality)}</div>
        </div>`;
      });
    }

    html += `<div class="dim" style="font-size:11px;padding:6px 0 4px;">碎片</div>`;
    const fragHas = fragGroups.filter(f=>f.count>0);
    if(fragHas.length === 0){
      html += `<div class="card dim" style="font-size:11px;">暂无碎片（3 碎片可合成 1 颗普通宝石）</div>`;
    }else{
      fragHas.forEach(f=>{
        const cfg = GEMS[f.key];
        const qCfg = GEM_QUALITY[f.quality];
        html += `<div class="card" style="padding:5px 7px;">
          <div class="card-title" style="font-size:12px;">
            <span style="color:${cfg.color};font-size:15px;">🧩</span>
            ${cfg.name}碎片
            <span class="dim">[${qCfg.name}]</span>
            <span style="float:right;color:#9d9;">×${f.count}</span>
          </div>
          <div class="card-actions" style="margin-top:4px;">
            ${f.quality==='normal'?`<button class="btn" onclick="Render._craftGem('${f.key}')">合成宝石(3)</button>`:''}
            ${f.quality==='normal'?`<button class="btn" onclick="Render._upgradeFrag('${f.key}','normal','rare')">升级稀有(3)</button>`:''}
            ${f.quality==='rare'?`<button class="btn" onclick="Render._upgradeFrag('${f.key}','rare','legend')">升级传说(3)</button>`:''}
          </div>
        </div>`;
      });
    }
    return html;
  },

  _craftGem(key){
    const g = craftGem(key);
    if(!g) return toast("碎片不足");
    toast(`合成成功：${GEMS[g.key].name}（${GEM_QUALITY[g.quality].name}）`);
    Save.auto();
    Nav._show('bag',{tab:'gem',page:1});
    Render.top();
  },
  _upgradeFrag(key, fromQ, toQ){
    const ok = upgradeFragment(key, fromQ, toQ);
    if(!ok) return toast("碎片不足");
    toast(`升级成功：${GEMS[key].name}碎片（${GEM_QUALITY[toQ].name}）`);
    Save.auto();
    Nav._show('bag',{tab:'gem',page:1});
  },

  socketPage(opts){
    opts = opts || {};
    const eq = Equip.findEquipByRef(opts);
    if(!eq){
      Nav.back();
      return;
    }
    const q = QUALITY[eq.quality];
    const sockets = eq.sockets || [null, null, null];

    let html = `<div class="card">
      <div class="card-title ${q.cls}">${eq.name} <span class="dim">[${q.name}] ${SLOT_NAME[eq.slot]}</span></div>
      <div class="card-meta">选择孔位 → 点击下方宝石镶嵌</div>
    </div>`;

    html += `<div style="display:flex;gap:6px;margin:8px 0;">`;
    for(let i=0;i<3;i++){
      const g = sockets[i];
      html += `<div class="card" style="flex:1;align-items:center;padding:8px 4px;min-height:70px;">
        <div class="dim" style="font-size:10px;">孔 ${i+1}</div>`;
      if(g){
        const cfg = GEMS[g.key];
        const qCfg = GEM_QUALITY[g.quality];
        html += `<div style="font-size:22px;color:${cfg.color};">${cfg.icon}</div>
          <div style="font-size:10px;">${qCfg.name}</div>
          <button class="btn" style="margin-top:4px;padding:3px;font-size:10px;" onclick="Render._removeGem(${i})">取下</button>`;
      }else{
        html += `<div style="font-size:22px;color:#444;">○</div>
          <div class="dim" style="font-size:10px;">空</div>
          <button class="btn" style="margin-top:4px;padding:3px;font-size:10px;" onclick="Render._selectSocket(${i})" id="socketBtn${i}">选中</button>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    html += `<div class="dim" style="font-size:11px;margin-top:6px;">你的宝石（点选一颗 → 自动镶到"选中"孔）</div>`;
    if(Game.gems.length === 0){
      html += `<div class="card dim">暂无宝石，去商店购买或打怪掉落</div>`;
    }else{
      const order = ['red','blue','green','purple','orange','black','yellow','white'];
      const sorted = Game.gems.slice().sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key));
      html += `<div style="display:flex;flex-wrap:wrap;gap:4px;">`;
      sorted.forEach(gem=>{
        const cfg = GEMS[gem.key];
        const qCfg = GEM_QUALITY[gem.quality];
        html += `<div class="card" style="flex:0 0 calc(33% - 4px);padding:5px;align-items:center;cursor:pointer;" onclick="Render._pickGem('${gem.uid}')">
          <div style="font-size:20px;color:${cfg.color};">${cfg.icon}</div>
          <div style="font-size:9px;">${cfg.name}</div>
          <div style="font-size:9px;color:#888;">${qCfg.name} · ${cfg.type==='pct'?gemValue(gem.key,gem.quality)+'%':'+'+gemValue(gem.key,gem.quality)}</div>
        </div>`;
      });
      html += `</div>`;
    }

    html += `<div style="margin-top:8px;"><button class="btn" onclick="Nav.back()">返回</button></div>`;

    $('socketBody').innerHTML = html;

    this._socketSelected = (this._socketSelected != null) ? this._socketSelected : -1;
    if(this._socketSelected >= 0){
      const btn = $('socketBtn' + this._socketSelected);
      if(btn){ btn.classList.add('primary'); btn.textContent = '已选'; }
    }
  },

  _selectSocket(i){
    this._socketSelected = i;
    Render.socketPage(Nav._lastOpts);
  },

  _pickGem(gemId){
    const eq = Equip.findEquipByRef(Nav._lastOpts);
    if(!eq) return toast("装备丢失");
    if(this._socketSelected < 0) return toast("请先选一个孔位");
    Equip.socketGem(eq, this._socketSelected, gemId);
    this._socketSelected = -1;
    Render.socketPage(Nav._lastOpts);
  },

  _removeGem(socketIdx){
    const eq = Equip.findEquipByRef(Nav._lastOpts);
    if(!eq) return;
    Equip.unsocketGem(eq, socketIdx);
    Render.socketPage(Nav._lastOpts);
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

  /* ============================================================
   *  商店（两个 tab：道具 | 宝石）
   * ============================================================ */
  shopPage(opts){
    opts = opts || {};
    const tab = opts.tab || 'item';
    const page = opts.page || 1;

    // tab 头
    let html = `<div style="display:flex;gap:6px;margin-bottom:6px;">
      <button class="btn ${tab==='item'?'primary':''}" onclick="Nav._show('shop',{tab:'item',page:1})">道具</button>
      <button class="btn ${tab==='gem'?'primary':''}" onclick="Nav._show('shop',{tab:'gem',page:1})">宝石</button>
    </div>`;

    if(tab === 'item'){
      html += Render._shopItemTab(page);
    }else{
      html += Render._shopGemTab(page);
    }
    $('shopList').innerHTML = html;
    $('shopPager').innerHTML = '';
  },

  _shopItemTab(page){
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
    if(total > 1){
      html += `<div class="pager">
        <button ${page<=1?'disabled':''} onclick="Nav._show('shop',{tab:'item',page:${page-1}})">◀</button>
        <span>${page} / ${total}</span>
        <button ${page>=total?'disabled':''} onclick="Nav._show('shop',{tab:'item',page:${page+1}})">▶</button>
      </div>`;
    }
    return html;
  },

  _shopGemTab(page){
    const order = ['red','blue','green','purple','orange','black','yellow','white'];
    let html = `<div class="card">
      <div class="card-title">💎 宝石镶嵌</div>
      <div class="card-meta">打开镶嵌界面，把宝石镶到装备上</div>
      <div class="card-actions"><button class="btn primary" onclick="Shop.openSocketPage()">打开镶嵌</button></div>
    </div>`;

    html += `<div class="dim" style="font-size:11px;padding:6px 0 4px;">普通宝石 · ${GEM_SHOP_PRICE}金/颗</div>`;
    order.forEach(k=>{
      const g = GEMS[k];
      html += `<div class="card" style="padding:6px 8px;">
        <div class="card-title" style="font-size:12px;">
          <span style="color:${g.color};font-size:16px;">${g.icon}</span>
          ${g.name}
          <span class="dim">[普通]</span>
        </div>
        <div class="card-meta">${g.desc} +${g.val[0]}${g.type==='pct'?'%':''} · ${GEM_SHOP_PRICE}金</div>
        <div class="card-actions"><button class="btn" onclick="Shop.buyGem('${k}')">购买</button></div>
      </div>`;
    });
    return html;
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
      ? `<button ${page<=1?'disabled':''} onclick="Nav._show('quest',{page:${page-1}})">◀</button><span>${page} / ${total}</span><button ${page>=total?'disabled':''} onclick="Nav._show('quest',{page:${page+1}})">▶</button>`
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
        const alive = petAlive(p);
        const maxHp = st.hp;
        const hpPct = clamp(p.hp/maxHp, 0, 1) * 100;
        const skills = p.skills && p.skills.length
          ? p.skills.map(k=>PET_SKILLS[k].name).join(' / ')
          : '无';
        const skillDesc = p.skills && p.skills.length
          ? p.skills.map(k=>{
              const sk = PET_SKILLS[k];
              const cdTxt = PET_SKILL_CD[k] ? `（CD ${PET_SKILL_CD[k]} 回合）` : '（被动）';
              return `<div class="dim" style="font-size:10px;">· ${sk.name}：${sk.desc}${cdTxt}</div>`;
            }).join('')
          : '';
        const statusTxt = !alive
          ? `<span style="color:#c88;font-size:10px;">[复活中 ${Math.ceil((p.downUntil - Date.now())/1000)}s]</span>`
          : (isActive ? `<span style="color:#8f8;font-size:10px;">[已上阵]</span>` : '');
        html += `<div class="card">
          <div class="card-title">${p.avatar} <span class="${q.cls}">${p.name}</span> <span class="dim">[${q.name}] Lv.${p.lv}</span> ${statusTxt}</div>
          <div class="card-meta">HP ${Math.floor(p.hp)}/${maxHp} · 攻${st.atk} 防${st.def} 速${st.spd} | 被动 攻+${st.pAtk} 防+${st.pDef} 速+${st.pSpd}</div>
          <div class="bar" style="height:8px;margin-bottom:4px;"><i style="width:${hpPct}%;background:#7a8a7a;"></i></div>
          <div class="card-meta">技能(${p.skills.length}): ${skills}</div>
          ${skillDesc}
          <div class="card-meta">经验 ${p.exp}/${p.lv*150}</div>
          <div class="card-actions">
            ${isActive
              ? `<button class="btn ghost" onclick="Pet.toggle('${p.uid}')">下阵</button>`
              : `<button class="btn" onclick="Pet.toggle('${p.uid}')" ${activeCount>=limit || !alive ?'disabled':''}>${!alive?'复活中':(activeCount>=limit?'已满':'上阵')}</button>`}
            <button class="btn danger" onclick="Pet.release('${p.uid}')">放生</button>
          </div>
        </div>`;
      });
    }
    $('petBody').innerHTML = html;
  }
};

setInterval(()=>{
  if(!$('page-home').classList.contains('hidden')) Render.top();
  if(Game.battle) Combat.render();
}, 1500);