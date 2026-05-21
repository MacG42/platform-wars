// Procedural two-voice chiptune — A-minor groove at 150 BPM.
// Square-wave melody + triangle-wave bass, scheduled via Web Audio API.

const SAMPLE_RATE  = 44100;
const BPM          = 150;
const MEL_STEP_SEC = 60 / (BPM * 4); // 16th note
const BAS_STEP_SEC = 60 / (BPM * 2); // 8th note
const MEL_VOL      = 0.06;
const BAS_VOL      = 0.045;
const MASTER_VOL   = 0.28;
const LOOKAHEAD_SEC = 0.1;
const SCHEDULE_HZ   = 25; // how often we call schedule() in ms

// 32-step melody (Hz, 0 = rest) — A-minor pentatonic
const MEL_FREQS = [
  440, 440,   0, 330,  392, 330,   0, 220,
  440, 440,   0, 392,  330, 294, 330,   0,
  440, 523, 494, 440,  392, 330, 294,   0,
  330, 392, 440,   0,  392, 330,   0,   0,
];
// 16-step bass
const BAS_FREQS = [
  110,   0, 110,   0,   98,   0,  98,   0,
  110,   0, 131,   0,  110,   0, 123,   0,
];

export class MusicPlayer {
  private ctx:     AudioContext;
  private master:  GainNode;
  private nextMelTime = 0;
  private nextBasTime = 0;
  private melStep = 0;
  private basStep = 0;
  private timerId = 0;
  private disposed = false;

  constructor() {
    this.ctx    = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_VOL;
    this.master.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    this.nextMelTime = now;
    this.nextBasTime = now;

    this.schedule();
    this.timerId = window.setInterval(() => this.schedule(), SCHEDULE_HZ);
  }

  private schedule() {
    if (this.disposed) return;
    const until = this.ctx.currentTime + LOOKAHEAD_SEC;

    while (this.nextMelTime < until) {
      const freq = MEL_FREQS[this.melStep % MEL_FREQS.length];
      if (freq > 0) this.playNote('square',   freq, MEL_VOL, this.nextMelTime, MEL_STEP_SEC * 0.85);
      this.nextMelTime += MEL_STEP_SEC;
      this.melStep++;
    }

    while (this.nextBasTime < until) {
      const freq = BAS_FREQS[this.basStep % BAS_FREQS.length];
      if (freq > 0) this.playNote('triangle', freq, BAS_VOL, this.nextBasTime, BAS_STEP_SEC * 0.8);
      this.nextBasTime += BAS_STEP_SEC;
      this.basStep++;
    }
  }

  private playNote(
    type: OscillatorType,
    freq: number,
    vol: number,
    startTime: number,
    duration: number,
  ) {
    const gain = this.ctx.createGain();
    gain.connect(this.master);

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);

    // Attack-sustain-decay envelope
    const attack  = duration * 0.05;
    const decay   = duration * 0.2;
    const sustain = vol * 0.7;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol,     startTime + attack);
    gain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    gain.gain.setValueAtTime(sustain,          startTime + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0,       startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
    osc.onended = () => { gain.disconnect(); };
  }

  pause() {
    if (this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  dispose() {
    this.disposed = true;
    clearInterval(this.timerId);
    this.ctx.close();
  }
}
