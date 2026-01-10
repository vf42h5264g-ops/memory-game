document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const board = document.getElementById("board");

  startBtn.addEventListener("click", () => {
    console.log("START 押された"); // デバッグ用

    startScreen.style.display = "none";   // ← classじゃなく直接消す
    gameScreen.style.display = "block";   // ← 確実に表示

    startGame();
  });

  function startGame() {
    board.innerHTML = "";

    const images = ["001", "002", "003", "004", "005"];
    const cards = [...images, ...images].sort(() => Math.random() - 0.5);

    cards.forEach((name) => {
      const card = document.createElement("div");
      card.className = "card";

      const img = document.createElement("img");
      img.src = "img/back.jpg";

      card.appendChild(img);
      board.appendChild(card);

      card.addEventListener("click", () => {
        img.src = `img/${name}.jpg`;
      });
    });
  }
});









