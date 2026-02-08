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

// VS HUD（HTMLに無い場合もあるので optional）
const vsHud = document.getElementById("vsHud");
const turnText = document.getElementById("turnText");
const scoreText = document.getElementById("scoreText");

// ===== 状態（ソロ） =====
let mode = "easy";
let first = null;
let lock = false;
let miss = 0;
let startTime = 0;

// ===== 状態（VS） =====
let vsState = null;

// ===== モード設定（ソロ用） =====
const modeSetting = {
  easy: 3,    // 3ペア=6枚
  normal: 6,  // 6ペア=12枚
  hard: 6     // 6ペア=12枚（ミス5でBAD END）
};

// ===== 共通：ヘルパ =====
function resetCommonState() {
  // 前ゲームの状態を必ず消す
  first = null;
  lock = false;
  miss = 0;
  vsState = null;

  board.innerHTML = "";
  missArea.innerHTML = "";
  board.classList.remove("vs"); // VS用クラスを外す（CSSで使うなら）
  if (vsHud) vsHud.classList.add("hidden");
}

// ===== スタート =====
document.querySelectorAll(".modeBtn").forEach(btn => {
  btn.addEventListener("pointerdown", () => {
    mode = btn.dataset.mode;

    // VSは別ルート
    if (mode === "vs") {
      startCountdown("vs");
    } else {
      startCountdown("solo");
    }
  });
});

document.getElementById("helpBtn").onclick = () => setScreen("help");
document.getElementById("backFromHelp").onclick = () => setScreen("start");
document.getElementById("backBtn").onclick = () => setScreen("start");
document.getElementById("retryBtn").onclick = () => {
  // リザルトからのリトライは、今の mode で再開
  if (mode === "vs") startCountdown("vs");
  else startCountdown("solo");
};

// ===== カウントダウン =====
function startCountdown(kind) {
  setScreen("game");
  resetCommonState();

  let count = 3;
  countdownEl.classList.remove("hidden");
  countdownEl.textContent = count;

  const timer = setInterval(() => {
    count--;
    if (count === 0) {
      clearInterval(timer);
      countdownEl.classList.add("hidden");

      if (kind === "vs") startVsGame();
      else startSoloGame();

    } else {
      countdownEl.textContent = count;
    }
  }, 1000);
}

/* =========================
   ソロ（既存）
   ========================= */
function startSoloGame() {
  const total = modeSetting[mode];
  const names = [];
  for (let i = 1; i <= total; i++) {
    names.push(i.toString().padStart(3, "0"));
  }

  // 2枚ずつ & シャッフル
  const cards = [...names, ...names].sort(() => Math.random() - 0.5);
  startTime = Date.now();

  cards.forEach(name => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = "img/back.jpg";
    card.appendChild(img);

    board.appendChild(card);

    card.addEventListener("pointerdown", () => {
      if (lock) return;

      // すでに表（= backじゃない）なら無視
      if (!img.src.includes("back")) return;

      // 表にする
      img.src = `img/${name}.jpg`;

      if (!first) {
        first = img;
      } else {
        lock = true;

        if (first.src === img.src) {
          // 当たり
          first = null;
          lock = false;
          checkClearSolo();
        } else {
          // 外れ
          setTimeout(() => {
            img.src = "img/back.jpg";
            first.src = "img/back.jpg";
            first = null;
            lock = false;
            miss++;
            checkBadEndSolo();
          }, 800);
        }
      }
    });
  });
}

function checkClearSolo() {
  const open = [...document.querySelectorAll(".card img")]
    .every(img => !img.src.includes("back"));

  if (open) {
    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    resultText.textContent = "PERFECT!!";
    timeText.textContent = `TIME : ${time}s`;
    setScreen("result");
  }
}

function checkBadEndSolo() {
  if (mode === "hard" && miss >= 5) {
    resultText.textContent = "BAD END…";
    timeText.textContent = "";
    setScreen("result");
  }
}

/* =========================
   VS（20枚・2人対戦）
   - 001〜010 を2枚ずつ（10ペア=20枚）
   - 当てたら同じ手番
   - 外したら手番交代
   ========================= */
const IMG_DIR = "img/";
const IMG_EXT = ".jpg";
const VS_PAIRS = 10; // 001〜010

function startVsGame() {
  // VS HUD表示
  if (vsHud) vsHud.classList.remove("hidden");

  // boardレイアウト（CSSで #board.vs を作る想定）
  board.classList.add("vs");

  // 状態初期化
  vsState = {
    deck: makeVsDeck(),
    first: null,      // {idx, id}
    lock: false,
    matchedPairs: 0,
    player: 0,        // 0:P1 1:P2
    score: [0, 0],
    startedAt: performance.now()
  };

  renderVsHud();
  renderVsBoard();
}

function makeVsDeck() {
  const cards = [];
  for (let i = 1; i <= VS_PAIRS; i++) {
    const num = String(i).padStart(3, "0"); // "001"〜"010"
    const src = `${IMG_DIR}${num}${IMG_EXT}`;
    cards.push({ id: num, src, matched: false });
    cards.push({ id: num, src, matched: false });
  }
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function renderVsHud() {
  if (!turnText || !scoreText) return;
  const p = vsState.player + 1;
  turnText.textContent = `手番：PLAYER ${p}`;
  scoreText.textContent = `SCORE  P1:${vsState.score[0]}  /  P2:${vsState.score[1]}`;
}

function renderVsBoard() {
  board.innerHTML = "";

  vsState.deck.forEach((card, idx) => {
    const cell = document.createElement("div");
    cell.className = "card";
    cell.dataset.index = String(idx);

    const img = document.createElement("img");
    img.src = "img/back.jpg";
    cell.appendChild(img);

    cell.addEventListener("pointerdown", () => onVsCardClick(idx));
    board.appendChild(cell);
  });
}

function getVsImgEl(idx) {
  const cardEl = board.querySelector(`.card[data-index="${idx}"]`);
  return cardEl ? cardEl.querySelector("img") : null;
}

function onVsCardClick(idx) {
  if (!vsState || vsState.lock) return;

  const card = vsState.deck[idx];
  if (card.matched) return;

  const img = getVsImgEl(idx);
  if (!img) return;

  // すでに開いてるなら無視（backじゃない）
  if (!img.src.includes("back")) return;

  // 開く
  img.src = card.src;

  // 1枚目
  if (!vsState.first) {
    vsState.first = { idx, id: card.id };
    return;
  }

  // 2枚目
  const firstPick = vsState.first;
  vsState.first = null;
  vsState.lock = true;

  const isMatch = firstPick.id === card.id;

  if (isMatch) {
    // 当たり：得点+1、手番継続
    vsState.deck[firstPick.idx].matched = true;
    vsState.deck[idx].matched = true;
    vsState.score[vsState.player] += 1;
    vsState.matchedPairs += 1;

    vsState.lock = false;
    renderVsHud();

    if (vsState.matchedPairs === VS_PAIRS) {
      endVsGame();
    }
  } else {
    // 外れ：戻して手番交代
    setTimeout(() => {
      const img1 = getVsImgEl(firstPick.idx);
      const img2 = getVsImgEl(idx);
      if (img1) img1.src = "img/back.jpg";
      if (img2) img2.src = "img/back.jpg";

      vsState.player = 1 - vsState.player;
      vsState.lock = false;
      renderVsHud();
    }, 750);
  }
}

function endVsGame() {
  const ms = performance.now() - vsState.startedAt;
  const sec = Math.max(1, Math.round(ms / 1000));

  const [s1, s2] = vsState.score;

  let msg = "";
  if (s1 > s2) msg = `PLAYER 1 の勝ち！ (${s1}-${s2})`;
  else if (s2 > s1) msg = `PLAYER 2 の勝ち！ (${s2}-${s1})`;
  else msg = `引き分け！ (${s1}-${s2})`;

  resultText.textContent = msg;
  timeText.textContent = `TIME : ${sec}s`;
  setScreen("result");
}

// 初期画面
setScreen("start");


















