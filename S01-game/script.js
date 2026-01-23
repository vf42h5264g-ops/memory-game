// ==============================
// Quattro Vageena : Last Call
// Complete JS / iPhone超安定版（WebAudio + 基準時刻方式）
//
// ✅ 初回だけ「ピコピコ鳴り響く」対策：
//    - unlock（ユーザー操作）で AudioContext を作成
//    - その場で各SEを decodeAudioData してキャッシュ（以後ズレ激減）
//    - prime（無音連打）やHTMLAudioのpool連打を廃止
//
// ✅ カウントと音ズレ対策：
//    - “基準時刻方式” (AudioContext.currentTime + offset)
//    - 表示は performance.now() に同期して補正
//
// ✅ カウント0は beep2.wav
// ✅ NT-D(v03)で負け：ランダム台詞（指定5種）
// ✅ NT-D選択演出：3秒で文字ピンク化 → 1秒フリッカー → 開始
// ✅ サウンドON/OFF（右下）
// ✅ ショット（左下）で go.wav
// ✅ help（下中央）
//
// ※ これを script.js に「丸ごと」貼り替えてください
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

  // 必須要素チェック
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

  // NT-D用
  let destroySafeOpened = 0;

  // 二重起動防止
  let countdownRunning = false;

  // カウントダウン管理（キャンセル用）
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
  // easy: 3種類×2枚=6枚
  // normal/hard: 6種類×2枚=12枚
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
  // WebAudio（超安定）
  // =====================
  let audioCtx = null;
  let audioReady = false;     // decode完了
  let audioUnlocking = false; // 連打対策
  let audioUnlocked = false;  // context動作OK

  const SOUND_FILES = {
    beep: "sound/beep.wav",
    beep2: "sound/beep2.wav",
    go: "sound/go.wav",
  };

  const buffers = {
    beep: null,
    beep2: null,
    go: null,
  };

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

      // iOS: resumeが必要
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // デコード（初回だけ）
      if (!audioReady) {
        const entries = Object.entries(SOUND_FILES);
        for (const [key, url] of entries) {
          const ab = await fetchArrayBuffer(url);
          // Safariの古いdecodeAudioData互換
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

      // “無音”で1回鳴らして完全解錠（音量0のGainで）
      const g = audioCtx.createGain();
      g.gain.value = 0.0;
      g.connect(audioCtx.destination);

      const src = audioCtx.createBufferSource();
      src.buffer = buffers.beep || null;
      src.connect(g);
      src.start(audioCtx.currentTime);
      src.stop(audioCtx.currentTime + 0.01);

      audioUnlocked = true;
      return true;
    } catch (e) {
      // 失敗してもゲームは動かす（音だけ無し）
      console.log(e);
      audioUnlocked = false;
      return false;
    } finally {
      audioUnlocking = false;
    }
  }

  function playSfx(key, whenSec = null) {
    if (!soundEnabled) return;
    if (!audioUnlocked || !audioCtx || !audioReady) return;
    const buf = buffers[key];
    if (!buf) return;

    const src = audioCtx.createBufferSource();
    src.buffer = buf;

    // クリックノイズ対策：超短いフェード
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1.0, audioCtx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);

    src.connect(gain);
    gain.connect(audioCtx.destination);

    const t = (whenSec == null) ? audioCtx.currentTime : whenSec;
    src.start(t);
    // stopは保険
    src.stop(t + Math.min(1.0, buf.duration + 0.05));
  }

  // =====================
  // 表示：HARDは✖、NT-Dは進捗
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
  // ボタン類（イベント登録）
  // =====================

  // モードボタン
  document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.addEventListener("pointerdown", async (e) => {
      e.preventDefault();

      // ★ 初回の“鳴り響き”対策：
      //   ここで一度だけ unlock & decode を完了させる（以後安定）
      await ensureAudioUnlocked();

      const selected = btn.dataset.mode;
      mode = selected || "easy";

      // 連打対策：演出リセット
      const destroyBtn = document.querySelector('.modeBtn[data-mode="destroy"]');
      destroyBtn?.classList.remove("charging");
      screens.start?.classList.remove("flicker");

      // 進行中カウントダウン停止
      cancelCountdown();

      // NT-D以外
      if (mode !== "destroy") {
        setStartNeon(false);
        startCountdown();
        return;
      }

      // ===== NT-D演出 =====
      setStartNeon(true);

      // 3秒で文字ピンク化（CSS .charging）
      requestAnimationFrame(() => destroyBtn?.classList.add("charging"));

      // 3秒後に1秒フリッカー
      setTimeout(() => {
        screens.start?.classList.add("flicker");
      }, 3000);

      // 4秒後に開始
      setTimeout(() => {
        screens.start?.classList.remove("flicker");
        destroyBtn?.classList.remove("charging");
        startCountdown();
      }, 4000);
    }, { passive: false });
  });

  // 左下：ショット（go音）
  shotBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await ensureAudioUnlocked();
    // “いきなりgoが鳴る”誤解を避ける：ここは意図通りのgoのみ
    playSfx("go");
  }, { passive: false });

  // 下中央：ヘルプ
  helpBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await ensureAudioUnlocked();
    setScreen("help");
  }, { passive: false });

  backFromHelpBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await ensureAudioUnlocked();
    setScreen("start");
  }, { passive: false });

  // 右下：サウンドON/OFF
  soundBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await ensureAudioUnlocked();
    soundEnabled = !soundEnabled;
    renderSoundIcon();
    try { localStorage.setItem("soundEnabled", soundEnabled ? "1" : "0"); } catch {}
  }, { passive: false });

  // 結果画面：戻る
  backBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await ensureAudioUnlocked();
    setStartNeon(false);
    setScreen("start");
  }, { passive: false });

  // 結果画面：もう一回
  retryBtn?.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await ensureAudioUnlocked();
    cancelCountdown();
    startCountdown();
  }, { passive: false });

  // =====================
  // カウントダウン（基準時刻方式：表示＆SEのズレ補正）
  // - 3,2,1 は beep
  // - 0 は beep2
  // =====================
  function startCountdown() {
    if (countdownRunning) return;
    countdownRunning = true;

    // 念のためキャンセル
    cancelCountdown();
    countdownRunning = true;

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

    // ここが“基準”
    const t0Perf = performance.now();
    const t0Audio = (audioCtx && audioUnlocked && audioReady) ? audioCtx.currentTime : null;

    // 表示する値
    const seq = [3, 2, 1, 0];

    // 音のスケジュール（WebAudioが使える時だけ）
    // 余裕を持って +0.06s（Safariで直後startが不安定な時がある）
    const audioBase = (t0Audio != null) ? (t0Audio + 0.06) : null;

    if (audioBase != null) {
      // 3,2,1
      playSfx("beep", audioBase + 0.0);
      playSfx("beep", audioBase + 1.0);
      playSfx("beep", audioBase + 2.0);
      // 0
      playSfx("beep2", audioBase + 3.0);
    }

    // 表示側：performance.now基準で誤差補正（drift補正）
    let lastShown = null;

    const tick = () => {
      if (!countdownRunning) return;

      const elapsed = (performance.now() - t0Perf) / 1000; // sec
      // 0.0-0.999 => 3, 1.0-1.999 =>2, 2.0-2.999=>1, 3.0-3.999=>0
      const idx = Math.min(3, Math.floor(elapsed));
      const show = seq[idx];

      if (show !== lastShown) {
        countdownEl.textContent = String(show);
        lastShown = show;

        // WebAudioが使えない環境のフォールバック（ほぼ無い想定）
        // ただしここで“初回鳴り響き”が出やすいので、Audioが無い時は鳴らさない
      }

      if (show === 0 && elapsed >= 3.05) {
        // 0 を少し見せてから開始
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

    // 最初の表示は即
    countdownEl.textContent = "3";
    lastShown = 3;
    countdownRAF = requestAnimationFrame(tick);
  }

  // =====================
  // ゲーム開始（分岐）
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

    // v02～（例: easy=3 => v02,v03,v04）
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

          // ★めくった瞬間に鳴らす（即時）
          playSfx("go");

          // UIはちょい後
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
  // v03演出（ランダム台詞 + ボタン）
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
    overlay.style.gap = "14px";

    const img = document.createElement("img");
    img.src = "img/v03.jpg";
    img.alt = "v03";
    img.style.width = "100vw";
    img.style.height = "70vh";
    img.style.objectFit = "contain";

    // ランダム台詞
    const line = document.createElement("div");
    line.textContent = pickTequilaLine();
    line.style.color = "#ff3bd4";
    line.style.fontSize = "clamp(18px, 4.6vw, 38px)";
    line.style.fontWeight = "900";
    line.style.letterSpacing = "0.04em";
    line.style.textShadow = "0 0 14px rgba(255, 60, 212, 0.55)";

    // テキスト
    const text = document.createElement("div");
    text.textContent = "GO！テキーラ！！";
    text.style.color = "#fff";
    text.style.fontSize = "clamp(26px, 6vw, 60px)";
    text.style.fontWeight = "800";
    text.style.letterSpacing = "0.04em";
    text.style.textShadow = "0 0 10px rgba(255, 40, 40, 0.25), 0 0 22px rgba(255, 0, 120, 0.18)";

    // ボタン
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
  setStartNeon(false);
  setScreen("start");
});

