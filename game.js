/**
 * 釘雨落珠 — simplified pachinko-style: launch → peg bounce → slot score.
 */

export const W = 420;
export const H = 640;
export const BALL_R = 7;
export const PEG_R = 5.5;
export const GRAVITY = 1650;
export const RESTITUTION = 0.62;
export const FRICTION_AIR = 0.015;
export const MAX_BALLS = 3;
export const LAUNCH_MIN = 420;
export const LAUNCH_MAX = 920;

/**
 * @typedef {object} Peg
 * @property {number} x
 * @property {number} y
 * @property {number} r
 * @property {number} flash
 */

/**
 * @typedef {object} Ball
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} r
 * @property {boolean} active
 * @property {number} trail
 */

/**
 * @typedef {object} Slot
 * @property {number} x0
 * @property {number} x1
 * @property {number} score
 * @property {string} label
 * @property {number} flash
 */

export class PinfallGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.ballsLeft = MAX_BALLS;
    this.power = 0.55;
    this.charging = false;
    this.chargeT = 0;
    /** @type {'ready' | 'flying' | 'scored' | 'over'} */
    this.status = "ready";
    this.message = "按住發射蓄力，鬆手彈出";
    this.lastGain = 0;
    /** @type {Ball | null} */
    this.ball = null;
    this.pegs = this.buildPegs();
    this.slots = this.buildSlots();
    this.launcherX = W * 0.5;
    this.shake = 0;
  }

  buildPegs() {
    /** @type {Peg[]} */
    const pegs = [];
    const top = 70;
    const bottom = H - 130;
    const rows = 11;
    const cols = 7;
    for (let row = 0; row < rows; row++) {
      const y = top + (row / (rows - 1)) * (bottom - top);
      const n = row % 2 === 0 ? cols : cols - 1;
      const inset = row % 2 === 0 ? 0 : (W - 48) / (cols - 1) / 2;
      for (let c = 0; c < n; c++) {
        const x = 24 + inset + (c / Math.max(1, n - 1)) * (W - 48);
        pegs.push({ x, y, r: PEG_R, flash: 0 });
      }
    }
    // a few larger “featured” pegs
    pegs.push({ x: W * 0.5, y: 200, r: PEG_R + 2.5, flash: 0 });
    pegs.push({ x: W * 0.32, y: 320, r: PEG_R + 1.5, flash: 0 });
    pegs.push({ x: W * 0.68, y: 320, r: PEG_R + 1.5, flash: 0 });
    return pegs;
  }

  buildSlots() {
    const scores = [10, 30, 100, 50, 20, 5];
    const labels = ["10", "30", "百", "50", "20", "5"];
    const n = scores.length;
    const margin = 18;
    const usable = W - margin * 2;
    const w = usable / n;
    /** @type {Slot[]} */
    const slots = [];
    for (let i = 0; i < n; i++) {
      slots.push({
        x0: margin + i * w,
        x1: margin + (i + 1) * w,
        score: scores[i],
        label: labels[i],
        flash: 0,
      });
    }
    return slots;
  }

  beginCharge() {
    if (this.status !== "ready" || this.ballsLeft <= 0) return false;
    this.charging = true;
    this.chargeT = 0;
    this.power = 0.2;
    this.message = "蓄力中…鬆手發射";
    return true;
  }

  /**
   * @param {number} dt
   */
  updateCharge(dt) {
    if (!this.charging) return;
    this.chargeT += dt;
    // ping-pong power 0.15..1
    const t = this.chargeT * 1.35;
    const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 - Math.PI / 2);
    this.power = 0.18 + wave * 0.82;
  }

  release() {
    if (!this.charging || this.status !== "ready") return { ok: false, events: [] };
    this.charging = false;
    const p = this.power;
    const speed = LAUNCH_MIN + p * (LAUNCH_MAX - LAUNCH_MIN);
    // slight random horizontal aim from launcher channel
    const aim = (Math.random() - 0.5) * 110;
    this.ballsLeft -= 1;
    this.ball = {
      x: this.launcherX + (Math.random() - 0.5) * 6,
      y: H - 78,
      vx: aim * 0.35,
      vy: -speed,
      r: BALL_R,
      active: true,
      trail: 0,
    };
    this.status = "flying";
    this.message = "珠子飛上去了";
    this.lastGain = 0;
    return { ok: true, events: /** @type {string[]} */ (["launch"]) };
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    for (const peg of this.pegs) {
      if (peg.flash > 0) peg.flash = Math.max(0, peg.flash - dt * 3);
    }
    for (const s of this.slots) {
      if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 2.2);
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 8);

    if (this.charging) this.updateCharge(dt);

    if (this.status !== "flying" || !this.ball?.active) {
      return { events: /** @type {string[]} */ ([]) };
    }

    /** @type {string[]} */
    const events = [];
    const b = this.ball;
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;

    for (let s = 0; s < steps; s++) {
      b.vy += GRAVITY * h;
      b.vx *= 1 - FRICTION_AIR * h * 60;
      b.vy *= 1 - FRICTION_AIR * 0.35 * h * 60;
      b.x += b.vx * h;
      b.y += b.vy * h;

      // side walls
      const left = 14 + b.r;
      const right = W - 14 - b.r;
      if (b.x < left) {
        b.x = left;
        b.vx = Math.abs(b.vx) * RESTITUTION;
        events.push("wall");
      } else if (b.x > right) {
        b.x = right;
        b.vx = -Math.abs(b.vx) * RESTITUTION;
        events.push("wall");
      }

      // top bumper
      if (b.y < 28 + b.r) {
        b.y = 28 + b.r;
        b.vy = Math.abs(b.vy) * RESTITUTION;
        events.push("wall");
      }

      // peg collisions
      for (const peg of this.pegs) {
        const dx = b.x - peg.x;
        const dy = b.y - peg.y;
        const dist = Math.hypot(dx, dy);
        const min = b.r + peg.r;
        if (dist < min && dist > 1e-4) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = min - dist;
          b.x += nx * overlap;
          b.y += ny * overlap;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= (1 + RESTITUTION) * vn * nx;
            b.vy -= (1 + RESTITUTION) * vn * ny;
            // tiny tangential kick so paths diverge
            b.vx += -ny * (18 + Math.random() * 28);
            b.vy += nx * (18 + Math.random() * 28);
          }
          peg.flash = 1;
          events.push("peg");
        }
      }

      // slot zone
      const slotY = H - 52;
      if (b.y + b.r >= slotY) {
        const slot = this.slots.find((sl) => b.x >= sl.x0 && b.x < sl.x1);
        if (slot) {
          this.scoreSlot(slot, events);
          return { events };
        }
        // between dividers — nudge into nearest
        let best = this.slots[0];
        let bestD = Infinity;
        for (const sl of this.slots) {
          const mid = (sl.x0 + sl.x1) / 2;
          const d = Math.abs(b.x - mid);
          if (d < bestD) {
            bestD = d;
            best = sl;
          }
        }
        this.scoreSlot(best, events);
        return { events };
      }
    }

    b.trail = Math.min(1, b.trail + dt * 2);
    // dedupe noisy peg/wall spam for caller (keep last few unique-ish)
    return { events: uniqueTail(events, 6) };
  }

  /**
   * @param {Slot} slot
   * @param {string[]} events
   */
  scoreSlot(slot, events) {
    slot.flash = 1;
    this.lastGain = slot.score;
    this.score += slot.score;
    this.shake = 0.55;
    this.ball = null;
    events.push(slot.score >= 50 ? "jackpot" : "score");

    if (this.ballsLeft <= 0) {
      this.status = "over";
      this.message = `本局結束 · 總分 ${this.score}`;
      events.push("over");
    } else {
      this.status = "ready";
      this.message = `進「${slot.label}」＋${slot.score} · 剩 ${this.ballsLeft} 珠`;
    }
  }

  setPowerFromPointer(norm01) {
    if (this.status !== "ready") return;
    this.power = clamp(norm01, 0.15, 1);
  }
}

/**
 * @param {string[]} arr
 * @param {number} n
 */
function uniqueTail(arr, n) {
  const out = [];
  for (let i = arr.length - 1; i >= 0 && out.length < n; i--) {
    if (!out.includes(arr[i])) out.push(arr[i]);
  }
  return out.reverse();
}

/**
 * @param {number} v
 * @param {number} a
 * @param {number} b
 */
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
