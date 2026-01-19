// ===== 定数 =====
const BACK_SRC = "img/vback.jpg";
const beep = new Audio("sound/beep.wav");
beep.preload = "auto";

// ===== 画面管理 =====
const screens = {
  start: document.getElementById("startScreen"),
  help: document.getElementById("helpScreen"),
  game: document.getElementById("gameScreen"),
  result: document.getElementById("resultScreen")
};

function setScreen(name) {
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// ===== 要素 =====
const board = document.getElementById("board");
const countdownEl = document.getElementById("countdown");
const missArea = document.getElementById("missArea");
const resultText = document.getElementById("resultText");
const timeText = document.getElementById("timeText");

// ===== 状態 =====
let mode = "easy";
let first = null;
let lock = false;
let miss = 0;
let startTime = 0;

// ===== モード設定 =====
const modeSetting = {
  easy: 3,
  normal: 6,
  hard: 6
};

// ===== スタート =====
document.querySelectorAll(".modeBtn").forEach(btn => {
  btn.addEventListener("pointerdown", () => {
    mode = btn.dataset.mode;
    startCountdown();
  });
});

document.getElementById("helpBtn").onclick = () => setScreen("help");
document.getElementById("backFromHelp").onclick = () => setScreen("start");
document.getElementById("backBtn").onclick = () => setScreen("start");
document.getElementById("retryBtn").onclick = () => startCountdown();

// ===== カウントダウン =====
function startCountdown() {
  setScreen("game");
  board.innerHTML = "";
  missArea.innerHTML = "";
  miss = 0;
  first = null;
  lock = false;
  renderMiss();

  let count = 3;
  countdownEl.classList.remove("hidden");
  countdownEl.textContent = count;

  const timer = setInterval(() => {
    beep.currentTime = 0;
    beep.play().catch(() => {});

    count--;
    if (count === 0) {
      clearInterval(timer);
      countdownEl.classList.add("hidden");
      startGame();
    } else {
      countdownEl.textContent = count;
    }
  }, 1000);
}

// ===== ゲーム =====
function startGame() {
  const total = modeSetting[mode];
  const names = [];

  for (let i = 2; i < 2 + total; i++) {
    names.push("v" + i.toString().padStart(2, "0"));
  }

  const cards = [...names, ...names].sort(() => Math.random() - 0.5);
  startTime = Date.now();

  cards.forEach(name => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = BACK_SRC;
    img.dataset.open = "0";

    card.appendChild(img);
    board.appendChild(card);

    card.addEventListener("pointerdown", () => {
      if (lock || img.dataset.open === "1") return;

      img.src = `img/${name}.jpg`;
      img.dataset.open = "1";

      if (!first) {
        first = img;
      } else {
        lock = true;

        if (first.src === img.src) {
          first = null;
          lock = false;
          checkClear();
        } else {
          setTimeout(() => {
            img.src = BACK_SRC;
            first.src = BACK_SRC;
            img.dataset.open = "0";
            first.dataset.open = "0";
            first = null;
            lock = false;
            miss++;
            renderMiss();
            checkBadEnd();
          }, 800);
        }
      }
    });
  });
}

// ===== 判定 =====
function checkClear() {
  const open = [...document.querySelectorAll(".card img")]
    .every(img => img.dataset.open === "1");

  if (open) {
    launchConfetti();
    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    resultText.textContent = "PERFECT!!";
    timeText.textContent = `TIME : ${time}s`;
    setScreen("result");
  }
}

function checkBadEnd() {
  if (mode === "hard" && miss >= 5) {
    resultText.textContent = "BAD END…";
    timeText.textContent = "";
    setScreen("result");
  }
}

// ===== HARDモード MISS表示 =====
function renderMiss() {
  if (mode !== "hard") {
    missArea.textContent = "";
    return;
  }
  const max = 5;
  missArea.textContent =
    "MISS : " +
    "✖".repeat(miss) +
    "・".repeat(Math.max(0, max - miss));
}

// ===== 紙吹雪 =====
function launchConfetti(durationMs = 1200) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.zIndex = "9999";
  document.body.appendChild(container);

  const endAt = Date.now() + durationMs;

  function spawn() {
    const piece = document.createElement("div");
    piece.style.position = "absolute";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.top = "-10px";
    piece.style.width = 6 + Math.random() * 6 + "px";
    piece.style.height = 10 + Math.random() * 10 + "px";
    piece.style.background = `hsl(${Math.random() * 360},90%,60%)`;
    piece.style.opacity = "0.9";
    piece.style.borderRadius = "2px";

    const drift = (Math.random() * 2 - 1) * 120;
    const fall = 600 + Math.random() * 600;
    const rotate = (Math.random() * 2 - 1) * 720;
    const life = 900 + Math.random() * 700;
    const start = performance.now();

    container.appendChild(piece);

    function animate(t) {
      const p = Math.min(1, (t - start) / life);
      piece.style.transform =
        `translate(${drift * p}px, ${fall * p}px) rotate(${rotate * p}deg)`;
      piece.style.opacity = (1 - p).toString();
      if (p < 1) requestAnimationFrame(animate);
      else piece.remove();
    }
    requestAnimationFrame(animate);
  }

  const interval = setInterval(() => {
    for (let i = 0; i < 10; i++) spawn();
    if (Date.now() > endAt) {
      clearInterval(interval);
      setTimeout(() => container.remove(), 800);
    }
  }, 100);
}

// ===== 初期画面 =====
setScreen("start");

















