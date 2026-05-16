// ============================================================
// sound.js — Procedural Chess SFX Generator (No audio files)
// ============================================================

const Sound = (function () {

  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // ------------------------------------------------------------
  //  GENERIC HELPERS
  // ------------------------------------------------------------
  function playTone(freq, duration, {
    type = "sine",
    volume = 0.4,
    attack = 0.005,
    decay = 0.08
  } = {}) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // simple ADS-ish envelope
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playNoise(duration, {
    volume = 0.25,
    lowpass = 800
  } = {}) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + duration);
  }

  // ------------------------------------------------------------
  //  CORE CHESS SOUNDS (wooden, minimal, chess.com‑like)
  // ------------------------------------------------------------

  // Soft wooden “thock” for normal move
  function move() {
    // low triangle + filtered noise
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.09);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(t + 0.12);

    // subtle wood “air”
    playNoise(0.08, { volume: 0.18, lowpass: 900 });
  }

  // Sharper wooden “tak” for capture
  function capture() {
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.07);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(t + 0.14);

    // slightly stronger noise burst
    playNoise(0.09, { volume: 0.26, lowpass: 1100 });
  }

  // Soft neutral “invalid” tap (non‑harsh)
  function invalid() {
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.05);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(t + 0.1);
  }

  // UI click (buttons, toggles)
  function click() {
    playTone(320, 0.07, {
      type: "square",
      volume: 0.25,
      attack: 0.003,
      decay: 0.06
    });
  }

  // Subtle “ding” for check
  function check() {
    const t = ctx.currentTime;

    // two quick chimes
    playTone(880, 0.12, {
      type: "sine",
      volume: 0.22,
      attack: 0.005,
      decay: 0.1
    });

    setTimeout(() => {
      playTone(1175, 0.11, {
        type: "sine",
        volume: 0.18,
        attack: 0.005,
        decay: 0.09
      });
    }, 70);
  }

  // Slightly grander chord for checkmate
  function checkmate() {
    const t = ctx.currentTime;

    // low “root”
    playTone(440, 0.22, {
      type: "triangle",
      volume: 0.28,
      attack: 0.01,
      decay: 0.2
    });

    // mid “third”
    setTimeout(() => {
      playTone(554.37, 0.22, {
        type: "sine",
        volume: 0.24,
        attack: 0.01,
        decay: 0.2
      });
    }, 40);

    // high “fifth”
    setTimeout(() => {
      playTone(659.25, 0.24, {
        type: "sine",
        volume: 0.22,
        attack: 0.01,
        decay: 0.22
      });
    }, 80);
  }

  // Optional: game start sound
  function start() {
    const t = ctx.currentTime;

    playTone(523.25, 0.12, {
      type: "sine",
      volume: 0.2,
      attack: 0.005,
      decay: 0.1
    });

    setTimeout(() => {
      playTone(659.25, 0.12, {
        type: "sine",
        volume: 0.18,
        attack: 0.005,
        decay: 0.1
      });
    }, 80);
  }

  // ------------------------------------------------------------
  //  PUBLIC API
  // ------------------------------------------------------------
  return {
    move,
    capture,
    invalid,
    click,
    check,
    checkmate,
    start
  };

})();
