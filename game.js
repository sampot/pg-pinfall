/**
 * 釘雨落珠 — simplified pachinko-style: side rail up → fall through pegs → slot.
 */

export const W = 420;
export const H = 640;
export const BALL_R = 7;
export const PEG_R = 5.2;
export const GRAVITY = 1650;
export const RESTITUTION = 0.58;
export const FRICTION_AIR = 0.012;
export const MAX_BALLS = 3;
export const LAUNCH_MIN = 780;
export const LAUNCH_MAX = 1180;

/** Right launch rail (no pegs). */
export const RAIL_LEFT = W - 52;
export const RAIL_RIGHT = W - 14;
export const FIELD_RIGHT = RAIL_LEFT - 4;
export const FIELD_LEFT = 14;
export const TOP_OPEN_Y = 52;
export const SLOT_TOP = H - 56;

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
 * @property {'rail' | 'field'} phase
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
    /** @type {'ready' | 'flying' | 'over'} */
    this.status = "ready";
    this.message = "按住發射蓄力，鬆手沿軌道彈上";
    this.lastGain = 0;
    /** @type {Ball | null} */
    this.ball = null;
    this.pegs = this.buildPegs();
    this.slots = this.buildSlots();
    this.launcherX = (RAIL_LEFT + RAIL_RIGHT) / 2;
    this.shake = 0;
  }

  buildPegs() {
    /** @type {Peg[]} */
    const pegs = [];
    const top = 88;
    const bottom = SLOT_TOP - 36;
    const rows = 12;
    const cols = 6;
    const x0 = FIELD_LEFT + 18;
    const x1 = FIELD_RIGHT - 18;
    for (let row = 0; row < rows; row++) {
      const y = top + (row / (rows - 1)) * (bottom - top);
      const n = row % 2 === 0 ? cols : cols - 1;
      const inset = row % 2 === 0 ? 0 : (x1 - x0) / (cols - 1) / 2;
      for (let c = 0; c < n; c++) {
        const x = x0 + inset + (c / Math.max(1, n - 1)) * (x1 - x0);
        pegs.push({ x, y, r: PEG_R, flash: 0 });
      }
    }
    return pegs;
  }

  buildSlots() {
    const scores = [10, 30, 100, 50, 20, 5];
    const labels = ["10", "30", "百", "50", "20", "5"];
    const n = scores.length;
    const margin = FIELD_LEFT + 4;
    const usable = FIELD_RIGHT - margin - 4;
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
    const t = this.chargeT * 1.35;
    const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 - Math.PI / 2);
    this.power = 0.18 + wave * 0.82;
  }

  release() {
    if (!this.charging || this.status !== "ready") {
      return { ok: false, events: /** @type {string[]} */ ([]) };
    }
    this.charging = false;
    const speed = LAUNCH_MIN + this.power * (LAUNCH_MAX - LAUNCH_MIN);
    this.ballsLeft -= 1;
    this.ball = {
      x: this.launcherX,
      y: H - 72,
      vx: (Math.random() - 0.5) * 20,
      vy: -speed,
      r: BALL_R,
      active: true,
      phase: "rail",
    };
    this.status = "flying";
    this.message = "沿軌道上升…";
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
      b.vy *= 1 - FRICTION_AIR * 0.25 * h * 60;
      b.x += b.vx * h;
      b.y += b.vy * h;

      if (b.phase === "rail") {
        this.constrainRail(b, events);
        // Reach top opening → spill into field
        if (b.y < TOP_OPEN_Y + b.r + 8) {
          b.phase = "field";
          b.y = TOP_OPEN_Y + b.r + 10;
          b.vx = -220 - Math.random() * 160;
          b.vy = Math.max(40, Math.abs(b.vy) * 0.25);
          this.message = "落入釘雨";
          events.push("enter");
        }
      } else {
        this.constrainField(b, events);
        this.collidePegs(b, events);

        if (b.y + b.r >= SLOT_TOP) {
          this.landInSlot(b, events);
          return { events: uniqueTail(events, 8) };
        }
      }
    }

    return { events: uniqueTail(events, 6) };
  }

  /**
   * @param {Ball} b
   * @param {string[]} events
   */
  constrainRail(b, events) {
    const left = RAIL_LEFT + b.r + 1;
    const right = RAIL_RIGHT - b.r - 1;
    if (b.x < left) {
      b.x = left;
      b.vx = Math.abs(b.vx) * 0.2;
    } else if (b.x > right) {
      b.x = right;
      b.vx = -Math.abs(b.vx) * 0.2;
    }
    // rail floor not needed while ascending; soft top handled by phase change
    if (b.y > H - 20) {
      b.y = H - 20;
      b.vy = -Math.abs(b.vy);
      events.push("wall");
    }
  }

  /**
   * @param {Ball} b
   * @param {string[]} events
   */
  constrainField(b, events) {
    const left = FIELD_LEFT + b.r;
    const right = FIELD_RIGHT - b.r;
    if (b.x < left) {
      b.x = left;
      b.vx = Math.abs(b.vx) * RESTITUTION;
      events.push("wall");
    } else if (b.x > right) {
      b.x = right;
      b.vx = -Math.abs(b.vx) * RESTITUTION;
      events.push("wall");
    }
    if (b.y < TOP_OPEN_Y + b.r) {
      b.y = TOP_OPEN_Y + b.r;
      b.vy = Math.abs(b.vy) * RESTITUTION;
      events.push("wall");
    }
  }

  /**
   * @param {Ball} b
   * @param {string[]} events
   */
  collidePegs(b, events) {
    for (const peg of this.pegs) {
      const dx = b.x - peg.x;
      const dy = b.y - peg.y;
      const dist = Math.hypot(dx, dy);
      const min = b.r + peg.r;
      if (dist >= min || dist <= 1e-4) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = min - dist;
      b.x += nx * overlap;
      b.y += ny * overlap;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + RESTITUTION) * vn * nx;
        b.vy -= (1 + RESTITUTION) * vn * ny;
        b.vx += -ny * (12 + Math.random() * 22);
        b.vy += nx * (12 + Math.random() * 22);
      }
      peg.flash = 1;
      events.push("peg");
    }
  }

  /**
   * @param {Ball} b
   * @param {string[]} events
   */
  landInSlot(b, events) {
    let slot = this.slots.find((sl) => b.x >= sl.x0 && b.x < sl.x1);
    if (!slot) {
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
      slot = best;
    }
    this.scoreSlot(slot, events);
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
