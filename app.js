import { PinfallAudio } from "./audio.js";
import { PinfallGame, H, W } from "./game.js";
import { drawScene } from "./sprites.js";

const audio = new PinfallAudio();
const game = new PinfallGame();
globalThis.__pinfall = game;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const ballsEl = document.getElementById("balls");
const statusEl = document.getElementById("status");
const btnMute = document.getElementById("btn-mute");
const btnLaunch = document.getElementById("btn-launch");
const btnReset = document.getElementById("btn-reset");

canvas.width = W;
canvas.height = H;

let lastTs = 0;
let running = true;
let lastChargeBeep = 0;

function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function syncHud() {
  scoreEl.textContent = String(game.score);
  ballsEl.textContent = String(game.ballsLeft);
  const tone =
    game.status === "over"
      ? "win"
      : game.lastGain >= 50
        ? "win"
        : game.charging
          ? "warn"
          : "";
  setStatus(game.message, tone);
  btnLaunch.disabled = game.status !== "ready" || game.ballsLeft <= 0;
  btnLaunch.textContent =
    game.status === "over"
      ? "本局結束"
      : game.charging
        ? "鬆手發射"
        : "按住發射";
}

/**
 * @param {string[]} events
 */
function handleEvents(events) {
  for (const e of events) {
    if (e === "launch") audio.launch();
    else if (e === "enter") audio.wall();
    else if (e === "peg") audio.peg();
    else if (e === "wall") audio.wall();
    else if (e === "score") audio.score();
    else if (e === "jackpot") audio.jackpot();
    else if (e === "over") audio.over();
  }
}

/**
 * @param {number} ts
 */
function frame(ts) {
  if (!running) return;
  const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;

  if (game.charging && ts - lastChargeBeep > 140) {
    lastChargeBeep = ts;
    // soft tick only while rising near peaks feels noisy; skip — visual meter enough
  }

  const { events } = game.update(dt);
  handleEvents(events);
  syncHud();
  drawScene(ctx, game);
  requestAnimationFrame(frame);
}

async function startCharge() {
  await audio.unlock();
  if (game.beginCharge()) {
    syncHud();
  }
}

function endCharge() {
  if (!game.charging) return;
  const { ok, events } = game.release();
  if (ok) handleEvents(events);
  syncHud();
}

btnLaunch.addEventListener("pointerdown", (ev) => {
  ev.preventDefault();
  startCharge();
});
btnLaunch.addEventListener("pointerup", (ev) => {
  ev.preventDefault();
  endCharge();
});
btnLaunch.addEventListener("pointerleave", () => {
  if (game.charging) endCharge();
});
btnLaunch.addEventListener("pointercancel", () => {
  if (game.charging) endCharge();
});

canvas.addEventListener("pointerdown", async (ev) => {
  await audio.unlock();
  const rect = canvas.getBoundingClientRect();
  const y = ((ev.clientY - rect.top) / rect.height) * H;
  // tap lower third or power meter area to charge
  if (y > H * 0.55 || game.status === "ready") {
    startCharge();
  }
});
canvas.addEventListener("pointerup", () => endCharge());
canvas.addEventListener("pointercancel", () => endCharge());
window.addEventListener("pointerup", () => endCharge());

btnReset.addEventListener("click", async () => {
  await audio.unlock();
  game.reset();
  syncHud();
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  audio.setEnabled(!audio.enabled);
  btnMute.textContent = audio.enabled ? "音效開" : "音效關";
  btnMute.setAttribute("aria-pressed", audio.enabled ? "true" : "false");
});

syncHud();
requestAnimationFrame(frame);
