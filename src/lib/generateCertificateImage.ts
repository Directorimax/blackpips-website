export type CertificateImageData = {
  studentName: string;
  courseName: string;
  certificateNumber: string;
  issuedAt: string;
};

const WIDTH = 2400;
const HEIGHT = 1697;
const BLACK = "#090909";
const CREAM = "#f7f1df";
const MUTED = "#d8cfbc";
const GOLD = "#c9a44c";
const GOLD_LIGHT = "#e3c675";

export async function generateCertificatePng(data: CertificateImageData): Promise<Blob> {
  if ("fonts" in document) await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create the certificate canvas.");

  drawCertificate(ctx, data);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Certificate image generation failed."));
          return;
        }
        resolve(result);
      },
      "image/png",
      1,
    );
  });
}

function drawCertificate(ctx: CanvasRenderingContext2D, data: CertificateImageData) {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(WIDTH / 2, 170, 30, WIDTH / 2, 170, 960);
  glow.addColorStop(0, "rgba(201, 164, 76, 0.24)");
  glow.addColorStop(1, "rgba(201, 164, 76, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, 760);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, WIDTH - 72, HEIGHT - 72);
  ctx.strokeStyle = "rgba(227, 198, 117, 0.62)";
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 70, WIDTH - 140, HEIGHT - 140);
  drawCornerDetails(ctx);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CREAM;
  ctx.font = "700 58px Georgia";
  ctx.fillText("BLACK", WIDTH / 2 - 12, 170);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillText("PIPS", WIDTH / 2 + 173, 170);

  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = "700 25px Arial";
  ctx.letterSpacing = "12px";
  ctx.fillText("CERTIFICATE OF COMPLETION", WIDTH / 2, 276);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = CREAM;
  ctx.font = "700 76px Georgia";
  ctx.fillText("This certifies that", WIDTH / 2, 390);

  const nameFontSize = chooseFontSize(data.studentName, 100, 62, 1500);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = `700 ${nameFontSize}px Georgia`;
  const nameLines = drawWrappedText(
    ctx,
    data.studentName,
    WIDTH / 2,
    530,
    1560,
    nameFontSize * 1.18,
    2,
  );

  const statementY = 530 + nameLines * nameFontSize * 1.18 + 54;
  ctx.fillStyle = MUTED;
  ctx.font = "400 34px Arial";
  drawWrappedText(
    ctx,
    "has successfully completed every published lesson in the BlackPips premium course",
    WIDTH / 2,
    statementY,
    1520,
    50,
    2,
  );

  const courseFontSize = chooseFontSize(data.courseName, 68, 42, 1680);
  ctx.fillStyle = CREAM;
  ctx.font = `700 ${courseFontSize}px Georgia`;
  drawWrappedText(
    ctx,
    data.courseName,
    WIDTH / 2,
    statementY + 132,
    1680,
    courseFontSize * 1.15,
    2,
  );

  const informationTop = 1060;
  ctx.strokeStyle = "rgba(201, 164, 76, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(430, informationTop);
  ctx.lineTo(WIDTH - 430, informationTop);
  ctx.moveTo(430, informationTop + 142);
  ctx.lineTo(WIDTH - 430, informationTop + 142);
  ctx.stroke();

  const issuedDate = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(data.issuedAt));
  drawMeta(ctx, "COMPLETION DATE", issuedDate, 650, informationTop + 55);
  drawMeta(ctx, "COMPLETION", "100%", WIDTH / 2, informationTop + 55);
  drawMeta(ctx, "CERTIFICATE NO.", data.certificateNumber, 1750, informationTop + 55);

  drawSignature(ctx, 430, 1425, "BlackPips Academy", "INSTRUCTOR SIGNATURE");
  drawSignature(ctx, WIDTH - 430, 1425, "BlackPips", "VERIFIED COMPLETION");
  ctx.beginPath();
  ctx.arc(WIDTH / 2, 1400, 43, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(201, 164, 76, 0.15)";
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = GOLD_LIGHT;
  ctx.font = "700 34px Arial";
  ctx.fillText("BP", WIDTH / 2, 1412);
}

function drawCornerDetails(ctx: CanvasRenderingContext2D) {
  const corners: Array<[number, number, number, number]> = [
    [106, 106, 1, 1],
    [WIDTH - 106, 106, -1, 1],
    [106, HEIGHT - 106, 1, -1],
    [WIDTH - 106, HEIGHT - 106, -1, -1],
  ];
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.lineWidth = 5;
  for (const [x, y, directionX, directionY] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + directionY * 90);
    ctx.lineTo(x, y);
    ctx.lineTo(x + directionX * 90, y);
    ctx.stroke();
  }
}

function drawMeta(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
) {
  ctx.fillStyle = MUTED;
  ctx.font = "700 17px Arial";
  ctx.fillText(label, x, y);
  ctx.fillStyle = CREAM;
  ctx.font = "700 27px Arial";
  ctx.fillText(value, x, y + 45);
}

function drawSignature(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  label: string,
  caption: string,
) {
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 180, y);
  ctx.lineTo(centerX + 180, y);
  ctx.stroke();
  ctx.fillStyle = CREAM;
  ctx.font = "700 25px Georgia";
  ctx.fillText(label, centerX, y + 42);
  ctx.fillStyle = MUTED;
  ctx.font = "700 15px Arial";
  ctx.fillText(caption, centerX, y + 75);
}

function chooseFontSize(text: string, preferred: number, minimum: number, maxWidth: number) {
  const averageCharacterWidth = preferred * 0.64;
  const estimatedWidth = text.length * averageCharacterWidth;
  return Math.max(
    minimum,
    Math.min(preferred, Math.floor((maxWidth / estimatedWidth) * preferred)),
  );
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines)
    visibleLines[maxLines - 1] = `${visibleLines[maxLines - 1].replace(/[,.\s]+$/, "")}…`;
  visibleLines.forEach((line, index) => ctx.fillText(line, centerX, startY + index * lineHeight));
  return visibleLines.length;
}
