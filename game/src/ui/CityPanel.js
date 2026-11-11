/* ui/CityPanel.js — 城池内政界面（用例2）
 * 三页签：资源 / 征兵（复用表单模版4 计数器）/ 委任。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  var T = SG.THEME, C = T.C, S = T.S, D = SG.DATA;

  SG.UI.openCityPanel = function (scene, initialTab) {
    return SG.UI.panels.open(scene, 'city', function () {
      var p = SG.UI.makePanel(scene, { w: 600, h: 460, title: '城池内政', onClose: function () { SG.UI.panels.close(); } });
      var L = SG.UI.label, B = SG.UI.makeButton, fmt = SG.UI.fmt;
      var content = scene.add.container(0, 0);
      p.root.add(content);

      var current = initialTab || 'res';
      var count = 0;
      var selected = (SG.State.data.assignments || []).slice();
      var tabBtns = {};

      [
        { k: 'res', name: '资源' },
        { k: 'recruit', name: '征兵' },
        { k: 'assign', name: '委任' }
      ].forEach(function (tab, i) {
        tabBtns[tab.k] = B(scene, {
          x: -p.w / 2 + 78 + i * 116, y: -p.h / 2 + 82, w: 104, h: 34,
          label: tab.name, variant: 'ghost', fontSize: 15,
          onClick: function () { current = tab.k; render(); }
        });
        p.root.add(tabBtns[tab.k]);
      });

      var actionBtn = B(scene, {
        x: -82, y: p.h / 2 - 38, w: 150, h: 42, label: '征 兵',
        onClick: doAction
      });
      var cancelBtn = B(scene, {
        x: 90, y: p.h / 2 - 38, w: 150, h: 42, label: '取 消', variant: 'ghost',
        onClick: function () { SG.UI.panels.close(); }
      });
      p.root.add([actionBtn, cancelBtn]);

      function clear() { content.removeAll(true); }

      function bar(x, y, labelText, cur, cap) {
        var w = 300;
        content.add(L(scene, x, y, labelText, { size: 13, color: S.PARCHMENT }));
        var back = scene.add.rectangle(x + 100, y + 8, w - 100, 10, C.DISABLED, 0.5).setOrigin(0, 0);
        var ratio = Math.max(0, Math.min(1, cur / cap));
        var fill = scene.add.rectangle(x + 100, y + 8, (w - 100) * ratio, 10, ratio >= 0.9 ? C.RED : C.GOLD, 1).setOrigin(0, 0);
        content.add([back, fill]);
        content.add(L(scene, x + w + 8, y, fmt(cur) + '/' + fmt(cap), { size: 12, color: S.GOLD_LIGHT }));
      }

      function render() {
        clear();
        var d = SG.State.data;
        Object.keys(tabBtns).forEach(function (k) { tabBtns[k].redraw(false); });

        content.add(L(scene, -p.w / 2 + 28, -p.h / 2 + 112,
          '主城: 荆益-主城  Lv' + d.city.level + '     兵力: ' + fmt(d.army.soldiers) + ' / ' + fmt(d.city.capacity),
          { size: 14, color: S.GOLD }));

        if (current === 'res') {
          actionBtn.setLabel('关 闭').setEnabled(true);
          D.RES_KEYS.forEach(function (k, i) {
            var r = d.player.res[k];
            bar(-p.w / 2 + 28, -p.h / 2 + 152 + i * 46,
              D.RES_NAMES[k] + '  +' + fmt(r.yield), r.cur, r.cap);
          });
          content.add(L(scene, -p.w / 2 + 28, p.h / 2 - 96,
            '委任加成: +' + Math.round(d.assignments.length * 10) + '%    每 5 秒结算一次资源',
            { size: 12, color: S.GOLD_DIM }));
        } else if (current === 'recruit') {
          actionBtn.setLabel('征 兵');
          var y = -p.h / 2 + 160;
          content.add(L(scene, -p.w / 2 + 28, y - 34, '*征兵数量', { size: 15, color: S.GOLD, bold: true }));

          var minus = B(scene, { x: -p.w / 2 + 150, y: y, w: 44, h: 38, label: '-', variant: 'ghost', fontSize: 20,
            onClick: function () { count = Math.max(0, count - D.COST.step); render(); } });
          var plus = B(scene, { x: -p.w / 2 + 322, y: y, w: 44, h: 38, label: '+', variant: 'ghost', fontSize: 20,
            onClick: function () { count = Math.min(D.COST.stepMax, count + D.COST.step); render(); } });
          content.add([minus, plus]);
          content.add(L(scene, -p.w / 2 + 236, y, String(count), { size: 20, color: S.GOLD_LIGHT, ox: 0.5, oy: 0.5, bold: true }));
          content.add(L(scene, -p.w / 2 + 380, y, '步长 500  上限 5000', { size: 12, color: S.GOLD_DIM, oy: 0.5 }));

          var costGrain = Math.floor(count * D.COST.recruitGrain);
          var costCoin = Math.floor(count * D.COST.recruitCoin);
          content.add(L(scene, -p.w / 2 + 28, y + 52,
            '预计消耗:  粮草 ' + fmt(costGrain) + '     铜币 ' + fmt(costCoin), { size: 14, color: S.PARCHMENT }));
          content.add(L(scene, -p.w / 2 + 28, y + 78,
            '征兵后兵力: ' + fmt(d.army.soldiers + count) + ' / ' + fmt(d.city.capacity), { size: 14, color: S.PARCHMENT }));
          var ok = count > 0 && d.player.res.grain.cur >= costGrain &&
            d.player.currency.coin >= costCoin && d.army.soldiers + count <= d.city.capacity;
          actionBtn.setEnabled(ok);
        } else {
          actionBtn.setLabel('确认委任').setEnabled(true);
          content.add(L(scene, -p.w / 2 + 28, -p.h / 2 + 148,
            '勾选空闲武将（最多 3 名），每名使四资源产量 +10%', { size: 13, color: S.PARCHMENT }));
          d.heroes.forEach(function (h, i) {
            var col = i % 2, row = Math.floor(i / 2);
            var x = -p.w / 2 + 28 + col * 280, y = -p.h / 2 + 182 + row * 52;
            var on = selected.indexOf(h.id) >= 0;
            var usable = h.status === 'idle' || h.status === 'assigned';
            var btn = B(scene, {
              x: x + 122, y: y + 12, w: 246, h: 40,
              label: (on ? '[√] ' : '[ ] ') + h.name + '  ' + h.arms + '  武力' + h.force + (usable ? '' : '  (不可选)'),
              variant: 'ghost', fontSize: 13, enabled: usable,
              onClick: function () {
                var idx = selected.indexOf(h.id);
                if (idx >= 0) { selected.splice(idx, 1); }
                else if (selected.length < 3) { selected.push(h.id); }
                else { SG.UI.toast(scene, '最多委任 3 名武将', 'warn'); }
                render();
              }
            });
            content.add(btn);
          });
          content.add(L(scene, -p.w / 2 + 28, p.h / 2 - 92,
            '已选 ' + selected.length + '/3    委任后产量加成 +' + (selected.length * 10) + '%',
            { size: 13, color: S.GOLD_LIGHT }));
        }
      }

      function doAction() {
        var d = SG.State.data;
        if (current === 'res') { SG.UI.panels.close(); return; }
        if (current === 'recruit') {
          var res = SG.State.recruit(count);
          if (!res.ok) { SG.Sfx.play('warn'); SG.UI.toast(scene, res.reason, 'warn'); return; }
          SG.Sfx.play('recruit');
          SG.UI.toast(scene, '征兵完成  兵力 ' + SG.UI.fmt(res.after));
          count = 0; render();
        } else {
          var a = SG.State.assign(selected);
          if (!a.ok) { SG.Sfx.play('warn'); SG.UI.toast(scene, a.reason, 'warn'); return; }
          SG.UI.toast(scene, '委任已保存  产量 +' + Math.round(a.bonus * 100) + '%');
          render();
        }
      }

      render();
      return p;
    });
  };
})(window);
