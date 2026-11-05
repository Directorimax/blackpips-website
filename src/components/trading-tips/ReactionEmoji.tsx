import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { AnimationItem } from "lottie-web";

/** Noto animated emoji (Google, CC BY 4.0), the same files the app plays. */
const REACTION_ANIMATIONS: Record<string, string> = {
  "👍": "/reactions/thumbs_up.json",
  "❤️": "/reactions/heart.json",
  "🔥": "/reactions/fire.json",
  "👏": "/reactions/clap.json",
  "💯": "/reactions/hundred.json",
  "🤯": "/reactions/mind_blown.json",
};

export type ReactionEmojiHandle = { celebrate: () => void };

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Same design as the app: the small emoji always plays in its button. When
 * chosen, it grows in place, plays its whole animation once (twice for very
 * short ones), then settles back.
 */
export const ReactionEmoji = forwardRef<ReactionEmojiHandle, { emoji: string }>(
  function ReactionEmoji({ emoji }, ref) {
    const box = useRef<HTMLSpanElement>(null);
    const anim = useRef<AnimationItem | null>(null);
    const zooming = useRef(false);
    const src = REACTION_ANIMATIONS[emoji];

    useEffect(() => {
      if (!src || !box.current) return;
      let alive = true;
      void import("lottie-web/build/player/lottie_light").then(({ default: lottie }) => {
        if (!alive || !box.current) return;
        anim.current = lottie.loadAnimation({
          container: box.current,
          renderer: "svg",
          loop: true,
          autoplay: !reducedMotion(),
          path: src,
        });
      });
      return () => {
        alive = false;
        anim.current?.destroy();
        anim.current = null;
      };
    }, [src]);

    useImperativeHandle(ref, () => ({
      celebrate() {
        const item = anim.current;
        const el = box.current;
        if (!item || !el || zooming.current || reducedMotion()) return;
        zooming.current = true;
        const seconds = item.getDuration(false);
        let loops = seconds < 1 ? 2 : 1;
        item.loop = false;
        el.classList.add("is-zoom");
        item.goToAndPlay(0, true);
        const done = () => {
          loops -= 1;
          if (loops > 0) {
            item.goToAndPlay(0, true);
            return;
          }
          item.removeEventListener("complete", done);
          el.classList.remove("is-zoom");
          item.loop = true;
          item.play();
          zooming.current = false;
        };
        item.addEventListener("complete", done);
      },
    }));

    if (!src) return <span className="tip-emoji">{emoji}</span>;
    return <span ref={box} className="tip-emoji tip-emoji-anim" aria-hidden="true" />;
  },
);
