document.addEventListener("DOMContentLoaded", () => {

  /* =====================
     DOM
  ===================== */
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const board = document.getElementById("board");
  const countdownEl = document.getElementById("countdown");
  const missUI = document.getElementById("missUI");

  /* =====================
     効果音（★修正済み）
  ===================== */
  const beep = new Audio("beep.wav");
  const meowStart = new Audio("meowStart.wav");
  const meowOK = new Audio("meow.wav");
  const meowNG = new Audio("meow_miss.wav");
  const meowClear = new Audio("meow_long.wav");

  /* =====================
     状態
  ===================== */
  let mode = "normal";
  let firstCard = null;
  let lock = false;
  let matchedCount = 0;
  let missCount = 0;
  let maxMiss = 0;
  let totalPairs = 0;
  let startTime = 0;

  /* =====================
     モード選択
  ===================== */
  document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      startScreen.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      startCountdown();
    });
  });

  /* =====================
     カウントダウン
  ===================== */
  function startCountdown() {
    board.innerHTML = "";
    countdownEl.classList.remove("hidden");

    let count = 3;
    countdownEl.textContent = count;
    beep.play();

    const timer = setInterval(() => {
      count--;

      if (count > 0) {
        countdownEl.textContent = count;
        beep.currentTime = 0;
        beep.play();
      } else {
        clearInterval(timer);
        countdownEl.textContent = "にゃ！";
        meowStart.play();

        setTimeout(() => {
          countdownEl.classList.add("hidden");
          startGame();
        }, 800);
      }
    }, 1000);
  }

  /* =====================
     ゲーム開始
  ===================== */
  function startGame() {
    board.innerHTML = "";
    firstCard = null;
    lock = false;
    matchedCount = 0;
    missCount = 0;

    if (mode === "easy") {
      totalPairs = 3;
      maxMiss = Infinity;
    } else if (mode === "normal") {
      totalPairs = 6;
      maxMiss = Infinity;
    } else {
      totalPairs = 6;
      maxMiss = 5;
    }

    updateMissUI();
    startTime = Date.now();

    const images = ["001", "002", "003", "004", "005", "006"]
      .slice(0, totalPairs);

    const cards = [...images, ...images].sort(() => Math.random() - 0.5);

    cards.forEach(name => {
      const card = document.createElement("div");
      card.className = "card";

      const img = document.createElement("img");
      img.src = "img/back.jpg";
      img.dataset.name = name;

      card.appendChild(img);
      board.appendChild(card);

      card.addEventListener("click", () => flipCard(card, img));
    });
  }

  /* =====================
     カード処理
  ===================== */
  function flipCard(card, img) {
    if (lock || card === firstCard) return;

    img.src = `img/${img.dataset.name}.jpg`;

    if (!firstCard) {
      firstCard = card;
      return;
    }

    lock = true;
    const firstImg = firstCard.querySelector("img");

    if (firstImg.dataset.name === img.dataset.name) {
      meowOK.currentTime = 0;
      meowOK.play();

      matchedCount++;
      firstCard = null;
      lock = false;

      if (matchedCount === totalPairs) {
        setTimeout(showClear, 500);
      }
    } else {
      missCount++;
      meowNG.currentTime = 0;
      meowNG.play();
      updateMissUI();

      setTimeout(() => {
        img.src = "img/back.jpg";
        firstImg.src = "img/back.jpg";
        firstCard = null;
        lock = false;

        if (mode === "hard" && missCount >= maxMiss) {
          showBadEnd();
        }
      }, 800);
    }
  }

  /* =====================
     ミス表示
  ===================== */
  function updateMissUI() {
    missUI.textContent =
      mode === "hard" ? "🐾".repeat(missCount) : "";
  }

  /* =====================
     クリア
  ===================== */
  function showClear() {
    const time = ((Date.now() - startTime) / 1000).toFixed(1);

    board.innerHTML = `
      <div class="result clear">
        <h1>PERFECT!!</h1>
        <p>${time} 秒</p>
        <button onclick="restart()">もう1回</button>
        <button onclick="backToStart()">モード選択へ</button>
      </div>
    `;

    meowClear.play();
    confetti();
  }

  /* =====================
     BAD END
  ===================== */
  function showBadEnd() {
    board.innerHTML = `
      <div class="result bad">
        <h1>BAD END…</h1>
        <button onclick="backToStart()">モード選択へ</button>
      </div>
    `;
  }

  /* =====================
     紙吹雪
  ===================== */
  function confetti() {
    for (let i = 0; i < 80; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.animationDelay = Math.random() * 2 + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }
  }

  /* =====================
     グローバル
  ===================== */
  window.restart = startCountdown;
  window.backToStart = () => {
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  };

});









































