import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { OpenAppButton } from "./StoreBadges";

const state = vi.hoisted(() => ({ platform: null as string | null }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: () => [
    state.platform,
    (value: string | null) => {
      state.platform = value;
    },
  ],
}));

afterEach(() => {
  state.platform = null;
  vi.unstubAllGlobals();
});

it.each([
  ["iPhone", 5, true, false],
  ["iPad", 5, true, false],
  ["Macintosh", 5, true, false],
  ["Android", 5, false, true],
  ["Macintosh", 0, true, true],
  ["Windows NT", 0, true, true],
])(
  "shows explicit store choices after a click on %s with %i touch points",
  (userAgent, maxTouchPoints, apple, google) => {
    vi.stubGlobal("navigator", { userAgent, maxTouchPoints });
    const button = OpenAppButton({});
    expect(renderToStaticMarkup(button)).not.toContain("href=");
    button.props.children[0].props.onClick();
    const markup = renderToStaticMarkup(OpenAppButton({}));
    expect(markup.includes("https://apps.apple.com/tz/app/blackpips/id6821567324")).toBe(apple);
    expect(markup.includes("https://play.google.com/store/apps/details?id=com.blackpips.app")).toBe(
      google,
    );
    expect(markup).not.toMatch(/intent:\/\/|blackpips:\/\//);
  },
);
