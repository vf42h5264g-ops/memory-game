document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     画面（state）管理
  ========================= */
  const startScreen  = document.getElementById("startScreen");
  const helpScreen   = document.getElementById("helpScreen");
  const gameScreen   = document.getElementById("gameScreen");
  const resultScreen = document.getElementById("resultScreen");

  const screens = [startScreen, helpScreen, gameScreen, resultScreen];

  function setScreen(name) {
    // name: "start" | "help" | "game" | "result"
    screens.forEach(s => s.classList.add("hidden"));
    if (name === "start")  startScreen.classList.remove("hidden");
    if (name === "help")   helpScreen.classList.remove("hidden");
    if (name === "game")   gameScreen.classList.remove("hidden");
    if (name === "result") resultScreen.classList.remove("hidden");
  }

  /* =========================
     DOM
  ========================= */
  const board       = document.getElementById("board");
  const countdownEl = document.getElementById("countdown");
  const missArea    = document.getElementById("missArea");

  const resultText  = document.getElementById("resultText");
  const timeText    = document.getElementById("timeText");
  const retryBtn    = document.getElementById("retryBtn");
  const backBtn     = document.getElementById("backBtn");

  const helpBtn       = document.getElementById("helpBtn");
  const backFromHelp  = document.getElementById("backFromHelp");

  const modeBtns = document.querySelectorAll(".modeBtn");

  /* =========================
     効果音（devフォルダから見て1つ上）
     直下に置いてある前提：
       /beep.wav
       /meow.wav
       /meowStart.wav
       /meow_long.wav
       /meow_miss.wav
  ========================= */
// ===== 効果音 =====
const se = {
  beep:  new Audio("../beep.wav"),
  meow:  new Audio("../meow.wav"),
  start: new Audio("../meowStart.wav"),
  clear: new Audio("../meow_long.wav"),
  miss:  new Audio("../meow_miss.wav"),
};

// ===== サウンドON/OFF（唯一の状態）=====
let soundEnabled = localStorage.getItem("soundEnabled") === "1";

// iOS解放済みフラグ（解放はON時に1回だけ）
let audioUnlocked = false;

function updateSoundButton() {
  const btn = document.getElementById("soundToggle");
  if (!btn) return;

  btn.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
  btn.textContent = soundEnabled ? "🔊 SOUND: ON" : "🔇 SOUND: OFF";
}

function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  Object.values(se).forEach(a => {
    try {
      a.volume = 0;
      a.play().catch(() => {});
      a.pause();
      a.currentTime = 0;
      a.volume = 1;
    } catch (e) {}
  });
}

function playSE(key, volume = 1.0) {
  if (!soundEnabled) return;

  const a = se[key];
  if (!a) return;

  try {
    a.pause();
    a.currentTime = 0;
    a.volume = volume;
    a.play().catch(() => {});
  } catch (e) {}
}

// ===== ボタンのイベント（これ1つだけ）=====
(function initSoundToggle() {
  const btn = document.getElementById("soundToggle");
  if (!btn) return;

  updateSoundButton();

  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();

    soundEnabled = !soundEnabled;
    localStorage.setItem("soundEnabled", soundEnabled ? "1" : "0");

    if (soundEnabled) {
      unlockAudioOnce();
      playSE("meow", 0.8); // ON確認
    }

    updateSoundButton();
  });
})();


  /* =========================
     ゲーム状態
  ========================= */
  let mode = "easy";
  let cardCount = 6;      // 6 or 12
  let pairCount = 3;      // 3 or 6
  let lockBoard = true;

  let firstCard = null;   // { cardEl, imgEl, name }
  let secondCard = null;

  let matchedCount = 0;   // 揃った枚数
  let missCount = 0;      // ミス回数（HARDのみ5でBAD）

  let startTime = 0;

  const MODE_SETTING = {
    easy:   { cards: 6,  pairs: 3,  missLimit: Infinity },
    normal: { cards: 12, pairs: 6,  missLimit: Infinity },
    hard:   { cards: 12, pairs: 6,  missLimit: 5 },
  };

  /* =========================
     画面：スタート / 説明
  ========================= */
  if (helpBtn) {
    helpBtn.addEventListener("pointerdown", () => {
      setScreen("help");
    });
  }

  if (backFromHelp) {
    backFromHelp.addEventListener("pointerdown", () => {
      setScreen("start");
    });
  }

  modeBtns.forEach(btn => {
    btn.addEventListener("pointerdown", () => {
      // iPhone対策：最初のタップで音を解放
      unlockAudio();

      mode = btn.dataset.mode || "easy";
      const s = MODE_SETTING[mode] || MODE_SETTING.easy;
      cardCount = s.cards;
      pairCount = s.pairs;

      startFlow();
    });
  });

  /* =========================
     ボタン：結果画面
  ========================= */
  retryBtn.addEventListener("pointerdown", () => {
    // もう1回 = 同じモードで再スタート
    unlockAudio();
    startFlow();
  });

  backBtn.addEventListener("pointerdown", () => {
    // モード選択に戻る
    resetAll();
    setScreen("start");
  });

  /* =========================
     ゲーム開始フロー
     1) 初期化
     2) game画面へ
     3) カウントダウン（ピッピッにゃ）
     4) カード生成
  ========================= */
  function startFlow() {
    resetAll();
    setScreen("game");
    startCountdown(() => {
      setupCards();
      startTime = Date.now();
      lockBoard = false;
    });
  }

  function resetAll() {
    // UI
    board.innerHTML = "";
    missArea.innerHTML = "";
    resultScreen.classList.add("hidden");
    countdownEl.classList.add("hidden");
    countdownEl.textContent = "";

    // 状態
    lockBoard = true;
    firstCard = null;
    secondCard = null;
    matchedCount = 0;
    missCount = 0;

    // HARDは肉球表示を初期化
    updateMissUI();
  }

  /* =========================
     カウントダウン（3,2 = beep / 1の次で startにゃ）
  ========================= */
  function startCountdown(done) {
    lockBoard = true;

    let count = 3;
    countdownEl.textContent = String(count);
    countdownEl.classList.remove("hidden");

    // 最初の「ピッ」
    playSE("beep", 0.6);

    const timer = setInterval(() => {
      count--;

      if (count === 0) {
        clearInterval(timer);

        countdownEl.classList.add("hidden");
        countdownEl.textContent = "";

        // 最後の「にゃ！」
        playSE("start", 1.0);

        done();
        return;
      }

      countdownEl.textContent = String(count);
      // 2,1 のところでも「ピッ」
      playSE("beep", 0.6);
    }, 1000);
  }

  /* =========================
     カード生成
  ========================= */
  function setupCards() {
    board.innerHTML = "";

    // 枚数で列数を変える（6枚=3列、12枚=4列）
    if (cardCount === 6) {
      board.style.gridTemplateColumns = "repeat(3, 1fr)";
    } else {
      board.style.gridTemplateColumns = "repeat(4, 1fr)";
    }

    // 001..006 を作る（pairs分）
    const names = [];
    for (let i = 1; i <= pairCount; i++) {
      const n = String(i).padStart(3, "0");
      names.push(n, n);
    }

    // シャッフル
    names.sort(() => Math.random() - 0.5);

    names.forEach(name => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.name = name;

      const img = document.createElement("img");
      img.src = "../img/back.jpg"; // devから1つ上のimg
      img.alt = "card";

      card.appendChild(img);
      board.appendChild(card);

      card.addEventListener("pointerdown", () => onCardTap(card, img, name));
    });
  }

  /* =========================
     タップ処理
  ========================= */
  function onCardTap(cardEl, imgEl, name) {
    if (lockBoard) return;

    // 同じカード連打防止
    if (firstCard && firstCard.cardEl === cardEl) return;

    // 既に揃ったカードは無視
    if (cardEl.classList.contains("matched")) return;

    // 表にする
    imgEl.src = `../img/${name}.jpg`;

    if (!firstCard) {
      firstCard = { cardEl, imgEl, name };
      return;
    }

    secondCard = { cardEl, imgEl, name };
    lockBoard = true;

    checkMatch();
  }

  /* =========================
     判定（一致/不一致）
  ========================= */
  function checkMatch() {
    if (!firstCard || !secondCard) {
      lockBoard = false;
      return;
    }

    if (firstCard.name === secondCard.name) {
      // 正解
      playSE("meow", 1.0);

      firstCard.cardEl.classList.add("matched");
      secondCard.cardEl.classList.add("matched");

      matchedCount += 2;

      resetTurn();

      if (matchedCount === cardCount) {
        setTimeout(showClear, 600);
      }
      return;
    }

    // ミス
    missCount++;
    playSE("miss", 0.9);
    updateMissUI();

    setTimeout(() => {
      // HARDのBAD END判定（ここで完結させる）
      const limit = MODE_SETTING[mode].missLimit;
      if (missCount >= limit) {
        showBadEnd();
        return;
      }

      // 裏に戻す
      firstCard.imgEl.src = "../img/back.jpg";
      secondCard.imgEl.src = "../img/back.jpg";

      resetTurn();
    }, 900);
  }

  function resetTurn() {
    firstCard = null;
    secondCard = null;
    lockBoard = false;
  }

  // HARD用：ミス表示（😿を増やす）
function updateMissUI() {
  if (mode !== "hard") {
    missArea.textContent = "";
    return;
  }

  // ミス回数分だけ 😿 を表示
  missArea.textContent = "😿".repeat(missCount);
}


  /* =========================
     結果表示（1か所で管理）
  ========================= */
  function showResult(title, sub = "") {
    resultText.textContent = title;
    timeText.textContent = sub;

    setScreen("result");
  }

  function showClear() {
    const time = ((Date.now() - startTime) / 1000).toFixed(1);

    playSE("clear", 1.0);
    showResult("PERFECT!!", `TIME : ${time}s`);

    // ※紙吹雪は後で追加OK（ここに足す）
  }

  function showBadEnd() {
    showResult("BAD END…", "");
  }

  /* =========================
     初期画面
  ========================= */
  setScreen("start");
});


















