export const TRADING_TIPS_BUCKET = "trading-tips";
export const TIP_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const TIP_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const TIP_MEDIA_TYPES = [...TIP_IMAGE_TYPES, ...TIP_VIDEO_TYPES] as const;
export const TIP_MEDIA_ACCEPT = TIP_MEDIA_TYPES.join(",");
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const MAX_TIP_MEDIA = 10;
export const TIP_REACTIONS = ["👍", "❤️", "🔥", "👏", "💯", "🤯"] as const;
export type TipReaction = (typeof TIP_REACTIONS)[number];

export type TradingTipMedia = {
  id: string;
  media_type: "image" | "video";
  media_path: string;
  mime_type: string;
  sort_order: number;
};

export type TradingTip = {
  id: string;
  title: string | null;
  caption: string;
  media_type: "image" | "video" | null;
  media_path: string | null;
  mime_type: string | null;
  created_at: string;
  expires_at: string | null;
  trading_tip_media?: TradingTipMedia[];
};

const EXTENSIONS_BY_MIME: Readonly<Record<string, readonly string[]>> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
};

export function tipFileExtension(file: Pick<File, "name" | "type">) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSIONS_BY_MIME[file.type]?.includes(extension) ? extension : null;
}

export function validateTipFile(file: File): string | null {
  if (!(TIP_MEDIA_TYPES as readonly string[]).includes(file.type))
    return "Use a JPEG, PNG, WebP, MP4, WebM, or MOV file.";
  if (!tipFileExtension(file)) return "The file extension does not match its media type.";
  const maximum = file.type.startsWith("image/") ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
  if (file.size > maximum)
    return `${file.type.startsWith("image/") ? "Images" : "Videos"} must be ${maximum / 1024 / 1024} MB or smaller.`;
  return null;
}

export function isOwnedTipMediaPath(tipId: string, path: string) {
  const escapedTipId = tipId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^tips/${escapedTipId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|jpeg|png|webp|mp4|webm|mov)$`,
    "i",
  ).test(path);
}

export function exactTipMediaPaths(tipId: string, paths: string[]) {
  return [...new Set(paths.filter((path) => isOwnedTipMediaPath(tipId, path)))];
}

export function mediaTypeFor(mimeType: string): "image" | "video" {
  return mimeType.startsWith("video/") ? "video" : "image";
}
export function remainingTipTime(expiresAt: string | null) {
  if (!expiresAt) return "Permanent";
  const minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000));
  if (minutes >= 24 * 60)
    return `Expires in ${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  if (minutes >= 60) return `Expires in ${Math.floor(minutes / 60)}h`;
  return `Expires in ${minutes}m`;
}

export function expiryAt(option: "24h" | "72h" | "7d" | "forever" | "custom", custom?: string) {
  if (option === "forever") return null;
  if (option === "custom") return custom ? new Date(custom).toISOString() : null;
  const hours = option === "24h" ? 24 : option === "72h" ? 72 : 168;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
