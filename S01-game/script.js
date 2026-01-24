// ==============================
// Quattro Vageena : Last Call
// Complete JS / iPhone安定版（WebAudio優先 + 失敗時HTMLAudioフォールバック）
//
// ✅ 音が鳴らない対策：WebAudioが失敗したらHTMLAudioで鳴らす
// ✅ カウントと音ズレ対策：基準時刻方式（performance.now補正）
// ✅ 0 は beep2.wav
// ✅ NT-D v03負け：ランダム台詞のみ（固定「GOテキーラ」撤去）
// ✅ PayPay投げ銭：paypay.jpg + URL + 感謝メッセージ
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  // iPhoneでも原因が分かるように（不要なら消してOK）
  window.onerror = function (msg, url, line, col) {
    alert("JSエラー:\n" + msg + "\n" + line + ":" + col);
  };

  // =====================
  // 定数
  // =====================
  const BACK_SRC = "img/vback.jpg";

  // =====================
  // PayPay 投げ銭設定
  // =====================
  const TIP = {
    url: "https://qr.paypay.ne.jp/p2p01_UmHN8gFjP5JmQwzo",
    img: "img/paypay.jpg", // ★あなたの指定：paypay.jpg
    title: "投げ銭（PayPay）",
    message: [
      "もしこのゲームを楽しんでいただけたら、",
      "ささやかなご支援で応援していただけると嬉しいです。",
      "いただいたご支援は、今後の改善や制作の励みになります。",
      "本当にありがとうございます。"
    ].join("<br>")
  };

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
    screens.start?.classList.toggle("neon", !!on);
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

  const MODE_LABEL = {
  easy: "EASY MODE",
  normal: "NORMAL MODE",
  hard: "HARD MODE",
  destroy: "NT-D MODE"
};

  // =====================
  // 状態
  // =====================
  let mode = "easy";
  let first = null;
  let lock = false;
  let miss = 0;
  let startTime = 0;
  let destroySafeOpened = 0;

  // 二重起動防止
  let countdownRunning = false;
  let countdownRAF = 0;
  let countdownFinishTimeout = 0;

  function cancelCountdown() {
    if (countdownRAF) cancelAnimationFrame(countdownRAF);
    countdownRAF = 0;
    if (countdownFinishTimeout) clearTimeout(countdownFinishTimeout);
    countdownFinishTimeout = 0;
    countdownRunning = false;
  }

  // =====================
  // モード設定（神経衰弱）
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

  // =====================
  // サウンド設定（保存）
  // =====================
  let soundEnabled = true;
  try {
    const saved = localStorage.getItem("soundEnabled");
    if (saved !== null) soundEnabled = saved === "1";
  } catch {}

  function renderSoundIcon() {
    if (!soundBtn) return;
    soundBtn.textContent = soundEnabled ? "🔊" : "🔇";
  }
  renderSoundIcon();

  // =====================
  // NT-D v03負け台詞（ランダム）
  // =====================
  const tequilaLines = [
    "いきまーーっす！",
    "飲めよ国民！",
    "坊やだからさ・・・",
    "ザクとは違うのだよ",
    "見せてもらおうか"
  ];

  function pickTequilaLine() {
    return tequilaLines[Math.floor(Math.random() * tequilaLines.length)];
  }

  // =====================
  // サウンド：WebAudio優先 + HTMLAudioフォールバック
  // =====================
  const SOUND_FILES = {
    beep: "sound/beep.wav",
    beep2: "sound/beep2.wav",
    go: "sound/go.wav",
  };

  // ---- HTMLAudio fallback
  const htmlAudio = {
    beep: new Audio(SOUND_FILES.beep),
    beep2: new Audio(SOUND_FILES.beep2),
    go: new Audio(SOUND_FILES.go),
  };
  Object.values(htmlAudio).forEach(a => {
    a.preload = "auto";
    a.volume = 1.0;
  });

  function playHtml(key) {
    if (!soundEnabled) return;
    const base = htmlAudio[key];
    if (!base) return;
    const a = base.cloneNode();
    a.volume = base.volume;
    try { a.currentTime = 0; } catch {}
    a.play().catch(() => {});
  }

  // ---- WebAudio
  let audioCtx = null;
  let audioReady = false;
  let audioUnlocked = false;
  let audioUnlocking = false;
  let useWebAudio = false;

  const buffers = { beep: null, beep2: null, go: null };

  async function fetchArrayBuffer(url) {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("Sound fetch failed: " + url);
    return await res.arrayBuffer();
  }

  async function ensureAudioUnlocked() {
    if (audioUnlocked) return true;
    if (audioUnlocking) return false;

    audioUnlocking = true;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      if (!audioReady) {
        for (const [key, url] of Object.entries(SOUND_FILES)) {
          const ab = await fetchArrayBuffer(url);
          buffers[key] = await new Promise((resolve, reject) => {
            audioCtx.decodeAudioData(
              ab.slice(0),
              (buf) => resolve(buf),
              (err) => reject(err)
            );
          });
        }
        audioReady = true;
      }

      // 無音で1回鳴らして解錠
      const g = audioCtx.createGain();
      g.gain.value = 0.0;
      g.connect(audioCtx.destination);

      const src = audioCtx.createBufferSource();
      src.buffer = buffers.beep;
      src.connect(g);
      src.start(audioCtx.currentTime);
      src.stop(audioCtx.currentTime + 0.01);

      audioUnlocked = true;
      useWebAudio = true;
      return true;
    } catch (e) {
      console.log("WebAudio disabled -> fallback to HTMLAudio", e);
      useWebAudio = false;
      audioUnlocked = true;
      return false;
    } finally {
      audioUnlocking = false;
    }
  }

  function playWeb(key, whenSec = null) {
    if (!soundEnabled) return;
    if (!useWebAudio || !audioCtx || !audioReady) return;
    const buf = buffers[key];
    if (!buf) return;

    const src = audioCtx.createBufferSource();
    src.buffer = buf;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1.0, audioCtx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);

    src.connect(gain);
    gain.connect(audioCtx.destination);

    const t = (whenSec == null) ? audioCtx.currentTime : whenSec;
    src.start(t);
    src.stop(t + Math.min(1.0, buf.duration + 0.05));
  }

  function playSfx(key, whenSec = null) {
    if (!soundEnabled) return;

    if (useWebAudio && whenSec != null) {
      playWeb(key, whenSec);
      return;
    }

    if (useWebAudio) playWeb(key);
    else playHtml(key);
  }

  // =====================
  // 表示（HARD/NT-D）
  // =====================
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
  // PayPay 投げ銭 UI（JSで自動生成）
  // =====================
  function ensureTipButton() {
    if (!screens.start) return;

    // すでにあれば作らない
    if (document.getElementById("tipBtn")) return;

    const tipBtn = document.createElement("div");
    tipBtn.id = "tipBtn";
    tipBtn.textContent = "🫶";
    tipBtn.setAttribute("role", "button");
    tipBtn.setAttribute("aria-label", "投げ銭（PayPay）");

    // 既存アイコンと同系統
    tipBtn.style.width = "52px";
    tipBtn.style.height = "52px";
    tipBtn.style.display = "grid";
    tipBtn.style.placeItems = "center";
    tipBtn.style.fontSize = "24px";
    tipBtn.style.borderRadius = "999px";
    tipBtn.style.background = "rgba(255,255,255,0.10)";
    tipBtn.style.border = "1px solid rgba(255,255,255,0.12)";
    tipBtn.style.cursor = "pointer";
    tipBtn.style.userSelect = "none";
    tipBtn.style.boxShadow = "0 10px 24px rgba(0,0,0,0.35)";
    tipBtn.style.position = "absolute";
    tipBtn.style.right = "76px"; // ★右下サウンドボタンの左隣（バランス用）
    tipBtn.style.bottom = "14px";
    tipBtn.style.touchAction = "manipulation";

    tipBtn.addEventListener("pointerdown", async (e) => {
      e.preventDefault();
      await ensureAudioUnlocked();
      showTipOverlay();
    }, { passive: false });

    screens.start.appendChild(tipBtn);
  }

  function showTipOverlay() {
    const old = document.getElementById("tipOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "tipOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "100000";
    overlay.style.background = "rgba(0,0,0,0.92)";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.gap = "14px";
    overlay.style.padding = "18px";
    overlay.style.textAlign = "center";

    const title = document.createElement("div");
    title.textContent = TIP.title;
    title.style.color = "#fff";
    title.style.fontSize = "18px";
    title.style.fontWeight = "900";
    title.style.letterSpacing = "0.04em";

    const msg = document.createElement("div");
    msg.innerHTML = TIP.message;
    msg.style.color = "rgba(255,255,255,0.92)";
    msg.style.fontSize = "14px";
    msg.style.lineHeight = "1.8";
    msg.style.maxWidth = "420px";

    const img = document.createElement("img");
    img.src = TIP.img;
    img.alt = "PayPay QR";
    img.style.width = "min(320px, 78vw)";
    img.style.borderRadius = "14px";
    img.style.border = "1px solid rgba(255,255,255,0.18)";
    img.style.boxShadow = "0 18px 38px rgba(0,0,0,0.55)";

    const openBtn = document.createElement("a");
    openBtn.href = TIP.url;
    openBtn.target = "_blank";
    openBtn.rel = "noopener";
    openBtn.textContent = "PayPayで開く";
    openBtn.style.display = "inline-block";
    openBtn.style.padding = "12px 18px";
    openBtn.style.borderRadius = "14px";
    openBtn.style.textDecoration = "none";
    openBtn.style.fontWeight = "800";
    openBtn.style.color = "#111";
    openBtn.style.background = "#fff";
    openBtn.style.cursor = "pointer";

    // 支援後導線（検知できないのでユーザー操作）
    const doneBtn = document.createElement("button");
    doneBtn.textContent = "支援が終わった方はこちら";
    doneBtn.style.padding = "10px 16px";
    doneBtn.style.fontSize = "14px";
    doneBtn.style.borderRadius = "12px";
    doneBtn.style.border = "1px solid rgba(255,255,255,0.18)";
    doneBtn.style.background = "rgba(255,255,255,0.10)";
    doneBtn.style.color = "#fff";
    doneBtn.style.cursor = "pointer";

    doneBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      overlay.remove();
      showThanksMessage();
    }, { passive: false });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "閉じる";
    closeBtn.style.padding = "10px 16px";
    closeBtn.style.fontSize = "14px";
    closeBtn.style.borderRadius = "12px";
    closeBtn.style.border = "none";
    closeBtn.style.cursor = "pointer";

    closeBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      overlay.remove();
    }, { passive: false });

    overlay.appendChild(title);
    overlay.appendChild(msg);
    overlay.appendChild(img);
    overlay.appendChild(openBtn);
    overlay.appendChild(doneBtn);
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
  }

  function showThanksMessage() {
    const old = document.getElementById("thanksOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "thanksOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "100000";
    overlay.style.background = "rgba(0,0,0,0.92)";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "24px";
    overlay.style.textAlign = "center";
    overlay.style.gap = "18px";

    const title = document.createElement("div");
    title.textContent = "ありがとうございます！";
    title.style.color = "#fff";
    title.style.fontSize = "18px";
    title.style.fontWeight = "900";
    title.style.letterSpacing = "0.04em";

    const text = document.createElement("div");
    text.innerHTML = `
      <div style="line-height:1.9; color:rgba(255,255,255,0.92); font-size:14px;">
        ご支援ありがとうございます。<br>
        楽しんでいただけたことが何よりの励みです。<br><br>
        これからも、気軽に遊んでいただけたら嬉しいです。
      </div>
    `;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "スタート画面に戻る";
    closeBtn.style.padding = "12px 18px";
    closeBtn.style.fontSize = "14px";
    closeBtn.style.borderRadius = "12px";
    closeBtn.style.border = "none";
    closeBtn.style.cursor = "pointer";

    closeBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      overlay.remove();
    }, { passive: false });

    overlay.appendChild(title);
    overlay.appendChild(text);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
  }

  // =====================
  // ボタンイベント
  // =====================
  document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      ensureAudioUnlocked();

      const selected = btn.dataset.mode;
      mode = selected || "easy";

      const destroyBtn = document.querySelector('.modeBtn[data-mode="destroy"]');
      destroyBtn?.classList.remove("charging");
      screens.start?.classList.remove("flicker");

      cancelCountdown();

      if (mode !== "destroy") {
        setStartNeon(false);
        startCountdown();
        return;
      }

      // NT-D演出
      setStartNeon(true);
      requestAnimationFrame(() => destroyBtn?.classList.add("charging"));

      setTimeout(() => screens.start?.classList.add("flicker"), 3000);
      setTimeout(() => {
        screens.start?.classList.remove("flicker");
        destroyBtn?.classList.remove("charging");
        startCountdown();
      }, 4000);
    }, { passive: false });
  });

  shotBtn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    ensureAudioUnlocked();
    playSfx("go");
  }, { passive: false });

  helpBtn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    ensureAudioUnlocked();
    setScreen("help");
  }, { passive: false });

  backFromHelpBtn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    ensureAudioUnlocked();
    setScreen("start");
  }, { passive: false });

  soundBtn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    ensureAudioUnlocked();
    soundEnabled = !soundEnabled;
    renderSoundIcon();
    try { localStorage.setItem("soundEnabled", soundEnabled ? "1" : "0"); } catch {}
  }, { passive: false });

  backBtn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    ensureAudioUnlocked();
    setStartNeon(false);
    setScreen("start");
  }, { passive: false });

  retryBtn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    ensureAudioUnlocked();
    cancelCountdown();
    startCountdown();
  }, { passive: false });

  // =====================
  // カウントダウン（基準時刻方式）
  // 3,2,1: beep / 0: beep2
  // =====================
  function startCountdown() {
    if (countdownRunning) return;
    cancelCountdown();
    countdownRunning = true;

    setScreen("game");
    board.innerHTML = "";
    missArea.innerHTML = "";
    applyBoardLayout();

    miss = 0;
    first = null;
    lock = false;
    destroySafeOpened = 0;
    renderStatus();

    countdownEl.classList.remove("hidden");

    const t0Perf = performance.now();
    const seq = [3, 2, 1, 0];

    let audioBase = null;
    if (useWebAudio && audioCtx && audioReady) {
      audioBase = audioCtx.currentTime + 0.06;
      playSfx("beep",  audioBase + 0.0);
      playSfx("beep",  audioBase + 1.0);
      playSfx("beep",  audioBase + 2.0);
      playSfx("beep2", audioBase + 3.0);
    }

    let lastShown = null;

    const tick = () => {
      if (!countdownRunning) return;

      const elapsed = (performance.now() - t0Perf) / 1000;
      const idx = Math.min(3, Math.floor(elapsed));
      const show = seq[idx];

      if (show !== lastShown) {
        countdownEl.textContent = String(show);
        lastShown = show;

        if (!(audioBase != null)) {
          if (show === 0) playSfx("beep2");
          else playSfx("beep");
        }
      }

      if (show === 0 && elapsed >= 3.05) {
        countdownFinishTimeout = setTimeout(() => {
          if (!countdownRunning) return;
          countdownEl.classList.add("hidden");
          countdownRunning = false;
          startGame();
        }, 180);
        return;
      }

      countdownRAF = requestAnimationFrame(tick);
    };

    countdownEl.textContent = "3";
    lastShown = 3;

    if (!(audioBase != null)) playSfx("beep");

    countdownRAF = requestAnimationFrame(tick);
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
      }, { passive: false });
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
          playSfx("go");
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
            resultText.textContent = "僕にはまだ帰れるところがあるんだ";
            timeText.textContent = `TIME : ${time}s`;
            setScreen("result");
          }, 250);
        }
      }, { passive: false });
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

      const modeEl = document.getElementById("resultMode");
   　 modeEl.textContent = MODE_LABEL[mode] || "";
   　 modeEl.classList.toggle("ntd", mode === "destroy");
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
  // v03演出（ランダム台詞のみ）
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
    overlay.style.gap = "16px";

    const img = document.createElement("img");
    img.src = "img/v03.jpg";
    img.alt = "v03";
    img.style.width = "100vw";
    img.style.height = "70vh";
    img.style.objectFit = "contain";

    const line = document.createElement("div");
    line.textContent = pickTequilaLine();
    line.style.color = "#ff3bd4";
    line.style.fontSize = "clamp(18px, 4.8vw, 40px)";
    line.style.fontWeight = "900";
    line.style.letterSpacing = "0.04em";
    line.style.textShadow = "0 0 14px rgba(255, 60, 212, 0.55)";

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
    retry.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      overlay.remove();
      cancelCountdown();
      startCountdown();
    }, { passive: false });

    const back = document.createElement("button");
    back.textContent = "モード選択";
    back.style.padding = "12px 18px";
    back.style.fontSize = "18px";
    back.style.borderRadius = "12px";
    back.style.border = "none";
    back.style.cursor = "pointer";
    back.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      overlay.remove();
      setStartNeon(false);
      setScreen("start");
    }, { passive: false });

    btnRow.appendChild(retry);
    btnRow.appendChild(back);

    overlay.appendChild(img);
    overlay.appendChild(line);
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
  ensureTipButton();      // ★投げ銭ボタン自動追加
  setStartNeon(false);
  setScreen("start");
});



