const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 300;
canvas.height = 300;

// draw test line
ctx.strokeStyle = "white";
ctx.lineWidth = 5;
ctx.beginPath();
ctx.moveTo(20, 20);
ctx.lineTo(280, 280);
ctx.stroke();

alert("If you see a white diagonal line, canvas works");
