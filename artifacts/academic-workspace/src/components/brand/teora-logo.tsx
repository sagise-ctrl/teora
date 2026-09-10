import { cn } from "@/lib/utils";

interface TeoraLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { img: 32, text: "text-lg", gap: "gap-2" },
  md: { img: 40, text: "text-xl", gap: "gap-2" },
  lg: { img: 56, text: "text-2xl", gap: "gap-3" },
};

export function TeoraLogo({ className, showText = true, size = "md" }: TeoraLogoProps) {
  const { img, text, gap } = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center", gap, className)}>
      <img
        src="/logo.png"
        alt="Teora"
        width={img}
        height={img}
        className="object-contain flex-shrink-0"
        style={{ width: img, height: img }}
      />

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
