const IMAGE_EXTENSIONS = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
} as const;

export type AllowedImageMime = keyof typeof IMAGE_EXTENSIONS;

export function validateImageFile(file: File, options: { maxBytes: number; allowGif?: boolean }) {
  const allowedTypes = options.allowGif
    ? Object.keys(IMAGE_EXTENSIONS)
    : Object.keys(IMAGE_EXTENSIONS).filter((type) => type !== "image/gif");
  if (!allowedTypes.includes(file.type)) return "Unsupported image type.";
  if (file.size <= 0 || file.size > options.maxBytes) return "Image file size is not allowed.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const validExtensions = IMAGE_EXTENSIONS[file.type as AllowedImageMime];
  if (!extension || !validExtensions.includes(extension as never)) {
    return "The image extension does not match its declared type.";
  }
  return null;
}

export function extensionForImageMime(type: string) {
  const extensions = IMAGE_EXTENSIONS[type as AllowedImageMime];
  if (!extensions) throw new Error("Unsupported image type.");
  return extensions[0];
}
