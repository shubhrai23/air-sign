const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
let lastX = null;
let lastY = null;

// Start camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    alert("Camera not available");
    console.error(err);
  });

// Match canvas to video
video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
});

// MediaPipe Hands
const hands = new Hands({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(res => {
  console.log("hands.onResults fired");

  if (!res.multiHandLandmarks) return;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, 50, 50);
});

// Camera → MediaPipe loop
const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  }
});
camera.start();

// Clear button
document.getElementById("clear").onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lastX = null;
  lastY = null;
};

