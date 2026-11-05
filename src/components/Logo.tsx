import wordmark from "@/assets/blackpips_wordmark.png";
import bull from "@/assets/blackpips-bull-gold.png";

/** The official BLACKPIPS wordmark used in the navigation and footer. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src={wordmark}
      alt="BLACKPIPS"
      width={162}
      height={28}
      fetchPriority="high"
      decoding="async"
      className={`wordmark h-7 w-auto object-contain ${className}`}
    />
  );
}

/** The gold bull mark, kept as a decorative brand icon. */
export function BullMark({ className = "" }: { className?: string }) {
  return <img src={bull} alt="" aria-hidden="true" decoding="async" className={className} />;
}
