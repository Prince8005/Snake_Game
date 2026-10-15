(() => {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const gridSize = 24;
  const cellSize = canvas.width / gridSize;
  const scoreElement = document.getElementById("score");
  const bestElement = document.getElementById("best-score");
  const levelElement = document.getElementById("level");
  const levelFill = document.getElementById("level-fill");
  const overlay = document.getElementById("game-overlay");
  const title = document.getElementById("overlay-title");
  const kicker = document.getElementById("overlay-kicker");
  const copy = document.getElementById("overlay-copy");
  const playLabel = document.getElementById("play-label");
  const status = document.getElementById("game-status");
  const soundButton = document.getElementById("sound-button");
  const audioContext = window.AudioContext ? new AudioContext() : null;

  let snake;
  let apple;
  let direction;
  let nextDirection;
  let score = 0;
  let best = Number(localStorage.getItem("snake-best-score")) || 0;
  let running = false;
  let paused = false;
  let soundEnabled = true;
  let lastStep = 0;
  let animationFrame;

  bestElement.textContent = String(best).padStart(2, "0");

  function resetBoard() {
    snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    updateStats();
    apple = placeApple();
    draw();
  }

  function placeApple() {
    let position;
    do {
      position = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize)
      };
    } while (snake.some(segment => segment.x === position.x && segment.y === position.y));
    return position;
  }

  function updateStats() {
    scoreElement.textContent = String(score).padStart(2, "0");
    levelElement.textContent = String(Math.floor(score / 5) + 1).padStart(2, "0");
    levelFill.style.width = `${((score % 5) + 1) * 20}%`;
  }

  function draw() {
    ctx.fillStyle = "#121813";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(169, 202, 155, 0.055)";
    ctx.lineWidth = 1;
    for (let i = 1; i < gridSize; i++) {
      const position = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(position, 0);
      ctx.lineTo(position, canvas.height);
      ctx.moveTo(0, position);
      ctx.lineTo(canvas.width, position);
      ctx.stroke();
    }

    drawApple();
    snake.forEach((segment, index) => drawSegment(segment, index));
  }

  function drawSegment(segment, index) {
    const inset = index === 0 ? 2 : 2.5;
    const x = segment.x * cellSize + inset;
    const y = segment.y * cellSize + inset;
    const size = cellSize - inset * 2;
    ctx.fillStyle = index === 0 ? "#c8ff83" : `rgba(151, 218, 89, ${Math.max(.5, .88 - index * .012)})`;
    ctx.shadowColor = index === 0 ? "rgba(184,245,106,.42)" : "transparent";
    ctx.shadowBlur = index === 0 ? 12 : 0;
    roundedRect(x, y, size, size, 5);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (index === 0) {
      ctx.fillStyle = "#25351d";
      const eyes = direction.x !== 0
        ? [{ x: x + size * .62, y: y + size * .29 }, { x: x + size * .62, y: y + size * .69 }]
        : [{ x: x + size * .29, y: y + size * .62 }, { x: x + size * .69, y: y + size * .62 }];
      eyes.forEach(eye => {
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function drawApple() {
    const centerX = (apple.x + .5) * cellSize;
    const centerY = (apple.y + .52) * cellSize;
    ctx.save();
    ctx.shadowColor = "rgba(255, 112, 86, .65)";
    ctx.shadowBlur = 17;
    ctx.fillStyle = "#ff765d";
    ctx.beginPath();
    ctx.arc(centerX, centerY + 1, cellSize * .31, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#b8f56a";
    ctx.beginPath();
    ctx.ellipse(centerX + 4, centerY - 7, 3.6, 1.8, -.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#699c3c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 4);
    ctx.lineTo(centerX + 1, centerY - 7);
    ctx.stroke();
    ctx.restore();
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function tick(timestamp) {
    if (!running || paused) return;
    if (timestamp - lastStep >= Math.max(65, 145 - Math.floor(score / 5) * 10)) {
      lastStep = timestamp;
      step();
    }
    animationFrame = requestAnimationFrame(tick);
  }

  function step() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const ateApple = head.x === apple.x && head.y === apple.y;
    const bodyToCheck = ateApple ? snake : snake.slice(0, -1);

    if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize ||
        bodyToCheck.some(segment => segment.x === head.x && segment.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);
    if (ateApple) {
      score++;
      apple = placeApple();
      playTone(660, .09);
      if (score > best) {
        best = score;
        localStorage.setItem("snake-best-score", String(best));
        bestElement.textContent = String(best).padStart(2, "0");
      }
      updateStats();
    } else {
      snake.pop();
    }
    draw();
  }

  function startGame() {
    cancelAnimationFrame(animationFrame);
    resetBoard();
    running = true;
    paused = false;
    lastStep = 0;
    overlay.classList.add("hidden");
    status.textContent = "IN THE ZONE";
    animationFrame = requestAnimationFrame(tick);
  }

  function endGame() {
    running = false;
    paused = false;
    playTone(180, .22);
    status.textContent = "GAME OVER";
    kicker.textContent = "NICE RUN";
    title.textContent = "Game over.";
    copy.textContent = `You scored ${score}. Ready to beat your best?`;
    playLabel.textContent = "PLAY AGAIN";
    overlay.classList.remove("hidden");
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      cancelAnimationFrame(animationFrame);
      status.textContent = "PAUSED";
      kicker.textContent = "TAKE YOUR TIME";
      title.textContent = "Paused.";
      copy.textContent = "Your snake is waiting right where you left it.";
      playLabel.textContent = "RESUME GAME";
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
      status.textContent = "IN THE ZONE";
      lastStep = 0;
      animationFrame = requestAnimationFrame(tick);
    }
  }

  function changeDirection(next) {
    if (!running || paused) return;
    if (next.x !== -direction.x || next.y !== -direction.y) nextDirection = next;
  }

  function playTone(frequency, duration) {
    if (!soundEnabled || !audioContext) return;
    if (audioContext.state === "suspended") audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }

  const keyDirections = {
    ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }
  };

  document.addEventListener("keydown", event => {
    const next = keyDirections[event.key] || keyDirections[event.key.toLowerCase()];
    if (next) {
      event.preventDefault();
      changeDirection(next);
    } else if (event.code === "Space") {
      event.preventDefault();
      togglePause();
    }
  });

  document.getElementById("play-button").addEventListener("click", () => {
    if (paused) togglePause();
    else startGame();
  });
  document.getElementById("restart-button").addEventListener("click", startGame);
  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundButton.classList.toggle("muted", !soundEnabled);
    soundButton.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Enable sound");
  });
  document.querySelectorAll("[data-direction]").forEach(button => {
    button.addEventListener("click", () => {
      const directions = {
        up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
        left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
      };
      changeDirection(directions[button.dataset.direction]);
    });
  });

  let touchStart;
  canvas.addEventListener("touchstart", event => {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
      if (Math.abs(dx) > Math.abs(dy)) changeDirection({ x: Math.sign(dx), y: 0 });
      else changeDirection({ x: 0, y: Math.sign(dy) });
    }
    touchStart = null;
  }, { passive: true });

  resetBoard();
})();
