import { cn } from "@/lib/utils";

interface TeoraLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { icon: 32, text: "text-lg", gap: "gap-2" },
  md: { icon: 40, text: "text-xl", gap: "gap-2" },
  lg: { icon: 56, text: "text-2xl", gap: "gap-3" },
};

export function TeoraLogo({ className, showText = true, size = "md" }: TeoraLogoProps) {
  const { icon, text, gap } = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center", gap, className)}>
      {/* Hexagonal logo icon */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hex-gradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2D79FF" />
            <stop offset="100%" stopColor="#8E54E9" />
          </linearGradient>
        </defs>
        {/* Hexagon shape */}
        <path
          d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
          fill="url(#hex-gradient)"
          fillOpacity="0.1"
          stroke="url(#hex-gradient)"
          strokeWidth="2"
        />
        {/* Circuit lines */}
        <line x1="32" y1="20" x2="32" y2="36" stroke="url(#hex-gradient)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="18" r="3" fill="url(#hex-gradient)" />
        <circle cx="32" cy="38" r="3" fill="url(#hex-gradient)" />
        <line x1="22" y1="28" x2="28" y2="28" stroke="url(#hex-gradient)" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="28" x2="42" y2="28" stroke="url(#hex-gradient)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="28" r="2.5" fill="url(#hex-gradient)" />
        <circle cx="44" cy="28" r="2.5" fill="url(#hex-gradient)" />
        <line x1="26" y1="44" x2="38" y2="44" stroke="url(#hex-gradient)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="44" r="2" fill="url(#hex-gradient)" />
        <circle cx="40" cy="44" r="2" fill="url(#hex-gradient)" />
      </svg>

      {/* Text wordmark */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-serif font-bold tracking-tight text-primary", text)}>
            Teora
          </span>
        </div>
      )}
    </div>
  );
}
