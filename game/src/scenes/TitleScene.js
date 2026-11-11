/* scenes/TitleScene.js — 标题页：开始赛季 / 继续赛季 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  SG.Scenes = SG.Scenes || {};
  var T = SG.THEME, C = T.C, S = T.S;

  SG.Scenes.Title = class Title extends Phaser.Scene {
    constructor() { super('Title'); }

    create() {
      var sc = this, L = SG.UI.label, B = SG.UI.makeButton;
      sc.cameras.main.setBackgroundColor(S.BROWN_PANEL);

      /* 羊皮纸色块 + 金色边框，程序化绘制，不使用原版素材 */
      var g = sc.add.graphics();
      g.fillStyle(C.PARCHMENT, 0.10); g.fillRect(80, 90, T.W - 160, T.H - 180);
      g.lineStyle(2, C.GOLD_DIM, 0.8); g.strokeRect(80, 90, T.W - 160, T.H - 180);
      g.lineStyle(1, C.GOLD, 0.35); g.strokeRect(96, 106, T.W - 192, T.H - 212);

      L(sc, T.W / 2, 210, '三国沙盘 · 战略原型', { size: 56, color: S.GOLD, ox: 0.5, oy: 0.5, bold: true });
      L(sc, T.W / 2, 272, '横屏 SLG 核心玩法 Demo  |  基于 REA 逆向取证与商店视觉规格',
        { size: 16, color: S.PARCHMENT, ox: 0.5, oy: 0.5 });
      L(sc, T.W / 2, 310, '仅复用可量化设计语言，不含任何原版美术资产 / 商标 / 立绘',
        { size: 13, color: S.GOLD_DIM, ox: 0.5, oy: 0.5 });

      var hasSave = SG.State.hasSave();
      var startBtn = B(sc, {
        x: T.W / 2 - 110, y: 400, w: 200, h: 52, label: '开始新赛季', fontSize: 20,
        onClick: function () {
          SG.State.newGame();
          SG.Sfx.play('click');
          sc.scene.start('Map');
        }
      });
      var contBtn = B(sc, {
        x: T.W / 2 + 110, y: 400, w: 200, h: 52, label: '继续赛季', variant: 'ghost', fontSize: 20,
        enabled: hasSave,
        onClick: function () {
          if (SG.State.load()) { SG.Sfx.play('click'); sc.scene.start('Map'); }
          else {
            SG.Sfx.play('warn');
            SG.UI.toast(sc, '存档损坏，已重开新赛季', 'warn');
            SG.State.newGame();
            sc.time.delayedCall(600, function () { sc.scene.start('Map'); });
          }
        }
      });

      L(sc, T.W / 2, 500,
        '玩法: 选相邻地块 → 出征 → 占领 / 交战 → 资源增长 → 征兵 → 编成战法 → 占领 30 地或 3 州城达成霸业',
        { size: 14, color: S.PARCHMENT, ox: 0.5, oy: 0.5 });
      L(sc, T.W / 2, 536, '每 5 秒结算一次资源与体力  |  进度自动保存在浏览器本地',
        { size: 13, color: S.GOLD_DIM, ox: 0.5, oy: 0.5 });
      L(sc, T.W / 2, 588, '操作: 鼠标 / 触摸点击格子与按钮  ·  ESC 关闭面板  ·  建议横屏 1280×720',
        { size: 12, color: S.GOLD_DIM, ox: 0.5, oy: 0.5 });

      sc.input.keyboard.on('keydown-ESC', function () { SG.UI.panels.close(); });
      sc.events.once('shutdown', function () { SG.UI.panels.close(); });
      return { startBtn: startBtn, contBtn: contBtn };
    }
  };
})(window);
