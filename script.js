document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const board = document.getElementById("board");

  const meow = new Audio("meow.wav");
  const meowLong = new Audio("meow_long.wav");
  const beep = document.getElementById("beep");
  const meowStart = document.getElementById("meowStart");
  const soundMiss = new Audio("meow_miss.wav");

  let startTime = 0;
  let firstCard = null;
  let secondCard = null;
  let lock = false;
  let matchedCount = 0;
  let mode = "normal";
　let maxMiss = Infinity;
　let missCount = 0;


  document.querySelectorAll(".modeSelect button").forEach(btn => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.mode;

    if (mode === "easy") {
      maxMiss = Infinity;
    } else if (mode === "normal") {
      maxMiss = Infinity;
    } else if (mode === "hard") {
      maxMiss = 5;
    }

    missCount = 0;
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    startCountdown();
  });
});


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

      // 最後の「にゃ！」
      meowStart.currentTime = 0;
      meowStart.play();

      board.innerHTML = "";   // カウント表示を消す
      lockBoard = false;      // ★これが無いとカード死亡
      startGame();            // カード生成
    } else {
      document.querySelector(".countdown").textContent = count;

      beep.currentTime = 0;
      beep.play();
    }
  }, 1000);
}


function startGame() {
  board.innerHTML = "";
  matchedCount = 0;
  missCount = 0;

  let images;

  if (mode === "easy") {
    images = ["001", "002", "003"];
  } else {
    images = ["001", "002", "003", "004", "005", "006"];
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

    card.addEventListener("click", () => {
      flipCard(card, img);
    });
  });
}


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
  ｝
    
　function checkForMatch() {
    if (firstCard.dataset.name === secondCard.dataset.name) {
      meow.play();

      firstCard.classList.add("matched");
      secondCard.classList.add("matched");

      matchedCount += 2;
      resetTurn();

      if (matchedCount === 12) {
        setTimeout(showClear, 500);
      }
    } else {

      lockBoard = true; 
      
      missSound.currentTime = 0;
      missSound.volume = 0.4;
      missSound.play();
      
      setTimeout(() => {
        firstCard.querySelector("img").src = "img/back.jpg";
        secondCard.querySelector("img").src = "img/back.jpg";

        firstCard.classList.add("shake");
        secondCard.classList.add("shake");

      setTimeout(() => {
      firstCard.classList.remove("shake");
      secondCard.classList.remove("shake");
    }, 300);

      missCount++;

if (mode === "hard" && missCount >= maxMiss) {
  setTimeout(showBadEnd, 500);
  return;
}


        resetTurn();
      }, 1000);
    }
  }

  function showBadEnd() {
  lockBoard = true;
  board.innerHTML = `
    <div class="result bad">
      <h1>BAD END</h1>
      <button onclick="restart()">もう一回</button>
    </div>
  `;
}
  function restart() {
  startCountdown();
}

  function resetTurn() {
    firstCard = null;
    secondCard = null;
    lockBoard = false;
  }

  function showClear() {
  meowLong.play();
  launchConfetti();

  const clearTime = ((Date.now() - startTime) / 1000).toFixed(1);

  board.innerHTML = `
    <div class="clearScreen">
      <h1>PERFECT!!</h1>
      <p>TIME : ${clearTime} sec</p>
      <button id="restartBtn">もう1回</button>
    </div>
  `;

  document
    .getElementById("restartBtn")
    .addEventListener("click", startCountdown);
}

  function launchConfetti() {
  for (let i = 0; i < 80; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";

    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.backgroundColor =
      ["#ff0", "#0ff", "#f0f", "#0f0", "#f00"][Math.floor(Math.random() * 5)];
    confetti.style.animationDuration = 2 + Math.random() * 2 + "s";

    document.body.appendChild(confetti);

    setTimeout(() => confetti.remove(), 4000);
  }
}

});
































