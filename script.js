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
  const meowStart = new Audio("meowStart.wav");
  const meowLong = new Audio("meow_long.wav");
  const meowMiss = new Audio("meow_miss.wav");

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
    // ★ 絶対に最初に隠す（超重要）
    resultScreen.classList.add("hidden");
    resultScreen.style.display = "none";

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
     カウントダウン
  ===================== */
  function showCountdown(done) {
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

        meowStart.currentTime = 0;
        meowStart.play();

        done();
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
    const pairCount = cardCount / 2;
    const names = [];

    for (let i = 1; i <= pairCount; i++) {
      const name = String(i).padStart(3, "0");
      names.push(name, name);
    }

    names.sort(() => Math.random() - 0.5);

    board.style.gridTemplateColumns =
      cardCount === 6 ? "repeat(3,1fr)" : "repeat(4,1fr)";

    names.forEach(name => {
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
     カード操作
  ===================== */
  function flipCard(card, img) {
    if (lock) return;
    if (card === firstCard) return;
    if (card.classList.contains("matched")) return;

    img.src = `img/${card.dataset.name}.jpg`;

    if (!firstCard) {
      firstCard = card;
      return;
    }

    checkMatch(card);
  }

  function checkMatch(secondCard) {
    lock = true;

    if (firstCard.dataset.name === secondCard.dataset.name) {
      meow.currentTime = 0;
      meow.play();

      firstCard.classList.add("matched");
      secondCard.classList.add("matched");

      matched += 2;
      resetTurn();

      if (matched === cardCount) {
        setTimeout(showClear, 600);
      }
    } else {
      missCount++;

      meowMiss.currentTime = 0;
      meowMiss.play();

      if (mode === "hard") updateMiss();

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

  function resetTurn() {
    firstCard = null;
    lock = false;
  }

  /* =====================
     ミス表示（HARD）
  ===================== */
  function updateMiss() {
    missArea.textContent = "🐾".repeat(missCount);
  }

  /* =====================
     クリア
  ===================== */
  function showClear() {
    const time = ((Date.now() - startTime) / 1000).toFixed(1);

    resultText.textContent = "PERFECT!!";
    timeText.textContent = `TIME : ${time}s`;

    resultScreen.classList.remove("hidden");

    meowLong.currentTime = 0;
    meowLong.play();
  }

  /* =====================
     BAD END
  ===================== */
  function showBadEnd() {
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
    resultScreen.classList.add("hidden");
  });

});








