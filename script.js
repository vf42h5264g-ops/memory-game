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

  const modeBtns = document.querySelectorAll(".modeBtn");

  /* =====================
     サウンド
  ===================== */
  const beep = new Audio("beep.wav");
  const meow = new Audio("meow.wav");
  const meowLong = new Audio("meow_long.wav");
  const meowStart = new Audio("meowStart.wav");
  const missSound = new Audio("meow_miss.wav");

  /* =====================
     ゲーム変数（★統一）
  ===================== */
  let mode = "easy";
  let cardCount = 6;

  let firstCard = null;
  let secondCard = null;
  let lockBoard = true;

  let matchedCount = 0;
  let missCount = 0;

  let startTime = 0;

  /* =====================
     モード選択
  ===================== */
  modeBtns.forEach(btn => {
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
    resultScreen.classList.add("hidden");
    board.innerHTML = "";
    missArea.innerHTML = "";

    firstCard = null;
    secondCard = null;
    matchedCount = 0;
    missCount = 0;
    lockBoard = true;

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    showCountdown(() => {
      setupCards();
      startTime = Date.now();
      lockBoard = false;
    });
  }

  /* =====================
     カウントダウン
  ===================== */
  function showCountdown(callback) {
    let count = 3;

    countdownEl.textContent = count;
    countdownEl.classList.remove("hidden");

    beep.currentTime = 0;
    beep.play();

    const timer = setInterval(() => {
      count--;

      if (count === 0) {
        clearInterval(timer);
        countdownEl.textContent = "にゃ！";

        meowStart.currentTime = 0;
        meowStart.play();

        setTimeout(() => {
          countdownEl.classList.add("hidden");
          countdownEl.textContent = "";
          callback();
        }, 600);

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
  function setupCards() {
    board.innerHTML = "";

    const images = [];
    for (let i = 1; i <= cardCount / 2; i++) {
      images.push(String(i).padStart(3, "0"));
    }

    const cards = [...images, ...images].sort(() => Math.random() - 0.5);

    cards.forEach(name => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.name = name;

      const img = document.createElement("img");
      img.src = "img/back.jpg";

      card.appendChild(img);
      board.appendChild(card);

      card.addEventListener("click", () => flipCard(card, img));
    });
  }

  /* =====================
     カードをめくる
  ===================== */
  function flipCard(card, img) {
    if (lockBoard) return;
    if (card === firstCard) return;
    if (card.classList.contains("matched")) return;

    img.src = `img/${card.dataset.name}.jpg`;

    if (!firstCard) {
      firstCard = card;
      return;
    }

    secondCard = card;
    checkForMatch();
  }

  /* =====================
     判定
  ===================== */
  function checkForMatch() {
    lockBoard = true;

    if (firstCard.dataset.name === secondCard.dataset.name) {
      meow.currentTime = 0;
      meow.play();

      firstCard.classList.add("matched");
      secondCard.classList.add("matched");

      matchedCount += 2;
      resetTurn();

      if (matchedCount === cardCount) {
        setTimeout(showClear, 500);
      }

    } else {
      missCount++;
      updateMissArea();

      missSound.currentTime = 0;
      missSound.play();

      setTimeout(() => {
        firstCard.querySelector("img").src = "img/back.jpg";
        secondCard.querySelector("img").src = "img/back.jpg";
        resetTurn();

        if (mode === "hard" && missCount >= 5) {
          showBadEnd();
        }

      }, 1000);
    }
  }

  /* =====================
     ミス表示（HARD用）
  ===================== */
  function updateMissArea() {
    if (mode !== "hard") return;

    missArea.innerHTML = "🐾".repeat(missCount);
  }

  /* =====================
     ターンリセット
  ===================== */
  function resetTurn() {
    firstCard = null;
    secondCard = null;
    lockBoard = false;
  }

  /* =====================
     クリア
  ===================== */
  function showClear() {
    lockBoard = true;

    const time = ((Date.now() - startTime) / 1000).toFixed(1);

    meowLong.currentTime = 0;
    meowLong.play();

    resultText.textContent = "PERFECT!";
    timeText.textContent = `TIME : ${time}s`;

    resultScreen.classList.remove("hidden");
  }

  /* =====================
     BAD END
  ===================== */
  function showBadEnd() {
    lockBoard = true;

    resultText.textContent = "BAD END…";
    timeText.textContent = "";

    resultScreen.classList.remove("hidden");
  }

  /* =====================
     ボタン
  ===================== */
  retryBtn.addEventListener("click", startGame);

  backBtn.addEventListener("click", () => {
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  });

});






