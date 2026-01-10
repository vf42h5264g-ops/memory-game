document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const startScreen = document.getElementById("startScreen");
  const board = document.getElementById("board");

  let firstCard = null;
  let secondCard = null;
  let lock = false;

  startBtn.addEventListener("click", () => {
    // スタート画面を完全に消す（Safari対策）
    startScreen.remove();
    document.getElementById("gameScreen").classList.remove("hidden");
    startGame();
  });

  function startGame() {
    board.innerHTML = "";

    const images = ["001", "002", "003", "004", "005"];
    const cards = [...images, ...images].sort(() => Math.random() - 0.5);

    cards.forEach((name) => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.name = name;

      const img = document.createElement("img");
      img.src = "img/back.jpg";

      card.appendChild(img);
      board.appendChild(card);

      card.addEventListener("click", () => {
        if (lock) return;
        if (card === firstCard) return;

        img.src = `img/${name}.jpg`;

        if (!firstCard) {
          firstCard = card;
          return;
        }

        secondCard = card;
        lock = true;

        checkMatch();
      });
    });
  }

  function checkMatch() {
    const img1 = firstCard.querySelector("img");
    const img2 = secondCard.querySelector("img");

    if (firstCard.dataset.name === secondCard.dataset.name) {
      // ペア成立
      resetTurn();
    } else {
      // 外れ → 少し見せて戻す
      setTimeout(() => {
        img1.src = "img/back.jpg";
        img2.src = "img/back.jpg";
        resetTurn();
      }, 800);
    }
  }

  function resetTurn() {
    firstCard = null;
    secondCard = null;
    lock = false;
  }
});












