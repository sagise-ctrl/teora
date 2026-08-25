import { Sparkles, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAITiers, useGetMyBalance } from "@/lib/api-client-react/generated/api";

interface TierSelectorProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  /** Optional: only show tier name, not the price line. Useful inline next to a button. */
  minimal?: boolean;
}

/**
 * Reusable AI tier selector. Fetches tier list + user's preferred tier from API.
 * Defaults to user's preferred tier, falling back to first available tier.
 */
export function TierSelector({ value, onChange, compact = false, minimal = false }: TierSelectorProps) {
  const { data: tiersData } = useGetAITiers();
  const { data: balanceData } = useGetMyBalance();

  // Auto-select preferred tier on first load
  if (!value && tiersData?.tiers && tiersData.tiers.length > 0) {
    const preferred = tiersData.tiers.find(t => t.id === balanceData?.preferredTierId);
    const fallback = preferred ?? tiersData.tiers[0];
    if (fallback?.id) {
      // Defer to next tick to avoid setting state during render
      queueMicrotask(() => onChange(fallback.id!));
    }
  }

  if (!tiersData?.tiers || tiersData.tiers.length === 0) {
    return <Skeleton className={compact ? "h-7 w-[120px]" : "h-9 w-[160px]"} />;
  }

  const selected = tiersData.tiers.find(t => t.id === value);
  const isFree = selected?.isFree ?? false;

  return (
    <div className="flex items-center gap-1.5">
      {!minimal && <Sparkles className="w-3 h-3 text-muted-foreground shrink-0" />}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={compact ? "h-7 w-[120px] text-xs bg-muted/50 border-border/50" : "h-9 w-[160px] text-xs"}>
          <SelectValue placeholder="Pilih tier" />
        </SelectTrigger>
        <SelectContent>
          {tiersData.tiers.map((tier) => (
            <SelectItem key={tier.id} value={tier.id!} className="text-xs">
              <div className="flex items-center gap-2">
                <span>{tier.name}</span>
                {tier.isFree && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-green-100 text-green-700 border-0">
                    FREE
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {minimal && isFree && (
        <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
          <Zap className="w-3 h-3" />
          Free
        </span>
      )}
    </div>
  );
}
