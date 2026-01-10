document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const board = document.getElementById("board");

  const meow = new Audio("meow.wav");
  const meowLong = new Audio("meow_long.wav");

  let firstCard = null;
  let secondCard = null;
  let lock = false;
  let matchedCount = 0;

  startBtn.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    startGame();
  });

  function startGame() {
    board.innerHTML = "";
    matchedCount = 0;
    firstCard = null;
    secondCard = null;

    const images = ["001", "002", "003", "004", "005","006"];
    const cards = [...images, ...images].sort(() => Math.random() - 0.5);

    cards.forEach((name) => {
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

    if (firstCard.dataset.name === secondCard.dataset.name) {
      meow.play();
      matchedCount += 2;
      resetTurn();

      if (matchedCount === 12) {
        setTimeout(showClear, 500);
      }
    } else {
      setTimeout(() => {
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

  function showClear() {
  meowLong.play();

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
    .addEventListener("click", startGame);
}

});
















