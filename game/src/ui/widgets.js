/* widgets.js — 公共 UI 组件（Button / Text / Panel / Toast / PanelManager）
 * 用例1~4 复用本文件，禁止在各面板内另写一套按钮或弹窗。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  var T = SG.THEME, C = T.C, S = T.S;

  function label(scene, x, y, text, o) {
    o = o || {};
    var style = {
      fontFamily: o.font || T.FONT,
      fontSize: (o.size || T.FS_BODY) + 'px',
      color: o.color || S.INK,
      align: o.align || 'left',
      fontStyle: o.bold ? 'bold' : 'normal',
      lineSpacing: o.lineSpacing === undefined ? 4 : o.lineSpacing
    };
    if (o.wrap) { style.wordWrap = { width: o.wrap, useAdvancedWrap: true }; }
    return scene.add.text(x, y, text, style).setOrigin(o.ox === undefined ? 0 : o.ox, o.oy === undefined ? 0 : o.oy);
  }

  /** 按钮：primary 金底 / ghost 描边；三态 normal-hover-disabled */
  function makeButton(scene, o) {
    var w = o.w || 136, h = o.h || 44;
    var primary = o.variant !== 'ghost';
    var c = scene.add.container(o.x, o.y);
    var bg = scene.add.rectangle(0, 0, w, h, primary ? C.GOLD : C.BROWN_PANEL, primary ? 1 : 0.25);
    bg.setStrokeStyle(2, primary ? C.GOLD_LIGHT : C.GOLD);
    var tx = label(scene, 0, 0, o.label || '', {
      size: o.fontSize || 16, color: primary ? S.INK : S.GOLD,
      ox: 0.5, oy: 0.5, bold: true
    });
    c.add([bg, tx]);
    c.enabled = o.enabled !== false;
    c.bg = bg; c.tx = tx;

    function redraw(hover) {
      if (!c.enabled) {
        bg.setFillStyle(C.DISABLED, 0.45); bg.setStrokeStyle(2, C.DISABLED); tx.setColor(S.DISABLED);
        return;
      }
      if (primary) {
        bg.setFillStyle(hover ? C.GOLD_LIGHT : C.GOLD, 1);
        bg.setStrokeStyle(2, hover ? C.WHITE : C.GOLD_LIGHT);
        tx.setColor(S.INK);
      } else {
        bg.setFillStyle(hover ? C.GOLD : C.BROWN_PANEL, hover ? 0.20 : 0.25);
        bg.setStrokeStyle(2, C.GOLD);
        tx.setColor(hover ? S.GOLD_LIGHT : S.GOLD);
      }
    }

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', function () { if (c.enabled) { redraw(true); } });
    bg.on('pointerout', function () { redraw(false); });
    bg.on('pointerdown', function () {
      if (!c.enabled) { return; }
      SG.Sfx.play('click');
      if (o.onClick) { o.onClick(); }
    });
    c.setEnabled = function (v) { c.enabled = !!v; redraw(false); return c; };
    c.setLabel = function (s) { tx.setText(s); return c; };
    c.redraw = redraw;
    redraw(false);
    return c;
  }

  /** 模态面板：遮罩 + 标题栏 + 关闭按钮，返回可销毁对象 */
  function makePanel(scene, o) {
    var w = o.w || T.PANEL_W, h = o.h || T.PANEL_H;
    var shade = scene.add.rectangle(T.W / 2, T.H / 2, T.W, T.H, C.BLACK, 0.62).setInteractive().setDepth(8000);
    var root = scene.add.container(T.W / 2, T.H / 2).setDepth(8100);
    var bg = scene.add.rectangle(0, 0, w, h, C.BROWN_PANEL, 0.97);
    bg.setStrokeStyle(2, C.GOLD_DIM);
    var bar = scene.add.rectangle(0, -h / 2 + 26, w, 52, C.BROWN_DEEP, 0.95);
    bar.setStrokeStyle(1, C.GOLD_DIM);
    var title = label(scene, -w / 2 + 20, -h / 2 + 14, o.title || '', { size: T.FS_TITLE, color: S.GOLD, bold: true });
    root.add([bg, bar, title]);

    var panel = {
      root: root, shade: shade, w: w, h: h,
      destroy: function () { shade.destroy(); root.destroy(); }
    };

    var closeBtn = makeButton(scene, {
      x: w / 2 - 32, y: -h / 2 + 26, w: 44, h: 32, label: '×', variant: 'ghost', fontSize: 20,
      onClick: function () { if (o.onClose) { o.onClose(); } else { SG.UI.panels.close(); } }
    });
    root.add(closeBtn);
    panel.closeBtn = closeBtn;
    return panel;
  }

  /** 底部短提示，2s 自动消失 */
  function toast(scene, msg, kind) {
    var color = kind === 'error' ? S.RED : (kind === 'warn' ? S.MARCH : S.GOLD);
    var w = Math.max(240, msg.length * 16 + 48);
    var c = scene.add.container(T.W / 2, T.H - 96).setDepth(9500);
    var bg = scene.add.rectangle(0, 0, w, 42, C.BROWN_PANEL, 0.95);
    bg.setStrokeStyle(2, C.GOLD_DIM);
    var tx = label(scene, 0, 0, msg, { size: 14, color: color, ox: 0.5, oy: 0.5, bold: true });
    c.add([bg, tx]);
    c.setAlpha(0);
    scene.tweens.add({ targets: c, alpha: 1, y: T.H - 116, duration: 160 });
    scene.time.delayedCall(1800, function () {
      if (!c.active) { return; }
      scene.tweens.add({ targets: c, alpha: 0, duration: 220, onComplete: function () { c.destroy(); } });
    });
    return c;
  }

  var panels = {
    current: null,
    open: function (scene, key, builder) {
      if (this.current) { this.current.destroy(); this.current = null; }
      var p = builder();
      p.key = key;
      this.current = p;
      return p;
    },
    close: function () {
      if (this.current) { this.current.destroy(); this.current = null; }
    },
    isOpen: function () { return !!this.current; }
  };

  SG.UI = {
    label: label,
    makeButton: makeButton,
    makePanel: makePanel,
    toast: toast,
    panels: panels
  };
})(window);
