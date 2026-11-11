/* state.js — 单一状态源 + 存档 + 资源结算 + 出征/占领/征兵/编成
 * 需求文档《总览》GR-01~GR-12 与各用例「数据模型与状态管理规范」的实现。
 * 场景只通过本模块与 SaveService/BattleService 访问数据，不直接写 localStorage。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  var T = SG.THEME;
  var D = SG.DATA;
  var KEY = 'sg_sandbox_save_v1';

  var d = null;
  var listeners = [];
  var saveTimer = null;
  var seq = 1;

  function emit() { listeners.forEach(function (fn) { try { fn(d); } catch (e) { /* 不吞异常：输出到控制台 */ console.error('[state] listener error', e); } }); }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /** 六边形中心（flat-top, odd-q offset） */
  function center(q, r) {
    var s = T.HEX_S, h = Math.sqrt(3) * s;
    return { x: T.MAP_OX + q * 1.5 * s, y: T.MAP_OY + r * h + (q % 2) * (h / 2) };
  }

  function hexPoints(cx, cy, s) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 180 * (60 * i);
      pts.push({ x: cx + s * Math.cos(a), y: cy + s * Math.sin(a) });
    }
    return pts;
  }

  /** 用几何距离判定相邻，避免 offset 坐标邻居表出错 */
  function isAdjacent(a, b) {
    if (!a || !b) { return false; }
    var p = center(a.q, a.r), q = center(b.q, b.r);
    return Math.hypot(p.x - q.x, p.y - q.y) < Math.sqrt(3) * T.HEX_S * 1.15;
  }

  function stateOf(q, r) {
    for (var i = 0; i < D.STATES.length; i++) {
      var s = D.STATES[i];
      if (q >= s.q0 && q <= s.q1 && r >= s.r0 && r <= s.r1) { return s; }
    }
    return D.STATES[0];
  }

  function isPassSpot(st, q, r) {
    return (q === st.q0 + 1 && r === st.r0 + 2) || (q === st.q0 + 4 && r === st.r0 + 1);
  }

  function countLands() {
    return d.tiles.filter(function (t) { return t.owner === 'player'; }).length;
  }

  function countCities() {
    return d.tiles.filter(function (t) { return t.owner === 'player' && t.type === 'city'; }).length;
  }

  function recomputeYield() {
    var extra = { wood: 0, iron: 0, stone: 0, grain: 0 };
    d.tiles.forEach(function (t) {
      if (t.owner === 'player' && t.yield && t.yield.res) { extra[t.yield.res] += t.yield.amount; }
    });
    D.RES_KEYS.forEach(function (k) {
      d.player.res[k].yield = D.INITIAL.baseYield + extra[k];
    });
  }

  function recomputePower() {
    d.player.lands = countLands();
    d.player.power = Math.round(d.player.lands * 120 + countCities() * 800 + d.army.soldiers / 100);
    SG.BattleService.refreshPower(d.currentTeam);
  }

  function checkSeasonWin() {
    if (d.season.won) { return; }
    if (d.player.lands >= D.SEASON.landsGoal || countCities() >= D.SEASON.citiesGoal) {
      d.season.won = true;
    }
  }

  function generate(seed) {
    var rnd = mulberry32(seed);
    var tiles = [];
    for (var q = 0; q < D.COLS; q++) {
      for (var r = 0; r < D.ROWS; r++) {
        var st = stateOf(q, r);
        var type, level = 1 + Math.floor(rnd() * 4);
        if (q === st.capital.q && r === st.capital.r) {
          type = 'city'; level = 4;
        } else if (isPassSpot(st, q, r)) {
          type = 'pass'; level = 4;
        } else {
          var x = rnd();
          if (x < 0.08) { type = 'water'; }
          else if (x < 0.30) { type = 'plain'; }
          else if (x < 0.45) { type = 'forest'; }
          else if (x < 0.58) { type = 'mine'; }
          else if (x < 0.68) { type = 'quarry'; }
          else if (x < 0.84) { type = 'farm'; }
          else { type = 'plain'; }
        }
        var terr = D.TERRAIN[type];
        var owner = (st.id === D.PLAYER_STATE) ? 'neutral' : st.id;
        var garrison = 0;
        if (owner !== 'neutral' && owner !== 'player') {
          garrison = type === 'city' ? 6000 : (type === 'pass' ? 2400 : level * 800);
        }
        tiles.push({
          q: q, r: r, state: st.id, type: type, level: level,
          owner: owner, garrison: garrison,
          yield: terr.res ? { res: terr.res, amount: D.YIELD_PER_TILE } : null
        });
      }
    }

    var model = {
      version: 1,
      seed: seed,
      tickCount: 0,
      tiles: tiles,
      player: {
        name: '刘备你别走',
        fame: D.INITIAL.fame,
        lands: 0,
        power: 0,
        currency: { jade: D.INITIAL.jade, gold: D.INITIAL.gold, coin: D.INITIAL.coin },
        res: {}
      },
      army: { q: 2, r: 6, soldiers: 12000, stamina: D.INITIAL.stamina, status: 'idle' },
      city: { level: D.INITIAL.cityLevel, capacity: D.INITIAL.cityLevel * 5000 },
      heroes: D.HEROES.map(function (h) {
        return { id: h.id, name: h.name, arms: h.arms, force: h.force, soldiers: h.soldiers, status: 'idle', tactics: [null, null] };
      }),
      teams: [
        { index: 1, heroIds: ['h1', 'h2', 'h3'], power: 0 },
        { index: 2, heroIds: ['h4', 'h5'], power: 0 }
      ],
      currentTeam: 1,
      tacticPoints: D.INITIAL.tacticPoints,
      assignments: [],
      season: { day: 1, won: false }
    };

    D.RES_KEYS.forEach(function (k) {
      model.player.res[k] = {
        cur: D.INITIAL.res[k].cur,
        cap: D.INITIAL.res[k].cap,
        yield: D.INITIAL.baseYield,
        full: false
      };
    });

    /* 玩家初始：主城 + 周边 4 格 */
    var home = model.tiles.find(function (t) { return t.q === 2 && t.r === 6; });
    if (home) { home.type = 'city'; home.level = 3; home.owner = 'player'; home.garrison = 0; home.yield = null; }
    var near = model.tiles.filter(function (t) {
      return t !== home && t.type !== 'water' && isAdjacent(t, home);
    }).slice(0, 4);
    near.forEach(function (t) { t.owner = 'player'; t.garrison = 0; });

    return model;
  }

  var State = {
    get data() { return d; },

    onChange: function (fn) { if (listeners.indexOf(fn) < 0) { listeners.push(fn); } },
    offChange: function (fn) { listeners = listeners.filter(function (f) { return f !== fn; }); },

    center: center,
    hexPoints: hexPoints,
    isAdjacent: isAdjacent,
    stateOf: stateOf,

    tile: function (q, r) {
      return d ? d.tiles.find(function (t) { return t.q === q && t.r === r; }) : null;
    },
    hero: function (id) {
      return d ? d.heroes.find(function (h) { return h.id === id; }) : null;
    },
    tactic: function (id) {
      return D.TACTICS.find(function (t) { return t.id === id; }) || null;
    },
    team: function () { return d ? d.teams[d.currentTeam - 1] : null; },

    hasSave: function () {
      try { return global.localStorage.getItem(KEY) !== null; } catch (e) { return false; }
    },

    /** SaveService.save()：带 500ms 节流，失败时内存状态仍生效 */
    save: function (immediate) {
      if (!d) { return false; }
      var doSave = function () {
        try {
          global.localStorage.setItem(KEY, JSON.stringify(d));
          return true;
        } catch (e) {
          console.warn('[state] 存档写入失败', e);
          return false;
        }
      };
      if (immediate) {
        if (saveTimer) { global.clearTimeout(saveTimer); saveTimer = null; }
        return doSave();
      }
      if (!saveTimer) {
        saveTimer = global.setTimeout(function () { saveTimer = null; doSave(); }, 500);
      }
      return true;
    },

    load: function () {
      try {
        var raw = global.localStorage.getItem(KEY);
        if (!raw) { return false; }
        var obj = JSON.parse(raw);
        if (!obj || !obj.tiles || obj.version !== 1) { return false; }
        d = obj;
        recomputeYield();
        recomputePower();
        emit();
        return true;
      } catch (e) {
        console.warn('[state] 存档损坏，回退新赛季', e);
        return false;
      }
    },

    newGame: function (seed) {
      d = generate(seed || (Date.now() % 100000));
      recomputeYield();
      recomputePower();
      this.save(true);
      emit();
      return d;
    },

    clearSave: function () {
      try { global.localStorage.removeItem(KEY); } catch (e) { console.warn(e); }
    },

    /** 每 5 秒结算：四资源 + 体力 + 赛季天数 */
    tick: function () {
      if (!d) { return; }
      var bonus = 1 + d.assignments.length * 0.1;
      D.RES_KEYS.forEach(function (k) {
        var r = d.player.res[k];
        var next = Math.min(r.cap, r.cur + Math.round(r.yield * bonus));
        r.cur = next;
        r.full = next >= r.cap;
      });
      if (d.army.stamina < 100) { d.army.stamina = Math.min(100, d.army.stamina + 1); }
      d.tickCount = (d.tickCount || 0) + 1;
      d.season.day = Math.floor(d.tickCount / 12) + 1;
      this.save();
      emit();
    },

    /** 出征合法性校验，返回 {ok, from?, reason?} */
    canMarch: function (t) {
      if (!d) { return { ok: false, reason: '状态未初始化' }; }
      if (!t) { return { ok: false, reason: '请先选中地块' }; }
      if (t.type === 'water') { return { ok: false, reason: '水域不可通行' }; }
      if (d.army.status !== 'idle') { return { ok: false, reason: '部队行军中' }; }
      if (d.army.stamina < D.COST.marchStamina) { return { ok: false, reason: '体力不足，请等待恢复' }; }
      if (d.army.soldiers <= 0) { return { ok: false, reason: '请先征兵' }; }
      if (t.owner === 'player') { return { ok: false, reason: '该地已归属我方' }; }
      if (d.player.lands >= D.SEASON.landsCap && t.type !== 'city') {
        return { ok: false, reason: '领地已达上限' };
      }
      var from = d.tiles.find(function (x) { return x.owner === 'player' && isAdjacent(x, t); });
      if (!from) { return { ok: false, reason: '只能向相邻地块行军' }; }
      return { ok: true, from: from };
    },

    beginMarch: function (t, from) {
      d.army.stamina -= D.COST.marchStamina;
      d.army.status = 'marching';
      d.army.q = from.q; d.army.r = from.r;
      this.save(); emit();
    },

    endMarch: function (t) {
      d.army.status = 'idle';
      d.army.q = t.q; d.army.r = t.r;
      this.save(); emit();
    },

    needsBattle: function (t) {
      return !!(t && (t.garrison > 0 || (t.owner !== 'player' && t.owner !== 'neutral')));
    },

    /** 直接占领（中立无守军地块） */
    occupy: function (t) {
      t.owner = 'player';
      t.garrison = 0;
      recomputeYield();
      recomputePower();
      checkSeasonWin();
      this.save(true); emit();
    },

    /** 构造战斗快照，交给 BattleScene */
    makeSnapshot: function (t, from) {
      var team = this.team();
      var main = this.hero(team.heroIds[0]);
      var st = stateOf(t.q, t.r);
      var snap = {
        seq: seq++,
        q: t.q, r: t.r,
        from: { q: from.q, r: from.r },
        attacker: {
          teamIndex: d.currentTeam,
          heroIds: team.heroIds.slice(),
          name: main ? main.name : '我军',
          arms: main ? main.arms : '骑',
          force: main ? main.force : 70,
          soldiers: d.army.soldiers,
          tactics: team.heroIds.reduce(function (acc, hid) {
            var h = State.hero(hid);
            return h ? acc.concat(h.tactics.filter(Boolean)) : acc;
          }, [])
        },
        defender: {
          state: st.name,
          terrain: D.TERRAIN[t.type].name,
          level: t.level,
          garrison: Math.max(1, t.garrison || t.level * 800),
          arms: (t.type === 'city' || t.type === 'pass') ? '盾' : '弓',
          isCity: t.type === 'city',
          isPass: t.type === 'pass'
        }
      };
      SG.pendingBattle = snap;
      return snap;
    },

    /** 战斗结果回写；occupy=true 仅胜利时有效 */
    applyBattleResult: function (res, occupy) {
      var army = d.army;
      army.status = 'idle';
      army.soldiers = Math.max(0, res.afterSoldiers !== undefined ? res.afterSoldiers : army.soldiers - res.lossSelf);
      if (occupy && res.win) {
        var t = this.tile(res.q, res.r);
        if (t) {
          t.owner = 'player';
          t.garrison = Math.max(0, t.garrison - res.lossEnemy);
        }
        recomputeYield();
        recomputePower();
        checkSeasonWin();
        army.q = res.q; army.r = res.r;
      } else {
        army.q = res.from.q; army.r = res.from.r;
      }
      this.save(true); emit();
    },

    cancelBattle: function () {
      if (!d) { return; }
      d.army.status = 'idle';
      this.save(true); emit();
    },

    /** 征兵，见用例2 业务规则 2~3 */
    recruit: function (count) {
      if (!d) { return { ok: false, reason: '状态未初始化' }; }
      count = Math.floor(Number(count) || 0);
      if (count <= 0) { return { ok: false, reason: '数量为 0' }; }
      var costGrain = Math.floor(count * D.COST.recruitGrain);
      var costCoin = Math.floor(count * D.COST.recruitCoin);
      if (d.player.res.grain.cur < costGrain || d.player.currency.coin < costCoin) {
        return { ok: false, reason: '资源不足，请先占领资源地' };
      }
      if (d.army.soldiers + count > d.city.capacity) {
        return { ok: false, reason: '超出兵力上限' };
      }
      d.player.res.grain.cur -= costGrain;
      d.player.currency.coin -= costCoin;
      d.army.soldiers += count;
      recomputePower();
      this.save(true); emit();
      return { ok: true, costGrain: costGrain, costCoin: costCoin, after: d.army.soldiers };
    },

    /** 委任，见用例2 业务规则 4 */
    assign: function (heroIds) {
      if (!d) { return { ok: false, reason: '状态未初始化' }; }
      heroIds = (heroIds || []).slice(0, 3);
      var invalid = heroIds.some(function (id) {
        var h = State.hero(id);
        return !h || h.status !== 'idle';
      });
      if (invalid) { return { ok: false, reason: '出征中或已委任的武将不可委任' }; }
      d.heroes.forEach(function (h) {
        h.status = (h.status === 'assigned') ? 'idle' : h.status;
      });
      d.assignments = heroIds;
      heroIds.forEach(function (id) { var h = State.hero(id); if (h) { h.status = 'assigned'; } });
      recomputeYield();
      this.save(true); emit();
      return { ok: true, bonus: heroIds.length * 0.1 };
    },

    /** 装配战法，见用例3 业务规则 3~5 */
    equipTactic: function (heroId, slot, tacticId) {
      if (!d) { return { ok: false, reason: '状态未初始化' }; }
      var h = this.hero(heroId);
      var t = this.tactic(tacticId);
      if (!h || !t) { return { ok: false, reason: '武将或战法不存在' }; }
      if (h.tactics[slot]) { return { ok: false, reason: '战法位已满' }; }
      if (h.tactics.indexOf(tacticId) >= 0) { return { ok: false, reason: '已装配该战法' }; }
      if (d.tacticPoints < t.cost) { return { ok: false, reason: '战法点不足' }; }
      h.tactics[slot] = tacticId;
      d.tacticPoints -= t.cost;
      SG.BattleService.refreshPower(d.currentTeam);
      this.save(true); emit();
      return { ok: true, cost: t.cost };
    },

    unequipTactic: function (heroId, slot) {
      if (!d) { return { ok: false, reason: '状态未初始化' }; }
      var h = this.hero(heroId);
      if (!h || !h.tactics[slot]) { return { ok: false, reason: '该战法位为空' }; }
      var t = this.tactic(h.tactics[slot]);
      h.tactics[slot] = null;
      if (t) { d.tacticPoints += t.cost; }
      SG.BattleService.refreshPower(d.currentTeam);
      this.save(true); emit();
      return { ok: true, refund: t ? t.cost : 0 };
    },

    setTeam: function (index, heroIds) {
      if (!d) { return { ok: false, reason: '状态未初始化' }; }
      var team = d.teams[index - 1];
      if (!team) { return { ok: false, reason: '队伍不存在' }; }
      if (heroIds.length > 3) { return { ok: false, reason: '每队最多 3 名武将' }; }
      var invalid = heroIds.some(function (id) {
        var h = State.hero(id);
        return !h || (h.status !== 'idle' && team.heroIds.indexOf(id) < 0);
      });
      if (invalid) { return { ok: false, reason: '该武将不可编入' }; }
      team.heroIds = heroIds.slice();
      SG.BattleService.refreshPower(index);
      this.save(true); emit();
      return { ok: true };
    },

    switchTeam: function (index) {
      if (!d || !d.teams[index - 1]) { return; }
      d.currentTeam = index;
      SG.BattleService.refreshPower(index);
      this.save(true); emit();
    },

    /** 验收调试接口：供 TC-06/TC-09/TC-13 等边界用例构造前置条件 */
    debug: {
      setRes: function (k, v) { if (d) { d.player.res[k].cur = v; State.save(true); emit(); } },
      setStamina: function (v) { if (d) { d.army.stamina = v; State.save(true); emit(); } },
      setSoldiers: function (v) { if (d) { d.army.soldiers = v; recomputePower(); State.save(true); emit(); } },
      setTacticPoints: function (v) { if (d) { d.tacticPoints = v; State.save(true); emit(); } },
      captureRandom: function (n) {
        if (!d) { return; }
        var pool = d.tiles.filter(function (t) { return t.owner !== 'player' && t.type !== 'water'; });
        for (var i = 0; i < Math.min(n, pool.length); i++) {
          pool[i].owner = 'player'; pool[i].garrison = 0;
        }
        recomputeYield(); recomputePower(); checkSeasonWin();
        State.save(true); emit();
      }
    }
  };

  SG.State = State;
})(window);
