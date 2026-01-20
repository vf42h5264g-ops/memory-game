 => {
    try { a.currentTime = 0; } catch {}
    a.play().then(() => {
      a.pause();
      try { a.currentTime = 0; } catch {}
    }).catch(() => {});
  });
}

// 安定再生：クローンして鳴らす（連打・同時再生でも落ちにくい）
function playSfx(key) {
  const base = SFX[key];
  if (!base) return;

  // iOS対策：未解錠なら無理に鳴らさない（解錠はモード押下でやる）
  if (!audioUnlocked) return;

  const a = base.cloneNode();   // ★ここがミソ
  a.volume = base.volume;

  a.play().catch(() => {});
}


// =====================
// 画面管理
// =====================
const screens = {
  start: document.getElementById("startScreen"),
  help: document.getElementById("helpScreen"),
  game: document.getElementById("gameScreen"),
  result: document.getElementById("resultScreen")
};

function setScreen(name) {
setScreen("start");






































