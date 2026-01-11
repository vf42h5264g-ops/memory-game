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

        meowStart.currentTime = 0;
        meowStart.play();

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
  function setupCards() {
    const pairCount = cardCount / 2;
    const images = [];

    for (let i = 1; i <= pairCount; i++) {
      images.push(i.toString().padStart(3, "0"));
      images.push(i.toString().padStart(3, "0"));
    }

    images.sort(() => Math.random() - 0.5);

    images.forEach(name => {
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
     カードめくり
  ===================== */
  function flipCard(card, img) {
    if (lock) return;
    if (card === firstCard) return;

    img.src = `img/${card.dataset.name}.jpg`;

    if (!firstCard) {
      firstCard = card;
      return;
    }

    secondCard = card;
    lock = true;

    checkMatch();
  }

  /* =====================
     判定
  ===================== */
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

  function resetTurn() {
    firstCard = null;
    secondCard = null;
    lock = false;
  }

  /* =====================
     失敗表示（肉球）
  ===================== */
  function updateMissIcons() {
    missArea.innerHTML = "";
    for (let i = 0; i < missCount; i++) {
      missArea.textContent += "🐾";
    }
  }

  /* =====================
     CLEAR（紙吹雪）
  ===================== */
  function showClear() {
    const time = ((Date.now() - startTime) / 1000).toFixed(1);

    resultText.textContent = "PERFECT!!";
    timeText.textContent = `TIME : ${time}s`;
    resultScreen.classList.remove("hidden");

    meowLong.currentTime = 0;
    meowLong.play();

    launchConfetti();
  }

  /* =====================
     BAD END
  ===================== */
  function showBadEnd() {
    resultText.textContent = "BAD END...";
    timeText.textContent = "";
    resultScreen.classList.remove("hidden");
  }

  /* =====================
     紙吹雪
  ===================== */
  function launchConfetti() {
    for (let i = 0; i < 60; i++) {
      const confetti = document.createElement("div");
      confetti.textContent = "🎉";
      confetti.style.position = "fixed";
      confetti.style.left = Math.random() * 100 + "vw";
      confetti.style.top = "-20px";
      confetti.style.fontSize = "24px";
      confetti.style.pointerEvents = "none";
      confetti.style.transition = "transform 2s linear, opacity 2s";

      document.body.appendChild(confetti);

      setTimeout(() => {
        confetti.style.transform =
          `translateY(110vh) rotate(${Math.random() * 360}deg)`;
        confetti.style.opacity = "0";
      }, 50);

      setTimeout(() => confetti.remove(), 2200);
    }
  }

  /* =====================
     ボタン
  ===================== */
  retryBtn.addEventListener("click", () => startGame());
  backBtn.addEventListener("click", () => {
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  });

});












