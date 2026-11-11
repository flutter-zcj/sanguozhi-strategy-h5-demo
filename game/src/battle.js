/* battle.js — BattleService：战力公式、克制/战法系数、战损与胜负判定
 * 公式见《02_需求规格_04_战斗结算界面.md》业务规则 2~7。
 * 用例3 的队伍战力预览与用例4 的结算共用本服务，避免两套数值。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  var D = SG.DATA;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }

  var BattleService = {
    /** 兵种克制：返回攻/守系数与提示文案 */
    counterFactor: function (atkArms, defArms) {
      if (atkArms === '器械' || defArms === '器械') {
        return { a: 1, d: 1, label: '器械不参与克制链' };
      }
      if (D.COUNTER[atkArms] === defArms) {
        return { a: 1.2, d: 0.8, label: atkArms + ' 克 ' + defArms + '  +20%' };
      }
      if (D.COUNTER[defArms] === atkArms) {
        return { a: 0.8, d: 1.2, label: atkArms + ' 被 ' + defArms + ' 克  -20%' };
      }
      return { a: 1, d: 1, label: '无兵种克制' };
    },

    /** 汇总队伍已装配战法的效果 */
    tacticEffects: function (heroIds) {
      var out = { factor: 1, lossReduce: 0, heal: 0, labels: [] };
      (heroIds || []).forEach(function (hid) {
        var h = SG.State.hero(hid);
        if (!h) { return; }
        (h.tactics || []).forEach(function (tid) {
          if (!tid) { return; }
          var t = SG.State.tactic(tid);
          if (!t) { return; }
          out.labels.push(t.name);
          switch (t.effect) {
            case 'first':   out.factor *= 1.10; break;
            case 'assault': out.factor *= 1.15; break;
            case 'formation': out.factor *= 1.08; break;
            case 'fire':    out.factor *= 1.20; break; /* 攻城时生效 */
            case 'guard':   out.lossReduce += 0.10; break;
            case 'formation2': out.lossReduce += 0.08; break;
            case 'heal':    out.heal += 0.05; break;
            default: break;
          }
        });
      });
      out.lossReduce = clamp(out.lossReduce, 0, 0.5);
      return out;
    },

    /** 同队三武将兵种不重复时 +5% */
    varietyFactor: function (heroIds) {
      var arms = (heroIds || []).map(function (hid) {
        var h = SG.State.hero(hid); return h ? h.arms : null;
      }).filter(Boolean);
      var uniq = {};
      arms.forEach(function (a) { uniq[a] = 1; });
      return Object.keys(uniq).length >= 3 ? 1.05 : 1;
    },

    /** 队伍静态战力预览（不含随机因子），用例3 使用 */
    refreshPower: function (teamIndex) {
      var team = SG.State.data.teams[(teamIndex || 1) - 1];
      if (!team) { return 0; }
      var ids = team.heroIds || [];
      var main = SG.State.hero(ids[0]);
      var force = main ? main.force : 70;
      var soldiers = SG.State.data.army.soldiers;
      var eff = this.tacticEffects(ids);
      var power = soldiers * (1 + force / 100) * eff.factor * this.varietyFactor(ids);
      team.power = Math.round(power);
      return team.power;
    },

    /**
     * 结算战斗。
     * snapshot = State.makeSnapshot() 的返回值。
     * 返回 { win, atkPower, defPower, atk, def, lossSelf, lossEnemy, canOccupy }
     */
    resolve: function (snap) {
      var atk = snap.attacker;
      var def = snap.defender;
      var counter = this.counterFactor(atk.arms, def.arms);
      var eff = this.tacticEffects(atk.tactics);
      var random = rnd(0.9, 1.1);
      var siege = (atk.arms === '器械' && def.isCity) ? 1.5 : 1;
      var variety = this.varietyFactor(atk.heroIds);

      var atkPower = atk.soldiers
        * counter.a
        * (1 + atk.force / 100)
        * random
        * eff.factor
        * variety
        * siege;

      var cityBonus = def.isCity ? 1.5 : (def.isPass ? 1.3 : 1);
      var defPower = def.garrison
        * (1 + def.level / 10)
        * counter.d
        * cityBonus;

      atkPower = Math.round(atkPower);
      defPower = Math.round(defPower);
      var win = atkPower >= defPower;

      var selfRate = win ? rnd(0.10, 0.20) : rnd(0.40, 0.60);
      selfRate = selfRate * (1 - eff.lossReduce);
      var enemyRate = win ? rnd(0.40, 0.60) : rnd(0.10, 0.20);

      var lossSelf = Math.round(atk.soldiers * selfRate);
      var lossEnemy = Math.round(def.garrison * enemyRate);
      var afterHeal = Math.round((atk.soldiers - lossSelf) * (1 + eff.heal));

      return {
        seq: snap.seq, q: snap.q, r: snap.r, from: snap.from,
        win: win,
        canOccupy: win,
        atkPower: atkPower,
        defPower: defPower,
        atk: {
          soldiers: atk.soldiers, counter: counter.a, force: 1 + atk.force / 100,
          random: random, tactic: eff.factor, variety: variety, siege: siege,
          labels: eff.labels, counterLabel: counter.label
        },
        def: {
          garrison: def.garrison, level: def.level, counter: counter.d,
          cityBonus: cityBonus
        },
        lossSelf: lossSelf,
        lossEnemy: lossEnemy,
        afterSoldiers: Math.max(0, Math.min(afterHeal, atk.soldiers))
      };
    }
  };

  SG.BattleService = BattleService;
})(window);
