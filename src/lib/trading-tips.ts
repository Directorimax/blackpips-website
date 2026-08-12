export const TRADING_TIPS_BUCKET = "trading-tips";
export const TIP_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const TIP_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const TIP_MEDIA_TYPES = [...TIP_IMAGE_TYPES, ...TIP_VIDEO_TYPES] as const;
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

export function validateTipFile(file: File): string | null {
  if (!(TIP_MEDIA_TYPES as readonly string[]).includes(file.type))
    return "Use a JPEG, PNG, WebP, MP4, or WebM file.";
  const maximum = file.type.startsWith("image/") ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
  if (file.size > maximum)
    return `${file.type.startsWith("image/") ? "Images" : "Videos"} must be ${maximum / 1024 / 1024} MB or smaller.`;
  return null;
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
