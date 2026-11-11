/* ui/HeroPanel.js — 武将战法界面（用例3）
 * 左侧武将卡复用 Card 模版3（标题+状态标签+字段+操作）；右侧「研兵悟道」四分类战法卡。
 * 布局：严格左右分栏（左 -426..-166 / 右 -114..430），各区块不重叠。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  var T = SG.THEME, C = T.C, S = T.S, D = SG.DATA;

  SG.UI.openHeroPanel = function (scene) {
    return SG.UI.panels.open(scene, 'hero', function () {
      var p = SG.UI.makePanel(scene, { w: 900, h: 540, title: '武将 · 战法', onClose: function () { SG.UI.panels.close(); } });
      var L = SG.UI.label, B = SG.UI.makeButton, fmt = SG.UI.fmt;
      var content = scene.add.container(0, 0);
      p.root.add(content);

      var selectedHero = (SG.State.team().heroIds[0]) || 'h1';
      var cat = '指挥';

      function render() {
        content.removeAll(true);
        var d = SG.State.data, team = SG.State.team(), h0 = SG.State.hero(selectedHero);

        content.add(L(scene, 150, -p.h / 2 + 14, '战法点 ' + fmt(d.tacticPoints) + '  +',
          { size: 15, color: S.GOLD_LIGHT, bold: true }));

        /* 队伍切换 */
        [1, 2].forEach(function (idx, i) {
          content.add(B(scene, {
            x: -p.w / 2 + 70 + i * 112, y: -p.h / 2 + 82, w: 104, h: 34,
            label: '队伍 ' + idx, variant: d.currentTeam === idx ? 'primary' : 'ghost', fontSize: 15,
            onClick: function () {
              SG.State.switchTeam(idx);
              selectedHero = (SG.State.team().heroIds[0]) || selectedHero;
              render();
            }
          }));
        });
        content.add(L(scene, -p.w / 2 + 260, -p.h / 2 + 76,
          '队伍战力 ' + fmt(team.power) + '    编成 ' + team.heroIds.length + '/3',
          { size: 13, color: S.PARCHMENT }));

        /* ---------------- 左栏：武将卡（x -426..-166） ---------------- */
        var lx = -p.w / 2 + 24;
        d.heroes.forEach(function (h, i) {
          var y = -p.h / 2 + 118 + i * 62;
          var inTeam = team.heroIds.indexOf(h.id) >= 0;
          var sel = h.id === selectedHero;
          var card = scene.add.rectangle(lx + 130, y + 29, 260, 58,
            sel ? C.GOLD : C.BROWN_PANEL, sel ? 0.20 : 0.72);
          card.setStrokeStyle(sel ? 2 : 1, sel ? C.GOLD : C.GOLD_DIM);
          content.add(card);

          var tactics = h.tactics.filter(Boolean).map(function (id) {
            var t = SG.State.tactic(id); return t ? t.name : '';
          }).join(' / ') || '(空)';
          content.add(L(scene, lx + 12, y + 4, h.name + (inTeam ? '  [队伍' + d.currentTeam + ']' : ''),
            { size: 14, color: sel ? S.GOLD_LIGHT : S.WHITE, bold: true }));
          content.add(L(scene, lx + 12, y + 23,
            h.arms + '  武力 ' + h.force + '  兵力 ' + fmt(h.soldiers) + '  ' + statusText(h.status),
            { size: 11, color: S.PARCHMENT }));
          content.add(L(scene, lx + 12, y + 41, '战法 ' + tactics,
            { size: 10, color: S.GOLD }));

          /* 命中区只覆盖卡片左侧，避开右下的编成按钮 */
          var hit = scene.add.rectangle(lx + 95, y + 29, 190, 58, C.BLACK, 0).setInteractive({ useHandCursor: true });
          hit.on('pointerdown', function () { selectedHero = h.id; render(); });
          content.add(hit);

          content.add(B(scene, {
            x: lx + 220, y: y + 42, w: 64, h: 22, label: inTeam ? '移出' : '编入',
            variant: 'ghost', fontSize: 11,
            enabled: h.status === 'idle' || inTeam,
            onClick: function () {
              var ids = team.heroIds.slice(), ix = ids.indexOf(h.id);
              if (ix >= 0) { ids.splice(ix, 1); } else { ids.push(h.id); }
              var r = SG.State.setTeam(team.index, ids);
              if (!r.ok) { SG.Sfx.play('warn'); SG.UI.toast(scene, r.reason, 'warn'); }
              render();
            }
          }));
        });

        /* ---------------- 右栏：分类 + 战法卡 + 预览（x -114..430） ---------------- */
        var rx = -p.w / 2 + 336;
        D.TACTIC_CATS.forEach(function (c, i) {
          content.add(B(scene, {
            x: rx + 60 + i * 132, y: -p.h / 2 + 92, w: 120, h: 34,
            label: c, variant: cat === c ? 'primary' : 'ghost', fontSize: 14,
            onClick: function () { cat = c; render(); }
          }));
        });

        var list = D.TACTICS.filter(function (t) { return t.category === cat; });
        list.forEach(function (t, i) {
          var col = i % 2, row = Math.floor(i / 2);
          var x = rx + 130 + col * 270, y = -p.h / 2 + 160 + row * 96;
          var equipped = h0 && h0.tactics.indexOf(t.id) >= 0;
          var affordable = d.tacticPoints >= t.cost;
          content.add(B(scene, {
            x: x, y: y, w: 250, h: 86,
            label: t.name + '   [' + (equipped ? '已装配' : t.category) + ']\n' +
              '发动 ' + t.rate + '%   ' + fmt(t.cost) + ' 点\n' + t.desc,
            variant: equipped ? 'primary' : 'ghost', fontSize: 13,
            enabled: affordable || equipped,
            onClick: function () { onTacticClick(t); }
          }));
          if (!affordable && !equipped) {
            content.add(L(scene, x, y + 48, '战法点不足', { size: 10, color: S.RED, ox: 0.5 }));
          }
        });

        /* 效果预览：y 48..184，与战法卡（到 y 29）分离；下方提示与按钮留出间距 */
        var pv = scene.add.rectangle(rx + 264, 116, 528, 136, C.BROWN_DEEP, 0.85);
        pv.setStrokeStyle(1, C.GOLD_DIM);
        content.add(pv);
        content.add(L(scene, rx + 16, 60, '满级效果预览', { size: 15, color: S.GOLD, bold: true }));
        var hs = h0 ? h0.tactics.filter(Boolean) : [];
        var names = hs.map(function (id) { var t = SG.State.tactic(id); return t ? t.name : ''; }).join(' / ') || '未装配';
        content.add(L(scene, rx + 16, 86, '当前武将: ' + (h0 ? h0.name : '-') + '    已装配: ' + names,
          { size: 12, color: S.PARCHMENT }));
        content.add(L(scene, rx + 16, 110, '战法类型: ' + cat + '    发动概率: 30%-60%',
          { size: 12, color: S.PARCHMENT }));
        content.add(L(scene, rx + 16, 134,
          '战法位: ' + hs.length + '/2    队伍: ' + d.currentTeam + '/2    队伍战力: ' + fmt(team.power),
          { size: 12, color: S.GOLD_LIGHT }));
        content.add(L(scene, rx + 16, 160,
          '效果: ' + (hs.length ? hs.map(function (id) { var t = SG.State.tactic(id); return t ? t.desc : ''; }).join('；') : '无'),
          { size: 11, color: S.PARCHMENT, wrap: 500 }));

        content.add(L(scene, rx, 198,
          '提示: 点击战法卡装配到当前武将的空战法位；再次点击已装配战法可卸下并退还战法点',
          { size: 10, color: S.GOLD_DIM }));
      }

      function statusText(s) {
        return s === 'assigned' ? '已委任' : (s === 'marching' ? '行军中' : '待命');
      }

      function onTacticClick(t) {
        var h = SG.State.hero(selectedHero);
        if (!h) { return; }
        var slot = h.tactics.indexOf(t.id);
        if (slot >= 0) {
          var u = SG.State.unequipTactic(h.id, slot);
          if (u.ok) { SG.UI.toast(scene, '已卸下 ' + t.name + '，退还 ' + fmt(u.refund) + ' 点'); }
        } else {
          var empty = h.tactics.indexOf(null);
          if (empty < 0) { SG.Sfx.play('warn'); SG.UI.toast(scene, '战法位已满', 'warn'); return; }
          var e = SG.State.equipTactic(h.id, empty, t.id);
          if (!e.ok) { SG.Sfx.play('warn'); SG.UI.toast(scene, e.reason, 'warn'); return; }
          SG.UI.toast(scene, '已装配 ' + t.name + '，消耗 ' + fmt(e.cost) + ' 点');
        }
        render();
      }

      p.root.add(B(scene, {
        x: -82, y: p.h / 2 - 26, w: 150, h: 40, label: '确认编成',
        onClick: function () { SG.State.save(true); SG.UI.toast(scene, '编成已保存'); SG.UI.panels.close(); }
      }));
      p.root.add(B(scene, {
        x: 90, y: p.h / 2 - 26, w: 150, h: 40, label: '关 闭', variant: 'ghost',
        onClick: function () { SG.UI.panels.close(); }
      }));

      render();
      return p;
    });
  };
})(window);
