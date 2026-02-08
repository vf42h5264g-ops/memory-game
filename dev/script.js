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

  // VS HUD（HTMLに入れたやつ）
  const vsHud = document.getElementById("vsHud");
  const turnText = document.getElementById("turnText");
  const scoreText = document.getElementById("scoreText");

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
     // 追加：手番交代SE
    turn:  new Audio("../ping.wav"),
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
     ゲーム設定（モード）
     - vs を追加：20枚=10ペア
  ========================= */
  const MODE_SETTING = {
    easy:   { cards: 6,  pairs: 3,  missLimit: Infinity },
    normal: { cards: 12, pairs: 6,  missLimit: Infinity },
    hard:   { cards: 12, pairs: 6,  missLimit: 5 },
    vs:     { cards: 20, pairs: 10, missLimit: Infinity },
  };

  /* =========================
     ゲーム状態（共通）
  ========================= */
  let mode = "easy";
  let cardCount = 6;
  let pairCount = 3;

  let lockBoard = true;
  let first = null;   // ソロ用 { cardEl, imgEl, name }
  let second = null;

  let matchedCount = 0; // ソロでもVSでも「めくった一致数」判定に使う
  let missCount = 0;
  let startTime = 0;

  /* =========================
     VS 状態
  ========================= */
  let vsState = null;
  // vsState = { player, score, firstPick }

  function isVS() {
    return mode === "vs";
  }

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

    // VSは開始カウントで「PLAYER1ご準備」表示
    startCountdown(() => {
      setupCards();

      startTime = Date.now();
      lockBoard = false;

      if (isVS()) {
        initVSState();
        showVSHud(true);
        renderVSHud();
      } else {
        showVSHud(false);
      }
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

    // RESULT 勝者カラー解除
    if (resultScreen) {
      resultScreen.classList.remove("p1win", "p2win", "draw");
    }

    // boardの見た目
    board.classList.remove("vs");
    board.classList.remove("solo");
    board.classList.remove("p1turn");
    board.classList.remove("p2turn");

    // VS HUDを隠す
    showVSHud(false);

    // 状態初期化（共通）
    lockBoard = true;
    first = null;
    second = null;
    matchedCount = 0;
    missCount = 0;
    vsState = null;

    updateMissUI();
  }

  function showVSHud(show) {
    if (!vsHud) return;
    if (show) vsHud.classList.remove("hidden");
    else vsHud.classList.add("hidden");
  }

  /* =========================
     B: 手番テロップ（切替時）
     - countdownEl を流用（楽＆崩れない）
  ========================= */
  function flashTurnBanner(text, ms = 700) {
    if (!countdownEl) return;

    countdownEl.innerHTML = `<div style="font-size:32px; font-weight:800;">${text}</div>`;
    countdownEl.classList.remove("hidden");

    setTimeout(() => {
      countdownEl.classList.add("hidden");
      countdownEl.textContent = "";
    }, ms);
  }

  /* =========================
     カウントダウン（ピッ、ピッ、にゃ！）
     - VSは「PLAYER1ご準備」付き
  ========================= */
  function startCountdown(done) {
    lockBoard = true;

    let count = 3;

    // 初期表示
    if (isVS()) {
      countdownEl.innerHTML =
        `<div style="font-size:20px; margin-bottom:10px;">PLAYER 1 ご準備下さい</div>
         <div style="font-size:80px; line-height:1;">${count}</div>`;
    } else {
      countdownEl.textContent = String(count);
    }

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

      if (isVS()) {
        countdownEl.innerHTML =
          `<div style="font-size:20px; margin-bottom:10px;">PLAYER 1 ご準備下さい</div>
           <div style="font-size:80px; line-height:1;">${count}</div>`;
      } else {
        countdownEl.textContent = String(count);
      }

      playSE("beep", 0.6);
    }, 1000);
  }

  /* =========================
     カード生成
  ========================= */
  function setupCards() {
    board.innerHTML = "";

    // 列数（JSで強制）
    if (cardCount === 6) {
      board.style.gridTemplateColumns = "repeat(3, 1fr)";
      board.classList.add("solo");
    } else if (cardCount === 12) {
      board.style.gridTemplateColumns = "repeat(4, 1fr)";
      board.classList.add("solo");
    } else if (cardCount === 20) {
      board.style.gridTemplateColumns = "repeat(5, 1fr)";
      board.classList.add("vs");
    } else {
      board.style.gridTemplateColumns = "repeat(4, 1fr)";
    }

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
     タップ（ソロ/VS共通入口）
  ========================= */
  function onCardTap(cardEl, imgEl, name) {
    if (lockBoard) return;

    // 既に揃ったカードは無視
    if (cardEl.classList.contains("matched")) return;

    // すでに表なら無視（backじゃない）
    if (!imgEl.src.includes("back")) return;

    // 同じカード連打防止（1枚目と同じ）
    if (!isVS()) {
      if (first && first.cardEl === cardEl) return;
    } else {
      if (vsState?.firstPick && vsState.firstPick.cardEl === cardEl) return;
    }

    // 表にする
    imgEl.src = `../img/${name}.jpg`;

    if (!isVS()) {
      // ===== ソロの処理 =====
      if (!first) {
        first = { cardEl, imgEl, name };
        return;
      }
      second = { cardEl, imgEl, name };
      lockBoard = true;
      checkMatchSolo();
    } else {
      // ===== VSの処理 =====
      onCardTapVS(cardEl, imgEl, name);
    }
  }

  /* =========================
     ソロ判定
  ========================= */
  function checkMatchSolo() {
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
        setTimeout(showClearSolo, 600);
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
     HARD用：😿ミス表示（ソロのみ）
  ========================= */
  function updateMissUI() {
    if (!missArea) return;

    if (isVS()) {
      missArea.textContent = "";
      return;
    }

    if (mode !== "hard") {
      missArea.textContent = "";
      return;
    }

    missArea.textContent = "😿".repeat(missCount);
  }

  /* =========================
     VS 初期化 & HUD（A）
     - HUDの見た目切替クラス
     - boardにも手番クラス（あればCSSで枠出せる）
  ========================= */
  function initVSState() {
    vsState = {
      player: 0,           // 0=P1, 1=P2
      score: [0, 0],
      firstPick: null,     // {cardEl,imgEl,name}
    };

    // 開始時の枠/色
    applyTurnClasses();
  }

  function applyTurnClasses() {
    if (!vsState) return;

    // HUD
    if (vsHud) {
      vsHud.classList.toggle("p1", vsState.player === 0);
      vsHud.classList.toggle("p2", vsState.player === 1);
    }

    // 盤面（CSSで枠を出したい場合用）
    board.classList.toggle("p1turn", vsState.player === 0);
    board.classList.toggle("p2turn", vsState.player === 1);
  }

  function renderVSHud() {
    if (!turnText || !scoreText || !vsState) return;

    turnText.textContent = `手番：PLAYER ${vsState.player + 1}`;
    scoreText.textContent = `SCORE  P1:${vsState.score[0]}  /  P2:${vsState.score[1]}`;

    applyTurnClasses();
  }

  /* =========================
     VS タップ処理（A+B）
  ========================= */
  function onCardTapVS(cardEl, imgEl, name) {
    if (!vsState) return;

    if (!vsState.firstPick) {
      vsState.firstPick = { cardEl, imgEl, name };
      return;
    }

    // 2枚目
    const firstPick = vsState.firstPick;
    const secondPick = { cardEl, imgEl, name };
    vsState.firstPick = null;

    lockBoard = true;

    const isMatch = firstPick.name === secondPick.name;

    if (isMatch) {
      playSE("meow", 1.0);

      firstPick.cardEl.classList.add("matched");
      secondPick.cardEl.classList.add("matched");

      vsState.score[vsState.player] += 1;

      matchedCount += 2;

      lockBoard = false;
      renderVSHud();

      if (matchedCount === cardCount) {
        setTimeout(showClearVS, 600);
      }
      return;
    }

    // 外れ
    playSE("miss", 0.9);

    setTimeout(() => {
      // 裏に戻す
      firstPick.imgEl.src = "../img/back.jpg";
      secondPick.imgEl.src = "../img/back.jpg";

      // 手番交代
      vsState.player = 1 - vsState.player;

      // 追加：交代SE（短く控えめ）
      playSE("turn", 0.7);

      // A: HUD/枠更新
      renderVSHud();

      // B: でかテロップで強調
      flashTurnBanner(`PLAYER ${vsState.player + 1} の番！`, 700);

      lockBoard = false;
    }, 900);
  }

  /* =========================
     結果表示
  ========================= */
  function showResult(title, sub = "") {
    resultText.textContent = title;
    timeText.textContent = sub;
    setScreen("result");
  }

  function showClearSolo() {
    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    playSE("clear", 1.0);
    showResult("PERFECT!!", `TIME : ${time}s`);
  }

  function showClearVS() {
  const time = ((Date.now() - startTime) / 1000).toFixed(1);

  const s1 = vsState?.score?.[0] ?? 0;
  const s2 = vsState?.score?.[1] ?? 0;

  // いったんクラスを掃除
  if (resultScreen) resultScreen.classList.remove("p1win", "p2win", "draw");

  let title = "";
  if (s1 > s2) {
    title = `PLAYER 1 の勝ち！ (${s1}-${s2})`;
    if (resultScreen) resultScreen.classList.add("p1win");
  } else if (s2 > s1) {
    title = `PLAYER 2 の勝ち！ (${s2}-${s1})`;
    if (resultScreen) resultScreen.classList.add("p2win");
  } else {
    title = `引き分け！ (${s1}-${s2})`;
    if (resultScreen) resultScreen.classList.add("draw");
  }

  playSE("clear", 1.0);
  showResult(title, `TIME : ${time}s`);
}


  function showBadEnd() {
    showResult("BAD END…", "");
  }

  /* =========================
     初期画面
  ========================= */
  setScreen("start");
});



















