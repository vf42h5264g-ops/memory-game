// =====================
// 定数・SE
// =====================
const BACK_SRC = "img/vback.jpg";

// ===== SE（Safari安定版）=====
const SFX = {
  beep: new Audio("sound/beep.wav"),
  go: new Audio("sound/go.wav"),
};

Object.values(SFX).forEach(a => {
  a.preload = "auto";
  a.volume = 1.0;
});

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // iOSの音解錠：超短く鳴らして止める（失敗してもOK）
  Object.values(SFX).forEach(a => {
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
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// =====================
// 要素
// =====================
const board = document.getElementById("board");
const countdownEl = document.getElementById("countdown");
const missArea = document.getElementById("missArea");
const resultText = document.getElementById("resultText");
const timeText = document.getElementById("timeText");

// =====================
// 状態
// =====================
let mode = "easy";
let first = null;
let lock = false;
let miss = 0;
let startTime = 0;

// ですとろい用
let destroySafeOpened = 0; // v03以外を何枚めくったか（最大11）

// =====================
// モード設定（通常神経衰弱用）
// =====================
const modeSetting = {
  easy: 3,
  normal: 6,
  hard: 6,
  destroy: 0 // destroyでは使わない（未定義回避）
};

// =====================
// 盤面レイアウト切替
// =====================
function applyBoardLayout() {
  board.classList.remove("layout-easy", "layout-12");

  if (mode === "easy") {
    board.classList.add("layout-easy"); // 6枚想定
  } else {
    board.classList.add("layout-12"); // 12枚想定（normal/hard/destroy）
  }
}

// =====================
// スタート
// =====================
document.querySelectorAll(".modeBtn").forEach(btn => {
  btn.addEventListener("pointerdown", () => {
    mode = btn.dataset.mode;
    startCountdown();
  });
});

// これらのボタンが万一無くても落ちないように（iPhone運用の保険）
document.getElementById("helpBtn")?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  setScreen("help");
});
document.getElementById("backFromHelp")?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  setScreen("start");
});

document.getElementById("backBtn")?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  setScreen("start");
});

document.getElementById("retryBtn")?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  startCountdown();
});

document.querySelectorAll(".modeBtn").forEach(btn => {
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    unlockAudio();
    mode = btn.dataset.mode;
    startCountdown();
  });
});


// =====================
// カウントダウン
// =====================
function startCountdown() {
  setScreen("game");
  board.innerHTML = "";
  missArea.innerHTML = "";

  applyBoardLayout();

  // 状態リセット
  miss = 0;
  first = null;
  lock = false;
  destroySafeOpened = 0;

  renderStatus();

  let count = 3;
  countdownEl.classList.remove("hidden");
  countdownEl.textContent = count;

  const timer = setInterval(() => {
    // 毎秒 beep
    playSfx("beep");


    count--;
    if (count === 0) {
      clearInterval(timer);
      countdownEl.classList.add("hidden");
      startGame();
    } else {
      countdownEl.textContent = count;
    }
  }, 1000);
}

// =====================
// ゲーム開始（分岐）
// =====================
function startGame() {
  if (mode === "destroy") {
    startDestroyGame();
  } else {
    startMemoryGame();
  }
}

// =====================
// 通常：神経衰弱
// =====================
function startMemoryGame() {
  const total = modeSetting[mode];
  const names = [];

  // 表面 v02～（例: easy=3 => v02,v03,v04）
  for (let i = 2; i < 2 + total; i++) {
    names.push("v" + i.toString().padStart(2, "0"));
  }

  const cards = [...names, ...names].sort(() => Math.random() - 0.5);
  startTime = Date.now();

  cards.forEach(name => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = BACK_SRC;
    img.dataset.open = "0";

    card.appendChild(img);
    board.appendChild(card);

    card.addEventListener("pointerdown", () => {
      if (lock || img.dataset.open === "1") return;

      img.src = `img/${name}.jpg`;
      img.dataset.open = "1";

      if (!first) {
        first = img;
      } else {
        lock = true;

        if (first.src === img.src) {
          first = null;
          lock = false;
          checkClearMemory();
        } else {
          setTimeout(() => {
            img.src = BACK_SRC;
            first.src = BACK_SRC;
            img.dataset.open = "0";
            first.dataset.open = "0";
            first = null;
            lock = false;

            miss++;
            renderStatus();
            checkBadEnd();
          }, 800);
        }
      }
    });
  });
}

// =====================
// ですとろい：v03を引いたら負け
//  - v03以外(v01,v02,v04,v05,v06,v07)からランダム11枚(重複あり)
//  - v03を1枚混ぜて合計12枚
//  - 1枚ずつめくり、v03で負け、11枚安全をめくり切れば勝ち
// =====================
function startDestroyGame() {
  const pool = ["v01", "v02", "v04", "v05", "v06", "v07"];

  const safe11 = Array.from({ length: 11 }, () => {
    return pool[Math.floor(Math.random() * pool.length)];
  });

  const cards = [...safe11, "v03"].sort(() => Math.random() - 0.5);

  startTime = Date.now();
  destroySafeOpened = 0;
  renderStatus();

  cards.forEach(name => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = BACK_SRC;
    img.dataset.open = "0";
    img.dataset.name = name;

    card.appendChild(img);
    board.appendChild(card);

    card.addEventListener("pointerdown", () => {
      if (lock || img.dataset.open === "1") return;

      img.src = `img/${name}.jpg`;
      img.dataset.open = "1";

      // v03 = 即負け（GO!テキーラ!! + go.wav + ボタン）
      if (name === "v03") {
        lock = true;
        setTimeout(() => {
          showTequilaLose();
        }, 150);
        return;
      }

      // 安全札
      destroySafeOpened++;
      renderStatus();

      // 11枚安全をめくり切ったら勝ち
      if (destroySafeOpened >= 11) {
        lock = true;
        setTimeout(() => {
          launchConfetti();
          const time = ((Date.now() - startTime) / 1000).toFixed(1);
          resultText.textContent = "SURVIVED!!";
          timeText.textContent = `TIME : ${time}s`;
          setScreen("result");
        }, 250);
      }
    });
  });
}

// =====================
// 判定：神経衰弱クリア
// =====================
function checkClearMemory() {
  const open = [...document.querySelectorAll(".card img")]
    .every(img => img.dataset.open === "1");

  if (open) {
    launchConfetti();
    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    resultText.textContent = "PERFECT!!";
    timeText.textContent = `TIME : ${time}s`;
    setScreen("result");
  }
}

// =====================
// 判定：HARD バッドエンド
// =====================
function checkBadEnd() {
  if (mode === "hard" && miss >= 5) {
    resultText.textContent = "BAD END…";
    timeText.textContent = "";
    setScreen("result");
  }
}

// =====================
// 表示：HARDは✖、destroyは進捗表示
// =====================
function renderStatus() {
  if (mode === "hard") {
    const max = 5;
    missArea.textContent =
      "MISS : " +
      "✖".repeat(miss) +
      "・".repeat(Math.max(0, max - miss));
    return;
  }

  if (mode === "destroy") {
    const remain = Math.max(0, 11 - destroySafeOpened);
    missArea.textContent = `SAFE : ${destroySafeOpened}/11   残り ${remain}`;
    return;
  }

  missArea.textContent = "";
}

// =====================
// v03を引いた時の「GO!テキーラ!!」演出 + 効果音 + ボタン
// =====================
function showTequilaLose() {
  // 効果音
  playSfx("go");


  // 既に出てたら消す（連打対策）
  const old = document.getElementById("tequilaOverlay");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "tequilaOverlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "99999";
  overlay.style.background = "rgba(0,0,0,0.92)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.gap = "18px";

  // v03を大きく表示
  const img = document.createElement("img");
  img.src = "img/v03.jpg";
  img.alt = "v03";
  img.style.width = "100vw";
  img.style.height = "70vh";
  img.style.objectFit = "contain";

  // テキスト
  const text = document.createElement("div");
  text.textContent = "GO！テキーラ！！";
  text.style.color = "#fff";
  text.style.fontSize = "clamp(28px, 6vw, 64px)";
  text.style.fontWeight = "800";
  text.style.letterSpacing = "0.04em";
  text.style.textShadow = "0 0 10px rgba(255,255,255,0.25)";

  // ボタンエリア（下部固定）
  const btnRow = document.createElement("div");
  btnRow.style.position = "absolute";
  btnRow.style.left = "0";
  btnRow.style.right = "0";
  btnRow.style.bottom = "18px";
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "center";
  btnRow.style.gap = "12px";
  btnRow.style.padding = "0 16px";

  const retry = document.createElement("button");
  retry.textContent = "もう一度";
  retry.style.padding = "12px 18px";
  retry.style.fontSize = "18px";
  retry.style.borderRadius = "12px";
  retry.style.border = "none";
  retry.style.cursor = "pointer";
  retry.addEventListener("pointerdown", () => {
    overlay.remove();
    startCountdown();
  });

  const back = document.createElement("button");
  back.textContent = "モード選択";
  back.style.padding = "12px 18px";
  back.style.fontSize = "18px";
  back.style.borderRadius = "12px";
  back.style.border = "none";
  back.style.cursor = "pointer";
  back.addEventListener("pointerdown", () => {
    overlay.remove();
    setScreen("start");
  });

  btnRow.appendChild(retry);
  btnRow.appendChild(back);

  overlay.appendChild(img);
  overlay.appendChild(text);
  overlay.appendChild(btnRow);

  document.body.appendChild(overlay);
}

// =====================
// 紙吹雪
// =====================
function launchConfetti(durationMs = 1200) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.zIndex = "9999";
  document.body.appendChild(container);

  const endAt = Date.now() + durationMs;

  function spawn() {
    const piece = document.createElement("div");
    piece.style.position = "absolute";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.top = "-10px";
    piece.style.width = 6 + Math.random() * 6 + "px";
    piece.style.height = 10 + Math.random() * 10 + "px";
    piece.style.background = `hsl(${Math.random() * 360},90%,60%)`;
    piece.style.opacity = "0.9";
    piece.style.borderRadius = "2px";

    const drift = (Math.random() * 2 - 1) * 120;
    const fall = 600 + Math.random() * 600;
    const rotate = (Math.random() * 2 - 1) * 720;
    const life = 900 + Math.random() * 700;
    const start = performance.now();

    container.appendChild(piece);

    function animate(t) {
      const p = Math.min(1, (t - start) / life);
      piece.style.transform =
        `translate(${drift * p}px, ${fall * p}px) rotate(${rotate * p}deg)`;
      piece.style.opacity = (1 - p).toString();
      if (p < 1) requestAnimationFrame(animate);
      else piece.remove();
    }
    requestAnimationFrame(animate);
  }

  const interval = setInterval(() => {
    for (let i = 0; i < 10; i++) spawn();
    if (Date.now() > endAt) {
      clearInterval(interval);
      setTimeout(() => container.remove(), 800);
    }
  }, 100);
}

// =====================
// 初期画面
// =====================
setScreen("start");



















