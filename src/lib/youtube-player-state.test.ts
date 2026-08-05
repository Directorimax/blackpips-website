import { describe, expect, it } from "vitest";
import { isTrustedYouTubeOrigin, parseYouTubePlaybackState } from "./youtube-player-state";

describe("lesson video playback messages", () => {
  it("recognizes playing, paused, and ended states", () => {
    expect(parseYouTubePlaybackState('{"event":"onStateChange","info":1}')).toBe("playing");
    expect(parseYouTubePlaybackState({ event: "onStateChange", info: 2 })).toBe("inactive");
    expect(parseYouTubePlaybackState({ event: "onStateChange", info: 0 })).toBe("inactive");
  });

  it("rejects unrelated messages and untrusted origins", () => {
    expect(parseYouTubePlaybackState({ event: "infoDelivery", info: 1 })).toBeNull();
    expect(isTrustedYouTubeOrigin("https://www.youtube.com")).toBe(true);
    expect(isTrustedYouTubeOrigin("https://evil.example")).toBe(false);
  });
});
