// Draws the same certificate the BLACKPIPS app issues: the owner's Photoshop template
// with only the learner name, date, completion and certificate number filled in.
// Layout numbers are copied from the app's CertificateLayoutSpec (1200 × 800 canvas).
import regularAlc from "@/assets/certificates/regular_alc.png";
import advancedAlc from "@/assets/certificates/advanced_alc.png";
import alcMasterclass from "@/assets/certificates/alc_masterclass.png";
import eightEntries from "@/assets/certificates/the_eight_entries.png";
import gothamBold from "@/assets/fonts/Gotham-Bold.otf?url";

export type CertificateImageData = {
  studentName: string;
  courseId?: string;
  courseName: string;
  certificateNumber: string;
  issuedAt: string;
  completionPercentage?: number;
};

const TEMPLATES = [
  {
    src: regularAlc,
    ids: ["3a763af4-45a9-457f-93cb-852fff0a36a5"],
    names: ["regular alc"],
  },
  {
    src: advancedAlc,
    ids: ["655a15fd-2bb7-46db-9aab-222f547eccfe"],
    names: ["advanced alc"],
  },
  {
    src: alcMasterclass,
    ids: ["ee256ca7-6fec-4fc2-83e7-6f1e00da5af0"],
    names: ["alc masterclass", "masterclass"],
  },
  {
    src: eightEntries,
    ids: ["abd2be17-957e-4f4f-ba31-9dc304a48819"],
    names: ["the eight entries", "eight entries"],
  },
];

const WIDTH = 1200;
const HEIGHT = 800;
const FONT = "GothamCertificate";
const RECIPIENT_SIZE = (12.41 * 300) / 72;
const VALUE_SIZE = (4.63 * 300) / 72;

export function resolveCertificateTemplate(courseId: string | undefined, courseName: string) {
  const id = courseId?.trim().toLowerCase();
  const name = courseName.trim().toLowerCase();
  return (
    TEMPLATES.find((t) => id && t.ids.includes(id)) ??
    TEMPLATES.find((t) => t.names.includes(name)) ??
    null
  );
}

export function formatCertificateDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

let fontReady: Promise<void> | null = null;
function loadFont() {
  fontReady ??= new FontFace(FONT, `url(${gothamBold})`, { weight: "700" }).load().then((face) => {
    document.fonts.add(face);
  });
  return fontReady;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Certificate template failed to load."));
    image.src = src;
  });
}

function drawCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  size: number,
  maxWidth?: number,
) {
  let resolved = size;
  ctx.font = `700 ${resolved}px ${FONT}`;
  const width = ctx.measureText(text).width;
  if (maxWidth && width > maxWidth) {
    resolved *= maxWidth / width;
    ctx.font = `700 ${resolved}px ${FONT}`;
  }
  ctx.fillText(text, centerX, baselineY);
}

export async function renderCertificateCanvas(data: CertificateImageData) {
  const template = resolveCertificateTemplate(data.courseId, data.courseName);
  if (!template) throw new Error("No certificate template for this course.");
  const [image] = await Promise.all([loadImage(template.src), loadFont()]);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  drawCentered(ctx, data.studentName, 600, 424, RECIPIENT_SIZE, 760);
  drawCentered(ctx, formatCertificateDate(data.issuedAt), 476, 633, VALUE_SIZE);
  drawCentered(ctx, `${Math.round(data.completionPercentage ?? 100)}%`, 705, 633, VALUE_SIZE);
  drawCentered(ctx, data.certificateNumber, 996, 676, VALUE_SIZE);
  return canvas;
}

export async function generateCertificatePng(data: CertificateImageData): Promise<Blob> {
  const canvas = await renderCertificateCanvas(data);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed."))),
      "image/png",
    ),
  );
}
