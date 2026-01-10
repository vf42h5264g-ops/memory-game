const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const board = document.getElementById("board");

const images = ["001", "002", "003"];
let cards = [];

startBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  startGame();
});

function startGame() {
  board.innerHTML = "";

  cards = [...images, ...images].sort(() => Math.random() - 0.5);

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







