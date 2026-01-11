document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const board = document.getElementById("board");

  const modeButtons = document.querySelectorAll(".modeBtn");

  // 効果音
  const beep = new Audio("beep.wav");
  const meow = new Audio("meow.wav");
  const meowStart = new Audio("meowStart.wav");
  const meowLong = new Audio("meow_long.wav");
  const missSound = new Audio("meow_miss.wav");

  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let matchedCount = 0;
  let totalCards = 12;

  /* =====================
     モード選択
  ===================== */
  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;

      if (mode === "easy") totalCards = 6;
      if (mode === "normal") totalCards = 12;
      if (mode === "hard") totalCards = 12;

      startScreen.classList.add("hidden");
      gameScreen.classList.remove("hidden");

      startCountdown();
    });
  });

  /* =====================
     カウントダウン
  ===================== */
  function startCountdown() {
    let count = 3;
    lockBoard = true;

    board.innerHTML = `<div class="countdown">${count}</div>`;
    beep.currentTime = 0;
    beep.play();

    const timer = setInterval(() => {
      count--;

      if (count === 0) {
        clearInterval(timer);

        meowStart.currentTime = 0;
        meowStart.play();

        board.innerHTML = "";
        startGame();
        lockBoard = false;
      } else {
        document.querySelector(".countdown").textContent = count;
        beep.currentTime = 0;
        beep.play();
      }
    }, 1000);
  }

  /* =====================
     ゲーム開始
  ===================== */
  function startGame() {
    matchedCount = 0;
    board.innerHTML = "";

    const images = ["001","002","003","004","005","006"]
      .slice(0, totalCards / 2);

    const cards = [...images, ...images]
      .sort(() => Math.random() - 0.5);

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
     カード処理
  ===================== */
  function flipCard(card, img) {
    if (lockBoard) return;
    if (card === firstCard) return;

    img.src = `img/${card.dataset.name}.jpg`;

    if (!firstCard) {
      firstCard = card;
      return;
    }

    secondCard = card;
    checkForMatch();
  }

  function checkForMatch() {
    if (firstCard.dataset.name === secondCard.dataset.name) {
      meow.currentTime = 0;
      meow.play();

      firstCard.classList.add("matched");
      secondCard.classList.add("matched");

      matchedCount += 2;
      resetTurn();

      if (matchedCount === totalCards) {
        setTimeout(showClear, 500);
      }
    } else {
      lockBoard = true;

      missSound.currentTime = 0;
      missSound.play();

      firstCard.classList.add("shake");
      secondCard.classList.add("shake");

      setTimeout(() => {
        firstCard.querySelector("img").src = "img/back.jpg";
        secondCard.querySelector("img").src = "img/back.jpg";

        firstCard.classList.remove("shake");
        secondCard.classList.remove("shake");

        resetTurn();
      }, 1000);
    }
  }

  function resetTurn() {
    firstCard = null;
    secondCard = null;
    lockBoard = false;
  }

  /* =====================
     クリア
  ===================== */
  function showClear() {
    meowLong.currentTime = 0;
    meowLong.play();

    board.innerHTML = `
      <div class="clear">
        <h1>PERFECT!</h1>
        <button id="restartBtn">もう1回</button>
      </div>
    `;

    document.getElementById("restartBtn").addEventListener("click", () => {
      startCountdown();
    });
  }
});







































