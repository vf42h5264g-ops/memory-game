let selectedMode = null;

document.querySelectorAll(".modeBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedMode = btn.dataset.mode;
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    startCountdown(); // ← ここが超重要
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
      lockBoard = false;      // カード操作を解放
      startGame();            // ← ★これが③の正体
    } else {
      document.querySelector(".countdown").textContent = count;
      beep.currentTime = 0;
      beep.play();
    }
  }, 1000);
}




































