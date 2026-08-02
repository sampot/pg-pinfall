/**
 * 釘雨落珠 — pachinko-style physics:
 * side rail ascent → gate into field → impulse peg collisions → slots.
 */

export const W = 420;
export const H = 640;
export const BALL_R = 7;
export const PEG_R = 5.2;

/** px/s² — tuned for screen scale, not SI metres. */
export const GRAVITY = 1550;
/** Metal-ish peg bounce (pachinko cascades, not pinball flipper). */
export const PEG_RESTITUTION = 0.44;
export const WALL_RESTITUTION = 0.32;
/** Coulomb-ish tangent damping on peg hit (0..1). */
export const PEG_FRICTION = 0.22;
export const WALL_FRICTION = 0.35;
/** Quadratic drag coefficient. */
export const DRAG = 0.00055;
export const MAX_SPEED = 2100;
export const FIXED_DT = 1 / 320;
export const MAX_BALLS = 3;
export const LAUNCH_MIN = 1450;
export const LAUNCH_MAX = 1850;

/** Right launch rail (no pegs). */
export const RAIL_LEFT = W - 52;
export const RAIL_RIGHT = W - 14;
export const FIELD_RIGHT = RAIL_LEFT - 4;
export const FIELD_LEFT = 14;
export const TOP_OPEN_Y = 52;
/** Below this Y, rail's left wall opens into the field. */
export const GATE_Y = TOP_OPEN_Y + 46;
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
 * @property {number} omega spin rad/s (visual + light rolling feel)
 * @property {number} angle rad
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

/**
 * @typedef {object} StaticCircle
 * @property {number} x
 * @property {number} y
 * @property {number} r
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
    /**
     * Right-side exit bumper: ascending ball glances LEFT through the open gate.
     * (A left-side bumper would push the ball further into the rail.)
     */
    this.bumpers = /** @type {StaticCircle[]} */ ([
      { x: RAIL_RIGHT - 9, y: TOP_OPEN_Y + 18, r: 12 },
      { x: FIELD_RIGHT - 26, y: TOP_OPEN_Y + 40, r: 10 },
    ]);
    this.launcherX = (RAIL_LEFT + RAIL_RIGHT) / 2;
    this.shake = 0;
    this.physAcc = 0;
  }

  buildPegs() {
    /** @type {Peg[]} */
    const pegs = [];
    const top = 96;
    const bottom = SLOT_TOP - 40;
    const rows = 12;
    const cols = 6;
    const x0 = FIELD_LEFT + 20;
    const x1 = FIELD_RIGHT - 22;
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
    // Keep a playable floor so light taps still clear the rail.
    this.power = 0.35 + wave * 0.65;
  }

  release() {
    if (!this.charging || this.status !== "ready") {
      return { ok: false, events: /** @type {string[]} */ ([]) };
    }
    this.charging = false;
    const speed = LAUNCH_MIN + this.power * (LAUNCH_MAX - LAUNCH_MIN);
    this.ballsLeft -= 1;
    // Tiny lateral jitter only — path chaos comes from peg geometry.
    this.ball = {
      x: this.launcherX + (Math.random() - 0.5) * 1.2,
      y: H - 72,
      vx: (Math.random() - 0.5) * 12,
      vy: -speed,
      omega: 0,
      angle: 0,
      r: BALL_R,
      active: true,
      phase: "rail",
    };
    this.status = "flying";
    this.message = "沿軌道上升…";
    this.lastGain = 0;
    this.physAcc = 0;
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
    this.physAcc += Math.min(dt, 0.05);
    let guard = 0;
    while (this.physAcc >= FIXED_DT && guard++ < 48) {
      this.physAcc -= FIXED_DT;
      const done = this.stepPhysics(FIXED_DT, events);
      if (done) break;
    }

    return { events: uniqueTail(events, 8) };
  }

  /**
   * Fixed-step semi-implicit Euler + impulse contacts.
   * @param {number} h
   * @param {string[]} events
   * @returns {boolean} true if ball finished (scored / miss)
   */
  stepPhysics(h, events) {
    const b = this.ball;
    if (!b?.active) return true;

    // gravity
    b.vy += GRAVITY * h;

    // quadratic drag
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 1) {
      const drag = DRAG * sp;
      b.vx -= (b.vx / sp) * drag * sp * h;
      b.vy -= (b.vy / sp) * drag * sp * h;
    }

    // integrate
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.angle += b.omega * h;
    b.omega *= Math.max(0, 1 - 1.8 * h);

    if (b.phase === "rail") {
      this.constrainRail(b, events);
      // Top funnel: open left wall + camber acceleration + exit bumper
      if (b.y < GATE_Y) {
        b.vx -= 2200 * h; // sloped rail camber toward field
        for (const bumper of this.bumpers) {
          this.circleImpulse(
            b,
            bumper.x,
            bumper.y,
            bumper.r,
            PEG_RESTITUTION,
            PEG_FRICTION,
            events,
            "wall",
          );
        }
      }
      if (b.x + b.r < RAIL_LEFT - 1) {
        b.phase = "field";
        // keep momentum; slight inward nudge if nearly scraping the wall
        if (b.vx > -40) b.vx = -80 - Math.random() * 40;
        this.message = "落入釘雨";
        events.push("enter");
      }
      // Miss: fell back to bottom of rail (only after leaving the launch pocket)
      if (b.y - b.r > H - 58 && b.vy > 120 && b.y > GATE_Y + 80) {
        this.missRail(events);
        return true;
      }
    } else {
      this.constrainField(b, events);
      for (const bumper of this.bumpers) {
        this.circleImpulse(
          b,
          bumper.x,
          bumper.y,
          bumper.r,
          PEG_RESTITUTION,
          PEG_FRICTION,
          events,
          "wall",
        );
      }
      // Multiple passes so ball doesn't sink into dense peg clusters
      for (let pass = 0; pass < 3; pass++) {
        let hits = 0;
        for (const peg of this.pegs) {
          if (
            this.circleImpulse(
              b,
              peg.x,
              peg.y,
              peg.r,
              PEG_RESTITUTION,
              PEG_FRICTION,
              events,
              "peg",
            )
          ) {
            peg.flash = 1;
            hits++;
          }
        }
        if (!hits) break;
      }

      if (b.y + b.r >= SLOT_TOP) {
        this.landInSlot(b, events);
        return true;
      }
    }

    this.clampSpeed(b);
    return false;
  }

  /**
   * @param {Ball} b
   */
  clampSpeed(b) {
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAX_SPEED) {
      const s = MAX_SPEED / sp;
      b.vx *= s;
      b.vy *= s;
    }
  }

  /**
   * Circle vs static circle: positional correction + bounce + friction.
   * @param {Ball} b
   * @param {number} cx
   * @param {number} cy
   * @param {number} cr
   * @param {number} restitution
   * @param {number} friction
   * @param {string[]} events
   * @param {string} eventName
   */
  circleImpulse(b, cx, cy, cr, restitution, friction, events, eventName) {
    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.hypot(dx, dy);
    const min = b.r + cr;
    if (dist >= min || dist < 1e-8) return false;

    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;

    // separate
    const overlap = min - dist;
    b.x += nx * overlap;
    b.y += ny * overlap;

    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return false; // separating

    const vt = b.vx * tx + b.vy * ty;

    // normal impulse (static body, infinite mass)
    const vnAfter = -vn * restitution;
    // tangent: kinetic friction toward zero slip (+ light spin coupling)
    const spinSlip = vt - b.omega * b.r * 0.15;
    const vtAfter = spinSlip * (1 - friction);

    b.vx = vnAfter * nx + vtAfter * tx;
    b.vy = vnAfter * ny + vtAfter * ty;
    b.omega += -spinSlip * friction * 0.08;

    // impact threshold for SFX — ignore grazing
    if (-vn > 40) events.push(eventName);
    return true;
  }

  /**
   * @param {Ball} b
   * @param {string[]} events
   */
  constrainRail(b, events) {
    const right = RAIL_RIGHT - b.r - 0.5;
    if (b.x > right) {
      b.x = right;
      if (b.vx > 0) {
        const vn = b.vx;
        b.vx = -vn * WALL_RESTITUTION;
        b.vy *= 1 - WALL_FRICTION * 0.5;
        if (vn > 30) events.push("wall");
      }
    }

    // Left wall only below the gate (sealed ascent channel)
    if (b.y >= GATE_Y) {
      const left = RAIL_LEFT + b.r + 0.5;
      if (b.x < left) {
        b.x = left;
        if (b.vx < 0) {
          const vn = -b.vx;
          b.vx = vn * WALL_RESTITUTION;
          b.vy *= 1 - WALL_FRICTION * 0.5;
          if (vn > 30) events.push("wall");
        }
      }
    }

    // Ceiling of cabinet inside rail
    const top = TOP_OPEN_Y + b.r;
    if (b.y < top) {
      b.y = top;
      if (b.vy < 0) {
        b.vy = -b.vy * WALL_RESTITUTION;
        b.vx *= 1 - WALL_FRICTION;
        events.push("wall");
      }
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
      if (b.vx < 0) {
        b.vx = -b.vx * WALL_RESTITUTION;
        b.vy *= 1 - WALL_FRICTION * 0.4;
        events.push("wall");
      }
    } else if (b.x > right) {
      b.x = right;
      if (b.vx > 0) {
        b.vx = -b.vx * WALL_RESTITUTION;
        b.vy *= 1 - WALL_FRICTION * 0.4;
        events.push("wall");
      }
    }
    const top = TOP_OPEN_Y + b.r;
    if (b.y < top) {
      b.y = top;
      if (b.vy < 0) {
        b.vy = -b.vy * WALL_RESTITUTION;
        b.vx *= 1 - WALL_FRICTION * 0.4;
        events.push("wall");
      }
    }
  }

  /**
   * @param {string[]} events
   */
  missRail(events) {
    this.ball = null;
    this.lastGain = 0;
    events.push("deny");
    if (this.ballsLeft <= 0) {
      this.status = "over";
      this.message = `力道不足掉回 · 本局結束 · 總分 ${this.score}`;
      events.push("over");
    } else {
      this.status = "ready";
      this.message = `力道不足，珠子掉回軌道 · 剩 ${this.ballsLeft} 珠`;
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
    this.shake = 0.45;
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
