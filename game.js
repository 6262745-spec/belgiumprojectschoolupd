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

// Constraints
const DESIGN_H = 500;
const WAFFLE_HEIGHT = 120;
const DIVE_RATIO = 0.6;
const MAX_STEP = 3;

// Cool settings and health based stuff
const MAX_HEALTH = 5;
const QUESTION_TIME = 10;
const WRONG_ANSWER_COSTS_HEALTH = true;

// Speed stuff
const START_SPEED = 8;
const MAX_SPEED = 15;
const SPEED_UP = 0.002;

// Ehh dont touch anything below here...
const BEE_FRAMES = 6;
const BEE_HITBOX = { side: 30, top: 15, bottom: 20 }; // Hitbox, changing is okay ig

const ART_SCALE = 3;
const BODY_WIDTH = 25 * ART_SCALE;
const SHEET_CELL = 48;
const CROP = { x: 8, y: 2, w: 34, h: 42 };
const CELL_FLOOR = 44;

const RUN_FRAMES = 9;
const RUN_FRAME_DISTANCE = 40;

const JUMP_FEET = [44, 44, 44, 44, 38, 37, 39, 44, 44];

const DIVE_FEET = [44, 42, 43, 44, 44, 44, 44, 44, 44];
const DIVE_ART_H = 34;
const DIVE_ENTRY = [2, 3];
const DIVE_HOLD_FRAME = 4;
const DIVE_FRAME_TICKS = 3;

const FORK_CROP = { x: 18, y: 6, w: 8, h: 36 }; 


// ---
// ASSETS
// ---
const runImg = new Image();
runImg.src = "assets/images/waffle_run.png";

const jumpImg = new Image();
jumpImg.src = "assets/images/waffle_jump.png";

const diveImg = new Image();
diveImg.src = "assets/images/waffle_dive.png";

const beeImg = new Image();
beeImg.src = "assets/images/bee.png";

const forkImg = new Image();
forkImg.src = "assets/images/fork.png";

const heartImg = new Image();
heartImg.src = "assets/images/heart_spritesheet_32x32.png";

const HEART_CELL = 32;
const HEART_DRAW = 30;
const HEART_FULL = { col: 0, row: 0 };
const HEART_EMPTY = { col: 4, row: 0 };

const cloudLayers = [
  new Image(),
  new Image(),
  new Image(),
  new Image(),
  new Image()
];

for (let i = 0; i < cloudLayers.length; i++) {
  cloudLayers[i].src = `assets/bg/Clouds 5/${i + 1}.png`;
}

const bgLayers = [
  new Image(),
  new Image(),
  new Image(),
  new Image()
];

for (let i = 0; i < bgLayers.length; i++) {
  bgLayers[i].src = `assets/bg/City/${i + 1}.png`;
}


// ---
// STATE
// ---
const player = {
  x: 0,
  y: 0,
  width: BODY_WIDTH,
  height: 60,
  vy: 0,

  gravity: 0.6,
  jumpPower: -12,
  isJumping: false,
  groundY: 0,

  standHeight: 60,
  diveHeight: 30,
  isDiving: false,
  diveTime: 0,
};

const obstacles = [];
const keys = {};

let floorY = 0;
let gameW = 800;
let scale = 1;

let running = false;
let rafId = 0;
let lastTime = 0;

let state = "start";
let health = MAX_HEALTH;
let speed = START_SPEED;
let distance = 0;
let distanceSinceSpawn = 0;
let nextGap = 600;
let gameOverTime = 0;

let currentQ = null;
let correctIndex = 0;
let deadline = 0;
let deck = [];

let showHitboxes = false;


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
    if (e.key === "Enter") pressStart();
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
function jumpDistance() {
  return ((2 * -player.jumpPower) / player.gravity) * speed;
}

function minGap() {
  return jumpDistance() + speed * 20;
}

function gapSize(kind) {
  if (kind === "close") return jumpDistance() * 0.1;
  if (kind === "bees") return 140;
  return minGap() * 0.8;
}

const PATTERNS = [
  // --- Common ---
  { weight: 5, minSpeed: 0,  parts: [ { type: "ground" } ] },
  { weight: 4, minSpeed: 0,  parts: [ { type: "high" } ] },

  // --- Uncommon ---
  { weight: 3, minSpeed: 8,  parts: [ { type: "ground" }, { type: "ground", gap: "close" } ] },
  { weight: 3, minSpeed: 9,  parts: [ { type: "ground" }, { type: "high", gap: "normal" } ] },
  { weight: 3, minSpeed: 9,  parts: [ { type: "high" },   { type: "ground", gap: "normal" } ] },

  // --- Rare ---
  { weight: 2, minSpeed: 10, parts: [ { type: "high" },   { type: "high", gap: "bees" } ] },
  { weight: 2, minSpeed: 11, parts: [ { type: "ground" }, { type: "ground", gap: "close" }, { type: "ground", gap: "close" } ] },
  { weight: 2, minSpeed: 11, parts: [ { type: "ground" }, { type: "high",   gap: "normal" }, { type: "ground", gap: "close" } ] },

  // --- Very Rare ---
  { weight: 4, minSpeed: 12, parts: [ { type: "ground" }, { type: "high",   gap: "normal" }, { type: "ground", gap: "normal" } ] },
  { weight: 4, minSpeed: 13, parts: [ { type: "high" },   { type: "ground", gap: "normal" }, { type: "high",   gap: "normal" } ] },
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

  const h = 45 + Math.random() * 27;
  const w = h * FORK_CROP.w / FORK_CROP.h;
  return { x: gameW, y: floorY - h, width: w, height: h, type: "ground", hit: false };
}

function restGap() {
  const extra = Math.max(100, 300 - (speed - START_SPEED) * 20);
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
  if (speed < MAX_SPEED) {
    speed += SPEED_UP * step;
    if (speed > MAX_SPEED) speed = MAX_SPEED;
  }

  player.isDiving = !!keys["ArrowDown"] && !player.isJumping;
  if (player.isDiving) {
    player.diveTime += step;
  } else {
    player.diveTime = 0;
  }

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

  const move = speed * step;
  distance += move;

  distanceSinceSpawn += move;
  if (distanceSinceSpawn >= nextGap) {
    spawnNext();
  }

  for (const o of obstacles) {
    o.x -= move;

    if (!o.hit && collides(getHitbox(player), getObstacleHitbox(o))) {
      o.hit = true;
      forgiveNearby(o);
      askQuestion();
      break;
    }
  }

  while (obstacles.length && obstacles[0].x + obstacles[0].width < 0) {
    obstacles.shift();
  }
}


// ---
// DRAWING: BACKGROUND
// ---
function drawLayer(tileWidth, factor, drawTile) {
  const offset = (distance * factor) % tileWidth;
  for (let x = -offset; x < gameW + tileWidth; x += tileWidth) {
    drawTile(x);
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, floorY);
  sky.addColorStop(0, "#4aa8ee");
  sky.addColorStop(1, "#bfe6ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, gameW + 2, floorY);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const cloudFactors = [0.02, 0.05, 0.08, 0.12];
  for (let i = 0; i < cloudFactors.length; i++) {
    const img = cloudLayers[i + 1];
    if (!img || !img.complete || img.naturalWidth === 0) continue;

    const tileW = img.naturalWidth;
    drawLayer(tileW, cloudFactors[i], function (x) {
      ctx.drawImage(img, snap(x), 0, snap(tileW), snap(DESIGN_H));
    });
  }

  const skylineLayers = [
    { img: bgLayers[0], speed: 0.02, drawH: 220 },
    { img: bgLayers[1], speed: 0.06, drawH: 240 }
  ];

  for (const layer of skylineLayers) {
    if (!layer.img || !layer.img.complete || layer.img.naturalWidth === 0) continue;

    const tileW = layer.img.naturalWidth;
    const tileH = layer.img.naturalHeight;
    const drawW = tileW * (layer.drawH / tileH);

    drawLayer(drawW, layer.speed, function (x) {
      ctx.drawImage(
        layer.img,
        snap(x),
        snap(floorY - layer.drawH),
        snap(drawW),
        snap(layer.drawH)
      );
    });
  }

  // Railway Layer (3.png = bgLayers[2]) at original dimensions
  if (bgLayers[2] && bgLayers[2].complete && bgLayers[2].naturalWidth > 0) {
    const tileW = bgLayers[2].naturalWidth;
    const tileH = bgLayers[2].naturalHeight;
    const drawW = tileW;
    const drawH = tileH;

    drawLayer(drawW, 0.14, function (x) {
      ctx.drawImage(
        bgLayers[2],
        snap(x),
        snap(floorY - drawH),
        snap(drawW),
        snap(drawH)
      );
    });
  }

  ctx.restore();

  ctx.fillStyle = "#2d3139";
  ctx.fillRect(0, floorY, gameW + 2, DESIGN_H - floorY);

  ctx.fillStyle = "#5c6370";
  ctx.fillRect(0, floorY, gameW + 2, 6);

  ctx.fillStyle = "#1e2126";
  ctx.fillRect(0, floorY + 6, gameW + 2, 3);

  ctx.fillStyle = "#8a93a2";
  drawLayer(120, 1, function (x) {
    ctx.fillRect(x, floorY + 22, 50, 4);
  });

  ctx.strokeStyle = "#14161a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(gameW, floorY);
  ctx.stroke();

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (bgLayers[3] && bgLayers[3].complete && bgLayers[3].naturalWidth > 0) {
    const tileW = bgLayers[3].naturalWidth;
    const tileH = bgLayers[3].naturalHeight;
    const drawH = 260;
    const drawW = tileW * (drawH / tileH);

    drawLayer(drawW, 0.22, function (x) {
      ctx.drawImage(
        bgLayers[3],
        snap(x),
        snap(floorY - drawH),
        snap(drawW),
        snap(drawH)
      );
    });
  }
  ctx.restore();
}


// ---
// DRAWING: SPRITES
// ---
function getRunFrame() {
  return Math.floor(distance / RUN_FRAME_DISTANCE) % RUN_FRAMES;
}

function getJumpFrame() {
  if (player.vy < -4) return 4;
  if (player.vy < 4) return 5;
  if (player.vy < 9) return 6;
  return 7;
}

function getDiveFrame() {
  const t = Math.floor(player.diveTime / DIVE_FRAME_TICKS);
  if (t < DIVE_ENTRY.length) return DIVE_ENTRY[t];
  return DIVE_HOLD_FRAME;
}

function snap(v) {
  return Math.round(v * scale) / scale;
}

function drawFrame(img, frame, feetRow, sx = 1, sy = 1) {
  if (!img.complete || img.naturalWidth === 0) return;

  const col = frame % 3;
  const row = Math.floor(frame / 3);
  const w = CROP.w * ART_SCALE * sx;
  const h = CROP.h * ART_SCALE * sy;
  const drop = (CELL_FLOOR - feetRow) * ART_SCALE * sy;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    col * SHEET_CELL + CROP.x, row * SHEET_CELL + CROP.y, CROP.w, CROP.h,
    snap(player.x + (player.width - w) / 2),
    snap(player.y + player.height - h + drop),
    snap(w), snap(h)
  );
  ctx.restore();
}

function drawPlayer() {
  if (player.isDiving) {
    const frame = getDiveFrame();
    const squash = player.diveHeight / (DIVE_ART_H * ART_SCALE);
    drawFrame(diveImg, frame, DIVE_FEET[frame], 1, squash);
  } else if (player.isJumping) {
    const frame = getJumpFrame();
    drawFrame(jumpImg, frame, JUMP_FEET[frame]);
  } else {
    drawFrame(runImg, getRunFrame(), CELL_FLOOR);
  }
}

function drawFork(o) {
  if (!forkImg.complete || forkImg.naturalWidth === 0) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowColor = "rgba(20, 25, 45, 0.9)";
  ctx.shadowBlur = 4 * scale;
  ctx.drawImage(
    forkImg,
    FORK_CROP.x, FORK_CROP.y, FORK_CROP.w, FORK_CROP.h,
    o.x, o.y, o.width, o.height
  );
  ctx.restore();
}

function drawBee(o) {
  if (!beeImg.complete || beeImg.naturalWidth === 0) return;

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

function drawObstacle(o) {
  if (o.type === "ground") drawFork(o);
  else drawBee(o);
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
  player.diveHeight = player.standHeight * DIVE_RATIO;
  player.height = player.standHeight;
  player.width = BODY_WIDTH;
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
  player.diveTime = 0;
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
