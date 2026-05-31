// ─── Canvas setup ───────────────────────────────────────────────────────────
const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');

const TILE    = 20;                          // size of each grid square in pixels
const COLS    = canvas.width  / TILE;        // 20 columns
const ROWS    = canvas.height / TILE;        // 20 rows

// ─── Game state ──────────────────────────────────────────────────────────────
let snake;       // array of {x, y} segments — index 0 is the head
let direction;   // current movement direction
let nextDir;     // buffered direction (prevents reversing mid-tick)
let food;        // {x, y} position of the food
let score;
let level;
let gameLoop;    // holds the setInterval reference so we can stop it

// ─── Score display elements ───────────────────────────────────────────────────
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');
const levelEl = document.getElementById('level');

// ─── Overlay elements ────────────────────────────────────────────────────────
const overlay     = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMsg  = document.getElementById('overlayMsg');

// Load best score from browser storage (persists between sessions)
let best = parseInt(localStorage.getItem('snakeBest') || '0');
bestEl.textContent = best;

// ─── Start / Restart ─────────────────────────────────────────────────────────
function startGame() {
  // Reset everything
  snake     = [{ x: 10, y: 10 }];            // start with a single segment in the middle
  direction = { x: 1, y: 0 };               // moving right
  nextDir   = { x: 1, y: 0 };
  score     = 0;
  level     = 1;
  scoreEl.textContent = 0;
  levelEl.textContent = 1;

  placeFood();
  overlay.classList.add('hidden');           // hide the start/game-over screen

  clearInterval(gameLoop);                   // clear any old loop
  gameLoop = setInterval(tick, getSpeed());  // start the game loop
}

// ─── Speed: gets faster every 5 points ────────────────────────────────────────
function getSpeed() {
  // Starts at 160ms per tick, reduces by 10ms each level (min 60ms)
  return Math.max(60, 160 - (level - 1) * 10);
}

// ─── Place food at a random empty cell ────────────────────────────────────────
function placeFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
    // Keep trying if food lands on the snake
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
  food = pos;
}

// ─── Main game tick (runs on every interval) ─────────────────────────────────
function tick() {
  direction = nextDir;                       // apply the buffered direction

  // Calculate new head position
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  // 🌀 Wrap-around: go through walls to the opposite side
  head.x = (head.x + COLS) % COLS;
  head.y = (head.y + ROWS) % ROWS;

  // 💀 Collision with own body → Game Over
  if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);                       // add new head to the front

  // 🍎 Did we eat the food?
  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;

    // Save best score
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('snakeBest', best);
    }

    // Level up every 5 foods eaten
    const newLevel = Math.floor(score / 5) + 1;
    if (newLevel !== level) {
      level = newLevel;
      levelEl.textContent = level;
      clearInterval(gameLoop);               // restart loop at new (faster) speed
      gameLoop = setInterval(tick, getSpeed());
    }

    placeFood();                             // place a new food (don't remove tail → snake grows)
  } else {
    snake.pop();                             // remove tail (snake moves forward without growing)
  }

  draw();
}

// ─── Draw everything on the canvas ───────────────────────────────────────────
function draw() {
  // Clear the board
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw faint grid lines
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Draw the snake
  snake.forEach((seg, index) => {
    // Head is brighter green; body fades slightly
    ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur  = index === 0 ? 12 : 4;
    roundRect(seg.x * TILE + 1, seg.y * TILE + 1, TILE - 2, TILE - 2, 4);
  });

  // Draw eyes on the head
  drawEyes(snake[0]);

  // Draw the food (glowing red circle)
  ctx.shadowColor = '#f87171';
  ctx.shadowBlur  = 16;
  ctx.fillStyle   = '#f87171';
  ctx.beginPath();
  ctx.arc(
    food.x * TILE + TILE / 2,
    food.y * TILE + TILE / 2,
    TILE / 2 - 3, 0, Math.PI * 2
  );
  ctx.fill();

  // Reset shadow so it doesn't affect other drawings
  ctx.shadowBlur = 0;
}

// Helper: draw a filled rounded rectangle
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

// Helper: draw two small eyes on the snake's head depending on direction
function drawEyes(head) {
  const cx = head.x * TILE + TILE / 2;
  const cy = head.y * TILE + TILE / 2;
  const eyeOffset = 3;
  const eyeSize   = 2;

  ctx.fillStyle  = '#0d0d0d';
  ctx.shadowBlur = 0;

  if (direction.x === 1)  { ctx.fillRect(cx + 3, cy - eyeOffset, eyeSize, eyeSize); ctx.fillRect(cx + 3, cy + eyeOffset - 1, eyeSize, eyeSize); }
  if (direction.x === -1) { ctx.fillRect(cx - 5, cy - eyeOffset, eyeSize, eyeSize); ctx.fillRect(cx - 5, cy + eyeOffset - 1, eyeSize, eyeSize); }
  if (direction.y === -1) { ctx.fillRect(cx - eyeOffset, cy - 5, eyeSize, eyeSize); ctx.fillRect(cx + eyeOffset - 1, cy - 5, eyeSize, eyeSize); }
  if (direction.y === 1)  { ctx.fillRect(cx - eyeOffset, cy + 3, eyeSize, eyeSize); ctx.fillRect(cx + eyeOffset - 1, cy + 3, eyeSize, eyeSize); }
}

// ─── Game Over ────────────────────────────────────────────────────────────────
function endGame() {
  clearInterval(gameLoop);
  overlayTitle.textContent = '💀 Game Over';
  overlayMsg.textContent   = `Score: ${score}   Best: ${best}\nLevel reached: ${level}`;
  document.getElementById('startBtn').textContent = '↩ Play Again';
  overlay.classList.remove('hidden');
}

// ─── Keyboard controls ────────────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  // Prevent arrow keys from scrolling the page
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();

  // Buffer the next direction — but don't allow reversing (e.g. going left while moving right)
  if ((e.key === 'ArrowUp'    || e.key === 'w') && direction.y !== 1)  nextDir = { x: 0, y: -1 };
  if ((e.key === 'ArrowDown'  || e.key === 's') && direction.y !== -1) nextDir = { x: 0, y:  1 };
  if ((e.key === 'ArrowLeft'  || e.key === 'a') && direction.x !== 1)  nextDir = { x: -1, y: 0 };
  if ((e.key === 'ArrowRight' || e.key === 'd') && direction.x !== -1) nextDir = { x: 1,  y: 0 };
});
