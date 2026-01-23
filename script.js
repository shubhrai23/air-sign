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

// ======== CONFIG (tweakable) ========
const PINCH_THRESHOLD = 22;   // tighter pinch
const SMOOTHING = 0.85;       // higher = smoother (0.6–0.85)

// ================= CAMERA =================
startBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });
    video.srcObject = stream;
    startBtn.style.display = "none";
    await loadModel();
    requestAnimationFrame(loop);
  } catch {
    alert("Camera permission denied");
  }
};

// ================= MODEL =================
async function loadModel() {
  model = await handpose.load();
}

// ================= CANVAS SIZE =================
video.onloadedmetadata = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

// ================= UTILS =================
function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function smooth(prev, curr, factor) {
  return prev * factor + curr * (1 - factor);
}

// ================= MAIN LOOP =================
async function loop() {
  if (model && video.readyState === 4) {
    const predictions = await model.estimateHands(video);

    if (predictions.length > 0) {
      const lm = predictions[0].landmarks;
      const index = lm[8];
      const thumb = lm[4];

      const pinchDist = distance(index, thumb);

      const rawX = canvas.width - index[0]; // mirror
      const rawY = index[1];

      // 🔥 SMOOTH POSITION
      if (smoothX === null) {
        smoothX = rawX;
        smoothY = rawY;
      } else {
        smoothX = smooth(smoothX, rawX, SMOOTHING);
        smoothY = smooth(smoothY, rawY, SMOOTHING);
      }

      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (pinchDist < PINCH_THRESHOLD) {
        if (isDrawing && lastX !== null) {
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);

          // ✨ quadratic smoothing
          const midX = (lastX + smoothX) / 2;
          const midY = (lastY + smoothY) / 2;
          ctx.quadraticCurveTo(lastX, lastY, midX, midY);
          ctx.stroke();
        }

        lastX = smoothX;
        lastY = smoothY;
        isDrawing = true;
      } else {
        // lift pen
        lastX = null;
        lastY = null;
        smoothX = null;
        smoothY = null;
        isDrawing = false;
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


