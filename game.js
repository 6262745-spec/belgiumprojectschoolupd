// game.js

// ---
// SETUP
// ---
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const quizBox = document.getElementById("quiz");
const quizTimer = document.getElementById("quiz-timer");
const quizQuestion = document.getElementById("quiz-question");
const quizChoices = document.getElementById("quiz-choices");
const quizBarFill = document.getElementById("quiz-bar-fill");
const jumpBtn = document.getElementById("btn-jump");
const diveBtn = document.getElementById("btn-dive");

const IS_TOUCH = window.matchMedia("(pointer: coarse)").matches;


// ---
// CONFIG
// ---

const UI_FONT = '"Pixelify Sans", sans-serif';
document.fonts.load('bold 20px "Pixelify Sans"');

const DESIGN_H = 500;
const MIN_GAME_W = 640;   // narrow (portrait phone) screens zoom out so you can still see what's coming
const WAFFLE_HEIGHT = 120;
const MAX_STEP = 3;

const MAX_HEALTH = 5;
const QUESTION_TIME = 10;
const WRONG_ANSWER_COSTS_HEALTH = true;

const START_SPEED = 8;
const MAX_SPEED = 15;
const SPEED_UP = 0.002;

const WAFFLE_CROP = { x: 125, y: 45, w: 265, h: 400 };
const BEE_FRAMES = 6;
const HOUSE_WALLS = ["#d8c7a8", "#c48a74", "#9fb0c2", "#e2d3b8"];


// ---
// ASSETS
// ---

const waffleImg = new Image();
waffleImg.src = "assets/images/waffle.png";

const beeImg = new Image();
beeImg.src = "assets/images/bee.png";

const heartImg = new Image();
heartImg.src = "assets/images/heart_spritesheet_32x32.png";

const HEART_CELL = 32;
const HEART_DRAW = 30;
const HEART_FULL = { col: 0, row: 0 };
const HEART_EMPTY = { col: 4, row: 0 };


const FORK = [
  "X.X.X.X",
  "X.X.X.X",
  "X.X.X.X",
  "XXXXXXX",
  ".XXXXX.",
  "..XXX..",
  "..DXD..",
  "..DXD..",
  "..DXD..",
  "..DXD..",
  "..DXD..",
  "..DXD..",
];
const FORK_ROWS = FORK.length;
const FORK_COLS = FORK[0].length;


// ---
// STATE
// ---
const player = {
  x: 0,
  y: 0,
  width: 45,
  height: 60,
  vy: 0,

  gravity: 0.6,
  jumpPower: -12,
  isJumping: false,
  groundY: 0,

  standHeight: 60,
  diveHeight: 30,
  isDiving: false,
};

const obstacles = [];
const keys = {};
let touchDive = false;

// World size and scaling
let floorY = 0;
let gameW = 800;
let scale = 1;
let offsetY = 0;

// Loop control
let running = false;
let rafId = 0;
let lastTime = 0;

// Game progress
let state = "start";   // "start" | "playing" | "question" | "gameover"
let health = MAX_HEALTH;
let speed = START_SPEED;
let distance = 0;
let distanceSinceSpawn = 0;
let nextGap = 600;

// Quiz
let currentQ = null;
let correctIndex = 0;
let deadline = 0;
let deck = [];

// Debug
let showHitboxes = false;   // press H


// ---
// INPUT
// ---
window.addEventListener("keydown", e => {
  if (!running) return;

  if (e.key === "h" || e.key === "H") {
    showHitboxes = !showHitboxes;
    return;
  }


  if (state === "start") {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      beginPlaying();
    }
    return;
  }

  if (state === "question") {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= quizChoices.children.length) answer(n - 1);
    return;
  }

  if (state === "gameover") {
    if (e.key === "Enter") { // Enter button restarts, i swear i'll forget ts
      restartGame();
    }
    return;
  }

  if (state !== "playing") return;

  if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
  }

  keys[e.key] = true;

  if ((e.key === " " || e.key === "ArrowUp") && !e.repeat) {
    jump();
  }
});

window.addEventListener("keyup", e => { keys[e.key] = false });

// Touch: tap the screen to start/restart, buttons to jump and dive
canvas.addEventListener("pointerdown", e => {
  if (!running) return;
  e.preventDefault();
  if (state === "start") beginPlaying();
  else if (state === "gameover") restartGame();
  else if (state === "playing" && IS_TOUCH) jump();
});

jumpBtn.addEventListener("pointerdown", e => {
  e.preventDefault();
  jumpBtn.classList.add("pressed");
  if (!running) return;
  if (state === "start") beginPlaying();
  else if (state === "gameover") restartGame();
  else if (state === "playing") jump();
});

diveBtn.addEventListener("pointerdown", e => {
  e.preventDefault();
  diveBtn.setPointerCapture(e.pointerId);
  diveBtn.classList.add("pressed");
  touchDive = true;
});

function releaseButton(e) {
  e.currentTarget.classList.remove("pressed");
  if (e.currentTarget === diveBtn) touchDive = false;
}
for (const btn of [jumpBtn, diveBtn]) {
  btn.addEventListener("pointerup", releaseButton);
  btn.addEventListener("pointercancel", releaseButton);
  btn.addEventListener("pointerleave", releaseButton);
  btn.addEventListener("contextmenu", e => e.preventDefault());
}


// ---
// ACTIONS
// ---
function jump() {
  if (player.isJumping) return;
  player.height = player.standHeight;
  player.y = floorY - player.standHeight;
  player.vy = player.jumpPower;
  player.isJumping = true;
}

function beginPlaying() {
  state = "playing";
}

function restartGame() {
  stopGame();
  startGame();
  state = "playing";
}


// ---
// HELPERS
// ---

// Basic fisher-yates implementation, great algorithm btw (Randomness)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
}

function getHitbox(obj, shrink = 8) {
  return {
    x: obj.x + shrink,
    y: obj.y + shrink,
    width: obj.width - shrink * 2,
    height: obj.height - shrink * 2
  };
}

function getObstacleHitbox(o) {
  return getHitbox(o, 2);
}

function collides(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}


// ---
// OBSTACLES
// ---
function minGap() {
  const airFrames = (2 * -player.jumpPower) / player.gravity;
  return airFrames * speed + speed * 20;
}

function spawnObstacle() {
  if (Math.random() < 0.35) {
    const gap = player.diveHeight + 20;
    const size = 110;
    obstacles.push({ x: gameW, y: floorY - gap - size, width: size, height: size, type: "high", hit: false });
  } else {
    const h = 40 + Math.random() * 30;
    const w = h * FORK_COLS / FORK_ROWS;
    obstacles.push({ x: gameW, y: floorY - h, width: w, height: h, type: "ground", hit: false });
  }
}


// ---
// QUIZ
// ---
function nextQuestion() {
  if (deck.length === 0) {
    deck = questions.slice();
    shuffle(deck);

    if (deck.length > 1 && deck[deck.length - 1] === currentQ) {
      const temp = deck[0];
      deck[0] = deck[deck.length - 1];
      deck[deck.length - 1] = temp;
    }
  }
  return deck.pop();
}

function askQuestion() {
  state = "question";
  currentQ = nextQuestion();

  quizQuestion.textContent = currentQ.question;

  const options = [];
  for (let i = 0; i < currentQ.choices.length; i++) {
    options.push({ text: currentQ.choices[i], isCorrect: i === currentQ.answer });
  }
  shuffle(options);

  quizChoices.innerHTML = "";
  for (let i = 0; i < options.length; i++) {
    if (options[i].isCorrect) correctIndex = i;

    const button = document.createElement("button");
    button.textContent = (i + 1) + ". " + options[i].text;
    button.addEventListener("click", function () {
      answer(i);
    });
    quizChoices.appendChild(button);
  }

  deadline = Date.now() + QUESTION_TIME * 1000;
  updateTimer();
  quizBox.hidden = false;
}

function answer(i) {
  if (state !== "question") return;
  if (i !== correctIndex && WRONG_ANSWER_COSTS_HEALTH) {
    loseHealth();
  }
  closeQuestion();
}

function loseHealth() {
  health--;
  if (health <= 0) {
    health = 0;
    state = "gameover";
  }
}

function closeQuestion() {
  quizBox.hidden = true;
  if (state !== "gameover") {
    state = "playing";
  }
}

function updateTimer() {
  const msLeft = deadline - Date.now();
  if (msLeft <= 0) {
    loseHealth();
    closeQuestion();
    return;
  }

  const secondsLeft = Math.ceil(msLeft / 1000);
  quizTimer.textContent = secondsLeft + "s";
  quizBarFill.style.width = (msLeft / (QUESTION_TIME * 1000)) * 100 + "%";
  quizBarFill.classList.toggle("low", secondsLeft <= 5);
}


// ---
// UPDATE
// ---
function logic(step) {
  // Speed ramp
  if (speed < MAX_SPEED) {
    speed += SPEED_UP * step;
    if (speed > MAX_SPEED) speed = MAX_SPEED;
  }

  // Player: dive, gravity, landing
  player.isDiving = (keys["ArrowDown"] || touchDive) && !player.isJumping;
  player.height = player.isDiving ? player.diveHeight : player.standHeight;
  player.groundY = floorY - player.height;

  if (player.isDiving) {
    player.y = player.groundY;
    player.vy = 0;
  } else {
    player.vy += player.gravity * step;
    player.y += player.vy * step;
  }

  if (player.y >= player.groundY) {
    player.y = player.groundY;
    player.vy = 0;
    player.isJumping = false;
  }

  // World movement and score
  const move = speed * step;
  distance += move;

  // Spawning
  distanceSinceSpawn += move;
  if (distanceSinceSpawn >= nextGap) {
    spawnObstacle();
    distanceSinceSpawn = 0;
    nextGap = minGap() + Math.random() * 400;
  }

  // Move obstacles and check hits
  for (const o of obstacles) {
    o.x -= move;

    if (!o.hit && collides(getHitbox(player), getObstacleHitbox(o))) {
      o.hit = true;
      askQuestion();
      break;
    }
  }

  // Remove obstacles that left the screen
  while (obstacles.length && obstacles[0].x + obstacles[0].width < 0) {
    obstacles.shift();
  }
}


// ---
// DRAWING: BACKGROUND
// ---
function drawLayer(tileWidth, factor, drawTile) {
  const offset = (distance * factor) % tileWidth;
  for (let x = -offset; x < gameW; x += tileWidth) {
    drawTile(x);
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + size * 0.7, y + size * 0.1, size * 0.7, size * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x - size * 0.7, y + size * 0.1, size * 0.6, size * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHouse(x, w, h, wall) {
  const top = floorY - h;

  ctx.fillStyle = wall;
  ctx.fillRect(x, top, w, h);

  ctx.fillStyle = "#8a4b3d";
  ctx.beginPath();
  ctx.moveTo(x - 4, top);
  ctx.lineTo(x + w / 2, top - w * 0.45);
  ctx.lineTo(x + w + 4, top);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6f8fb0";
  for (let wy = top + 12; wy < floorY - 20; wy += 24) {
    ctx.fillRect(x + w * 0.2, wy, 8, 12);
    ctx.fillRect(x + w * 0.6, wy, 8, 12);
  }
}

function drawTower(x) {
  const w = 44;
  const h = 170;
  const top = floorY - h;

  ctx.fillStyle = "#a79f93";
  ctx.fillRect(x, top, w, h);

  ctx.fillStyle = "#4f4f5c";
  ctx.beginPath();
  ctx.moveTo(x - 3, top);
  ctx.lineTo(x + w / 2, top - 60);
  ctx.lineTo(x + w + 3, top);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#4f4f5c";
  ctx.fillRect(x + w / 2 - 5, top + 20, 10, 24);

  ctx.fillStyle = "#f4efe2";
  ctx.beginPath();
  ctx.arc(x + w / 2, top + 70, 9, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground() {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, floorY);
  sky.addColorStop(0, "#4aa8ee");
  sky.addColorStop(1, "#bfe6ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, gameW + 2, floorY);

  // Sun
  ctx.fillStyle = "#fff3a0";
  ctx.beginPath();
  ctx.arc(gameW * 0.75, 80, 34, 0, Math.PI * 2);
  ctx.fill();

  // Clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  drawLayer(700, 0.08, function (x) {
    drawCloud(x + 100, 70, 35);
    drawCloud(x + 380, 45, 28);
    drawCloud(x + 560, 100, 32);
  });

  // Skyline
  drawLayer(900, 0.25, function (x) {
    drawHouse(x + 0, 60, 70, HOUSE_WALLS[0]);
    drawHouse(x + 60, 50, 90, HOUSE_WALLS[1]);
    drawHouse(x + 110, 70, 60, HOUSE_WALLS[2]);
    drawTower(x + 220);
    drawHouse(x + 264, 60, 80, HOUSE_WALLS[3]);
    drawHouse(x + 324, 55, 65, HOUSE_WALLS[0]);
    drawHouse(x + 520, 70, 85, HOUSE_WALLS[1]);
    drawHouse(x + 590, 50, 70, HOUSE_WALLS[2]);
    drawHouse(x + 640, 60, 100, HOUSE_WALLS[0]);
    drawHouse(x + 700, 55, 75, HOUSE_WALLS[3]);
  });

  // Road
  ctx.fillStyle = "#4b4f57";
  ctx.fillRect(0, floorY, gameW + 2, DESIGN_H - floorY);
  ctx.fillStyle = "#d5d9df";
  drawLayer(80, 1, function (x) {
    ctx.fillRect(x, floorY + 14, 36, 3);
    ctx.fillRect(x + 40, floorY + 28, 18, 3);
  });

  // Floor line
  ctx.strokeStyle = "#2b2f36";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(gameW, floorY);
  ctx.stroke();
}


// ---
// DRAWING: SPRITES
// ---
function drawPlayer() {
  if (!waffleImg.complete) return;

  let drawWidth = player.width;
  if (player.isDiving) drawWidth = player.width * 1.4;
  const drawX = player.x - (drawWidth - player.width) / 2;

  ctx.drawImage(
    waffleImg,
    WAFFLE_CROP.x, WAFFLE_CROP.y, WAFFLE_CROP.w, WAFFLE_CROP.h,
    drawX, player.y, drawWidth, player.height
  );
}

function drawObstacle(o) {
  if (o.type === "ground") {
    const cell = o.height / FORK_ROWS;

    for (let r = 0; r < FORK_ROWS; r++) {
      for (let c = 0; c < FORK_COLS; c++) {
        const letter = FORK[r][c];
        if (letter === ".") continue;

        ctx.fillStyle = (letter === "D") ? "#2f353d" : "#5c6670";
        ctx.fillRect(
          Math.round(o.x + c * cell),
          Math.round(o.y + r * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
  } else if (beeImg.complete && beeImg.naturalWidth > 0) {
    const frameW = beeImg.naturalWidth / BEE_FRAMES;
    const frameH = beeImg.naturalHeight;
    const frame = Math.floor(Date.now() / 80) % BEE_FRAMES;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      beeImg,
      frame * frameW, 0, frameW, frameH,
      o.x, o.y, o.width, o.height
    );
    ctx.restore();
  }
}

function drawHitbox(box) {
  ctx.strokeStyle = "red";
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
}


// ---
// DRAWING: HUD
// ---
function drawHearts() {
  if (!heartImg.complete || heartImg.naturalWidth === 0) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < MAX_HEALTH; i++) {
    const cell = i < health ? HEART_FULL : HEART_EMPTY;
    ctx.drawImage(
      heartImg,
      cell.col * HEART_CELL, cell.row * HEART_CELL, HEART_CELL, HEART_CELL,
      8 + i * (HEART_DRAW + 2), 6, HEART_DRAW, HEART_DRAW
    );
  }

  ctx.restore();
}

function drawHud(score) {
  drawHearts();

  ctx.fillStyle = "#0b2545";
  ctx.textAlign = "right";
  ctx.font = "24px " + UI_FONT;
  ctx.fillText("Score: " + score, gameW - 10, 30);
}

function drawGameOver(score) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, gameW, DESIGN_H);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "40px " + UI_FONT;
  ctx.fillText("GAME OVER", gameW / 2, DESIGN_H / 2 - 10);
  ctx.font = "20px " + UI_FONT;
  ctx.fillText("Score: " + score, gameW / 2, DESIGN_H / 2 + 20);
  ctx.fillText(IS_TOUCH ? "Tap to restart" : "Press Enter to restart", gameW / 2, DESIGN_H / 2 + 50);
}

function drawStartScreen() {
  ctx.fillStyle = "rgba(10, 20, 40, 0.55)";
  ctx.fillRect(0, 0, gameW, DESIGN_H);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "bold 56px " + UI_FONT;
  ctx.fillText("BELGIUM GAME TITLE", gameW / 2, 170, gameW - 20);

  ctx.font = "22px " + UI_FONT;
  ctx.fillText(IS_TOUCH ? "Tap or JUMP button: jump" : "Space / Up arrow: jump", gameW / 2, 235);
  ctx.fillText(IS_TOUCH ? "Hold DIVE button: dive" : "Down arrow: dive", gameW / 2, 268);
  ctx.fillText("Hit an obstacle and you have to answer a question", gameW / 2, 315, gameW - 20);

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.font = "bold 28px " + UI_FONT;
    ctx.fillText(IS_TOUCH ? "Tap to start" : "Press Space to start", gameW / 2, 390);
  }
}


// ---
// RENDER
// ---
function render() {
  // On tall screens the game sits in the middle; fill the space above with sky and below with road
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (offsetY > 0) {
    ctx.fillStyle = "#4aa8ee";
    ctx.fillRect(0, 0, canvas.width, offsetY + 1);
    ctx.fillStyle = "#4b4f57";
    ctx.fillRect(0, canvas.height - offsetY - 1, canvas.width, offsetY + 1);
  }

  ctx.setTransform(scale, 0, 0, scale, 0, offsetY);
  ctx.clearRect(0, 0, gameW, DESIGN_H);


  const score = Math.floor(distance / 10);

  drawBackground();
  drawPlayer();

  for (const o of obstacles) {
    drawObstacle(o);
  }

  if (showHitboxes) {
    drawHitbox(getHitbox(player));
    for (const o of obstacles) {
      drawHitbox(getObstacleHitbox(o));
    }
  }

  drawHud(score);
  if (state === "start") drawStartScreen();
  if (state === "gameover") drawGameOver(score);
}


// ---
// CANVAS SIZE
// ---
function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  scale = Math.min(canvas.height / DESIGN_H, canvas.width / MIN_GAME_W);
  gameW = canvas.width / scale;
  offsetY = (canvas.height - DESIGN_H * scale) / 2;

  floorY = DESIGN_H - 40;
  player.standHeight = WAFFLE_HEIGHT;
  player.diveHeight = player.standHeight * 0.5;
  player.height = player.standHeight;
  player.width = player.standHeight * (WAFFLE_CROP.w / WAFFLE_CROP.h);
  player.x = 50;
  player.groundY = floorY - player.height;
  player.y = player.groundY;
  render();
}


// ---
// GAME LOOP
// ---
function loop(timestamp) {
  if (!running) return;

  let step = 1;
  if (lastTime !== 0) {
    step = (timestamp - lastTime) / (1000 / 60);
  }
  lastTime = timestamp;

  if (step > MAX_STEP) step = MAX_STEP;
  if (step < 0) step = 0;

  if (state === "playing") {
    logic(step);
  } else if (state === "question") {
    updateTimer();
  }

  render();
  rafId = requestAnimationFrame(loop);
}

function startGame() {
  if (running) return;

  obstacles.length = 0;
  distanceSinceSpawn = 0;
  distance = 0;
  nextGap = 600;
  speed = START_SPEED;

  player.vy = 0;
  player.isJumping = false;
  player.isDiving = false;
  player.height = player.standHeight;
  player.groundY = floorY - player.height;
  player.y = player.groundY;

  health = MAX_HEALTH;
  state = "start";
  quizBox.hidden = true;

  for (const k in keys) keys[k] = false;
  touchDive = false;

  lastTime = 0;
  running = true;
  rafId = requestAnimationFrame(loop);
}

function stopGame() {
  running = false;
  cancelAnimationFrame(rafId);
  quizBox.hidden = true;
}