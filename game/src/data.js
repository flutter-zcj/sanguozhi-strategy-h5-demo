/* data.js — 静态配置（州域、地形、武将、战法、兵种克制）
 * 数值为 Demo 自定，不照搬原版平衡表（见资源分析报告第 7 节）。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};
  var C = SG.THEME.C;

  SG.DATA = {
    COLS: 12,
    ROWS: 8,
    RES_KEYS: ['wood', 'iron', 'stone', 'grain'],
    RES_NAMES: { wood: '木材', iron: '铁矿', stone: '石料', grain: '粮草' },
    YIELD_PER_TILE: 20000,

    STATES: [
      { id: 'bz', name: '并州', color: C.STATE_BZ, q0: 0, q1: 5, r0: 0, r1: 3, capital: { q: 2, r: 1 } },
      { id: 'qx', name: '青徐', color: C.STATE_QX, q0: 6, q1: 11, r0: 0, r1: 3, capital: { q: 8, r: 1 } },
      { id: 'jy', name: '荆益', color: C.STATE_JY, q0: 0, q1: 5, r0: 4, r1: 7, capital: { q: 2, r: 6 } },
      { id: 'hy', name: '淮扬', color: C.STATE_HY, q0: 6, q1: 11, r0: 4, r1: 7, capital: { q: 8, r: 6 } }
    ],
    PLAYER_STATE: 'jy',

    TERRAIN: {
      plain:  { name: '空地', short: '空', color: C.PARCHMENT_DARK, passable: true,  res: null },
      forest: { name: '林地', short: '林', color: C.FOREST,         passable: true,  res: 'wood' },
      mine:   { name: '矿场', short: '矿', color: C.MINE,           passable: true,  res: 'iron' },
      quarry: { name: '采石', short: '石', color: C.QUARRY,         passable: true,  res: 'stone' },
      farm:   { name: '农田', short: '田', color: C.FARM,           passable: true,  res: 'grain' },
      water:  { name: '水域', short: '水', color: C.WATER,          passable: false, res: null },
      pass:   { name: '关隘', short: '隘', color: C.GOLD_DIM,       passable: true,  res: null },
      city:   { name: '城池', short: '城', color: C.GOLD,           passable: true,  res: null }
    },

    ARMS: ['骑', '盾', '弓', '枪', '器械'],
    /* key 克 value */
    COUNTER: { '骑': '弓', '弓': '枪', '枪': '盾', '盾': '骑' },

    HEROES: [
      { id: 'h1', name: '关羽',   arms: '骑',   force: 97, soldiers: 5000 },
      { id: 'h2', name: '诸葛亮', arms: '弓',   force: 78, soldiers: 3000 },
      { id: 'h3', name: '赵云',   arms: '枪',   force: 96, soldiers: 4000 },
      { id: 'h4', name: '张飞',   arms: '器械', force: 94, soldiers: 3500 },
      { id: 'h5', name: '司马懿', arms: '盾',   force: 88, soldiers: 3000 },
      { id: 'h6', name: '黄忠',   arms: '弓',   force: 85, soldiers: 3000 }
    ],

    TACTIC_CATS: ['指挥', '主动', '突击', '阵法'],
    TACTICS: [
      { id: 't1', name: '治疗',   category: '指挥', rate: 45, cost: 1000, effect: 'heal',      desc: '战后恢复 5% 兵力' },
      { id: 't2', name: '坚守',   category: '指挥', rate: 40, cost: 1500, effect: 'guard',     desc: '受到战损 -10%' },
      { id: 't3', name: '先攻',   category: '主动', rate: 50, cost: 2000, effect: 'first',     desc: '战力 x1.10' },
      { id: 't4', name: '火攻',   category: '主动', rate: 35, cost: 2500, effect: 'fire',      desc: '攻城时 x1.20' },
      { id: 't5', name: '突击',   category: '突击', rate: 55, cost: 3000, effect: 'assault',   desc: '战力 x1.15' },
      { id: 't6', name: '疾行',   category: '突击', rate: 45, cost: 1800, effect: 'swift',     desc: '行军体力 -5' },
      { id: 't7', name: '锋矢阵', category: '阵法', rate: 40, cost: 2200, effect: 'formation', desc: '战力 x1.08' },
      { id: 't8', name: '方圆阵', category: '阵法', rate: 38, cost: 2000, effect: 'formation2',desc: '受到战损 -8%' },
      { id: 't9',  name: '休整',   category: '指挥', rate: 35, cost: 1200, effect: 'heal',       desc: '战后恢复 5% 兵力' },
      { id: 't10', name: '固守',   category: '指挥', rate: 42, cost: 1600, effect: 'guard',      desc: '受到战损 -10%' },
      { id: 't11', name: '水攻',   category: '主动', rate: 38, cost: 2200, effect: 'fire',       desc: '攻城时 x1.20' },
      { id: 't12', name: '煽动',   category: '主动', rate: 44, cost: 1800, effect: 'first',      desc: '战力 x1.10' },
      { id: 't13', name: '强袭',   category: '突击', rate: 52, cost: 2800, effect: 'assault',    desc: '战力 x1.15' },
      { id: 't14', name: '奔袭',   category: '突击', rate: 48, cost: 2000, effect: 'swift',      desc: '行军体力 -5' },
      { id: 't15', name: '鹤翼',   category: '阵法', rate: 41, cost: 2100, effect: 'formation',  desc: '战力 x1.08' },
      { id: 't16', name: '鱼鳞',   category: '阵法', rate: 39, cost: 1900, effect: 'formation2', desc: '受到战损 -8%' }
    ],

    INITIAL: {
      fame: 20000,
      jade: 2103,
      gold: 300,
      coin: 260000,
      res: {
        wood:  { cur: 3220000, cap: 6010000 },
        iron:  { cur: 3470000, cap: 6010000 },
        stone: { cur: 2290000, cap: 6010000 },
        grain: { cur: 2070000, cap: 6010000 }
      },
      baseYield: 130000,
      tacticPoints: 885698,
      cityLevel: 3,
      stamina: 100
    },

    SEASON: { landsGoal: 30, citiesGoal: 3, landsCap: 60 },
    COST: { marchStamina: 15, recruitGrain: 1.2, recruitCoin: 0.5, step: 500, stepMax: 5000 }
  };
})(window);
