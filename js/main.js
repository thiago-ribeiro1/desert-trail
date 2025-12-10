function checkDeviceBlock() {
  const isMobile = window.innerWidth < 900 || window.innerHeight < 600;

  const block = document.getElementById("mobile-block");
  const gameCanvas = document.getElementById("game");

  if (isMobile) {
    block.style.display = "flex";
    gameCanvas.style.display = "none";
  } else {
    block.style.display = "none";
    gameCanvas.style.display = "block";
  }
}

window.addEventListener("load", checkDeviceBlock);
window.addEventListener("resize", checkDeviceBlock);

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ===== controle do menu =====
let isGameStarted = false;
const menuScreen = document.getElementById("menu-screen");
const btnStart = document.getElementById("btn-start");

btnStart.addEventListener("click", () => {
  // toca o som do clique
  try {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  } catch (e) {}

  // para música do menu
  try {
    menuMusic.pause();
    menuMusic.currentTime = 0;
  } catch (e) {}

  isGameStarted = true;
  menuScreen.style.display = "none";
});

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", () => {
  resize();
  generateTerrain();
  resetGame();
});
resize();

// ========= IMAGENS =========
const bg = new Image();
bg.src = "assets/cenario.jpg";

const motoImg = new Image();
motoImg.src = "assets/moto_.png";

// ========= SOM DO MOTOR =========
const engine = new Audio("assets/motor_.mp3");
engine.loop = true;
engine.volume = 0;
let engineStarted = false;
let engineFadeTimeout = null; // timer pra desligar o motor depois de soltar a seta

// ========= MÚSICA DE FUNDO DO MENU =========
const menuMusic = new Audio("assets/menu-music.mp3");
menuMusic.loop = true;
menuMusic.volume = 0.5;

// ========= SOM DE GAME OVER =========
const gameOverSound = new Audio("assets/game-over.mp3");
gameOverSound.volume = 1.0;

// MUSICA MENU: desbloqueia áudio no primeiro clique do usuário no MENU
let menuAudioUnlocked = false;

document.addEventListener("click", () => {
  // se o jogo já começou, nunca toca música de menu
  if (isGameStarted) return;

  // se o menu já foi escondido por qualquer motivo, não toca
  if (menuScreen.style.display === "none") return;

  // só na primeira vez que clicar enquanto ainda está no menu
  if (!menuAudioUnlocked) {
    menuAudioUnlocked = true;
    try {
      menuMusic.currentTime = 0;
      menuMusic.play().catch(() => {});
    } catch (e) {}
  }
});

// ========= SOM DO CLIQUE NO MENU =========
const clickSound = new Audio("assets/click.mp3");
clickSound.volume = 0.6;

// ========= CONTROLES =========
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

let isDead = false;
let isWin = false;
let score = 0;

window.addEventListener("keydown", (e) => {
  if (keys[e.key] !== undefined) {
    e.preventDefault();

    if (!isGameStarted) return;

    keys[e.key] = true;

    // motor: só inicia uma vez, na primeira vez que pressionar ArrowUp
    if (e.key === "ArrowUp") {
      if (!engineStarted) {
        engineStarted = true;
        engine.currentTime = 0;
        engine.volume = 0; // começa silencioso
        engine.play().catch(() => {});
      }
    }
  }

  if (e.key === "r" || e.key === "R") {
    if (!isGameStarted) return;
    resetGame();
  }
});

window.addEventListener("keyup", (e) => {
  if (keys[e.key] !== undefined) {
    e.preventDefault();
    if (!isGameStarted) return;
    keys[e.key] = false;
  }
});

// ========= PISTA =========
const terrain = [];
const terrainLength = 6000;
const FINISH_LINE = terrainLength - 200;

function generateTerrain() {
  terrain.length = 0;

  const h = canvas.height;

  // altura média da pista (perto da parte de baixo)
  let base = h * 0.7;

  // amplitudes alvo em pixels (independente da tela)
  const TARGET_A1 = 120; // duna longa
  const TARGET_A2 = 60; // colina média
  const TARGET_A3 = 30; // ondinha pequena

  const totalTargetAmp = TARGET_A1 + TARGET_A2 + TARGET_A3;

  // quanto de “espaço vertical” podemos usar (40% da tela)
  const maxAllowedAmp = h * 0.4;

  // se a tela for baixa, reduz tudo proporcionalmente
  const ampScale = Math.min(1, maxAllowedAmp / totalTargetAmp);

  const A1 = TARGET_A1 * ampScale;
  const A2 = TARGET_A2 * ampScale;
  const A3 = TARGET_A3 * ampScale;

  // frequências diferentes para não repetir padrão
  const f1 = 0.004; // duna longa
  const f2 = 0.011; // média
  const f3 = 0.027; // rápida

  for (let x = 0; x < terrainLength; x++) {
    const offset = Math.sin(x * f1) * A1 + Math.sin(x * f2) * A2 + Math.sin(x * f3) * A3;

    const y = base + offset;

    terrain.push(y);
  }
}

generateTerrain();

// pega a altura do terreno na posição X (com clamp nas bordas)
function getGroundY(x) {
  const i = Math.floor(x);
  if (i < 0) return terrain[0];
  if (i >= terrain.length) return terrain[terrain.length - 1];
  return terrain[i];
}

// ========= MOTO / FÍSICA =========
let posX, posY, speedX, angle, riderTilt;
const ENGINE_POWER = 0.35;
const FRICTION = 0.02;
const MAX_SPEED_FWD = 6;
const MAX_SPEED_REV = -3;
const BIKE_OFFSET = 55; // distância da linha até o centro da moto

function resetGame() {
  isDead = false;
  isWin = false;
  score = 0;

  posX = 80;
  speedX = 0;
  riderTilt = 0;
  angle = 0;

  const g = getGroundY(posX);
  posY = g - BIKE_OFFSET;
}

resetGame();

function updatePhysics() {
  if (isDead || isWin) return;

  // ===== movimento =====
  if (keys.ArrowUp) speedX += ENGINE_POWER * 0.35;
  if (keys.ArrowDown) speedX -= ENGINE_POWER * 0.25;

  if (speedX > MAX_SPEED_FWD) speedX = MAX_SPEED_FWD;
  if (speedX < MAX_SPEED_REV) speedX = MAX_SPEED_REV;

  speedX *= 1 - FRICTION;
  posX += speedX;

  posX = Math.max(0, Math.min(posX, terrainLength - 1));

  // posição colada na pista
  const groundY = getGroundY(posX);
  posY = groundY - BIKE_OFFSET;

  // ===== 3 pontos pra calcular inclinação e curvatura =====
  const behindX = Math.max(posX - 12, 0);
  const aheadX = Math.min(posX + 12, terrainLength - 1);

  const p0 = getGroundY(behindX);
  const p1 = groundY;
  const p2 = getGroundY(aheadX);

  // inclinação média da pista
  const slopeAngle = Math.atan2(p2 - p0, 24);

  // ===== CURVATURA (desafio) =====
  // picos/vales geram balanço forte
  let curvature = (p2 - 2 * p1 + p0) * 0.21; // 0.08 -> 0.21 (bem mais forte)

  // escala a curvatura pela velocidade: devagar balança menos, rápido balança muito
  const speedFactor = 0.6 + (Math.abs(speedX) / MAX_SPEED_FWD) * 0.9;
  curvature *= speedFactor;

  // ===== controle do jogador =====
  if (keys.ArrowLeft) riderTilt -= 0.06;
  if (keys.ArrowRight) riderTilt += 0.06;

  // menos amortecimento -> mais "solta"
  riderTilt *= 0.98;

  const MAX_TILT = 1.0; // limite de quanto o jogador pode forçar
  if (riderTilt > MAX_TILT) riderTilt = MAX_TILT;
  if (riderTilt < -MAX_TILT) riderTilt = -MAX_TILT;

  // ===== ângulo alvo =====
  const targetAngle =
    slopeAngle * 0.5 + // pista
    curvature + // balanço bruto do terreno
    riderTilt; // jogador

  // resposta da moto (mais agressiva)
  angle += (targetAngle - angle) * 0.7; // 0.55 -> 0.7

  // ===== GAME OVER: virou mesmo =====
  const maxAngle = 1.2; // ~68°
  if (!isDead && (angle > maxAngle || angle < -maxAngle)) {
    isDead = true;
    engine.volume = 0;

    // toca som de game over
    try {
      gameOverSound.currentTime = 0;
      gameOverSound.play().catch(() => {});
    } catch (e) {}
  }

  // ===== vitória =====
  if (posX >= FINISH_LINE && !isDead) {
    isWin = true;
    engine.volume = 0;
  }

  // ===== pontuação =====
  score = Math.floor((posX / FINISH_LINE) * 100);
  if (score > 100) score = 100;

  // ===== som =====
  if (engineStarted && !isDead && !isWin && !engine.paused) {
    const sp = Math.abs(speedX); // velocidade absoluta
    const vFactor = Math.min(1, sp / MAX_SPEED_FWD);
    const accelerating = keys.ArrowUp;

    // volume alvo
    let targetVol;
    if (accelerating) {
      // acelerando: mais alto
      targetVol = 0.35 + vFactor * 0.45; // entre ~0.25 e 0.60
    } else {
      // se ainda está andando, um ronco baixo
      // se quase parado, quase nada mas nunca zero absoluto
      if (sp < 0.1) {
        targetVol = 0.03; // bem baixinho, mas não 0
      } else {
        targetVol = 0.08 + vFactor * 0.12; // entre 0.08 e 0.20
      }
    }

    // pitch alvo (mais agudo quando acelera)
    const targetPitch = accelerating
      ? 1.0 + vFactor * 0.35 // 1.0–1.35
      : 0.95 + vFactor * 0.1; // 0.95–1.05

    // suavização
    const SMOOTH = 0.03; // quanto menor, mais suave
    engine.volume += (targetVol - engine.volume) * SMOOTH;
    engine.playbackRate += (targetPitch - engine.playbackRate) * SMOOTH;
  }
}

// ========= CENÁRIO =========
function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!bg.complete || !bg.naturalWidth) {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#40a4ff");
    grad.addColorStop(1, "#ffd27a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const scale = Math.max(canvas.width / bg.width, canvas.height / bg.height);
  const renderWidth = bg.width * scale;
  const renderHeight = bg.height * scale;

  const dx = (canvas.width - renderWidth) / 2;
  const dy = (canvas.height - renderHeight) / 2;

  ctx.drawImage(bg, dx, dy, renderWidth, renderHeight);
}

// ========= PISTA =========
function drawTrackLine(cameraX) {
  ctx.save();

  ctx.beginPath();
  ctx.moveTo(0, canvas.height);

  for (let i = 0; i <= canvas.width; i++) {
    const worldX = Math.floor(cameraX + i);
    const y = getGroundY(worldX);
    ctx.lineTo(i, y);
  }

  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();

  // === GRADIENTE DE AREIA ===
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#FFE39A"); // topo da duna (clarinho)
  grad.addColorStop(1, "#f6ac45ff"); // base da duna (mais escuro)

  ctx.fillStyle = grad;
  ctx.fill();

  // linha branca por cima
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.stroke();

  ctx.restore();
}

// ========= BANDEIRA =========
function drawFinish(cameraX) {
  const screenX = FINISH_LINE - cameraX;
  if (screenX < -50 || screenX > canvas.width + 50) return;

  const y = getGroundY(FINISH_LINE);

  ctx.fillStyle = "#000";
  ctx.fillRect(screenX, y - 160, 8, 160);

  const size = 8;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 5; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? "#fff" : "#000";
      ctx.fillRect(screenX + 6 + i * size, y - 120 + j * size, size, size);
    }
  }
}

// ========= MOTO =========
function drawMoto(cameraX) {
  const screenX = canvas.width * 0.25;
  const screenY = posY;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(angle);

  const w = 230;
  const h = 140;

  // distância do pivô até a base da moto (onde ficam as rodas)
  const pivotToBottom = 65;

  // em vez de -h/2, usamos -pivotToBottom:
  ctx.drawImage(motoImg, -w / 2, -pivotToBottom, w, h);

  ctx.restore();
}

function getGameFontSizes() {
  // usa o menor lado da tela como referência
  const base = Math.min(canvas.width, canvas.height);

  // título (VOCÊ CAIU / VOCÊ VENCEU)
  const titleSize = Math.max(28, Math.min(80, base * 0.1));
  // texto de instrução (Pressione R...)
  const subtitleSize = Math.max(16, Math.min(40, base * 0.045));

  return { titleSize, subtitleSize };
}

function drawHUD() {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(15, 15, 260, 55);

  const hudSize = Math.max(14, Math.min(26, canvas.width * 0.018));

  ctx.fillStyle = "#fff";
  ctx.font = `bold ${hudSize}px 'RussoOne'`;
  ctx.textAlign = "left";
  ctx.fillText("Progresso: " + score + "%", 25, 40);
}

// ========= GAME OVER / WIN =========
function drawGameOver() {
  if (!isDead) return;

  const { titleSize, subtitleSize } = getGameFontSizes();

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";

  // título
  ctx.font = `bold ${titleSize}px 'RussoOne'`;
  ctx.fillStyle = "#e60000ff";
  ctx.fillText("VOCÊ CAIU", canvas.width / 2, canvas.height / 2 - titleSize * 0.2);

  // instrução
  ctx.font = `bold ${subtitleSize}px 'RussoOne'`;
  ctx.fillText(
    "Pressione R para tentar de novo",
    canvas.width / 2,
    canvas.height / 2 + subtitleSize * 1.2
  );
}

function drawWin() {
  if (!isWin) return;

  const { titleSize, subtitleSize } = getGameFontSizes();

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";

  // título
  ctx.font = `bold ${titleSize}px 'RussoOne'`;
  ctx.fillStyle = "#00ff80";
  ctx.fillText("🏁 Você venceu! 🏁", canvas.width / 2, canvas.height / 2 - titleSize * 0.2);

  // instrução
  ctx.font = `bold ${subtitleSize}px 'RussoOne'`;
  ctx.fillText(
    "Pressione R para jogar novamente",
    canvas.width / 2,
    canvas.height / 2 + subtitleSize * 1.2
  );
}

// ========= LOOP =========
function loop() {
  updatePhysics();

  const cameraX = posX - canvas.width * 0.25;

  drawBackground();
  drawTrackLine(cameraX);
  drawFinish(cameraX);
  drawMoto(cameraX);
  drawHUD();
  drawGameOver();
  drawWin();

  requestAnimationFrame(loop);
}

loop();
