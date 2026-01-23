const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start");
const clearBtn = document.getElementById("clear");

let model;
let lastX = null;
let lastY = null;
let smoothX = null;
let smoothY = null;
let isDrawing = false;

// ===== CONFIG =====
const PINCH_START = 26;     // must pinch THIS tight to start
const PINCH_END = 38;       // must open THIS much to stop
const SMOOTHING = 0.78;
const MIN_MOVE = 2;         // px, ignore micro jitter

// ================= CAMERA =================
startBtn.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" }
  });
  video.srcObject = stream;
  startBtn.style.display = "none";
  model = await handpose.load();
  requestAnimationFrame(loop);
};

// ================= CANVAS SIZE =================
video.onloadedmetadata = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

// ================= UTILS =================
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (p, c, f) => p * f + c * (1 - f);

// ================= MAIN LOOP =================
async function loop() {
  if (model && video.readyState === 4) {
    const preds = await model.estimateHands(video);

    if (preds.length) {
      const lm = preds[0].landmarks;
      const index = lm[8];
      const thumb = lm[4];

      const pinchDist = dist(index, thumb);

      const rawX = canvas.width - index[0];
      const rawY = index[1];

      if (smoothX === null) {
        smoothX = rawX;
        smoothY = rawY;
      } else {
        smoothX = lerp(smoothX, rawX, SMOOTHING);
        smoothY = lerp(smoothY, rawY, SMOOTHING);
      }

      // ✋ HYSTERESIS LOGIC
      if (!isDrawing && pinchDist < PINCH_START) {
        isDrawing = true;
        lastX = smoothX;
        lastY = smoothY;
      }

      if (isDrawing && pinchDist > PINCH_END) {
        isDrawing = false;
        lastX = lastY = smoothX = smoothY = null;
      }

      // ✍️ DRAW
      if (isDrawing && lastX !== null) {
        const moveDist = Math.hypot(smoothX - lastX, smoothY - lastY);
        if (moveDist > MIN_MOVE) {
          ctx.strokeStyle = "black";
          ctx.lineWidth = 4;
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
  lastX = lastY = smoothX = smoothY = null;
  isDrawing = false;
};
