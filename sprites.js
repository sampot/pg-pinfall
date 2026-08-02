import { BALL_R, H, W } from "./game.js";

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').PinfallGame} game
 */
export function drawScene(ctx, game) {
  const shakeX = (Math.random() - 0.5) * game.shake * 6;
  const shakeY = (Math.random() - 0.5) * game.shake * 4;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // cabinet
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a1024");
  g.addColorStop(0.45, "#120c1a");
  g.addColorStop(1, "#0a0810");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // side rails
  ctx.fillStyle = "rgba(251,191,36,0.18)";
  ctx.fillRect(0, 0, 12, H);
  ctx.fillRect(W - 12, 0, 12, H);
  ctx.fillStyle = "rgba(251,191,36,0.45)";
  ctx.fillRect(10, 0, 3, H);
  ctx.fillRect(W - 13, 0, 3, H);

  // top arch label
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, 40, 10, W - 80, 28, 10);
  ctx.fill();
  ctx.fillStyle = "rgba(253,224,71,0.85)";
  ctx.font = "700 13px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("釘 雨 落 珠", W / 2, 24);

  // playfield glass tint
  ctx.fillStyle = "rgba(94,234,212,0.03)";
  ctx.fillRect(14, 40, W - 28, H - 120);

  // pegs
  for (const peg of game.pegs) {
    const lit = peg.flash;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fillStyle = lit > 0 ? `rgba(253,224,71,${0.55 + lit * 0.4})` : "#c4b5fd";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // nail head highlight
    ctx.beginPath();
    ctx.arc(peg.x - peg.r * 0.3, peg.y - peg.r * 0.3, peg.r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
  }

  // slot bowls
  const slotTop = H - 56;
  for (const slot of game.slots) {
    const mid = (slot.x0 + slot.x1) / 2;
    const flash = slot.flash;
    ctx.fillStyle =
      flash > 0
        ? `rgba(251,191,36,${0.25 + flash * 0.35})`
        : "rgba(255,255,255,0.06)";
    ctx.fillRect(slot.x0 + 1, slotTop, slot.x1 - slot.x0 - 2, 44);
    // divider
    ctx.fillStyle = "rgba(251,191,36,0.35)";
    ctx.fillRect(slot.x0, slotTop, 2, 44);
    ctx.fillStyle = flash > 0 ? "#fef08a" : "#fde68a";
    ctx.font = "700 14px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(slot.label, mid, slotTop + 18);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "600 10px system-ui,sans-serif";
    ctx.fillText(`+${slot.score}`, mid, slotTop + 34);
  }
  ctx.fillStyle = "rgba(251,191,36,0.35)";
  ctx.fillRect(game.slots[game.slots.length - 1].x1 - 2, slotTop, 2, 44);

  // launcher channel
  const lx = game.launcherX;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, lx - 16, H - 100, 32, 40, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(251,191,36,0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // power meter
  const meterX = W - 34;
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

  // waiting ball in launcher
  if (game.status === "ready" && game.ballsLeft > 0) {
    drawBall(ctx, lx, H - 78, BALL_R, 1);
  }

  // flying ball
  if (game.ball?.active) {
    drawBall(ctx, game.ball.x, game.ball.y, game.ball.r, 1);
  }

  // balls remaining dots
  for (let i = 0; i < 3; i++) {
    const on = i < game.ballsLeft;
    ctx.beginPath();
    ctx.arc(28 + i * 16, H - 18, 5, 0, Math.PI * 2);
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
 * @param {number} a
 */
function drawBall(ctx, x, y, r, a) {
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, "#fef9c3");
  g.addColorStop(0.45, "#fbbf24");
  g.addColorStop(1, "#b45309");
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
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
