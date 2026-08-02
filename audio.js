/**
 * Original machine-ish SFX via Web Audio — no commercial samples.
 */

export class PinfallAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = true;
    this.master = 0.2;
    this._pegGate = 0;
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  /**
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} [type]
   * @param {number} [gain]
   * @param {number} [when]
   */
  tone(freq, dur, type = "square", gain = 0.12, when = 0) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  launch() {
    this.tone(180, 0.06, "sawtooth", 0.1);
    this.tone(320, 0.1, "triangle", 0.08, 0.04);
  }

  peg() {
    this.ensure();
    const now = this.ctx?.currentTime ?? 0;
    if (now < this._pegGate) return;
    this._pegGate = now + 0.028;
    const f = 520 + Math.random() * 280;
    this.tone(f, 0.03, "square", 0.045);
  }

  wall() {
    this.tone(140, 0.04, "triangle", 0.04);
  }

  score() {
    this.tone(440, 0.07, "triangle", 0.08);
    this.tone(660, 0.1, "triangle", 0.07, 0.06);
  }

  jackpot() {
    this.tone(523, 0.08, "triangle", 0.09);
    this.tone(659, 0.09, "triangle", 0.09, 0.08);
    this.tone(784, 0.14, "triangle", 0.1, 0.16);
  }

  over() {
    this.tone(300, 0.1, "triangle", 0.07);
    this.tone(220, 0.16, "sine", 0.06, 0.1);
  }

  chargeTick() {
    this.tone(240 + Math.random() * 40, 0.02, "square", 0.03);
  }
}
