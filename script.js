document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      alert("押された：" + btn.dataset.mode);
    });
  });
});


































