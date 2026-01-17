document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     DOM取得（必須）
  ========================= */
  const startScreen  = document.getElementById("startScreen");
  const helpScreen   = document.getElementById("helpScreen");
  const gameScreen   = document.getElementById("gameScreen");
  const resultScreen = document.getElementById("resultScreen");

  const board       = document.getElementById("board");
  const countdownEl = document.getElementById("countdown");
  const missArea    = document.getElementById("missArea");

  const resultText  = document.getElementById("resultText");
  const timeText    = document.getElementById("timeText");
  const retryBtn    = document.getElementById("retryBtn");
  const backBtn     = document.getElementById("backBtn");

  const helpBtn      = document.getElementById("helpBtn");
  const backFromHelp = document.getElementById("backFromHelp");

  const soundToggleBtn = document.getElementById("soundToggle");
  const modeBtns = document.querySelectorAll(".modeBtn");

  /* =========================
     画面遷移（state管理）
  ========================= */
  const screens = {
    start: startScreen,
    help: helpScreen,
    game: gameScreen,
    result: resultScreen,
  };

  function setScreen(name) {
    Object.values(screens).forEach(el => el.classList.add("hidden"));
    const target = screens[name];
    if (target) target.classList.remove("hidden");
  }

  /* =========================
     効果音（devから見て1つ上）
  ========================= */
  const se = {
    beep:  new Audio("../beep.wav"),
    meow:  new Audio("../meow.wav"),
    start: new Audio("../meowStart.wav"),
    clear: new Audio("../meow_long.wav"),
    miss:  new Audio("../meow_miss.wav"),
  };

  // ON/OFF状態（保存）
  let soundEnabled = localStorage.getItem("soundEnabled") === "1";
  let audioUnlocked = false;

  function updateSoundButton() {
    if (!soundToggleBtn) return;
    soundToggleBtn.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
    soundToggleBtn.textContent = soundEnabled ? "🔊 SOUND: ON" : "🔇 SOUND: OFF";
  }

  // iOS対策：最初のユーザー操作で一度だけ「解放」
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

  // サウンドトグル（ボタンは1つだけ）
  if (soundToggleBtn) {
    updateSoundButton();
    soundToggleBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();

      soundEnabled = !soundEnabled;
      localStorage.setItem("soundEnabled", soundEnabled ? "1" : "0");

      if (soundEnabled) {
        unlockAudioOnce();
        playSE("meow", 0.8); // ON確認
      }

      updateSoundButton();
    });
  }

  /* =========================
     ゲーム設定（3モード）
  ========================= */
  const MODE_SETTING = {
    easy:   { cards: 6,  pairs: 3, missLimit: Infinity },
    normal: { cards: 12, pairs: 6, missLimit: Infinity },
    hard:   { cards: 12, pairs: 6, missLimit: 5 },
  };

  /* =========================
     ゲーム状態
  ========================= */
  let mode = "easy";
  let cardCount = 6;
  let pairCount = 3;

  let lockBoard = true;
  let first = null;   // { cardEl, imgEl, name }
  let second = null;

  let matchedCount = 0;
  let missCount = 0;
  let startTime = 0;

  /* =========================
     画面：説明
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

  /* =========================
     モード選択
  ========================= */
  modeBtns.forEach(btn => {
    btn.addEventListener("pointerdown", () => {
      unlockAudioOnce();

      mode = btn.dataset.mode || "easy";
      const s = MODE_SETTING[mode] || MODE_SETTING.easy;
      cardCount = s.cards;
      pairCount = s.pairs;

      startFlow();
    });
  });

  /* =========================
     結果画面ボタン
  ========================= */
  if (retryBtn) {
    retryBtn.addEventListener("pointerdown", () => {
      unlockAudioOnce();
      startFlow(); // 同じモードで再開
    });
  }

  if (backBtn) {
    backBtn.addEventListener("pointerdown", () => {
      resetAll();
      setScreen("start");
    });
  }

  /* =========================
     開始フロー
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
    // UI初期化
    if (board) board.innerHTML = "";
    if (missArea) missArea.textContent = "";
    if (countdownEl) {
      countdownEl.classList.add("hidden");
      countdownEl.textContent = "";
    }

    // 状態初期化
    lockBoard = true;
    first = null;
    second = null;
    matchedCount = 0;
    missCount = 0;

    updateMissUI();
  }

  /* =========================
     カウントダウン（ピッ、ピッ、にゃ！）
  ========================= */
  function startCountdown(done) {
    lockBoard = true;

    let count = 3;
    countdownEl.textContent = String(count);
    countdownEl.classList.remove("hidden");

    playSE("beep", 0.6);

    const timer = setInterval(() => {
      count--;

      if (count === 0) {
        clearInterval(timer);
        countdownEl.classList.add("hidden");
        countdownEl.textContent = "";

        playSE("start", 1.0);
        done();
        return;
      }

      countdownEl.textContent = String(count);
      playSE("beep", 0.6);
    }, 1000);
  }

  /* =========================
     カード生成
  ========================= */
  function setupCards() {
    board.innerHTML = "";

    // 列数（6枚=3列、12枚=4列）
    if (cardCount === 6) board.style.gridTemplateColumns = "repeat(3, 1fr)";
    else board.style.gridTemplateColumns = "repeat(4, 1fr)";

    // 001.. (pairCount)
    const names = [];
    for (let i = 1; i <= pairCount; i++) {
      const n = String(i).padStart(3, "0");
      names.push(n, n);
    }

    // shuffle
    names.sort(() => Math.random() - 0.5);

    names.forEach(name => {
      const cardEl = document.createElement("div");
      cardEl.className = "card";
      cardEl.dataset.name = name;

      const imgEl = document.createElement("img");
      imgEl.src = "../img/back.jpg";
      imgEl.alt = "card";

      cardEl.appendChild(imgEl);
      board.appendChild(cardEl);

      cardEl.addEventListener("pointerdown", () => onCardTap(cardEl, imgEl, name));
    });
  }

  /* =========================
     タップ
  ========================= */
  function onCardTap(cardEl, imgEl, name) {
    if (lockBoard) return;

    // 既に揃ったカードは無視
    if (cardEl.classList.contains("matched")) return;

    // 同じカード連打防止
    if (first && first.cardEl === cardEl) return;

    // 表にする
    imgEl.src = `../img/${name}.jpg`;

    if (!first) {
      first = { cardEl, imgEl, name };
      return;
    }

    second = { cardEl, imgEl, name };
    lockBoard = true;

    checkMatch();
  }

  /* =========================
     判定
  ========================= */
  function checkMatch() {
    if (!first || !second) {
      lockBoard = false;
      return;
    }

    // 正解
    if (first.name === second.name) {
      playSE("meow", 1.0);

      first.cardEl.classList.add("matched");
      second.cardEl.classList.add("matched");

      matchedCount += 2;

      // 次へ
      first = null;
      second = null;
      lockBoard = false;

      // クリア判定
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
      // HARDのBAD END（ここで完結）
      const limit = MODE_SETTING[mode].missLimit;
      if (missCount >= limit) {
        showBadEnd();
        return;
      }

      // 裏に戻す
      first.imgEl.src = "../img/back.jpg";
      second.imgEl.src = "../img/back.jpg";

      // 次へ
      first = null;
      second = null;
      lockBoard = false;
    }, 900);
  }

  /* =========================
     HARD用：😿ミス表示
  ========================= */
  function updateMissUI() {
    if (!missArea) return;

    if (mode !== "hard") {
      missArea.textContent = "";
      return;
    }

    missArea.textContent = "😿".repeat(missCount);
  }

  /* =========================
     結果表示
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
  }

  function showBadEnd() {
    showResult("BAD END…", "");
  }

  /* =========================
     初期画面
  ========================= */
  setScreen("start");
});



















