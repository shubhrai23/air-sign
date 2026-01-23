const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start");
const clearBtn = document.getElementById("clear");

let model = null;

// drawing state
let isDrawing = false;
let lastX = null;
let lastY = null;
let smoothX = null;
let smoothY = null;
let lockedFinger = null;

// latest hand data (updated by ML loop)
let latestLandmarks = null;

// ===== CONFIG =====
const PINCH_START = 26;
const PINCH_END = 42;
const SMOOTHING = 0.8;
const MIN_MOVE = 2;
const LINE_WIDTH = 4;
const INFERENCE_INTERVAL = 100; // ms (~10 FPS)

// ---------- CAMERA ----------
startBtn.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" }
  });

  video.srcObject = stream;
  video.muted = true;       // REQUIRED for iOS
  video.playsInline = true;
  await video.play();       // 🔥 FORCE playback

  startBtn.style.display = "none";

  model = await handpose.load();
  startInferenceLoop();
  requestAnimationFrame(drawLoop);
};

// ---------- CANVAS SIZE ----------
video.onloadedmetadata = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

// ---------- UTILS ----------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (p, c, f) => p * f + c * (1 - f);

// choose index or middle finger (closest to thumb)
function pickFinger(lm, thumb) {
  const index = lm[8];
  const middle = lm[12];
  return dist(index, thumb) < dist(middle, thumb) ? index : middle;
}

// ---------- HANDPOSE LOOP (THROTTLED) ----------
function startInferenceLoop() {
  setInterval(async () => {
    if (!model || video.readyState !== 4) return;

    const preds = await model.estimateHands(video);
    latestLandmarks = preds.length ? preds[0].landmarks : null;
  }, INFERENCE_INTERVAL);
}

// ---------- DRAW LOOP (FAST & LIGHT) ----------
function drawLoop() {
  if (latestLandmarks) {
    const lm = latestLandmarks;
    const thumb = lm[4];

    if (!lockedFinger) {
      lockedFinger = pickFinger(lm, thumb);
    }

    const pinchDist = dist(lockedFinger, thumb);

    const rawX = canvas.width - lockedFinger[0];
    const rawY = lockedFinger[1];

    if (smoothX === null) {
      smoothX = rawX;
      smoothY = rawY;
    } else {
      smoothX = lerp(smoothX, rawX, SMOOTHING);
      smoothY = lerp(smoothY, rawY, SMOOTHING);
    }

    if (!isDrawing && pinchDist < PINCH_START) {
      isDrawing = true;
      lastX = smoothX;
      lastY = smoothY;
    }

    if (isDrawing && pinchDist > PINCH_END) {
      isDrawing = false;
      lastX = lastY = smoothX = smoothY = null;
      lockedFinger = null;
    }

    if (isDrawing && lastX !== null) {
      const move = Math.hypot(smoothX - lastX, smoothY - lastY);
      if (move > MIN_MOVE) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = LINE_WIDTH;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(smoothX, smoothY);
        ctx.stroke();

        lastX = smoothX;
        lastY = smoothY;
      }
    }
  }

  requestAnimationFrame(drawLoop);
}

// ---------- CLEAR ----------
clearBtn.onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  isDrawing = false;
  lastX = lastY = smoothX = smoothY = null;
  lockedFinger = null;
};
