const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let lastX = null;
let lastY = null;

// ================= CAMERA =================
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera not available. Open on phone.");
    console.error(err);
  }
}
startCamera();

// Match canvas size to actual video feed
video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
});

// ================= MEDIAPIPE =================
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

// ================= DRAWING =================
hands.onResults(results => {
  if (!results.multiHandLandmarks) {
    lastX = null;
    lastY = null;
    return;
  }

  const indexTip = results.multiHandLandmarks[0][8];

  const x = indexTip.x * canvas.width;
  const y = indexTip.y * canvas.height;

  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  if (lastX !== null) {
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  lastX = x;
  lastY = y;
});

// ================= FRAME LOOP (CRITICAL FIX) =================
async function processFrame() {
  if (video.readyState >= 2) {
    await hands.send({ image: video });
  }
  requestAnimationFrame(processFrame);
}
processFrame();

// ================= CLEAR =================
document.getElementById("clear").onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lastX = null;
  lastY = null;
};

