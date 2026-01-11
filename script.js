'use strict';

/* =====================
  設定
===================== */
const MODES = {
  easy:   { pairs: 3, missLimit: null },
  normal: { pairs: 6, missLimit: null },
  hard:   { pairs: 6, missLimit: 5 }
};

const images = [
  'cat1.png','cat2.png','cat3.png',
  'cat4.png','cat5.png','cat6.png'
];

/* =====================
  DOM
===================== */
const startScreen = document.getElementById('startScreen');
const gameScreen  = document.getElementById('gameScreen');
const board       = document.getElementById('board');
const countdownEl = document.getElementById('countdown');
const missArea    = document.getElementById('missArea');
const resultScreen= document.getElementById('resultScreen');
const resultText  = document.getElementById('resultText');
const timeText    = document.getElementById('timeText');
const retryBtn    = document.getElementById('retryBtn');
const backBtn     = document.getElementById('backBtn');

/* =====================
  サウンド
===================== */
const seStart = new Audio('meowStart.mp3');
const seOk    = new Audio('meowOk.mp3');
const seNg    = new Audio('meowNg.mp3');
const seClear = new Audio('meowClear.mp3');

/* =====================
  状態
===================== */
let mode = null;
let cards = [];
let firstCard = null;
let lock = false;
let matched = 0;
let missCount = 0;
let startTime = 0;

/* =====================
  モード選択
===================== */
document.querySelectorAll('.modeBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    startGame();
  });
});

/* =====================
  ゲーム開始
===================== */
function startGame() {
  // ★ 重要：結果画面を必ず隠す
  resultScreen.classList.add("hidden");

  board.innerHTML = "";
  missArea.innerHTML = "";

  matched = 0;
  missCount = 0;
  firstCard = null;
  lock = true;

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  showCountdown(() => {
    setupCards();
    startTime = Date.now();
    lock = false;
  });
}


/* =====================
  カウントダウン
===================== */
function showCountdown(callback) {
  countdownEl.classList.remove("hidden");

  countdownEl.textContent = "3";
  seStart.currentTime = 0;
  seStart.play();

  setTimeout(() => {
    countdownEl.textContent = "2";
    seStart.currentTime = 0;
    seStart.play();
  }, 1000);

  setTimeout(() => {
    countdownEl.textContent = "1";
    seStart.currentTime = 0;
    seStart.play();
  }, 2000);

  setTimeout(() => {
    countdownEl.classList.add("hidden");
    callback(); // ← 必ず呼ばれる
  }, 3000);
}


/* =====================
  カード生成
===================== */
function setupCards() {
  const pairCount = MODES[mode].pairs;
  const useImages = images.slice(0, pairCount);
  cards = [...useImages, ...useImages]
    .sort(() => Math.random() - 0.5);

  cards.forEach(src => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.image = src;
    card.textContent = '？';

    card.addEventListener('click', () => onCardClick(card));
    board.appendChild(card);
  });
}

/* =====================
  カード処理
===================== */
function onCardClick(card) {
  if (lock || card.classList.contains('open')) return;

  openCard(card);

  if (!firstCard) {
    firstCard = card;
    return;
  }

  lock = true;

  if (firstCard.dataset.image === card.dataset.image) {
    seOk.play();
    matched += 2;
    firstCard = null;
    lock = false;

    if (matched === cards.length) {
      clearGame();
    }
  } else {
    seNg.play();
    missCount++;
    updateMiss();

    setTimeout(() => {
      closeCard(firstCard);
      closeCard(card);
      firstCard = null;
      lock = false;

      if (MODES[mode].missLimit &&
          missCount >= MODES[mode].missLimit) {
        gameOver();
      }
    }, 800);
  }
}

/* =====================
  表示制御
===================== */
function openCard(card) {
  card.classList.add('open');
  card.textContent = '';
  card.style.backgroundImage = `url(${card.dataset.image})`;
}

function closeCard(card) {
  card.classList.remove('open');
  card.textContent = '？';
  card.style.backgroundImage = '';
}

function updateMiss() {
  missArea.innerHTML = '';
  if (!MODES[mode].missLimit) return;

  for (let i = 0; i < missCount; i++) {
    const span = document.createElement('span');
    span.textContent = '🐾';
    missArea.appendChild(span);
  }
}

/* =====================
  クリア / ゲームオーバー
===================== */
function clearGame() {
  seClear.play();
  showResult('PERFECT!! 🎉');
}

function gameOver() {
  showResult('BAD END…');
}

function showResult(text) {
  lock = true;
  const time = ((Date.now() - startTime) / 1000).toFixed(1);

  resultText.textContent = text;
  timeText.textContent = `TIME : ${time}s`;
  resultScreen.classList.remove('hidden');
}

/* =====================
  ボタン
===================== */
retryBtn.addEventListener('click', startGame);

backBtn.addEventListener('click', () => {
  gameScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

