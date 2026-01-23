const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start");
const clearBtn = document.getElementById("clear");

let model = null;

// drawing state
let drawing = false;
let lastX = null;
let lastY = null;

// store last detected finger
let fingerPos = null;

// ===== CONFIG =====
const PINCH_THRESHOLD = 35;
const LINE_WIDTH = 4;
const INFERENCE_INTERVAL = 120; // ms (iOS-safe)

// ---------- CAMERA ----------
startBtn.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  });

  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  startBtn.style.display = "none";

  model = await handpose.load({
    detectionConfidence: 0.8,
    iouThreshold: 0.3,
    scoreThreshold: 0.75
  });

  startInferenceLoop();
  requestAnimationFrame(drawLoop);
};

// ---------- CANVAS SIZE ----------
video.onloadedmetadata = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

// ---------- UTILS ----------
function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

// ---------- HANDPOSE LOOP ----------
function startInferenceLoop() {
  setInterval(async () => {
    if (!model || video.readyState !== 4) return;

    const predictions = await model.estimateHands(video, {
      flipHorizontal: true
    });

    if (predictions.length) {
      const lm = predictions[0].landmarks;
      const index = lm[8];
      const thumb = lm[4];

      const pinch = dist(index, thumb) < PINCH_THRESHOLD;

      if (pinch) {
        fingerPos = {
          x: index[0],
          y: index[1]
        };
      } else {
        fingerPos = null;
        lastX = lastY = null;
      }
    } else {
      fingerPos = null;
      lastX = lastY = null;
    }
  }, INFERENCE_INTERVAL);
}

// ---------- DRAW LOOP ----------
function drawLoop() {
  if (fingerPos) {
    const x = canvas.width - fingerPos.x;
    const y = fingerPos.y;

    ctx.strokeStyle = "black";
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = "round";

    if (lastX !== null) {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastX = x;
    lastY = y;
  }

  requestAnimationFrame(drawLoop);
}

// ---------- CLEAR ----------
clearBtn.onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lastX = lastY = null;
  fingerPos = null;
};
