const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
let points = [];
let paths = [];
let color = "#ffffff";
let size = 3;

// UI controls
document.getElementById("color").oninput = e => color = e.target.value;
document.getElementById("size").oninput = e => size = e.target.value;

// Start camera
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

// Match canvas to video size
video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
});

// MediaPipe Hands
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

// 🔥 CORE LOGIC — ALWAYS DRAW INDEX FINGER
hands.onResults(res => {
  if (!res.multiHandLandmarks) {
    if (drawing && points.length > 1) {
      paths.push({ points: [...points], color, size });
    }
    drawing = false;
    points = [];
    return;
  }

  const indexTip = res.multiHandLandmarks[0][8];

  const x = indexTip.x * canvas.width;
  const y = indexTip.y * canvas.height;

  drawing = true;
  points.push({ x, y });

  // draw only new stroke, do NOT clear canvas
  drawSmooth(points, color, size);
});


// Smooth stroke
function drawSmooth(pts, stroke, w) {
  if (pts.length < 2) return;

  ctx.strokeStyle = stroke;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  ctx.stroke();
}

// Camera feed loop
const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  }
});
camera.start();

// Clear
document.getElementById("clear").onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  points = [];
  paths = [];
};

// PNG export
document.getElementById("png").onclick = () => {
  const a = document.createElement("a");
  a.download = "signature.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
};

// SVG export
document.getElementById("svg").onclick = () => {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">`;
  paths.forEach(p => {
    let d = `M ${p.points[0].x} ${p.points[0].y}`;
    for (let i = 1; i < p.points.length; i++) {
      d += ` L ${p.points[i].x} ${p.points[i].y}`;
    }
    svg += `<path d="${d}" stroke="${p.color}" stroke-width="${p.size}" fill="none" stroke-linecap="round"/>`;
  });
  svg += `</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "signature.svg";
  a.click();
};

