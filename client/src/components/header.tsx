import { Sparkles } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onPremiumClick: () => void;
}

export function Header({ onPremiumClick }: HeaderProps) {
  const { user } = useUser();

  return (
    <header className="h-16 px-4 flex items-center justify-between bg-card border-b border-card-border z-10 shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight leading-none">GO Raiders</h1>
          <p className="text-[10px] text-muted-foreground font-semibold tracking-wide uppercase">
            Raid Coordinator
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onPremiumClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-full hover-elevate transition-transform active:scale-95"
          data-testid="button-premium-status"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              user?.isPremium ? "bg-amber-500 animate-pulse" : "bg-muted-foreground"
            }`}
          />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">
            {user?.isPremium ? "ELITE" : "FREE"}
          </span>
        </button>
      </div>
    </header>
  );
}
