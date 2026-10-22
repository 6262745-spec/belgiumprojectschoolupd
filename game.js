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

const touchJump = document.getElementById("touch-jump");
const touchDive = document.getElementById("touch-dive");


// ---
// CONFIG
// ---
const UI_FONT = '"Pixelify Sans", sans-serif';
document.fonts.load('bold 20px "Pixelify Sans"');

const touchQuery = window.matchMedia("(pointer: coarse)");
const portraitQuery = window.matchMedia("(pointer: coarse) and (orientation: portrait)");

const DESIGN_H = 500;
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
const BEE_HITBOX = { side: 30, top: 15, bottom: 20 };
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

// World size and scaling
let floorY = 0;
let gameW = 800;
let scale = 1;

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
let gameOverTime = 0;

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
function jump() {
  if (state !== "playing" || player.isJumping) return;
  player.height = player.standHeight;
  player.y = floorY - player.standHeight;
  player.vy = player.jumpPower;
  player.isJumping = true;
}

function pressStart() {
  if (!running) return;

  if (state === "start") {
    state = "playing";
  } else if (state === "gameover" && Date.now() - gameOverTime > 800) {
    stopGame();
    startGame();
    state = "playing";
  }
}

window.addEventListener("keydown", e => {
  if (!running) return;

  if (e.key === "h" || e.key === "H") {
    showHitboxes = !showHitboxes;
    return;
  }

  if (state === "start") {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      pressStart();
    }
    return;
  }

  if (state === "question") {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= quizChoices.children.length) answer(n - 1);
    return;
  }

  if (state === "gameover") {
    if (e.key === "Enter") pressStart();   // Enter button restarts, i swear i'll forget ts
    return;
  }

  if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
  }

  keys[e.key] = true;

  if ((e.key === " " || e.key === "ArrowUp") && !e.repeat) {
    jump();
  }
});

window.addEventListener("keyup", e => { keys[e.key] = false });

// Touch: right half = jump, left half = hold to dive
touchJump.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  if (state === "playing") jump();
  else pressStart();
});

touchDive.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  if (state === "playing") keys["ArrowDown"] = true;
  else pressStart();
});

function releaseDive() { keys["ArrowDown"] = false; }
touchDive.addEventListener("pointerup", releaseDive);
touchDive.addEventListener("pointercancel", releaseDive);
touchDive.addEventListener("pointerleave", releaseDive);


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
  if (o.type === "high") {
    return {
      x: o.x + BEE_HITBOX.side,
      y: o.y + BEE_HITBOX.top,
      width: o.width - BEE_HITBOX.side * 2,
      height: o.height - BEE_HITBOX.top - BEE_HITBOX.bottom
    };
  }
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

// gap = how far after the previous obstacle in the group (the first one ignores it)
// minSpeed = the pattern only appears once the game is at least this fast
// weight = how often it shows up (higher = more common)


function jumpDistance() {
  return ((2 * -player.jumpPower) / player.gravity) * speed;
}

function minGap() {
  return jumpDistance() + speed * 20;
}

function gapSize(kind) {
  if (kind === "close") return jumpDistance() * 0.2;
  if (kind === "bees") return 190;
  return minGap();
}
const PATTERNS = [
  { weight: 4, minSpeed: 0,  parts: [ { type: "ground" } ] },
  { weight: 3, minSpeed: 0,  parts: [ { type: "high" } ] },
  { weight: 2, minSpeed: 9,  parts: [ { type: "ground" }, { type: "ground", gap: "close" } ] },
  { weight: 2, minSpeed: 9,  parts: [ { type: "ground" }, { type: "high", gap: "normal" } ] },
  { weight: 2, minSpeed: 9,  parts: [ { type: "high" }, { type: "ground", gap: "normal" } ] },
  { weight: 1, minSpeed: 11, parts: [ { type: "high" }, { type: "high", gap: "bees" } ] },
  { weight: 1, minSpeed: 12, parts: [ { type: "ground" }, { type: "high", gap: "normal" }, { type: "ground", gap: "normal" } ] },
];

let patternBag = [];
let lastPattern = null;
const spawnQueue = [];

function refillBag() {
  patternBag = [];
  for (const p of PATTERNS) {
    if (speed < p.minSpeed) continue;
    for (let i = 0; i < p.weight; i++) patternBag.push(p);
  }
  shuffle(patternBag);
}

function pickPattern() {
  if (patternBag.length === 0) refillBag();

  // avoid the same pattern twice in a row
  if (patternBag[patternBag.length - 1] === lastPattern) {
    for (let i = patternBag.length - 2; i >= 0; i--) {
      if (patternBag[i] !== lastPattern) {
        const temp = patternBag[i];
        patternBag[i] = patternBag[patternBag.length - 1];
        patternBag[patternBag.length - 1] = temp;
        break;
      }
    }
  }

  lastPattern = patternBag.pop();
  return lastPattern;
}

function makeObstacle(type) {
  if (type === "high") {
    const gap = player.diveHeight + 20;
    const size = 110;
    return { x: gameW, y: floorY - gap - size + BEE_HITBOX.bottom, width: size, height: size, type: "high", hit: false };
  }

  const h = 40 + Math.random() * 30;
  const w = h * FORK_COLS / FORK_ROWS;
  return { x: gameW, y: floorY - h, width: w, height: h, type: "ground", hit: false };
}

function restGap() {
  const extra = Math.max(150, 500 - (speed - START_SPEED) * 30);
  return minGap() + Math.random() * extra;
}

function spawnNext() {
  if (spawnQueue.length === 0) {
    const pattern = pickPattern();
    for (let i = 0; i < pattern.parts.length; i++) {
      spawnQueue.push({ type: pattern.parts[i].type, gap: pattern.parts[i].gap });
    }
  }

  const next = spawnQueue.shift();
  obstacles.push(makeObstacle(next.type));
  distanceSinceSpawn = 0;

  if (spawnQueue.length > 0) {
    nextGap = gapSize(spawnQueue[0].gap);
  } else {
    nextGap = restGap();
  }
}

function forgiveNearby(hitObstacle) {
  for (const other of obstacles) {
    if (Math.abs(other.x - hitObstacle.x) < 260) other.hit = true;
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
    gameOverTime = Date.now();
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
  player.isDiving = keys["ArrowDown"] && !player.isJumping;
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
    spawnNext();
  }

  // Move obstacles and check hits
  for (const o of obstacles) {
    o.x -= move;

    if (!o.hit && collides(getHitbox(player), getObstacleHitbox(o))) {
      o.hit = true;
      forgiveNearby(o);
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
  ctx.fillText(touchQuery.matches ? "Tap to restart" : "Press Enter to restart", gameW / 2, DESIGN_H / 2 + 50);
}

function drawStartScreen() {
  const touch = touchQuery.matches;

  ctx.fillStyle = "rgba(10, 20, 40, 0.55)";
  ctx.fillRect(0, 0, gameW, DESIGN_H);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "bold 56px " + UI_FONT;
  ctx.fillText("BELGIUM GAME TITLE", gameW / 2, 170);

  ctx.font = "22px " + UI_FONT;
  ctx.fillText(touch ? "Tap the right side: jump" : "Space / Up arrow: jump", gameW / 2, 235);
  ctx.fillText(touch ? "Hold the left side: dive" : "Down arrow: dive", gameW / 2, 268);
  ctx.fillText("Hit an obstacle and you have to answer a question", gameW / 2, 315);

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.font = "bold 28px " + UI_FONT;
    ctx.fillText(touch ? "Tap to start" : "Press Space to start", gameW / 2, 390);
  }
}


// ---
// RENDER
// ---
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.parentElement.clientWidth * dpr);
  canvas.height = Math.round(canvas.parentElement.clientHeight * dpr);

  scale = canvas.height / DESIGN_H;
  gameW = canvas.width / scale;

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

  if (portraitQuery.matches) {
    if (state === "question" && lastTime !== 0) deadline += timestamp - lastTime;
    lastTime = timestamp;
    rafId = requestAnimationFrame(loop);
    return;
  }

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
  spawnQueue.length = 0;
  patternBag = [];
  lastPattern = null;
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

  lastTime = 0;
  running = true;
  rafId = requestAnimationFrame(loop);
}

function stopGame() {
  running = false;
  cancelAnimationFrame(rafId);
  quizBox.hidden = true;
}
