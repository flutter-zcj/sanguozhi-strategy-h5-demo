/* theme.js — 视觉常量
 * 与《01_REA逆向与游戏资源分析.md》第 6.5 节「配色与度量常量对照表」逐项对应。
 * 禁止在场景代码内硬编码色值，一律从这里取。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};

  var C = {
    PARCHMENT: 0xD8C49A,
    PARCHMENT_DARK: 0xC2A878,
    BROWN_DEEP: 0x3B2A18,
    BROWN_PANEL: 0x1E1710,
    INK: 0x2A2018,
    GOLD: 0xE8C56A,
    GOLD_LIGHT: 0xF5D98B,
    GOLD_DIM: 0x8C7A52,
    MARCH: 0xF07A28,
    BATTLE: 0xC0392B,
    STATE_BZ: 0xC9A44C,
    STATE_QX: 0x2C5A8C,
    STATE_JY: 0x3B6B4A,
    STATE_HY: 0x9C3B2E,
    NEUTRAL: 0x8C8272,
    WATER: 0x4A6B82,
    FOREST: 0x4F6B3A,
    MINE: 0x7A6A55,
    QUARRY: 0x8A8577,
    FARM: 0xA8A24E,
    WHITE: 0xF5ECD8,
    DISABLED: 0x6B6152,
    RED: 0xD9534F,
    BLACK: 0x000000
  };

  var S = {};
  Object.keys(C).forEach(function (k) {
    S[k] = '#' + C[k].toString(16).padStart(6, '0');
  });

  SG.THEME = {
    W: 1280,
    H: 720,
    C: C,
    S: S,
    FS_HUD: 14,
    FS_BODY: 14,
    FS_TITLE: 22,
    FS_BANNER: 20,
    FS_SMALL: 12,
    FS_BIG: 42,
    SPACE: { xs: 8, s: 12, m: 16, l: 24, xl: 32 },
    HUD_H: 56,
    BAR_H: 64,
    HEX_S: 34,
    MAP_OX: 70,
    MAP_OY: 96,
    FONT: '"Noto Serif CJK SC", "Songti SC", "SimSun", serif',
    FONT_NUM: '"DejaVu Sans Mono", "Courier New", monospace'
  };
})(window);
