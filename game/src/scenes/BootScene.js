/* scenes/BootScene.js — 启动引导（无外部资源，仅展示加载态） */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  SG.Scenes = SG.Scenes || {};
  var T = SG.THEME, C = T.C, S = T.S;

  SG.Scenes.Boot = class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }

    create() {
      var sc = this;
      sc.cameras.main.setBackgroundColor(S.BROWN_PANEL);
      SG.UI.label(sc, T.W / 2, T.H / 2 - 60, '三国沙盘 · 战略原型', {
        size: 34, color: S.GOLD, ox: 0.5, oy: 0.5, bold: true
      });
      SG.UI.label(sc, T.W / 2, T.H / 2 - 14, '正在载入沙盘…', {
        size: 14, color: S.PARCHMENT, ox: 0.5, oy: 0.5
      });
      var bar = sc.add.rectangle(T.W / 2 - 160, T.H / 2 + 30, 0, 8, C.GOLD).setOrigin(0, 0);
      sc.tweens.add({
        targets: bar, width: 320, duration: 280, ease: 'Sine.easeOut',
        onComplete: function () { sc.scene.start('Title'); }
      });
    }
  };
})(window);
