document.addEventListener("DOMContentLoaded", () => {
  // ① 要素取得
  const startBtn = document.getElementById("startBtn");
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");

  // ② ゲーム開始関数
  function startGame() {
    console.log("startGame called");
    createCards();
  }

  // ③ STARTボタン
  startBtn.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    startGame();
  });

  // ④ カード生成
  function createCards() {
    gameScreen.innerHTML = "";

    for (let i = 1; i <= 6; i++) {
      const card = document.createElement("img");
      card.src = "back.jpg";
      card.className = "card";
      gameScreen.appendChild(card);
    }
  }
});


