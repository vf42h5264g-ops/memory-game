document.addEventListener("DOMContentLoaded", () => {

  /* ========= 要素 ========= */
  const startScreen = document.getElementById("startScreen");
  const gameScreen  = document.getElementById("gameScreen");
  const board       = document.getElementById("board");
  const modeBtns    = document.querySelectorAll(".modeBtn");

  /* ========= 効果音 ========= */
  const beep = new Audio("beep.wav");
  const meowStart = new Audio("meow_start.wav");
  const meow = new Audio("meow.wav");
  const missSound = new Audio("miss.wav");

  /* ========= 状態 ========= */
  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let matchedCount = 0;
  let selectedMode = null;

  /* ========= iOS用：音アンロック ========= */
  function unlockAudio(audio) {
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
    }).catch(() => {});
  }

  /* ========= モード選択 ========= */
  modeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      selectedMode = btn.dataset.mode;

      // iOS音対策（超重要）
      unlockAudio(beep);
      unlockAudio(meowStart);
      unlockAudio(meow);
      unlockAudio(missSound);

      startScreen.style.display = "none";
      gameScreen.style.display = "block";

      startCountdown();
    });
  });

  /* ========= カウントダウン ========= */
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
        lockBoard = false;
        startGame();
      } else {
        document.querySelector(".countdown").textContent = count;
        beep.currentTime = 0;
        beep.play();
      }
    }, 1000);
  }

  /* ========= ゲーム開始 ========= */
  function startGame() {
    board.innerHTML = "";
    firstCard = null;
    secondCard = null;
    matchedCount = 0;

    let images = [];

    if (selectedMode === "easy") {
      images = ["001","002","003"];
    } else {
      images = ["001","002","003","004","005","006"];
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

  /* ========= カード反転 ========= */
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

  /* ========= 判定 ========= */
  function checkForMatch() {
    if (firstCard.dataset.name === secondCard.dataset.name) {
      meow.currentTime = 0;
      meow.play();

      matchedCount += 2;
      resetTurn();

      if (matchedCount === board.children.length) {
        setTimeout(showClear, 600);
      }
    } else {
      lockBoard = true;

      missSound.currentTime = 0;
      missSound.play();

      setTimeout(() => {
        firstCard.querySelector("img").src = "img/back.jpg";
        secondCard.querySelector("img").src = "img/back.jpg";
        resetTurn();
      }, 1000);
    }
  }

  /* ========= ターンリセット ========= */
  function resetTurn() {
    firstCard = null;
    secondCard = null;
    lockBoard = false;
  }

  /* ========= クリア ========= */
  function showClear() {
    board.innerHTML = `
      <div class="clear">
        <h1>PERFECT!!</h1>
        <button id="retryBtn">もう1回</button>
      </div>
    `;

    document.getElementById("retryBtn").addEventListener("click", () => {
      startCountdown();
    });
  }

});





































