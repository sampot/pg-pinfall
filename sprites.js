import {
  BALL_R,
  FIELD_LEFT,
  FIELD_RIGHT,
  GATE_Y,
  H,
  RAIL_LEFT,
  RAIL_RIGHT,
  SLOT_TOP,
  TOP_OPEN_Y,
  W,
} from "./game.js";

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').PinfallGame} game
 */
export function drawScene(ctx, game) {
  const shakeX = (Math.random() - 0.5) * game.shake * 6;
  const shakeY = (Math.random() - 0.5) * game.shake * 4;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a1024");
  g.addColorStop(0.45, "#120c1a");
  g.addColorStop(1, "#0a0810");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // outer frame
  ctx.fillStyle = "rgba(251,191,36,0.18)";
  ctx.fillRect(0, 0, 12, H);
  ctx.fillRect(W - 12, 0, 12, H);
  ctx.fillStyle = "rgba(251,191,36,0.45)";
  ctx.fillRect(10, 0, 3, H);
  ctx.fillRect(W - 13, 0, 3, H);

  // title
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, FIELD_LEFT + 8, 8, FIELD_RIGHT - FIELD_LEFT - 16, 26, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(253,224,71,0.85)";
  ctx.font = "700 12px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("釘 雨 落 珠", (FIELD_LEFT + FIELD_RIGHT) / 2, 21);

  // main field glass
  ctx.fillStyle = "rgba(94,234,212,0.035)";
  ctx.fillRect(FIELD_LEFT, TOP_OPEN_Y, FIELD_RIGHT - FIELD_LEFT, SLOT_TOP - TOP_OPEN_Y);

  // divider wall between field and rail (opens above GATE_Y)
  ctx.fillStyle = "rgba(251,191,36,0.28)";
  ctx.fillRect(RAIL_LEFT - 4, GATE_Y, 4, H - GATE_Y);
  ctx.fillStyle = "rgba(94,234,212,0.15)";
  ctx.fillRect(RAIL_LEFT - 4, TOP_OPEN_Y, 4, GATE_Y - TOP_OPEN_Y);

  // static bumpers at rail exit
  for (const bumper of game.bumpers) {
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(251,191,36,0.35)";
    ctx.fill();
    ctx.strokeStyle = "rgba(253,224,71,0.75)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "600 9px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("入口", FIELD_RIGHT - 18, TOP_OPEN_Y + 12);

  // launch rail channel
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(RAIL_LEFT, TOP_OPEN_Y, RAIL_RIGHT - RAIL_LEFT, H - TOP_OPEN_Y - 12);
  ctx.strokeStyle = "rgba(251,191,36,0.45)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    RAIL_LEFT + 0.5,
    TOP_OPEN_Y + 0.5,
    RAIL_RIGHT - RAIL_LEFT - 1,
    H - TOP_OPEN_Y - 13,
  );
  // rail arrows
  ctx.fillStyle = "rgba(253,224,71,0.35)";
  ctx.font = "700 11px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("↑", (RAIL_LEFT + RAIL_RIGHT) / 2, H * 0.45);
  ctx.fillText("射", (RAIL_LEFT + RAIL_RIGHT) / 2, H * 0.5);
  ctx.fillText("道", (RAIL_LEFT + RAIL_RIGHT) / 2, H * 0.55);

  // pegs (field only)
  for (const peg of game.pegs) {
    const lit = peg.flash;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fillStyle = lit > 0 ? `rgba(253,224,71,${0.55 + lit * 0.4})` : "#c4b5fd";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(peg.x - peg.r * 0.3, peg.y - peg.r * 0.3, peg.r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
  }

  // slots under field
  for (const slot of game.slots) {
    const mid = (slot.x0 + slot.x1) / 2;
    const flash = slot.flash;
    ctx.fillStyle =
      flash > 0
        ? `rgba(251,191,36,${0.25 + flash * 0.35})`
        : "rgba(255,255,255,0.06)";
    ctx.fillRect(slot.x0 + 1, SLOT_TOP, slot.x1 - slot.x0 - 2, 44);
    ctx.fillStyle = "rgba(251,191,36,0.35)";
    ctx.fillRect(slot.x0, SLOT_TOP, 2, 44);
    ctx.fillStyle = flash > 0 ? "#fef08a" : "#fde68a";
    ctx.font = "700 14px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(slot.label, mid, SLOT_TOP + 18);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "600 10px system-ui,sans-serif";
    ctx.fillText(`+${slot.score}`, mid, SLOT_TOP + 34);
  }
  if (game.slots.length) {
    ctx.fillStyle = "rgba(251,191,36,0.35)";
    ctx.fillRect(game.slots[game.slots.length - 1].x1 - 2, SLOT_TOP, 2, 44);
  }

  // power meter beside rail
  const meterX = RAIL_LEFT - 22;
  const meterY = H - 210;
  const meterH = 120;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, meterX, meterY, 14, meterH, 6);
  ctx.fill();
  const ph = meterH * game.power;
  const mg = ctx.createLinearGradient(0, meterY + meterH, 0, meterY);
  mg.addColorStop(0, "#34d399");
  mg.addColorStop(0.55, "#fbbf24");
  mg.addColorStop(1, "#f43f5e");
  ctx.fillStyle = mg;
  roundRect(ctx, meterX + 2, meterY + meterH - ph, 10, ph, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 9px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("力", meterX + 7, meterY - 8);

  // waiting ball in rail
  if (game.status === "ready" && game.ballsLeft > 0) {
    drawBall(ctx, game.launcherX, H - 72, BALL_R, 0, 1);
  }

  if (game.ball?.active) {
    drawBall(ctx, game.ball.x, game.ball.y, game.ball.r, game.ball.angle, 1);
  }

  // remaining balls
  for (let i = 0; i < 3; i++) {
    const on = i < game.ballsLeft;
    ctx.beginPath();
    ctx.arc(FIELD_LEFT + 14 + i * 16, H - 18, 5, 0, Math.PI * 2);
    ctx.fillStyle = on ? "#fbbf24" : "rgba(255,255,255,0.12)";
    ctx.fill();
  }

  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} angle
 * @param {number} a
 */
function drawBall(ctx, x, y, r, angle, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
  g.addColorStop(0, "#fef9c3");
  g.addColorStop(0.45, "#fbbf24");
  g.addColorStop(1, "#b45309");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // spin mark
  ctx.strokeStyle = "rgba(120,53,15,0.55)";
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, 0);
  ctx.lineTo(r * 0.45, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, -0.6, 0.6);
  ctx.stroke();
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
