// ===== DOM =====
const startScreen = document.getElementById("startScreen");
const board = document.getElementById("board");
const resultScreen = document.getElementById("resultScreen");
const resultText = document.getElementById("resultText");
const timeText = document.getElementById("timeText");
const retryBtn = document.getElementById("retryBtn");
const backBtn = document.getElementById("backBtn");
const missArea = document.getElementById("missArea");

// ===== SOUND =====
const beep = new Audio("beep.wav");
const meow = new Audio("meow.wav");
const meowLong = new Audio("meow_long.wav");
const meowMiss = new Audio("meow_miss.wav");
const meowStart = new Audio("meowStart.wav");

// ===== STATE =====
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedCount = 0;
let missCount = 0;
let maxMiss = 0;
let totalCards = 0;
let startTime = 0;
let currentMode = "";

// ===== MODE BUTTON =====
document.querySelectorAll(".modeBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentMode = btn.dataset.mode;

    if (currentMode === "easy") {
      totalCards = 6;
      maxMiss = Infinity;
    }
    if (currentMode === "normal") {
      totalCards = 12;
      maxMiss = Infinity;
    }
    if (currentMode === "hard") {
      totalCards = 12;
      maxMiss = 5;
    }

    startScreen.classList.add("hidden");
    startCountdown();
  });
});

// ===== COUNTDOWN =====
function startCountdown() {
  board.innerHTML = "";
  missArea.innerHTML = "";
  resultScreen.classList.add("hidden");

  let count = 3;
  lockBoard = true;

  board.innerHTML = `<div class="countdown">${count}</div>`;
  beep.currentTime = 0;
  beep.play();

  const timer = setInterval(() => {
    count--;

    if (count === 0) {
      clearInterval(timer);
      board.innerHTML = "";
      meowStart.currentTime = 0;
      meowStart.play();
      startGame();
      lockBoard = false;
    } else {
      document.querySelector(".countdown").textContent = count;
      beep.currentTime = 0;
      beep.play();
    }
  }, 1000);
}

// ===== GAME START =====
function startGame() {
  matchedCount = 0;
  missCount = 0;
  firstCard = null;
  secondCard = null;
  board.innerHTML = "";
  missArea.innerHTML = "";

  startTime = Date.now();

  let nums = [];
  for (let i = 1; i <= totalCards / 2; i++) {
    nums.push(i, i);
  }
  nums.sort(() => Math.random() - 0.5);

  nums.forEach(num => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.name = num;

    const img = document.createElement("img");
    img.src = "img/back.jpg";

    card.appendChild(img);
    board.appendChild(card);

    card.addEventListener("click", () => flipCard(card, img));
  });
}

// ===== FLIP =====
function flipCard(card, img) {
  if (lockBoard) return;
  if (card === firstCard) return;

  img.src = `img/${card.dataset.name.toString().padStart(3, "0")}.jpg`;

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  checkMatch();
}

// ===== CHECK =====
function checkMatch() {
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
    missCount++;

    meowMiss.currentTime = 0;
    meowMiss.play();

    if (currentMode === "hard") {
      const paw = document.createElement("span");
      paw.textContent = "🐾";
      missArea.appendChild(paw);
    }

    setTimeout(() => {
      firstCard.querySelector("img").src = "img/back.jpg";
      secondCard.querySelector("img").src = "img/back.jpg";
      resetTurn();

      if (missCount >= maxMiss) {
        showBadEnd();
      }
    }, 800);
  }
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

// ===== CLEAR =====
function showClear() {
  const time = ((Date.now() - startTime) / 1000).toFixed(1);
  resultText.textContent = "PERFECT!";
  timeText.textContent = `TIME : ${time}s`;

  meowLong.currentTime = 0;
  meowLong.play();

  resultScreen.classList.remove("hidden");
}

// ===== BAD END =====
function showBadEnd() {
  resultText.textContent = "BAD END…";
  timeText.textContent = "";

  resultScreen.classList.remove("hidden");
  lockBoard = true;
}

// ===== BUTTONS =====
retryBtn.addEventListener("click", () => {
  resultScreen.classList.add("hidden");
  startCountdown();
});

backBtn.addEventListener("click", () => {
  resultScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
});




















