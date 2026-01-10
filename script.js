const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");

function startGame() {
  console.log("startGame called"); // デバッグ用
  createCards();   // ← カード生成
}

startBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  startGame ();
});

function createCards() {
  gameScreen.innerHTML = "";

  for (let i = 1; i <= 6; i++) {
    const card = document.createElement("img");
    card.src = "back.jpg";
    card.className = "card";
    gameScreen.appendChild(card);
  }
}
