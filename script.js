const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start");
const clearBtn = document.getElementById("clear");

let model;

// drawing state
let isDrawing = false;
let lastX = null;
let lastY = null;
let smoothX = null;
let smoothY = null;
let lockedFinger = null;

// ======== CONFIG (TUNED FOR SIGNATURES) ========
const PINCH_START = 26;   // must be this tight to start drawing
const PINCH_END = 40;     // must open this much to stop
const SMOOTHING = 0.8;    // higher = smoother (0.75–0.85)
const MIN_MOVE = 2;       // ignore micro jitter (px)
const LINE_WIDTH = 4;

// ================= CAMERA =================
startBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });
    video.srcObject = stream;
    startBtn.style.display = "none";

    model = await handpose.load();
    requestAnimationFrame(loop);
  } catch (e) {
    alert("Camera permission denied");
  }
};

// ================= CANVAS SIZE =================
video.onloadedmetadata = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

// ================= UTILS =================
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (p, c, f) => p * f + c * (1 - f);

// choose finger closest to thumb (index vs middle)
function pickDrawingFinger(lm, thumb) {
  const index = lm[8];
  const middle = lm[12];

  const dIndex = dist(index, thumb);
  const dMiddle = dist(middle, thumb);

  return dIndex < dMiddle ? index : middle;
}

// ================= MAIN LOOP =================
async function loop() {
  if (model && video.readyState === 4) {
    const preds = await model.estimateHands(video);

    if (preds.length) {
      const lm = preds[0].landmarks;
      const thumb = lm[4];

      // 🔒 lock finger for whole stroke
      if (!lockedFinger) {
        lockedFinger = pickDrawingFinger(lm, thumb);
      }

      const pinchDist = dist(lockedFinger, thumb);

      const rawX = canvas.width - lockedFinger[0]; // mirror
      const rawY = lockedFinger[1];

      // smooth coordinates
      if (smoothX === null) {
        smoothX = rawX;
        smoothY = rawY;
      } else {
        smoothX = lerp(smoothX, rawX, SMOOTHING);
        smoothY = lerp(smoothY, rawY, SMOOTHING);
      }

      // ✋ HYSTERESIS
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

      // ✍️ DRAW
      if (isDrawing && lastX !== null) {
        const moveDist = Math.hypot(smoothX - lastX, smoothY - lastY);
        if (moveDist > MIN_MOVE) {
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
  }

  requestAnimationFrame(loop);
}

// ================= CLEAR =================
clearBtn.onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  isDrawing = false;
  lastX = lastY = smoothX = smoothY = null;
  lockedFinger = null;
};
