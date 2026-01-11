document.addEventListener("DOMContentLoaded", () => {

  /* =====================
     要素取得
  ===================== */
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");

  const modeBtns = document.querySelectorAll(".modeBtn");

  const countdownEl = document.getElementById("countdown");
  const board = document.getElementById("board");
  const missArea = document.getElementById("missArea");

  const resultScreen = document.getElementById("resultScreen");
  const resultText = document.getElementById("resultText");
  const timeText = document.getElementById("timeText");

  const retryBtn = document.getElementById("retryBtn");
  const backBtn = document.getElementById("backBtn");

  /* =====================
     サウンド
  ===================== */
  const seCount = new Audio("sound/count.wav");
  const seFlip = new Audio("sound/flip.wav");
  const seMiss = new Audio("sound/miss.wav");
  const seMatch = new Audio("sound/match.wav");
  const seClear = new Audio("sound/clear.wav");

  /* =====================
     ゲーム変数
  ===================== */
  let mode = "easy";
  let cardCount = 6;

  let firstCard = null;
  let lock = true;

  let matched = 0;
  let missCount = 0;

  let startTime = 0;

  /* =====================
     モード設定
  ===================== */
  function setMode(selected) {
    mode = selected;

    if (mode === "easy") cardCount = 6;
    if (mode === "normal") cardCount = 12;
    if (mode === "hard") cardCount = 12;
  }

  /* =====================
     スタート
  ===================== */
  modeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      setMode(btn.dataset.mode);
      startGame();
    });
  });

  /* =====================
     ゲーム開始
  ===================== */
  function startGame() {
    // 初期化
    resultScreen.classList.add("hidden");
    board.innerHTML = "";
    missArea.innerHTML = "";

    firstCard = null;
    matched = 0;
    missCount = 0;
    lock = true;

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    showCountdown(() => {
      setupCards();
      startTime = Date.now();
      lock = false;
    });
  }

  /* =====================
     カウントダウン（安定版）
  ===================== */
  function showCountdown(callback) {
    countdownEl.classList.remove("hidden");

    countdownEl.textContent = "3";
    seCount.currentTime = 0;
    seCount.play();

    setTimeout(() => {
      countdownEl.textContent = "2";
      seCount.currentTime = 0;
      seCount.play();
    }, 1000);

    setTimeout(() => {
      countdownEl.textContent = "1";
      seCount.currentTime = 0;
      seCount.play();
    }, 2000);

    setTimeout(() => {
      countdownEl.classList.add("hidden");
      callback();
    }, 3000);
  }

  /* =====================
     カード生成
  ===================== */
  function setupCards() {
    const pairCount = cardCount / 2;
    const images = [];

    for (let i = 1; i <= pairCount; i++) {
      images.push(i, i);
    }

    images.sort(() => Math.random() - 0.5);

    images.forEach(num => {
      const card = document.createElement("div");
      card.className = "card";

      const img = document.createElement("img");
      img.src = "img/back.jpg";
      img.dataset.num = num;

      card.appendChild(img);
      board.appendChild(card);

      card.addEventListener("click", () => onCardClick(card, img));
    });
  }

  /* =====================
     カードクリック
  ===================== */
  function onCardClick(card, img) {
    if (lock) return;
    if (card.classList.contains("open")) return;

    seFlip.currentTime = 0;
    seFlip.play();

    img.src = `img/${img.dataset.num}.jpg`;
    card.classList.add("open");

    if (!firstCard) {
      firstCard = card;
      return;
    }

    lock = true;

    const firstImg = firstCard.querySelector("img");

    if (firstImg.dataset.num === img.dataset.num) {
      // 正解
      seMatch.currentTime = 0;
      seMatch.play();

      matched += 2;
      firstCard = null;
      lock = false;

      if (matched === cardCount) {
        gameClear();
      }
    } else {
      // 不正解
      missCount++;
      seMiss.currentTime = 0;
      seMiss.play();

      updateMissUI();

      setTimeout(() => {
        firstImg.src = "img/back.jpg";
        img.src = "img/back.jpg";

        firstCard.classList.remove("open");
        card.classList.remove("open");

        firstCard = null;
        lock = false;

        if (mode === "hard" && missCount >= 5) {
          gameOver();
        }
      }, 800);
    }
  }

  /* =====================
     ミス表示（肉球）
  ===================== */
  function updateMissUI() {
    missArea.innerHTML = "";
    for (let i = 0; i < missCount; i++) {
      const span = document.createElement("span");
      span.textContent = "🐾";
      missArea.appendChild(span);
    }
  }

  /* =====================
     クリア
  ===================== */
  function gameClear() {
    seClear.currentTime = 0;
    seClear.play();

    const time = ((Date.now() - startTime) / 1000).toFixed(1);

    resultText.textContent = "PERFECT!";
    timeText.textContent = `TIME : ${time}s`;

    resultScreen.classList.remove("hidden");
  }

  /* =====================
     ゲームオーバー
  ===================== */
  function gameOver() {
    resultText.textContent = "BAD END";
    timeText.textContent = "";

    resultScreen.classList.remove("hidden");
    lock = true;
  }

  /* =====================
     ボタン
  ===================== */
  retryBtn.addEventListener("click", () => {
    startGame();
  });

  backBtn.addEventListener("click", () => {
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  });

});




