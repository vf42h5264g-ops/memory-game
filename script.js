let selectedMode = null;

document.querySelectorAll(".modeBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedMode = btn.dataset.mode;
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    startCountdown(); // ← ここが超重要
  });
});




































