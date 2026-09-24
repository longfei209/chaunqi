/* ============================================================
 *  render.js  —— 导航 + 各页面渲染
 *  新增：主页"下一层"按钮 + 技能升级页 + 书页显示
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
      case 'refine': Render.refinePage(opts); break;
      case 'shop':   Render.shopPage(opts); break;
      case 'quest':  Render.questPage(opts && opts.page || 1); break;
      case 'pet':    Render.petPage(); break;
      case 'socket': Render.socketPage(opts); break;
      case 'skill':  Render.skillPage(); break;
      case 'save':   Render.savePage(); break;
      case 'load':   Render.loadPage(); break;
      case 'battle': Combat.render(); break;
    }
  }
};

function _rangeTxt(baseMin, baseMax, refineVal){
  const baseTxt = `${baseMin}-${baseMax}`;
  if(!refineVal) return baseTxt;
  return `${baseTxt}[+${refineVal}]`;
}
function _hpTxt(baseHp, refineHp){
  const baseTxt = `+${baseHp}`;
  if(!refineHp) return baseTxt;
  return `${baseTxt}[+${refineHp}]`;
}
function _socketsTxt(eq){
  if(!eq || !eq.sockets) return '○○○';
  return eq.sockets.map(g => g ? GEMS[g.key].icon : '○').join('');
}

/* 技能升级费用 */
function _skillCost(targetLv){
  return SKILL_UPGRADE_COST[targetLv] || 0;
}
/* 技能当前效果描述 */
function _skillEffectDesc(key){
  const lv = getSkillLv(key);
  switch(key){
    case 'liehuo': return `伤害 ×${skillDmgMul('liehuo', 1.8).toFixed(2)}`;
    case 'banyue': return `群体 ×${skillDmgMul('banyue', 0.9).toFixed(2)}`;
    case 'zhiyu':  return `回血 ${(skillHealRate('zhiyu', 0.25)*100).toFixed(1)}%`;
    case 'du':     return `每回合 -${skillPoisonDmg()} HP，持续 3 回合`;
    case 'zhanshen': return `攻防 +${Math.round((skillBuffMul('zhanshen', 1.3)-1)*100)}%，3 回合`;
  }
  return '';
}

const Render = {
  top(){
    const p = Game.player;
    const mHp = playerMaxHp(), mMp = playerMaxMp();
    $('tLv').textContent = p.lv;
    $('tHpBar').style.width = clamp(p.hp/mHp,0,1)*100 + '%';
    $('tHpTxt').textContent = Math.floor(p.hp) + '/' + mHp;
    $('tMpBar').style.width = clamp(p.mp/mMp,0,1)*100 + '%';
    $('tMpTxt').textContent = Math.floor(p.mp) + '/' + mMp;
    const need = p.lv * 120;
    $('tExpBar').style.width = clamp(p.exp/need,0,1)*100 + '%';
    $('tExpTxt').textContent = p.exp + '/' + need;
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
    const hasNextFloor = fi + 1 < ar.floors.length;

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

    // 打完 BOSS 且不是最后一层 → 显示"下一层"按钮
    if(bossDead && hasNextFloor){
      html += `<button class="btn primary" style="padding:14px;font-size:15px;margin-top:6px;" onclick="Render._enterFloor(${fi+1})">
        ⬇ 进入第 ${fi+2} 层
      </button>`;
    }

    box.innerHTML = html;
  },

  areaPage(){
    let html = '';
    AREAS.forEach(ar=>{
      const locked = !ar.unlock && !(Game.flags && Game.flags[ar.id]);
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
      <div class="card-title">人物 · Lv.${Game.player.lv}</div>
      <div class="card-meta">HP ${Math.floor(Game.player.hp)}/${playerMaxHp()} · MP ${Math.floor(Game.player.mp)}/${playerMaxMp()}</div>
      <div class="card-meta">攻击 ${a.atkMin}-${a.atkMax}</div>
      <div class="card-meta">防御 ${a.defMin}-${a.defMax}</div>
      <div class="card-meta">速度 ${a.spd}</div>
      <div class="card-meta">生命 +${a.addHp}</div>
      <div class="card-meta">暴击率 ${(a.crit*100).toFixed(1)}% · 暴伤 ${(a.critD*100).toFixed(0)}%</div>
      <div class="card-meta">连击 ${(a.combo*100).toFixed(1)}% · 反击 ${(a.counter*100).toFixed(1)}%</div>
      <div class="card-meta">吸血 ${(a.lsPct*100).toFixed(1)}% · 固吸 ${a.lsFlat}</div>
      <div class="card-actions"><button class="btn" onclick="Equip.autoBest()">一键最强</button></div>
    </div>`;
    SLOT_ORDER.forEach(s=>{
      const e = Game.worn[s];
      if(e){
        const base = equipBaseRange(e);
        const atkTxt = _rangeTxt(base.atkMin, base.atkMax, e.refineAtk);
        const defTxt = _rangeTxt(base.defMin, base.defMax, e.refineDef);
        const hpTxt  = _hpTxt(base.hp, e.refineHp);
        const q = QUALITY[e.quality];
        html += `<div class="card clickable" onclick="Render.showEquipDetail('worn','${s}')">
          <div class="card-title ${q.cls}">${e.name} <span class="dim">[${q.name}] ${SLOT_NAME[s]}</span></div>
          <div class="card-meta">攻 ${atkTxt} 防 ${defTxt} 速 ${base.spd} HP ${hpTxt} · 洗练 ${e.refineTimes}/3 · ${_socketsTxt(e)}</div>
          <div class="card-actions worn-actions">
            <button class="btn" onclick="event.stopPropagation();Nav.go('socket',{type:'worn',slot:'${s}'})">镶嵌</button>
            <button class="btn" onclick="event.stopPropagation();Nav.go('refine',{type:'worn',slot:'${s}'})">洗练</button>
            <button class="btn" onclick="event.stopPropagation();Equip.unwear('${s}')">卸下</button>
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

    let headerHtml = `<div class="dim" style="font-size:11px;padding:0 0 6px;">
      金 ${fmt(Game.player.gold)} · 📖 ${Game.pages||0} 页 · 红 ${Game.player.potion} · 蓝 ${Game.player.potionMp} · 材 ${Game.mat}
    </div>`;
    headerHtml += `<div style="display:flex;gap:5px;margin-bottom:6px;">
      <button class="btn ${tab==='equip'?'primary':''}" onclick="Nav._show('bag',{tab:'equip',page:1})">装备</button>
      <button class="btn ${tab==='gem'?'primary':''}" onclick="Nav._show('bag',{tab:'gem',page:1})">宝石</button>
      <button class="btn ${tab==='craft'?'primary':''}" onclick="Nav._show('bag',{tab:'craft',page:1})">合成</button>
    </div>`;

    let result;
    if(tab === 'equip') result = Render._bagEquipTab(page);
    else if(tab === 'gem') result = Render._bagGemTab(page);
    else result = Render._bagCraftTab(page);

    $('bagList').innerHTML = headerHtml + result.list;
    $('bagPager').innerHTML = result.pager || '';
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
        const base = equipBaseRange(e);
        const atkTxt = _rangeTxt(base.atkMin, base.atkMax, e.refineAtk);
        const defTxt = _rangeTxt(base.defMin, base.defMax, e.refineDef);
        const hpTxt  = _hpTxt(base.hp, e.refineHp);
        const cmp = Equip.compareToWorn(e);

        const cmpLine = (label, nVal, oVal, isPct) => {
          if(nVal === 0 && oVal === 0) return '';
          const diff = nVal - oVal;
          if(diff === 0) return '';
          const up = diff > 0;
          const cls = up ? 'cmp-up' : 'cmp-down';
          const arrow = up ? '↑' : '↓';
          const text = isPct ? signedPct(diff) : signed(diff);
          return `<span style="margin-right:6px;">${label} ${text} ${arrow}</span>`;
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

        html += `<div class="card clickable" onclick="Render.showEquipDetail('bag',${idx})">
          <div class="card-title ${q.cls}">${e.name} <span class="dim">[${q.name}]</span></div>
          <div class="card-meta">攻 ${atkTxt} 防 ${defTxt} 速 ${base.spd} HP ${hpTxt} · 洗练 ${e.refineTimes}/3 · ${_socketsTxt(e)}</div>
          <div class="card-meta" style="font-size:11px;">${cmpHtml || '<span class="dim">无对比</span>'}</div>
          <div class="card-actions bag-actions">
            <button class="btn" onclick="event.stopPropagation();Equip.wear(${idx})">穿戴</button>
            <button class="btn" onclick="event.stopPropagation();Nav.go('socket',{type:'bag',idx:${idx}})">镶嵌</button>
            <button class="btn" onclick="event.stopPropagation();Nav.go('refine',{type:'bag',idx:${idx}})">洗练</button>
            <button class="btn" onclick="event.stopPropagation();Equip.sell(${idx})">出售</button>
            <button class="btn" onclick="event.stopPropagation();Equip.decompose(${idx})">分解</button>
          </div>
        </div>`;
      });
    }
    let pagerHtml = '';
    if(total > 1){
      pagerHtml = `<div class="pager">
        <button ${page<=1?'disabled':''} onclick="Nav._show('bag',{tab:'equip',page:${page-1}})">◀</button>
        <span>${page} / ${total}</span>
        <button ${page>=total?'disabled':''} onclick="Nav._show('bag',{tab:'equip',page:${page+1}})">▶</button>
      </div>`;
    }
    return { list: html, pager: pagerHtml };
  },

  _bagGemTab(page){
    page = page || 1;
    const order = ['red','blue','green','purple','orange','black','yellow','white'];
    const qOrder = ['legend','rare','normal'];

    const groups = {};
    Game.gems.forEach(g=>{
      const k = g.key + '_' + g.quality;
      if(!groups[k]) groups[k] = { key: g.key, quality: g.quality, count: 0 };
      groups[k].count++;
    });
    const gemList = Object.values(groups).sort((a,b)=>{
      const ai = order.indexOf(a.key), bi = order.indexOf(b.key);
      if(ai !== bi) return ai - bi;
      return qOrder.indexOf(a.quality) - qOrder.indexOf(b.quality);
    });

    const PAGE = PAGE_SIZE.bagGem;
    const total = Math.max(1, Math.ceil(gemList.length / PAGE));
    page = clamp(page, 1, total);
    const start = (page-1) * PAGE;
    const slice = gemList.slice(start, start + PAGE);

    let html = `<div class="dim" style="font-size:11px;padding:0 0 4px;">宝石 ${Game.gems.length} 颗</div>`;

    if(gemList.length === 0){
      html += `<div class="card dim">暂无宝石（怪物掉落或商店购买）</div>`;
    }else{
      slice.forEach(it=>{
        const cfg = GEMS[it.key];
        const qCfg = GEM_QUALITY[it.quality];
        const statVal = cfg.type==='pct'
          ? gemValue(it.key,it.quality)+'%'
          : '+'+gemValue(it.key,it.quality);
        html += `<div class="card" style="padding:6px 8px;">
          <div class="card-title" style="font-size:13px;margin-bottom:4px;">
            <span style="color:${cfg.color};font-size:16px;">${cfg.icon}</span>
            ${cfg.name}
            <span style="float:right;color:#9d9;">×${it.count}</span>
          </div>
          <div style="font-size:11px;color:#aaa;margin-bottom:2px;">${qCfg.name}</div>
          <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:4px;">${cfg.desc} ${statVal}</div>
          <div class="card-actions">
            <button class="btn" onclick="Render._openGemDecompose('${it.key}','${it.quality}')">分解</button>
          </div>
        </div>`;
      });
    }
    let pagerHtml = '';
    if(total > 1){
      pagerHtml = `<div class="pager">
        <button ${page<=1?'disabled':''} onclick="Nav._show('bag',{tab:'gem',page:${page-1}})">◀</button>
        <span>${page} / ${total}</span>
        <button ${page>=total?'disabled':''} onclick="Nav._show('bag',{tab:'gem',page:${page+1}})">▶</button>
      </div>`;
    }
    return { list: html, pager: pagerHtml };
  },

  _bagCraftTab(page){
    page = page || 1;
    const order = ['red','blue','green','purple','orange','black','yellow','white'];
    const qOrder = ['legend','rare','normal'];

    const fragGroups = [];
    order.forEach(k=>{
      const f = Game.fragments[k];
      if(!f) return;
      qOrder.forEach(q=>{
        if(f[q] > 0) fragGroups.push({ key:k, quality:q, count:f[q] });
      });
    });

    const PAGE = PAGE_SIZE.bagGem;
    const total = Math.max(1, Math.ceil(fragGroups.length / PAGE));
    page = clamp(page, 1, total);
    const start = (page-1) * PAGE;
    const slice = fragGroups.slice(start, start + PAGE);

    const totalFrags = fragGroups.reduce((s,x)=>s+x.count,0);
    let html = `<div class="dim" style="font-size:11px;padding:0 0 4px;">碎片 ${totalFrags} 个</div>`;

    if(fragGroups.length === 0){
      html += `<div class="card dim">暂无碎片（宝石分解或怪物掉落获得）</div>`;
    }else{
      slice.forEach(f=>{
        const cfg = GEMS[f.key];
        const qCfg = GEM_QUALITY[f.quality];
        html += `<div class="card" style="padding:6px 8px;">
          <div class="card-title" style="font-size:13px;">
            <span style="color:${cfg.color};font-size:15px;">🧩</span>
            ${cfg.name}碎片
            <span class="dim">[${qCfg.name}]</span>
            <span style="float:right;color:#9d9;">×${f.count}</span>
          </div>
          <div class="card-actions" style="margin-top:6px;">
            ${f.quality==='normal' && f.count>=3 ? `<button class="btn" onclick="Render._craftGem('${f.key}')">合成</button>` : ''}
            ${f.quality==='normal' && f.count>=6 ? `<button class="btn" onclick="Render._craftAllGem('${f.key}')">合成全部</button>` : ''}
            ${f.quality==='normal' && f.count>=3 ? `<button class="btn ghost" onclick="Render._upgradeFrag('${f.key}','normal','rare')">升级稀有</button>` : ''}
            ${f.quality==='rare' && f.count>=3 ? `<button class="btn ghost" onclick="Render._upgradeFrag('${f.key}','rare','legend')">升级传说</button>` : ''}
            ${f.quality==='legend' && f.count>=3 ? `<button class="btn primary" onclick="Render._craftLegendGem('${f.key}')">合成传说宝石</button>` : ''}
          </div>
        </div>`;
      });
    }
    let pagerHtml = '';
    if(total > 1){
      pagerHtml = `<div class="pager">
        <button ${page<=1?'disabled':''} onclick="Nav._show('bag',{tab:'craft',page:${page-1}})">◀</button>
        <span>${page} / ${total}</span>
        <button ${page>=total?'disabled':''} onclick="Nav._show('bag',{tab:'craft',page:${page+1}})">▶</button>
      </div>`;
    }
    return { list: html, pager: pagerHtml };
  },

  _craftGem(key){
    const g = craftGem(key);
    if(!g) return toast("碎片不足");
    toast(`合成成功：${GEMS[g.key].name}（${GEM_QUALITY[g.quality].name}）`);
    Save.auto();
    Nav._show('bag',{tab:'craft',page:1});
    Render.top();
  },
  _craftAllGem(key){
    let count = 0;
    while(craftGem(key)) count++;
    if(count === 0) return toast("碎片不足");
    toast(`合成了 ${count} 颗${GEMS[key].name}`);
    Save.auto();
    Nav._show('bag',{tab:'craft',page:1});
    Render.top();
  },
  _upgradeFrag(key, fromQ, toQ){
    const ok = upgradeFragment(key, fromQ, toQ);
    if(!ok) return toast("碎片不足");
    toast(`升级成功：${GEMS[key].name}碎片（${GEM_QUALITY[toQ].name}）`);
    Save.auto();
    Nav._show('bag',{tab:'craft',page:1});
  },
  _craftLegendGem(key){
    const g = craftLegendGem(key);
    if(!g) return toast("传说碎片不足（需 3 个）");
    toast(`合成成功：${GEMS[g.key].name}（传说）`);
    Save.auto();
    Nav._show('bag',{tab:'craft',page:1});
    Render.top();
  },

  _openGemDecompose(key, quality){
    const total = Game.gems.filter(g => g.key === key && g.quality === quality).length;
    if(total === 0) return toast("没有宝石");
    const cfg = GEMS[key];
    const qCfg = GEM_QUALITY[quality];

    let btns = '';
    if(total >= 1) btns += `<button class="btn" onclick="Render._doDecomposeGem('${key}','${quality}',1)">分解 1 颗</button>`;
    if(total >= 3) btns += `<button class="btn" onclick="Render._doDecomposeGem('${key}','${quality}',3)">分解 3 颗</button>`;
    if(total > 1)  btns += `<button class="btn danger" onclick="Render._doDecomposeGem('${key}','${quality}',${total})">全部 ×${total}</button>`;

    const html = `
      <div class="modal-title">
        <span><span style="color:${cfg.color};font-size:16px;">${cfg.icon}</span> ${cfg.name} <span class="dim">[${qCfg.name}]</span></span>
        <button class="modal-close" onclick="Render.closeEquipDetail()">✕</button>
      </div>
      <div class="modal-row"><span class="lbl">拥有</span><span>×${total}</span></div>
      <div class="modal-actions" style="margin-top:10px;">${btns}</div>
      <div class="modal-actions" style="margin-top:6px;">
        <button class="btn ghost" onclick="Render.closeEquipDetail()">取消</button>
      </div>
    `;
    $('equipModalBody').innerHTML = html;
    $('equipModal').classList.remove('hidden');
  },
  _doDecomposeGem(key, quality, count){
    const actual = decomposeGemsByKeyQuality(key, quality, count);
    if(actual <= 0) return toast("分解失败");
    const qCfg = GEM_QUALITY[quality];
    toast(`分解 ${GEMS[key].name} ×${actual} → ${actual*2} 个${qCfg.name}碎片`);
    Save.auto();
    Render.closeEquipDetail();
    const page = (Nav._lastOpts && Nav._lastOpts.page) || 1;
    Nav._show('bag',{tab:'gem',page});
    Render.top();
  },

  showEquipDetail(refType, refId){
    let eq = null;
    if(refType === 'worn') eq = Game.worn[refId];
    else if(refType === 'bag') eq = Game.bag[refId];
    if(!eq) return;

    const q = QUALITY[eq.quality];
    const base = equipBaseRange(eq);
    const gemB = equipGemBonus(eq);
    const afx = equipAffixDesc(eq);
    const socketsTxt = (eq.sockets||[]).map(g=>g?GEMS[g.key].icon:'○').join(' ');

    const atkTxt = _rangeTxt(base.atkMin, base.atkMax, eq.refineAtk);
    const defTxt = _rangeTxt(base.defMin, base.defMax, eq.refineDef);
    const hpTxt  = _hpTxt(base.hp, eq.refineHp);

    let actions = '';
    if(refType === 'bag'){
      actions = `
        <button class="btn" onclick="Equip.wear(${refId});Render.closeEquipDetail()">穿戴</button>
        <button class="btn" onclick="Render.closeEquipDetail();Nav.go('socket',{type:'bag',idx:${refId}})">镶嵌</button>
        <button class="btn" onclick="Render.closeEquipDetail();Nav.go('refine',{type:'bag',idx:${refId}})">洗练</button>
        <button class="btn" onclick="Equip.sell(${refId});Render.closeEquipDetail()">出售</button>
        <button class="btn" onclick="Equip.decompose(${refId});Render.closeEquipDetail()">分解</button>
      `;
    }else{
      actions = `
        <button class="btn" onclick="Render.closeEquipDetail();Nav.go('socket',{type:'worn',slot:'${refId}'})">镶嵌</button>
        <button class="btn" onclick="Render.closeEquipDetail();Nav.go('refine',{type:'worn',slot:'${refId}'})">洗练</button>
        <button class="btn" onclick="Equip.unwear('${refId}');Render.closeEquipDetail()">卸下</button>
      `;
    }

    const html = `
      <div class="modal-title">
        <span class="${q.cls}">${eq.name} <span class="dim">[${q.name}]</span></span>
        <button class="modal-close" onclick="Render.closeEquipDetail()">✕</button>
      </div>
      <div class="modal-row"><span class="lbl">槽位</span><span>${SLOT_NAME[eq.slot]}</span></div>
      <div class="modal-row"><span class="lbl">攻击</span><span>${atkTxt}</span></div>
      <div class="modal-row"><span class="lbl">防御</span><span>${defTxt}</span></div>
      <div class="modal-row"><span class="lbl">速度</span><span>${base.spd}</span></div>
      <div class="modal-row"><span class="lbl">生命</span><span>${hpTxt}</span></div>
      ${(gemB.atk+gemB.def+gemB.hp+gemB.spd+gemB.combo+gemB.counter+gemB.lsPct+gemB.lsFlat+gemB.crit) > 0
        ? `<div class="modal-row"><span class="lbl">宝石加成</span><span>攻+${gemB.atk} 防+${gemB.def} 速+${gemB.spd} HP+${gemB.hp} 连${gemB.combo}% 反${gemB.counter}% 吸${gemB.lsPct}% 固${gemB.lsFlat} 暴${gemB.crit}%</span></div>`
        : ''}
      <div class="modal-row"><span class="lbl">词条</span><span>${afx || '无'}</span></div>
      <div class="modal-row"><span class="lbl">孔位</span><span>${socketsTxt}</span></div>
      <div class="modal-row"><span class="lbl">洗练</span><span>${eq.refineTimes}/3</span></div>
      <div class="modal-actions">${actions}</div>
    `;
    $('equipModalBody').innerHTML = html;
    $('equipModal').classList.remove('hidden');
  },
  closeEquipDetail(){
    $('equipModal').classList.add('hidden');
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
        const statVal = cfg.type==='pct'
          ? gemValue(gem.key,gem.quality)+'%'
          : '+'+gemValue(gem.key,gem.quality);
        html += `<div class="card" style="flex:0 0 calc(33% - 4px);padding:5px;align-items:center;cursor:pointer;" onclick="Render._pickGem('${gem.uid}')">
          <div style="font-size:20px;color:${cfg.color};">${cfg.icon}</div>
          <div style="font-size:9px;">${cfg.name}</div>
          <div style="font-size:9px;color:#888;">${qCfg.name}</div>
          <div style="font-size:11px;font-weight:700;color:#fff;">${cfg.desc} ${statVal}</div>
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

  refinePage(opts){
    opts = opts || {};
    let eq = null;
    if(opts.type === 'worn') eq = Game.worn[opts.slot];
    else if(opts.type === 'bag') eq = Game.bag[opts.idx];
    else if(typeof opts === 'number') eq = Game.bag[opts];

    if(!eq){ Nav.back(); return; }

    const base = equipBaseRange(eq), q = QUALITY[eq.quality];
    const risk = Equip.refineRisk(eq);
    const afx = equipAffixDesc(eq);
    const isWorn = opts.type === 'worn';

    const atkTxt = _rangeTxt(base.atkMin, base.atkMax, eq.refineAtk);
    const defTxt = _rangeTxt(base.defMin, base.defMax, eq.refineDef);
    const hpTxt  = _hpTxt(base.hp, eq.refineHp);

    let html = `<div class="card">
      <div class="card-title ${q.cls}">${eq.name} [${q.name}]${isWorn?' <span class="dim">(装备中)</span>':''}</div>
      <div class="card-meta">区间 攻 ${atkTxt} 防 ${defTxt} HP ${hpTxt}</div>
      <div class="card-meta">速${base.spd} ${afx?'· '+afx:''}</div>
      <div class="card-meta">洗练次数 ${eq.refineTimes}/3 · 持有材料 ${Game.mat}</div>
      <div class="card-meta">本次风险：${(risk*100).toFixed(1)}% 破损</div>
      <div class="card-actions">
        <button class="btn primary" onclick="Render._doRefine()">执行洗练(耗1材料)</button>
      </div>
    </div>`;
    $('refineBody').innerHTML = html;
  },
  _doRefine(){
    const opts = Nav._lastOpts || {};
    let eq = null;
    if(opts.type === 'worn') eq = Game.worn[opts.slot];
    else if(opts.type === 'bag') eq = Game.bag[opts.idx];
    if(!eq) return;
    Equip.refine(eq);
  },

  /* ---------- 技能升级页 ---------- */
  skillPage(){
    const order = ['liehuo','banyue','zhiyu','du','zhanshen'];
    let html = `<div class="dim" style="font-size:12px;padding:0 0 8px;">
      📖 书页：<b style="color:#fff;">${Game.pages||0}</b> （商店 300 金/张）
    </div>`;

    order.forEach(k=>{
      const sk = SKILLS[k];
      const lv = getSkillLv(k);
      const maxed = lv >= sk.maxLv;
      const nextLv = lv + 1;
      const cost = maxed ? 0 : _skillCost(nextLv);
      const canUp = !maxed && (Game.pages||0) >= cost;

      html += `<div class="card">
        <div class="card-title">${sk.name} <span class="dim">Lv.${lv}/${sk.maxLv}</span></div>
        <div class="card-meta">${sk.desc} · ${_skillEffectDesc(k)}</div>
        <div class="card-meta">解锁 Lv.${sk.unlock} · 蓝耗 ${sk.mp} · CD ${sk.cd} 回合</div>
        ${maxed
          ? `<div class="card-meta" style="color:#9d9;">已满级</div>`
          : `<div class="card-meta">升级到 Lv.${nextLv} 需 📖 ${cost}</div>
             <div class="card-actions">
               <button class="btn ${canUp?'primary':''}" onclick="Render._doSkillUp('${k}')" ${canUp?'':'disabled'}>升级</button>
             </div>`}
      </div>`;
    });

    $('skillBody').innerHTML = html;
  },
  _doSkillUp(key){
    const sk = SKILLS[key];
    const lv = getSkillLv(key);
    if(lv >= sk.maxLv) return toast("已满级");
    const cost = _skillCost(lv + 1);
    if((Game.pages||0) < cost) return toast(`书页不足（需 ${cost}）`);
    Game.pages -= cost;
    Game.skillLv[key] = lv + 1;
    toast(`${sk.name} 升级到 Lv.${lv+1}！`);
    Save.auto();
    Render.skillPage();
    Render.top();
  },

  shopPage(opts){
    opts = opts || {};
    const tab = opts.tab || 'item';
    const page = opts.page || 1;

    let html = `<div class="dim" style="font-size:12px;padding:0 0 6px;">
      💰 金币：<b style="color:#d8b;">${fmt(Game.player.gold)}</b> · 📖 书页：<b style="color:#fff;">${Game.pages||0}</b>
    </div>`;

    html += `<div style="display:flex;gap:6px;margin-bottom:6px;">
      <button class="btn ${tab==='item'?'primary':''}" onclick="Nav._show('shop',{tab:'item',page:1})">道具</button>
      <button class="btn ${tab==='gem'?'primary':''}" onclick="Nav._show('shop',{tab:'gem',page:1})">宝石</button>
      <button class="btn ${tab==='page'?'primary':''}" onclick="Nav._show('shop',{tab:'page',page:1})">书页</button>
    </div>`;

    if(tab === 'item') html += Render._shopItemTab(page);
    else if(tab === 'gem') html += Render._shopGemTab(page);
    else html += Render._shopPageTab(page);

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
      if(!b) return;
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
    page = page || 1;
    const order = ['red','blue','green','purple','orange','black','yellow','white'];

    const items = [];
    items.push({
      label: '💎 宝石商店',
      sub: '购买宝石后，去「人物」或「背包」点装备卡片 → 镶嵌',
      action: null
    });
    order.forEach(k=>{
      const g = GEMS[k];
      items.push({
        label: `${g.icon} ${g.name} [普通]`,
        sub: `${g.desc} +${g.val[0]}${g.type==='pct'?'%':''} · ${GEM_SHOP_PRICE}金`,
        action: `Shop.buyGem('${k}')`
      });
    });

    const total = Math.ceil(items.length / PAGE_SIZE.shop);
    page = clamp(page, 1, total);
    const start = (page-1) * PAGE_SIZE.shop;
    const slice = items.slice(start, start + PAGE_SIZE.shop);

    let html = '';
    slice.forEach(it=>{
      html += `<div class="card" style="padding:6px 8px;">
        <div class="card-title" style="font-size:12px;">${it.label}</div>
        <div class="card-meta">${it.sub}</div>
        ${it.action ? `<div class="card-actions"><button class="btn" onclick="${it.action}">购买</button></div>` : ''}
      </div>`;
    });

    if(total > 1){
      html += `<div class="pager">
        <button ${page<=1?'disabled':''} onclick="Nav._show('shop',{tab:'gem',page:${page-1}})">◀</button>
        <span>${page} / ${total}</span>
        <button ${page>=total?'disabled':''} onclick="Nav._show('shop',{tab:'gem',page:${page+1}})">▶</button>
      </div>`;
    }
    return html;
  },

  _shopPageTab(page){
    page = page || 1;
    const items = [];
    items.push({
      label: '📖 书页 ×1',
      sub: `${PAGE_PRICE}金 · 用于技能升级`,
      action: `Shop.buyPage(1)`
    });
    items.push({
      label: '📖 书页 ×5',
      sub: `${PAGE_PRICE*5}金`,
      action: `Shop.buyPage(5)`
    });
    items.push({
      label: '📖 书页 ×10',
      sub: `${PAGE_PRICE*10}金`,
      action: `Shop.buyPage(10)`
    });
    items.push({
      label: '💰 出售书页',
      sub: `每张 ${PAGE_SELL} 金 · 当前拥有 ${Game.pages||0} 页`,
      action: `Shop.sellPage(1)`
    });

    let html = '';
    items.forEach(it=>{
      html += `<div class="card" style="padding:6px 8px;">
        <div class="card-title" style="font-size:12px;">${it.label}</div>
        <div class="card-meta">${it.sub}</div>
        <div class="card-actions"><button class="btn" onclick="${it.action}">${it.label.includes('出售')?'出售':'购买'}</button></div>
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
  },

  savePage(){
    const fmtTime = (ts)=>{
      if(!ts) return '';
      const d = new Date(ts);
      const pad = n => n<10?'0'+n:''+n;
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    let html = `<div class="dim" style="font-size:12px;padding:0 0 8px;">
      手动存档有 2 个槽位，覆盖前会确认。
    </div>`;

    const autoSum = Save.getSummary(Save.KEY_AUTO);
    html += `<div class="card" style="opacity:.7;">
      <div class="card-title">🤖 自动存档 <span class="dim">[系统]</span></div>
      <div class="card-meta">${autoSum
        ? `Lv.${autoSum.lv} · ${fmt(autoSum.gold)}金 · ${fmtTime(autoSum.ts)}`
        : '暂无自动存档'}</div>
      <div class="card-meta dim" style="font-size:11px;">关键节点自动写入，不可手动覆盖</div>
    </div>`;

    const m1 = Save.getSummary(Save.KEY_M1);
    html += `<div class="card">
      <div class="card-title">📁 手动存档 1</div>
      <div class="card-meta">${m1
        ? `Lv.${m1.lv} · ${fmt(m1.gold)}金 · ${fmtTime(m1.ts)}`
        : '空槽'}</div>
      <div class="card-actions">
        <button class="btn ${m1?'danger':'primary'}" onclick="Render._doSave(1)">
          ${m1?'覆盖保存':'保存到槽 1'}
        </button>
      </div>
    </div>`;

    const m2 = Save.getSummary(Save.KEY_M2);
    html += `<div class="card">
      <div class="card-title">📁 手动存档 2</div>
      <div class="card-meta">${m2
        ? `Lv.${m2.lv} · ${fmt(m2.gold)}金 · ${fmtTime(m2.ts)}`
        : '空槽'}</div>
      <div class="card-actions">
        <button class="btn ${m2?'danger':'primary'}" onclick="Render._doSave(2)">
          ${m2?'覆盖保存':'保存到槽 2'}
        </button>
      </div>
    </div>`;

    $('saveBody').innerHTML = html;
  },

  _doSave(slot){
    const key = slot === 1 ? Save.KEY_M1 : Save.KEY_M2;
    const exists = Save.getSummary(key);
    if(exists){
      confirmBox(`覆盖手动存档 ${slot}？`, ()=>{
        Save.manual(slot);
        Render.savePage();
      });
    }else{
      Save.manual(slot);
      Render.savePage();
    }
  },

  loadPage(){
    const fmtTime = (ts)=>{
      if(!ts) return '';
      const d = new Date(ts);
      const pad = n => n<10?'0'+n:''+n;
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    let html = `<div class="dim" style="font-size:12px;padding:0 0 8px;">
      点击「读取」加载对应槽的进度（会覆盖当前进度）
    </div>`;

    const slots = [
      { id:'auto', key: Save.KEY_AUTO, label:'🤖 自动存档' },
      { id:1,      key: Save.KEY_M1,   label:'📁 手动存档 1' },
      { id:2,      key: Save.KEY_M2,   label:'📁 手动存档 2' }
    ];

    slots.forEach(sl=>{
      const sum = Save.getSummary(sl.key);
      html += `<div class="card">
        <div class="card-title">${sl.label}</div>
        <div class="card-meta">${sum
          ? `Lv.${sum.lv} · ${fmt(sum.gold)}金 · ${fmtTime(sum.ts)}`
          : '空槽'}</div>
        ${sum ? `<div class="card-actions"><button class="btn primary" onclick="Render._doLoad('${sl.id}')">读取</button></div>` : ''}
      </div>`;
    });

    $('loadBody').innerHTML = html;
  },

  _doLoad(slot){
    confirmBox("读取此存档会覆盖当前进度，确定？", ()=>{
      Save.load(slot);
    });
  }
};

setInterval(()=>{
  if(!$('page-home').classList.contains('hidden')) Render.top();
  if(Game.battle) Combat.render();
  if(typeof tickPetRespawn === 'function' && tickPetRespawn()){
    if(!$('page-pet').classList.contains('hidden')) Render.petPage();
    if(Game.battle) Combat.render();
    Render.top();
  }
}, 1500);