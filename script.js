document.addEventListener("DOMContentLoaded", () => {

  /* =====================
     DOM取得
  ===================== */
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const board = document.getElementById("board");
  const countdownEl = document.getElementById("countdown");
  const missArea = document.getElementById("missArea");

  const resultScreen = document.getElementById("resultScreen");
  const resultText = document.getElementById("resultText");
  const timeText = document.getElementById("timeText");
  const retryBtn = document.getElementById("retryBtn");
  const backBtn = document.getElementById("backBtn");

  /* =====================
     サウンド
  ===================== */
  const beep = new Audio("beep.wav");
  const meow = new Audio("meow.wav");
  const meowLong = new Audio("meow_long.wav");
  const meowStart = new Audio("meowStart.wav");
  const meowMiss = new Audio("meow_miss.wav");

  /* =====================
     ゲーム変数
  ===================== */
  let mode = "easy";
  let cardCount = 6;

  let firstCard = null;
  let secondCard = null;
  let lock = true;

  let matched = 0;
  let missCount = 0;

  let startTime = 0;

  /* =====================
     モード選択
  ===================== */
  document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;

      if (mode === "easy") cardCount = 6;
      if (mode === "normal") cardCount = 12;
      if (mode === "hard") cardCount = 12;

      startGame();
    });
  });

  /* =====================
     ゲーム開始
  ===================== */
  function startGame() {
    // 初期化
    board.innerHTML = "";
    missArea.innerHTML = "";
    resultScreen.classList.add("hidden");

    firstCard = null;
    secondCard = null;
    matched = 0;
    missCount = 0;
    lock = true;

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    if (mode === "hard") updateMissIcons();

    startCountdown(() => {
      setupCards();
      startTime = Date.now();
      lock = false;
    });
  }

  /* =====================
     カウントダウン
  ===================== */
  function startCountdown(callback) {
    let count = 3;
    countdownEl.textContent = count;
    countdownEl.classList.remove("hidden");

    beep.currentTime = 0;
    beep.play();

    const timer = setInterval(() => {
      count--;

      if (count === 0) {
        clearInterval(timer);
        countdownEl.classList.add("hidden");

        meow.currentTime = 0;
        meow.play();

        callback();
      } else {
        countdownEl.textContent = count;
        beep.currentTime = 0;
        beep.play();
      }
    }, 1000);
  }

  /* =====================
     カード生成
  ===================== */
.======= */
  function checkMatch() {
    if (firstCard.dataset.name === secondCard.dataset.name) {
      meow.currentTime = 0;
      meow.play();

      matched += 2;
      resetTurn();

      if (matched === cardCount) {
        setTimeout(showClear, 600);
      }
    } else {
      missCount++;
      meowMiss.currentTime = 0;
      meowMiss.play();

      if (mode === "hard") updateMissIcons();

      setTimeout(() => {
        if (mode === "hard" && missCount >= 5) {
          showBadEnd();
          return;
        }

        firstCard.querySelector("img").src = "img/back.jpg";
        secondCard.querySelector("img").src = "img/back.jpg";
        resetTurn();
      }, 1000);
    }
  }
});















