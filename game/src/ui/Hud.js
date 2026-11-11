/* ui/Hud.js — 顶部 HUD 条
 * 字段与《01_REA逆向与游戏资源分析.md》第 5.1 节一致：
 * 君主 / 名声 / 领地 / 势力 + 玉璧 / 金铢 / 铜币 + 四资源（产量/当前/上限）。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  var T = SG.THEME, C = T.C, S = T.S, D = SG.DATA;

  function fmt(n) {
    n = Math.round(Number(n) || 0);
    if (n >= 10000) { return (Math.round(n / 10000 * 10) / 10) + '万'; }
    return String(n);
  }

  function Hud(scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(100);
    this.t = {};
    this._build();
    this._onChange = this.refresh.bind(this);
    SG.State.onChange(this._onChange);
    this.refresh();
  }

  Hud.prototype._build = function () {
    var sc = this.scene, L = SG.UI.label;
    var bg = sc.add.rectangle(T.W / 2, T.HUD_H / 2, T.W, T.HUD_H, C.BROWN_DEEP, 0.93);
    var line = sc.add.rectangle(T.W / 2, T.HUD_H - 1, T.W, 2, C.GOLD, 0.85);
    var avatar = sc.add.circle(28, 28, 18, C.GOLD_DIM, 1).setStrokeStyle(2, C.GOLD);
    var avatarTx = L(sc, 28, 28, '蜀', { size: 16, color: S.INK, ox: 0.5, oy: 0.5, bold: true });
    this.root.add([bg, line, avatar, avatarTx]);

    this.t.name = L(sc, 54, 6, '', { size: 14, color: S.GOLD, bold: true });
    this.t.info = L(sc, 54, 30, '', { size: 12, color: S.PARCHMENT });
    this.t.jade = L(sc, 250, 18, '', { size: 14, color: S.WHITE });
    this.t.gold = L(sc, 385, 18, '', { size: 14, color: S.WHITE });
    this.t.coin = L(sc, 510, 18, '', { size: 14, color: S.WHITE });
    this.root.add([this.t.name, this.t.info, this.t.jade, this.t.gold, this.t.coin]);

    var xs = [650, 940], ys = [6, 30];
    this.t.res = {};
    var self = this;
    D.RES_KEYS.forEach(function (k, i) {
      var x = xs[i % 2], y = ys[Math.floor(i / 2)];
      self.t.res[k] = L(sc, x, y, '', { size: 13, color: S.PARCHMENT });
      self.root.add(self.t.res[k]);
    });
  };

  Hud.prototype.refresh = function () {
    var d = SG.State.data;
    if (!d) { return; }
    this.t.name.setText(d.player.name);
    this.t.info.setText('名声 ' + fmt(d.player.fame) + '   领地 ' + d.player.lands + '/' + D.SEASON.landsCap + '   势力 ' + fmt(d.player.power));
    this.t.jade.setText('玉璧 ' + fmt(d.player.currency.jade) + '  +');
    this.t.gold.setText('金铢 ' + fmt(d.player.currency.gold) + '  +');
    this.t.coin.setText('铜币 ' + fmt(d.player.currency.coin) + '  +');
    var self = this;
    D.RES_KEYS.forEach(function (k) {
      var r = d.player.res[k];
      self.t.res[k].setText(D.RES_NAMES[k] + ' +' + fmt(r.yield) + '   ' + fmt(r.cur) + '/' + fmt(r.cap) + (r.full ? '  [满]' : ''));
      self.t.res[k].setColor(r.full ? S.RED : (r.cur / r.cap >= 0.9 ? S.GOLD_LIGHT : S.PARCHMENT));
    });
  };

  Hud.prototype.destroy = function () {
    SG.State.offChange(this._onChange);
    this.root.destroy();
  };

  SG.UI.Hud = Hud;
  SG.UI.fmt = fmt;
})(window);
