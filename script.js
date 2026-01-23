const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start");
const clearBtn = document.getElementById("clear");

let model;
let lastX = null;
let lastY = null;
let drawing = false;

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
  console.log("HandPose model loaded");
}

// ================= CANVAS SIZE =================
video.onloadedmetadata = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

// ================= MAIN LOOP =================
async function loop() {
  if (model && video.readyState === 4) {
    const predictions = await model.estimateHands(video);

    if (predictions.length > 0) {
      const landmarks = predictions[0].landmarks;

      // Index fingertip = landmark 8
      const [xRaw, yRaw] = landmarks[8];

      const x = canvas.width - xRaw; // mirror fix
      const y = yRaw;

      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";

      if (lastX !== null) {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      lastX = x;
      lastY = y;
      drawing = true;
    } else {
      lastX = null;
      lastY = null;
      drawing = false;
    }
  }

  requestAnimationFrame(loop);
}

// ================= CLEAR =================
clearBtn.onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lastX = null;
  lastY = null;
};
