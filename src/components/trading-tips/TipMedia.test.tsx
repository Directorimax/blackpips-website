import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SecureTipVideo } from "./TipMedia";

describe("SecureTipVideo", () => {
  it("renders secure, inline, metadata-only native playback controls", () => {
    const html = renderToStaticMarkup(<SecureTipVideo src="blob:test-video" />);
    expect(html).toContain("<video");
    expect(html).toContain('controls=""');
    expect(html).toContain('controlsList="nodownload"');
    expect(html).toContain('disablePictureInPicture=""');
    expect(html).toContain('playsInline=""');
    expect(html).toContain('preload="metadata"');
    expect(html).not.toContain("autoplay");
    expect(html).not.toContain("download=");
  });
});
