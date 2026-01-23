const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start");
const clearBtn = document.getElementById("clear");

let model;
let lastX = null;
let lastY = null;
let isDrawing = false;

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
  } catch (e) {
    alert("Camera permission denied");
  }
};

// ================= MODEL =================
async function loadModel() {
  model = await handpose.load();
  console.log("HandPose loaded");
}

// ================= CANVAS SIZE =================
video.onloadedmetadata = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

// ================= PINCH UTILS =================
function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
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

      // ✅ PINCH THRESHOLD (tuned for phones)
      const PINCH_THRESHOLD = 40;

      const x = canvas.width - index[0]; // mirror
      const y = index[1];

      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";

      if (pinchDist < PINCH_THRESHOLD) {
        // DRAW
        if (isDrawing && lastX !== null) {
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        lastX = x;
        lastY = y;
        isDrawing = true;
      } else {
        // STOP DRAWING
        lastX = null;
        lastY = null;
        isDrawing = false;
      }
    } else {
      lastX = null;
      lastY = null;
      isDrawing = false;
    }
  }

  requestAnimationFrame(loop);
}

// ================= CLEAR =================
clearBtn.onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lastX = null;
  lastY = null;
  isDrawing = false;
};
