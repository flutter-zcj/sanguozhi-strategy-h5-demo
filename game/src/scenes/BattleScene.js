/* scenes/BattleScene.js — 战斗结算界面（用例4）
 * 左右对垒卡复用 Card 模版4；战力公式只在 BattleService，本场景仅渲染。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  SG.Scenes = SG.Scenes || {};
  var T = SG.THEME, C = T.C, S = T.S, D = SG.DATA;

  function num(n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function fx(n, d) { return (Number(n) || 0).toFixed(d === undefined ? 2 : d); }

  SG.Scenes.Battle = class Battle extends Phaser.Scene {
    constructor() { super('Battle'); }

    init(data) {
      this.snap = (data && data.snap) ? data.snap : SG.pendingBattle;
    }

    create() {
      var sc = this, L = SG.UI.label, B = SG.UI.makeButton;
      if (!sc.snap) { sc.scene.start('Map'); return; }
      sc.result = null;
      sc.settled = false;

      sc.cameras.main.setBackgroundColor(S.BROWN_PANEL);
      var bg = sc.add.graphics();
      bg.fillStyle(C.PARCHMENT, 0.10); bg.fillRect(0, 56, T.W, T.H - 56);

      var bar = sc.add.rectangle(T.W / 2, 28, T.W, 56, C.BROWN_DEEP, 0.94);
      sc.add.rectangle(T.W / 2, 55, T.W, 2, C.GOLD, 0.8);
      L(sc, 24, 18, '← 返回沙盘', { size: 15, color: S.GOLD, bold: true });
      var backHit = sc.add.rectangle(84, 28, 150, 40, C.BLACK, 0).setInteractive({ useHandCursor: true });
      backHit.on('pointerdown', function () { sc.onBack(); });
      var st = D.STATES.find(function (s) { return s.id === sc.snap.defender.state; });
      L(sc, T.W / 2, 28,
        '交战地: ' + sc.snap.defender.state + ' (' + sc.snap.q + ',' + sc.snap.r + ')  ' +
        sc.snap.defender.terrain + ' Lv' + sc.snap.defender.level,
        { size: 20, color: S.GOLD, ox: 0.5, oy: 0.5, bold: true });

      /* 对垒卡（Card 模版4：主标题 + 字段 + 底部操作区） */
      sc.buildCard(300, 250, '我方 · 队伍 ' + sc.snap.attacker.teamIndex, C.GOLD, [
        '主将: ' + sc.snap.attacker.name + '    兵种: ' + sc.snap.attacker.arms,
        '兵力: ' + num(sc.snap.attacker.soldiers) + '    武力: ' + sc.snap.attacker.force,
        '战法: ' + (sc.snap.attacker.tactics.length || '无'),
        '克制: ' + SG.BattleService.counterFactor(sc.snap.attacker.arms, sc.snap.defender.arms).label
      ]);
      sc.buildCard(980, 250, '敌方 · ' + sc.snap.defender.state + '守军', C.BATTLE, [
        '守军: ' + num(sc.snap.defender.garrison) + '    兵种: ' + sc.snap.defender.arms,
        '地形: ' + sc.snap.defender.terrain + '    Lv' + sc.snap.defender.level,
        '加成: ' + (sc.snap.defender.isCity ? '州城 x1.5' : (sc.snap.defender.isPass ? '关隘城防 x1.3' : '无')),
        '状态: ' + (sc.snap.defender.garrison > 0 ? '有守军' : '无守军')
      ]);
      L(sc, T.W / 2, 250, 'VS', { size: 38, color: S.GOLD_LIGHT, ox: 0.5, oy: 0.5, bold: true });

      /* 战力对比条 */
      L(sc, 80, 404, '战力对比', { size: 16, color: S.GOLD, bold: true });
      sc.powerTexts = {
        a: L(sc, 80, 436, '我方  待结算', { size: 14, color: S.PARCHMENT }),
        d: L(sc, 80, 466, '敌方  待结算', { size: 14, color: S.PARCHMENT })
      };
      sc.barA = sc.add.rectangle(240, 444, 0, 12, C.GOLD).setOrigin(0, 0.5);
      sc.barD = sc.add.rectangle(240, 474, 0, 12, C.BATTLE).setOrigin(0, 0.5);
      sc.add.rectangle(240 + 400, 444, 800, 12, C.DISABLED, 0.35).setOrigin(0, 0.5);
      sc.add.rectangle(240 + 400, 474, 800, 12, C.DISABLED, 0.35).setOrigin(0, 0.5);
      /* 背景条放在填充条之前绘制会更自然，这里用 depth 修正 */
      sc.barA.setDepth(5); sc.barD.setDepth(5);

      /* 明细板 */
      var detail = sc.add.rectangle(T.W / 2, 556, 1160, 116, C.BROWN_PANEL, 0.9).setStrokeStyle(1, C.GOLD_DIM);
      detail.setDepth(1);
      sc.detailText = L(sc, 90, 508, '点击 [开始结算] 计算双方战力与战损', { size: 14, color: S.PARCHMENT, lineSpacing: 6 });
      sc.detailText.setDepth(2);
      sc.resultText = L(sc, T.W / 2, 600, '', { size: 18, color: S.GOLD, ox: 0.5, oy: 0.5, bold: true });
      sc.resultText.setDepth(2);

      /* 操作区 */
      sc.btnResolve = B(sc, { x: 440, y: 672, w: 160, h: 44, label: '开始结算', onClick: function () { sc.onResolve(); } });
      sc.btnOccupy = B(sc, { x: 640, y: 672, w: 160, h: 44, label: '占领该地', enabled: false, onClick: function () { sc.onFinish(true); } });
      sc.btnRetreat = B(sc, { x: 840, y: 672, w: 160, h: 44, label: '撤  退', variant: 'ghost', enabled: false, onClick: function () { sc.onFinish(false); } });

      sc.events.once('shutdown', function () { SG.UI.panels.close(); });
    }

    buildCard(x, y, title, edge, lines) {
      var sc = this, L = SG.UI.label;
      var box = sc.add.rectangle(x, y, 460, 208, C.BROWN_PANEL, 0.88).setStrokeStyle(2, edge);
      box.setDepth(1);
      L(sc, x - 210, y - 88, title, { size: 19, color: edge === C.GOLD ? S.GOLD : S.RED, bold: true }).setDepth(2);
      lines.forEach(function (line, i) {
        L(sc, x - 210, y - 52 + i * 30, line, { size: 14, color: S.PARCHMENT }).setDepth(2);
      });
    }

    onResolve() {
      var sc = this;
      if (sc.settled) { return; }   /* 幂等：TC-06 */
      sc.settled = true;
      SG.Sfx.play('battle');
      var r = SG.BattleService.resolve(sc.snap);
      sc.result = r;

      sc.powerTexts.a.setText('我方  ' + num(r.atkPower));
      sc.powerTexts.d.setText('敌方  ' + num(r.defPower));
      var max = Math.max(r.atkPower, r.defPower, 1);
      sc.tweens.add({ targets: sc.barA, width: 800 * r.atkPower / max, duration: 420 });
      sc.tweens.add({ targets: sc.barD, width: 800 * r.defPower / max, duration: 420 });

      sc.detailText.setText([
        '我方  ' + num(r.atk.soldiers) + ' × 克制 ' + fx(r.atk.counter) + ' × 武力 ' + fx(r.atk.force) +
        ' × 随机 ' + fx(r.atk.random) + ' × 战法 ' + fx(r.atk.tactic) +
        ' × 编成 ' + fx(r.atk.variety) + ' × 攻城 ' + fx(r.atk.siege) + '  =  ' + num(r.atkPower),
        '敌方  ' + num(r.def.garrison) + ' × (1 + Lv' + r.def.level + '/10) × 克制 ' + fx(r.def.counter) +
        ' × 城防 ' + fx(r.def.cityBonus) + '  =  ' + num(r.defPower),
        '战法: ' + (r.atk.labels.join(' / ') || '无') + '    ' + r.atk.counterLabel
      ].join('\n'));
      sc.resultText.setText((r.win ? '结果: 大捷' : '结果: 失利') +
        '    我方损失 ' + num(r.lossSelf) + '    敌方损失 ' + num(r.lossEnemy));
      sc.resultText.setColor(r.win ? S.GOLD : S.RED);

      sc.btnResolve.setEnabled(false);
      sc.btnOccupy.setEnabled(r.win);
      sc.btnRetreat.setEnabled(true);
      SG.Sfx.play(r.win ? 'victory' : 'warn');
    }

    onFinish(occupy) {
      var sc = this, r = sc.result;
      if (!r) { SG.State.cancelBattle(); sc.scene.start('Map'); return; }
      if (occupy && r.win) {
        var t = SG.State.tile(r.q, r.r);
        if (t && t.type !== 'city' && SG.State.data.player.lands >= D.SEASON.landsCap) {
          SG.Sfx.play('warn');
          SG.UI.toast(sc, '领地已达上限，只能撤退', 'warn');
          return;
        }
        SG.State.applyBattleResult(r, true);
        SG.UI.toast(sc, '已占领该地');
      } else {
        SG.State.applyBattleResult(r, false);
      }
      sc.scene.start('Map');
    }

    onBack() {
      var sc = this;
      if (!sc.settled) { SG.State.cancelBattle(); sc.scene.start('Map'); return; }
      SG.UI.panels.open(sc, 'quit', function () {
        var p = SG.UI.makePanel(sc, { w: 460, h: 210, title: '放弃本次交战' });
        p.root.add(SG.UI.label(sc, -190, -50, '放弃后不结算战损，确定返回沙盘？',
          { size: 15, color: S.PARCHMENT }));
        p.root.add(SG.UI.makeButton(sc, {
          x: -84, y: 54, w: 150, h: 40, label: '确 定',
          onClick: function () { SG.State.cancelBattle(); SG.UI.panels.close(); sc.scene.start('Map'); }
        }));
        p.root.add(SG.UI.makeButton(sc, {
          x: 84, y: 54, w: 150, h: 40, label: '取 消', variant: 'ghost',
          onClick: function () { SG.UI.panels.close(); }
        }));
        return p;
      });
    }
  };
})(window);
