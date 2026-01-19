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

  let count = 3;
  countdownEl.classList.remove("hidden");
  countdownEl.textContent = count;

  const timer = setInterval(() => {
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
  for (let i = 2; i <2+ total; i++) {
    names.push("v"+i.toString().padStart(2, "0"));
  }

  const cards = [...names, ...names].sort(() => Math.random() - 0.5);
  startTime = Date.now();

  cards.forEach(name => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = "img/v01.jpg";

    card.appendChild(img);
    board.appendChild(card);

    card.addEventListener("pointerdown", () => {
      if (lock || img.src.includes(name)) return;

      img.src = `img/${name}.jpg`;

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
            img.src = first.src = "img/v01.jpg";
            first = null;
            lock = false;
            miss++;
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
    .every(img => !img.src.includes("back"));

  if (open) {
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

// 初期画面
setScreen("start");

















