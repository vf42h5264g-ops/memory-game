// =====================
// 定数・SE
// =====================
const BACK_SRC = "img/vback.jpg";

const beep = new Audio("sound/beep.wav"); // カウントダウン用
beep.preload = "auto";

const goSound = new Audio("sound/go.wav"); // v03(テキーラ)用
goSound.preload = "auto";

// =====================
// 画面管理
// =====================
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

function applyBoardLayout() {
  board.classList.remove("layout-easy", "layout-12");

  if (mode === "easy") {
    board.classList.add("layout-easy");
  } else {
    // normal / hard / destroy
    board.classList.add("layout-12");
  }
}

// =====================
// 要素
// =====================
const board = document.getElementById("board");
const countdownEl = document.getElementById("countdown");
const missArea = document.getElementById("missArea");
const resultText = document.getElementById("resultText");
const timeText = document.getElementById("timeText");

// =====================
// 状態
// =====================
let mode = "easy";
let first = null;
let lock = false;
let miss = 0;
let startTime = 0;

// ですとろい用
let destroySafeOpened = 0; // v03以外を何枚めくったか（最大11）

// =====================
// モード設定（通常神経衰弱用）
// =====================
const modeSetting = {
  easy: 3,
  normal: 6,
  hard: 6,
  destroy: 0 // destroyでは使わない（未定義回避）
};

// =====================
// スタート
// =====================
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

// =====================
// カウントダウン
// =====================
function startCountdown() {
  setScreen("game");
  board.innerHTML = "";
  missArea.innerHTML = "";

  // 状態リセット
  miss = 0;
  first = null;
  lock = false;
  destroySafeOpened = 0;

  renderStatus();

  let count = 3;
  countdownEl.classList.remove("hidden");
  countdownEl.textContent = count;

  const timer = setInterval(() => {
    // 毎秒 beep
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

// =====================
// ゲーム開始（分岐）
// =====================
function startGame() {
  if (mode === "destroy") {
    startDestroyGame();
  } else {
    startMemoryGame();
  }
}

// =====================
// 通常：神経衰弱
// =====================
function startMemoryGame() {
  const total = modeSetting[mode];
  const names = [];

  // 表面 v02～（例: easy=3 => v02,v03,v04）
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
          checkClearMemory();
        } else {
          setTimeout(() => {
            img.src = BACK_SRC;
            first.src = BACK_SRC;
            img.dataset.open = "0";
            first.dataset.open = "0";
            first = null;
            lock = false;

            miss++;
            renderStatus();
            checkBadEnd();
          }, 800);
        }
      }
    });
  });
}

// =====================
// ですとろい：v03を引いたら負け
//  - v03以外(v01,v02,v04,v05,v06,v07)からランダム11枚(重複あり)
//  - v03を1枚混ぜて合計12枚
//  - 1枚ずつめくり、v03で負け、11枚安全をめくり切れば勝ち
// =====================
function startDestroyGame() {
  const pool = ["v01", "v02", "v04", "v05", "v06", "v07"];

  const safe11 = Array.from({ length: 11 }, () => {
    return pool[Math.floor(Math.random() * pool.length)];
  });

  const cards = [...safe11, "v03"].sort(() => Math.random() - 0.5);

  startTime = Date.now();
  destroySafeOpened = 0;
  renderStatus();

  cards.forEach(name => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = BACK_SRC;
    img.dataset.open = "0";
    img.dataset.name = name;

    card.appendChild(img);
    board.appendChild(card);

    card.addEventListener("pointerdown", () => {
      if (lock || img.dataset.open === "1") return;

      img.src = `img/${name}.jpg`;
      img.dataset.open = "1";

      // v03 = 即負け（テキーラ演出）
      if (name === "v03") {
        lock = true;
        setTimeout(() => {
          showTequilaLose(); // GO!テキーラ!! + go.wav + ボタン
        }, 150);
        return;
      }

      // 安全札
      destroySafeOpened++;
      renderStatus();

      // 11枚安全をめくり切ったら勝ち
      if (destroySafeOpened >= 11) {
        lock = true;
        setTimeout(() => {
          launchConfetti();
          const time = ((Date.now() - startTime) / 1000).toFixed(1);
          resultText.textContent = "SURVIVED!!";
          timeText.textContent = `TIME : ${time}s`;
          setScreen("result");
        }, 250);
      }
    });
  });
}

// =====================
// 判定：神経衰弱クリア
// =====================
function checkClearMemory() {
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

// =====================
// 判定：HARD バッドエンド
// =====================
function checkBadEnd() {
  if (mode === "hard" && miss >= 5) {
    resultText.textContent = "BAD END…";
    timeText.textContent = "";
    setScreen("result");
  }
}

// =====================
// 表示：HARDは✖、destroyは進捗表示
// =====================
function renderStatus() {
  if (mode === "hard") {
    const max = 5;
    missArea.textContent =
      "MISS : " +
      "✖".repeat(miss) +
      "・".repeat(Math.max(0, max - miss));
    return;
  }

  if (mode === "destroy") {
    const remain = Math.max(0, 11 - destroySafeOpened);
    missArea.textContent = `SAFE : ${destroySafeOpened}/11   残り ${remain}`;
    return;
  }

  missArea.textContent = "";
}

// =====================
// v03を引いた時の「GO!テキーラ!!」演出 + 効果音 + ボタン
// =====================
function showTequilaLose() {
  // 効果音
  goSound.currentTime = 0;
  goSound.play().catch(() => {});

  // 既に出てたら消す（連打対策）
  const old = document.getElementById("tequilaOverlay");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "tequilaOverlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "99999";
  overlay.style.background = "rgba(0,0,0,0.92)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.gap = "18px";

  // v03を画面いっぱい（実質フル）
  const img = document.createElement("img");
  img.src = "img/v03.jpg";
  img.alt = "v03";
  img.style.width = "100vw";
  img

















