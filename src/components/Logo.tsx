import logo from "@/assets/blackpips-bull-gold.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={logo}
        alt="BlackPips logo"
        className="h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]"
      />
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        Black<span className="text-gradient-gold">Pips</span>
      </span>
    </span>
  );
}
