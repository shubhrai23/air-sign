const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// CAMERA
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(() => alert("Camera error"));

// SYNC CANVAS SIZE
video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
});

// MEDIAPIPE
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

let lastX = null;
let lastY = null;

hands.onResults(res => {
  console.log("HAND RESULTS FIRED");
  if (!res.multiHandLandmarks) {
    lastX = null;
    lastY = null;
    return;
  }

  const p = res.multiHandLandmarks[0][8];

  const x = p.x * canvas.width;
  const y = p.y * canvas.height;

  ctx.strokeStyle = "red";   // VERY visible
  ctx.lineWidth = 5;
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

// MANUAL FRAME LOOP (NO Camera helper)
async function loop() {
  if (video.readyState >= 2) {
    await hands.send({ image: video });
  }
  requestAnimationFrame(loop);
}
loop();

// CLEAR
document.getElementById("clear").onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lastX = null;
  lastY = null;
};

