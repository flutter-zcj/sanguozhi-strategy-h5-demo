/* audio.js — WebAudio 合成音效与轻量 BGM
 * 触发点与《01_REA逆向与游戏资源分析.md》第 6.3 节逐项对应。
 * 不引入任何外部音频文件；BGM 默认关闭，由底栏 [音乐] 按钮开启。
 */
(function (global) {
  'use strict';
  var SG = global.SG = global.SG || {};

  var TONES = {
    click:   { notes: [660],            dur: 0.06, type: 'sine',     gain: 0.10 },
    march:   { notes: [440, 620],       dur: 0.12, type: 'triangle', gain: 0.12 },
    arrive:  { notes: [880],            dur: 0.10, type: 'sine',     gain: 0.12 },
    occupy:  { notes: [523, 659, 784],  dur: 0.09, type: 'sine',     gain: 0.13 },
    battle:  { notes: [220, 180],       dur: 0.22, type: 'sawtooth', gain: 0.10 },
    recruit: { notes: [392, 523],       dur: 0.10, type: 'triangle', gain: 0.12 },
    warn:    { notes: [180],            dur: 0.18, type: 'square',   gain: 0.09 },
    victory: { notes: [523, 659, 784, 1046], dur: 0.13, type: 'sine', gain: 0.14 }
  };

  var PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

  var Sfx = {
    ctx: null,
    enabled: true,
    bgmOn: false,
    bgmTimer: null,

    /** 惰性创建 AudioContext（浏览器要求用户手势后才能出声） */
    ensure: function () {
      if (this.ctx) { return this.ctx; }
      try {
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) { return null; }
        this.ctx = new AC();
      } catch (e) {
        this.ctx = null;
      }
      return this.ctx;
    },

    /** 播放单个短音；id 见 TONES */
    play: function (id) {
      if (!this.enabled) { return; }
      var ctx = this.ensure();
      if (!ctx) { return; }
      if (ctx.state === 'suspended') { ctx.resume(); }
      var cfg = TONES[id] || TONES.click;
      var now = ctx.currentTime;
      for (var i = 0; i < cfg.notes.length; i++) {
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = cfg.type;
        osc.frequency.setValueAtTime(cfg.notes[i], now + i * cfg.dur);
        g.gain.setValueAtTime(0.0001, now + i * cfg.dur);
        g.gain.exponentialRampToValueAtTime(cfg.gain, now + i * cfg.dur + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * cfg.dur + cfg.dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * cfg.dur);
        osc.stop(now + i * cfg.dur + cfg.dur + 0.02);
      }
    },

    /** 轻量 BGM：五声音阶随机音 + 低频鼓点，默认关闭 */
    startBgm: function () {
      var self = this;
      if (this.bgmOn) { return; }
      this.bgmOn = true;
      this.ensure();
      this.bgmTimer = global.setInterval(function () {
        if (!self.enabled || !self.ctx) { return; }
        var ctx = self.ctx;
        var now = ctx.currentTime;
        var f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.035, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.8);
      }, 900);
    },

    stopBgm: function () {
      this.bgmOn = false;
      if (this.bgmTimer) { global.clearInterval(this.bgmTimer); this.bgmTimer = null; }
    },

    toggleBgm: function () {
      if (this.bgmOn) { this.stopBgm(); } else { this.startBgm(); }
      return this.bgmOn;
    }
  };

  SG.Sfx = Sfx;
})(window);
