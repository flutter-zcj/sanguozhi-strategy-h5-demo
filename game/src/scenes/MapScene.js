/* scenes/MapScene.js — 沙盘主界面（用例1）
 * 96 格六边形沙盘 + HUD + 州旗 + 选中详情 + 底部操作栏 + 行军动画。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  SG.Scenes = SG.Scenes || {};
  var T = SG.THEME, C = T.C, S = T.S, D = SG.DATA;

  SG.Scenes.Map = class Map extends Phaser.Scene {
    constructor() { super('Map'); }

    create() {
      SG.UI.panels.close();
      var sc = this, L = SG.UI.label, B = SG.UI.makeButton;
      sc.cameras.main.setBackgroundColor(S.BROWN_PANEL);
      sc.selected = null;
      sc.victoryShown = false;
      sc.hits = [];

      /* 背景：羊皮纸横纹 */
      var bgG = sc.add.graphics();
      bgG.fillStyle(C.PARCHMENT, 0.16); bgG.fillRect(0, T.HUD_H, 820, T.H - T.HUD_H - T.BAR_H);
      for (var yy = T.HUD_H + 20; yy < T.H - T.BAR_H; yy += 44) {
        bgG.lineStyle(1, C.PARCHMENT_DARK, 0.06); bgG.lineBetween(0, yy, 820, yy);
      }

      sc.hud = new SG.UI.Hud(sc);
      sc.tileG = sc.add.graphics();
      sc.labelLayer = sc.add.container(0, 0);
      sc.hlG = sc.add.graphics();
      sc.arrowG = sc.add.graphics();
      sc.armyLayer = sc.add.container(0, 0);

      sc.buildArmy();
      sc.buildSidebar();
      sc.buildBottomBar();
      sc.renderTiles();
      sc.updateSidebar();
      sc.updateBottomBar();

      /* 点击空白取消选中 */
      sc.input.on('pointerdown', function (pointer, currentlyOver) {
        if (currentlyOver && currentlyOver.length) { return; }
        if (SG.UI.panels.isOpen()) { return; }
        sc.selected = null;
        sc.drawHighlight();
        sc.updateSidebar();
      });

      sc._escHandler = function () { SG.UI.panels.close(); };
      sc.input.keyboard.on('keydown-ESC', sc._escHandler);

      sc.tickTimer = sc.time.addEvent({ delay: 5000, loop: true, callback: sc.onTick, callbackScope: sc });
      sc.events.once('shutdown', sc.cleanup, sc);

      if (SG.State.data.season.won) { sc.showVictory(); }
    }

    /* ---------------------------------------------------------------- 地块 */
    renderTiles() {
      var sc = this, g = sc.tileG, L = SG.UI.label;
      g.clear();
      sc.labelLayer.removeAll(true);
      if (sc.hits) { sc.hits.forEach(function (h) { h.destroy(); }); }
      sc.hits = [];

      SG.State.data.tiles.forEach(function (t) {
        var p = SG.State.center(t.q, t.r);
        var pts = SG.State.hexPoints(p.x, p.y, T.HEX_S - 2);
        var terr = D.TERRAIN[t.type];
        var edge = t.owner === 'player' ? C.GOLD
          : (t.owner === 'neutral' ? C.BROWN_DEEP : (D.STATES.find(function (s) { return s.id === t.owner; }) || {}).color || C.RED);

        g.fillStyle(terr.color, t.type === 'water' ? 0.95 : 1);
        g.fillPoints(pts, true);
        g.lineStyle(t.owner === 'player' ? 3 : 1.5, edge, t.owner === 'player' ? 1 : 0.7);
        g.strokePoints(pts, true);

        sc.labelLayer.add(L(sc, p.x, p.y - 12, terr.short, {
          size: 14, color: t.type === 'water' ? S.WHITE : S.INK, ox: 0.5, oy: 0.5, bold: true
        }));
        sc.labelLayer.add(L(sc, p.x, p.y + 8, 'Lv' + t.level, {
          size: 10, color: t.type === 'water' ? S.WHITE : S.INK, ox: 0.5, oy: 0.5
        }));
        if (t.garrison > 0) {
          sc.labelLayer.add(L(sc, p.x + 18, p.y - 20, '⚔' + Math.round(t.garrison / 100) / 10 + 'k', {
            size: 9, color: S.BATTLE, ox: 0.5, oy: 0.5, bold: true
          }));
        }

        var hit = sc.add.circle(p.x, p.y, T.HEX_S * 0.88, C.BLACK, 0).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', function () { sc.onTileClick(t); });
        sc.hits.push(hit);
      });
      sc.drawHighlight();
    }

    drawHighlight() {
      this.hlG.clear();
      if (!this.selected) { return; }
      var p = SG.State.center(this.selected.q, this.selected.r);
      var pts = SG.State.hexPoints(p.x, p.y, T.HEX_S + 1);
      this.hlG.lineStyle(3, C.GOLD_LIGHT, 1);
      this.hlG.strokePoints(pts, true);
    }

    onTileClick(t) {
      if (SG.UI.panels.isOpen()) { return; }
      if (t.type === 'water') {
        SG.Sfx.play('warn');
        SG.UI.toast(this, '水域不可通行', 'warn');
        return;
      }
      SG.Sfx.play('click');
      this.selected = t;
      this.drawHighlight();
      this.updateSidebar();
    }

    /* ------------------------------------------------------------ 部队 / 行军 */
    buildArmy() {
      var sc = this;
      sc.armyToken = sc.add.container(0, 0).setDepth(50);
      var c = sc.add.circle(0, 0, 16, C.GOLD, 1).setStrokeStyle(2, C.BROWN_DEEP);
      var tx = SG.UI.label(sc, 0, 0, '军', { size: 14, color: S.INK, ox: 0.5, oy: 0.5, bold: true });
      sc.armyToken.add([c, tx]);
      sc.updateArmyPos();
    }

    updateArmyPos() {
      var a = SG.State.data.army;
      var p = SG.State.center(a.q, a.r);
      this.armyToken.setPosition(p.x, p.y);
    }

    drawArrow(a, b) {
      var g = this.arrowG;
      g.clear();
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      var ux = dx / len, uy = dy / len;
      g.lineStyle(3, C.MARCH, 0.9);
      g.lineBetween(a.x + ux * 20, a.y + uy * 20, b.x - ux * 24, b.y - uy * 24);
      for (var i = 1; i <= 3; i++) {
        var f = i / 4;
        var x = a.x + dx * f, y = a.y + dy * f;
        var tipX = x + ux * 12, tipY = y + uy * 12;
        var px = -uy, py = ux;
        g.fillStyle(C.MARCH, 1);
        g.fillTriangle(tipX, tipY, x + px * 7, y + py * 7, x - px * 7, y - py * 7);
      }
    }

    onMarch() {
      var sc = this, t = sc.selected;
      var chk = SG.State.canMarch(t);
      if (!chk.ok) {
        SG.Sfx.play('warn'); SG.UI.toast(sc, chk.reason, 'warn');
        return;
      }
      SG.State.beginMarch(t, chk.from);
      SG.Sfx.play('march');
      var a = SG.State.center(chk.from.q, chk.from.r), b = SG.State.center(t.q, t.r);
      sc.drawArrow(a, b);
      sc.armyToken.setPosition(a.x, a.y);
      sc.hud.refresh();
      sc.updateBottomBar();
      sc.tweens.add({
        targets: sc.armyToken, x: b.x, y: b.y, duration: 620, ease: 'Sine.easeInOut',
        onComplete: function () {
          sc.arrowG.clear();
          if (SG.State.needsBattle(t)) {
            var snap = SG.State.makeSnapshot(t, chk.from);
            sc.scene.start('Battle', { snap: snap });
          } else {
            SG.State.occupy(t);
            SG.State.endMarch(t);
            SG.Sfx.play('occupy');
            SG.UI.toast(sc, '占领成功  领地 +1');
            sc.refreshAll();
          }
        }
      });
    }

    refreshAll() {
      this.renderTiles();
      this.hud.refresh();
      this.updateSidebar();
      this.updateBottomBar();
      this.updateArmyPos();
      if (SG.State.data.season.won && !this.victoryShown) { this.showVictory(); }
    }

    onTick() {
      SG.State.tick();
      this.hud.refresh();
      this.updateSidebar();
      this.updateBottomBar();
      if (SG.State.data.season.won && !this.victoryShown) { this.showVictory(); }
    }

    /* -------------------------------------------------------------- 右侧栏 */
    buildSidebar() {
      var sc = this, x = 820, w = 444, y = T.HUD_H, h = T.H - T.HUD_H - T.BAR_H;
      var bg = sc.add.rectangle(x + w / 2, y + h / 2, w, h, C.BROWN_DEEP, 0.62);
      bg.setStrokeStyle(1, C.GOLD_DIM);
      sc.sideInfo = sc.add.container(0, 0);
      sc.sideTop = sc.add.container(0, 0);
      this.buildLegend();
    }

    /* 地块图例：右栏底部常驻，不随选中态刷新 */
    buildLegend() {
      var sc = this, L = SG.UI.label, keys = Object.keys(D.TERRAIN);
      L(sc, 838, 578, '地块图例', { size: 13, color: S.GOLD, bold: true });
      L(sc, 1150, 580, '金边 = 我方领地', { size: 10, color: S.GOLD_DIM });
      keys.forEach(function (k, i) {
        var terr = D.TERRAIN[k];
        var col = i % 4, row = Math.floor(i / 4);
        var x = 838 + col * 105, y = 600 + row * 24;
        sc.add.rectangle(x + 7, y + 7, 14, 14, terr.color, 1).setStrokeStyle(1, C.GOLD_DIM);
        L(sc, x + 20, y, terr.short + ' ' + terr.name, { size: 11, color: S.PARCHMENT });
      });
    }

    buildBanners() {
      var sc = this, L = SG.UI.label;
      D.STATES.forEach(function (s, i) {
        var x = 866 + (i % 2) * 218, y = 96 + Math.floor(i / 2) * 52;
        var r = sc.add.rectangle(x, y, 96, 40, s.color, 0.85).setStrokeStyle(2, C.GOLD_DIM);
        var tx = L(sc, x, y, s.name, { size: T.FS_BANNER, color: S.WHITE, ox: 0.5, oy: 0.5, bold: true });
        r.setDepth(20); tx.setDepth(21);
      });
    }

    updateSidebar() {
      var sc = this, L = SG.UI.label, B = SG.UI.makeButton, d = SG.State.data, fmt = SG.UI.fmt;
      sc.sideTop.removeAll(true);
      sc.sideInfo.removeAll(true);

      /* 州旗 */
      D.STATES.forEach(function (s, i) {
        var x = 866 + (i % 2) * 218, y = 96 + Math.floor(i / 2) * 52;
        var owned = d.tiles.filter(function (t) { return t.state === s.id && t.owner === 'player'; }).length;
        var r = sc.add.rectangle(x, y, 96, 40, s.color, 0.85).setStrokeStyle(2, owned === 24 ? C.GOLD_LIGHT : C.GOLD_DIM);
        var tx = L(sc, x, y - 6, s.name, { size: 18, color: S.WHITE, ox: 0.5, oy: 0.5, bold: true });
        var sub = L(sc, x, y + 12, owned + '/24 格', { size: 10, color: S.PARCHMENT, ox: 0.5, oy: 0.5 });
        sc.sideTop.add([r, tx, sub]);
      });

      /* 赛季目标 */
      sc.sideTop.add(L(sc, 840, 208, '赛季 · 霸业目标', { size: 18, color: S.GOLD, bold: true }));
      sc.sideTop.add(L(sc, 840, 240,
        '占领领地   ' + d.player.lands + ' / ' + D.SEASON.landsGoal + '     ' + progressBar(d.player.lands, D.SEASON.landsGoal),
        { size: 13, color: S.PARCHMENT }));
      var cities = d.tiles.filter(function (t) { return t.owner === 'player' && t.type === 'city'; }).length;
      sc.sideTop.add(L(sc, 840, 264,
        '攻占州城   ' + cities + ' / ' + D.SEASON.citiesGoal + '     ' + progressBar(cities, D.SEASON.citiesGoal),
        { size: 13, color: S.PARCHMENT }));
      sc.sideTop.add(L(sc, 840, 292,
        '势力 ' + fmt(d.player.power) + '    名声 ' + fmt(d.player.fame) + '    领地上限 ' + D.SEASON.landsCap,
        { size: 12, color: S.GOLD_LIGHT }));

      var sep = sc.add.rectangle(1042, 322, 410, 2, C.GOLD_DIM, 0.7);
      sc.sideTop.add(sep);

      /* 选中地块详情卡 */
      sc.sideTop.add(L(sc, 840, 334, '选中地块', { size: 17, color: S.GOLD, bold: true }));
      if (!sc.selected) {
        sc.sideInfo.add(L(sc, 840, 368, '点击沙盘上的地块查看详情', { size: 13, color: S.GOLD_DIM }));
        sc.sideInfo.add(L(sc, 840, 400, '操作提示:', { size: 13, color: S.PARCHMENT }));
        sc.sideInfo.add(L(sc, 840, 424, '1. 选中与己方领地相邻的地块', { size: 12, color: S.PARCHMENT }));
        sc.sideInfo.add(L(sc, 840, 446, '2. 点击 [出征] 派兵（消耗 15 体力）', { size: 12, color: S.PARCHMENT }));
        sc.sideInfo.add(L(sc, 840, 468, '3. 中立空地直接占领；有守军则进入战斗', { size: 12, color: S.PARCHMENT }));
        sc.sideInfo.add(L(sc, 840, 490, '4. 每 5 秒结算资源，用底栏征兵 / 编成战法', { size: 12, color: S.PARCHMENT }));
        sc.sideInfo.add(L(sc, 840, 524, '调试: 控制台可用 SG.State.debug.* 构造验收前置条件',
          { size: 11, color: S.GOLD_DIM }));
      } else {
        var t = sc.selected, terr = D.TERRAIN[t.type];
        var st = D.STATES.find(function (s) { return s.id === t.state; });
        var owner = t.owner === 'player' ? '我方' : (t.owner === 'neutral' ? '中立' : st.name + '（敌对）');
        var panel = sc.add.rectangle(1042, 424, 410, 150, C.BROWN_PANEL, 0.85).setStrokeStyle(1, C.GOLD_DIM);
        sc.sideInfo.add(panel);
        sc.sideInfo.add(L(sc, 852, 358,
          st.name + '  (' + t.q + ',' + t.r + ')  ' + terr.name + '  Lv' + t.level,
          { size: 14, color: S.GOLD_LIGHT, bold: true }));
        sc.sideInfo.add(L(sc, 852, 384, '归属: ' + owner + '     守军: ' + fmt(t.garrison), { size: 13, color: S.PARCHMENT }));
        sc.sideInfo.add(L(sc, 852, 408,
          t.yield ? ('占领后: ' + D.RES_NAMES[t.yield.res] + ' +' + fmt(t.yield.amount) + ' / 5s') : '占领后: 无资源产出（战略要地）',
          { size: 13, color: S.PARCHMENT }));
        sc.sideInfo.add(L(sc, 852, 432,
          t.type === 'city' ? '州城：攻占后主城等级 +1，计入霸业' :
            (t.type === 'pass' ? '关隘：城防加成 x1.3' : '普通地块'),
          { size: 12, color: S.GOLD_DIM }));
        var chk = SG.State.canMarch(t);
        var marchBtn = B(sc, {
          x: 920, y: 478, w: 150, h: 40, label: '出 征', enabled: chk.ok,
          onClick: function () { sc.onMarch(); }
        });
        var cancelBtn = B(sc, {
          x: 1090, y: 478, w: 130, h: 40, label: '取 消', variant: 'ghost',
          onClick: function () { sc.selected = null; sc.drawHighlight(); sc.updateSidebar(); }
        });
        sc.sideInfo.add([marchBtn, cancelBtn]);
        if (!chk.ok) {
          sc.sideInfo.add(L(sc, 1042, 508, chk.reason, { size: 11, color: S.RED, ox: 0.5 }));
        }
      }

      /* 当前队伍 */
      var team = SG.State.team();
      sc.sideInfo.add(L(sc, 840, 560,
        '队伍 ' + d.currentTeam + '  战力 ' + fmt(team.power) + '   兵力 ' + fmt(d.army.soldiers),
        { size: 12, color: S.GOLD_LIGHT }));
    }

    /* -------------------------------------------------------------- 底部栏 */
    buildBottomBar() {
      var sc = this, B = SG.UI.makeButton, y = T.H - T.BAR_H / 2;
      var bg = sc.add.rectangle(T.W / 2, y, T.W, T.BAR_H, C.BROWN_DEEP, 0.96);
      var line = sc.add.rectangle(T.W / 2, T.H - T.BAR_H, T.W, 2, C.GOLD, 0.8);
      bg.setDepth(200); line.setDepth(201);

      var items = [
        { x: 84, label: '内 政', fn: function () { SG.UI.openCityPanel(sc, 'res'); } },
        { x: 214, label: '武 将', fn: function () { SG.UI.openHeroPanel(sc); } },
        { x: 344, label: '征 兵', fn: function () { SG.UI.openCityPanel(sc, 'recruit'); } },
        { x: 474, label: '赛季目标', fn: function () { sc.showGoalPanel(); } },
        { x: 620, label: '音 乐', fn: function () { var on = SG.Sfx.toggleBgm(); SG.UI.toast(sc, on ? '音乐已开启' : '音乐已关闭'); } },
        { x: 750, label: '重开赛季', fn: function () { sc.confirmRestart(); } }
      ];
      items.forEach(function (it) {
        var b = B(sc, { x: it.x, y: y, w: 116, h: 40, label: it.label, variant: 'ghost', fontSize: 15, onClick: it.fn });
        b.setDepth(210);
      });

      sc.barStamina = SG.UI.label(sc, 900, y, '', { size: 13, color: S.PARCHMENT, oy: 0.5 }).setDepth(210);
      sc.barDay = SG.UI.label(sc, 1090, y, '', { size: 13, color: S.PARCHMENT, oy: 0.5 }).setDepth(210);
    }

    updateBottomBar() {
      var d = SG.State.data;
      if (this.barStamina) { this.barStamina.setText('体力 ' + d.army.stamina + '/100' + (d.army.status === 'marching' ? '  (行军中)' : '')); }
      if (this.barDay) { this.barDay.setText('赛季第 ' + d.season.day + ' 天'); }
    }

    /* -------------------------------------------------------------- 弹窗 */
    showGoalPanel() {
      var sc = this, d = SG.State.data;
      SG.UI.panels.open(sc, 'goal', function () {
        var p = SG.UI.makePanel(sc, { w: 520, h: 300, title: '赛季 · 霸业目标' });
        p.root.add(SG.UI.label(sc, -220, -90, '占领领地   ' + d.player.lands + ' / ' + D.SEASON.landsGoal,
          { size: 18, color: S.PARCHMENT }));
        p.root.add(SG.UI.label(sc, -220, -54, '攻占州城   ' + sc.cityCount() + ' / ' + D.SEASON.citiesGoal,
          { size: 18, color: S.PARCHMENT }));
        p.root.add(SG.UI.label(sc, -220, -10, '当前势力值   ' + SG.UI.fmt(d.player.power),
          { size: 16, color: S.GOLD_LIGHT }));
        p.root.add(SG.UI.label(sc, -220, 30, d.season.won ? '霸业已达成！' : '达成任一目标即可结算胜利',
          { size: 15, color: d.season.won ? S.GOLD : S.GOLD_DIM }));
        p.root.add(SG.UI.makeButton(sc, {
          x: 0, y: 96, w: 150, h: 40, label: '关 闭', variant: 'ghost',
          onClick: function () { SG.UI.panels.close(); }
        }));
        return p;
      });
    }

    cityCount() {
      return SG.State.data.tiles.filter(function (t) { return t.owner === 'player' && t.type === 'city'; }).length;
    }

    confirmRestart() {
      var sc = this;
      SG.UI.panels.open(sc, 'restart', function () {
        var p = SG.UI.makePanel(sc, { w: 460, h: 220, title: '重开赛季' });
        p.root.add(SG.UI.label(sc, -190, -56, '将清空本地存档并重新生成沙盘，确定继续？',
          { size: 15, color: S.PARCHMENT }));
        p.root.add(SG.UI.makeButton(sc, {
          x: -84, y: 56, w: 150, h: 40, label: '确 定',
          onClick: function () {
            SG.State.clearSave(); SG.State.newGame();
            SG.UI.panels.close(); sc.scene.restart();
          }
        }));
        p.root.add(SG.UI.makeButton(sc, {
          x: 84, y: 56, w: 150, h: 40, label: '取 消', variant: 'ghost',
          onClick: function () { SG.UI.panels.close(); }
        }));
        return p;
      });
    }

    showVictory() {
      var sc = this;
      sc.victoryShown = true;
      SG.Sfx.play('victory');
      SG.UI.panels.open(sc, 'victory', function () {
        var p = SG.UI.makePanel(sc, { w: 520, h: 280, title: '霸业达成' });
        p.root.add(SG.UI.label(sc, 0, -66, '霸业达成 · 天下归心', { size: 30, color: S.GOLD, ox: 0.5, oy: 0.5, bold: true }));
        p.root.add(SG.UI.label(sc, 0, -14, '领地 ' + SG.State.data.player.lands + ' / ' + D.SEASON.landsGoal +
          '    州城 ' + sc.cityCount() + ' / ' + D.SEASON.citiesGoal,
          { size: 16, color: S.PARCHMENT, ox: 0.5, oy: 0.5 }));
        p.root.add(SG.UI.makeButton(sc, {
          x: -92, y: 74, w: 160, h: 44, label: '重开赛季',
          onClick: function () {
            SG.State.clearSave(); SG.State.newGame();
            SG.UI.panels.close(); sc.scene.restart();
          }
        }));
        p.root.add(SG.UI.makeButton(sc, {
          x: 92, y: 74, w: 160, h: 44, label: '继续观战', variant: 'ghost',
          onClick: function () { SG.UI.panels.close(); }
        }));
        return p;
      });
    }

    cleanup() {
      SG.UI.panels.close();
      if (this.hud) { this.hud.destroy(); }
      if (this.tickTimer) { this.tickTimer.remove(); }
      if (this._escHandler) { this.input.keyboard.off('keydown-ESC', this._escHandler); }
    }
  };

  function progressBar(cur, goal) {
    var n = Math.min(10, Math.round(cur / goal * 10));
    return '[' + '#'.repeat(n) + '-'.repeat(10 - n) + ']';
  }
})(window);
