/* main.js — Phaser 游戏入口（横屏 1280×720, Scale.FIT） */
(function (global) {
  'use strict';
  var SG = global.SG, T = SG.THEME;

  var config = {
    type: Phaser.AUTO,
    width: T.W,
    height: T.H,
    parent: 'game-root',
    backgroundColor: '#1E1710',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      autoRound: true
    },
    render: { antialias: true, pixelArt: false },
    scene: [SG.Scenes.Boot, SG.Scenes.Title, SG.Scenes.Map, SG.Scenes.Battle]
  };

  global.__sgGame = new Phaser.Game(config);

  /* 横屏提示：仅触摸设备的竖屏显示全屏遮罩；
     桌面浏览器竖窗口保持可见（按 FIT 缩放），避免预览面板被遮住。 */
  var isTouch = ('ontouchstart' in global) || (global.navigator && global.navigator.maxTouchPoints > 0);
  function checkOrientation() {
    var mask = global.document.getElementById('rotate-mask');
    if (!mask) { return; }
    var portrait = global.innerHeight > global.innerWidth;
    mask.style.display = (portrait && isTouch) ? 'flex' : 'none';
  }
  global.addEventListener('resize', checkOrientation);
  global.addEventListener('orientationchange', checkOrientation);
  checkOrientation();
})(window);
