document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const board = document.getElementById("board"); // ★ 追加

  function startGame() {
    createCards();
  }

  startBtn.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    startGame();
  });

  function createCards() {
    board.innerHTML = ""; // ★ board を使う

    for (let i = 1; i <= 6; i++) {
      const card = document.createElement("img");
      card.src = "back.jpg";
      card.className = "card";
      board.appendChild(card); // ★ ここが重要
    }
  }
});




