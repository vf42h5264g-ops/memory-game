// =====================
// Quattro Vageena : Last Call (Complete JS / iPhone超安定版)
// - 起動直後の「ピコピコ」対策：primeは各SFX1個だけ + muted prime
// - カウントずれ対策：基準時刻方式（drift補正）
// - 0 は beep2.wav
// - NT-D v03負け台詞 ランダム
// =====================

document.addEventListener("DOMContentLoaded", () => {
  // iPhoneでも原因が分かるように（不要なら消してOK）
  window.onerror = function (msg, url, line, col) {
    alert("JSエラー:\n" + msg + "\n" + line + ":" + col);
  };

  // =====================
  // 定数
  // =====================
  const BACK_SRC = "img/vback.jpg";

  // v03負け台詞（ランダム）
  const TEQUILA_LINES = [
    "いきまーーっす！",
    "飲めよ国民！",
    "坊やだからさ・・・",
    "ザクとは違うのだよ",
    "見せてもらおうか"
  ];
  const pickTequilaLine = () =>
    TEQUILA_LINES[Math.floor(Math.random() * TEQUILA_LINES.length)];

  // =====================
  // SE（iPhone安定：Audio Pool方式）
  // =====================
  function makePool(src, size = 4, volume = 1.0) {
    const pool = Array.from({ length: size }, () => {
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = volume;
      try { a.load(); } catch {}
      return a;
    });
    let idx = 0;

    // ★primeは「1個だけ」＆ muted で確実に無音
    async function primeOneSilently() {
      const a = pool[0];
      const prevMuted = a.muted;
      const prevVol = a.volume;

      a.muted = true;      // ←音量0より確実
      a.volume = 1.0;      // mutedなら音出ないのでOK
      try { a.currentTime = 0; } catch {}

      try {
        const p = a.play();
        if (p && typeof p.then === "function") await p;
      } catch {}

      try { a.pause(); } catch {}
      try { a.currentTime = 0; } catch {}

      a.muted = prevMuted;
      a.volume = prevVol;
    }

    function playNow() {
      const a = pool[idx];
      idx = (idx + 1) % pool.length;

      // 同じインスタンスが再生中でも止めて先頭から
      try { a.pause(); } catch {}
      try { a.currentTime = 0; } catch {}

      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }

    function setVolume(v) {
      pool.forEach(a => (a.volume = v));
    }

    return { primeOneSilently, playNow, setVolume };
  }

  const SFX = {
    beep: makePool("sound/beep.wav", 5, 1.0),    // 3,2,1
    beep2: makePool("sound/beep2.wav", 3, 1.0),  // 0
    go: makePool("sound/go.wav", 3, 1.0),
  };

  let soundEnabled = true;
  let audioUnlocked = false;
  let unlockPromise = null;

  // ローカル保存（任意）
  try {
    const saved = localStorage.getItem("soundEnabled");
    if (saved !== null) soundEnabled = saved === "1";
  } catch {}

  // ★解錠（prime完了まで待つ）
  function unlockAudioAsync() {
    if (audioUnlocked) return Promise.resolve();
    if (unlockPromise) return unlockPromise;

    unlockPromise = (async () => {
      // 各SFXにつき「1回だけ」prime（これでピコピコをほぼ根絶）
      await SFX.beep.primeOneSilently();
      await SFX.beep2.primeOneSilently();
      await SFX.go.primeOneSilently();

      audioUnlocked = true;
    })().catch(() => {
      // 失敗しても継続
      audioUnlocked = true;
    });

    return unlockPromise;
  }

  function playSfx(key) {
    if (!soundEnabled) return;
    if (!audioUnlocked) return;
    const s = SFX[key];
    if (!s) return;
    s.playNow();
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
    Object.values(screens).forEach(s => s && s.classList.add("hidden"));
    screens[name]?.classList.remove("hidden");
  }

  function setStartNeon(on) {
    if (!screens.start) return;
    screens.start.classList.toggle("neon", !!on);
  }

  // =====================
  // 要素
  // =====================
  const board = document.getElementById("board");
  const countdownEl = document.getElementById("countdown");
  const missArea = document.getElementById("missArea");
  const resultText = document.getElementById("resultText");
  const timeText = document.getElementById("timeText");

  const shotBtn = document.getElementById("shotBtn");
  const helpBtn = document.getElementById("helpBtn");
  const soundBtn = document.getElementById("soundBtn");
  const backFromHelpBtn = document.getElementById("backFromHelp");
  const backBtn = document.getElementById("backBtn");
  const retryBtn = document.getElementById("retryBtn");

  if (!screens.start || !screens.game || !board || !countdownEl || !missArea || !resultText || !timeText) {
    alert("HTMLのIDが合ってない可能性があります。\nboard / countdown / missArea / resultText / timeText を確認してね。");
    return;
  }

  // =====================
  // 状態
  // =====================
  let mode = "easy";
  let first = null;
  let lock = false;
  let miss = 0;
  let startTime = 0;

  let destroySafeOpened = 0;

  // 二重起動防止＆タイマー管理
  let countdownRunning = false;
  let countdownTimerIds = [];
  function clearTimers() {
    countdownTimerIds.forEach(id => clearTimeout(id));
    countdownTimerIds = [];
  }

  // =====================
  // モード設定
  // =====================
  const modeSetting = {
    easy: 3,
    normal: 6,
    hard: 6,
    destroy: 0
  };

  function applyBoardLayout() {
    board.classList.remove("layout-easy", "layout-12");
    if (mode === "easy") board.classList.add("layout-easy");
    else board.classList.add("layout-12");
  }

  function renderSoundIcon() {
    if (!soundBtn) return;
    soundBtn.textContent = soundEnabled ? "🔊" : "🔇";
  }
  renderSoundIcon();

  function renderStatus() {
    if (mode === "hard") {
      const max = 5;
      missArea.textContent =
        "MISS : " + "✖".repeat(miss) + "・".repeat(Math.max(0, max - miss));
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
  // カウントダウン（基準時刻方式：drift補正）
  // - 3,2,1: beep
  // - 0: beep2
  // =====================
  function startCountdown() {
    if (countdownRunning) return;
    countdownRunning = true;

    clearTimers();

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

    countdownEl.classList.remove("hidden");

    const steps = [3, 2, 1, 0];
    const startAt = performance.now();  // ★基準
    let i = 0;

    const tick = () => {
      if (!countdownRunning) return;

      const num = steps[i];
      countdownEl.textContent = String(num);
      if (num === 0) playSfx("beep2");
      else playSfx("beep");

      i++;

      if (i >= steps.length) {
        // 0を少し見せてから開始
        const endId = setTimeout(() => {
          if (!countdownRunning) return;
          countdownEl.classList.add("hidden");
          countdownRunning = false;
          startGame();
        }, 300);
        countdownTimerIds.push(endId);
        return;
      }

      // ★次の「あるべき時刻」に合わせて遅れを補正
      const target = startAt + i * 1000;
      const delay = Math.max(0, target - performance.now());

      const id = setTimeout(tick, delay);
      countdownTimerIds.push(id);
    };

    // 即時スタート（最初の3をその場で）
    tick();
  }

  // =====================
  // ゲーム開始
  // =====================
  function startGame() {
    if (mode === "destroy") startDestroyGame();
    else startMemoryGame();
  }

  // =====================
  // 通常：神経衰弱
  // =====================
  function startMemoryGame() {
    const total = modeSetting[mode];
    const names = [];

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

      card.addEventListener("pointerdown", (e) => {
        e.preventDefault();
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
  // NT-D：v03を引いたら負け
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

      card.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (lock || img.dataset.open === "1") return;

        img.src = `img/${name}.jpg`;
        img.dataset.open = "1";

        if (name === "v03") {
          lock = true;
          playSfx("go"); // めくった瞬間
          setTimeout(() => showTequilaLose(false), 60);
          return;
        }

        destroySafeOpened++;
        renderStatus();

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
  // 判定
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

  function checkBadEnd() {
    if (mode === "hard" && miss >= 5) {
      resultText.textContent = "BAD END…";
      timeText.textContent = "";
      setScreen("result");
    }
  }

  // =====================
  // v03演出（ランダム台詞入り）
  // =====================
  function showTequilaLose(playSound = true) {
    if (playSound) playSfx("go");

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

    const img = document.createElement("img");
    img.src = "img/v03.jpg";
    img.alt = "v03";
    img.style.width = "100vw";
    img.style.height = "70vh";
    img.style.objectFit = "contain";

    const text = document.createElement("div");
    text.textContent = pickTequilaLine();
    text.style.color = "#fff";
    text.style.fontSize = "clamp(22px, 6vw, 58px)";
    text.style.fontWeight = "800";
    text.style.letterSpacing = "0.04em";
    text.style.textAlign = "center";
    text.style.padding = "0 14px";
    text.style.textShadow = "0 0 10px rgba(255, 40, 40, 0.25), 0 0 22px rgba(255, 0, 120, 0.18)";

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
    retry.addEventListener("pointerdown", async (e) => {
      e.preventDefault();
      await unlockAudioAsync();
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
    back.addEventListener("pointerdown", async (e) => {
      e.preventDefault();
      await unlockAudioAsync();
      overlay.remove();
      setStartNeon(false);
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
  // ボタン類
  // =====================
  document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.addEventListener("pointerdown", async (e) => {
      e.preventDefault();

      await unlockAudioAsync(); // ★prime完了まで待つ

      const selected = btn.dataset.mode;
      mode = selected || "easy";

      // 進行中のカウントダウン停止（連打・戻る対策）
      clearTimers();
      countdownRunning = false;

      // 演出リセット
      const destroyBtn = document.querySelector('.modeBtn[data-mode="destroy"]');
      destroyBtn?.classList.remove("charging");
      screens.start?.classList.remove("flicker");

      if (mode !== "destroy") {
        setStartNeon(false);
        startCountdown();
        return;
      }

      // ===== NT-D演出 =====
      setStartNeon(true);
      requestAnimationFrame(() => destroyBtn?.classList.add("charging"));

      // 3秒後チカチカ
      countdownTimerIds.push(setTimeout(() => {
        screens.start?.classList.add("flicker");
      }, 3000));

      // 4秒後開始
      countdownTimerIds.push(setTimeout(() => {
        screens.start?.classList.remove("flicker");
        destroyBtn?.classList.remove("charging");
        startCountdown();
      }, 4000));
    });
  });

  shotBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await unlockAudioAsync();
    playSfx("go");
  });

  helpBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await unlockAudioAsync();
    setScreen("help");
  });

  backFromHelpBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await unlockAudioAsync();
    setScreen("start");
  });

  soundBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await unlockAudioAsync();
    soundEnabled = !soundEnabled;
    renderSoundIcon();
    try { localStorage.setItem("soundEnabled", soundEnabled ? "1" : "0"); } catch {}
  });

  backBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await unlockAudioAsync();
    setStartNeon(false);
    setScreen("start");
  });

  retryBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await unlockAudioAsync();
    startCountdown();
  });

  // =====================
  // 初期画面
  // =====================
  setStartNeon(false);
  setScreen("start");
});
