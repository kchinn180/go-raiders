import { useUser } from "@/lib/user-context";
import logoImage from "@assets/IMG_0027_1768190905765.png";

interface HeaderProps {
  onPremiumClick: () => void;
}

export function Header({ onPremiumClick }: HeaderProps) {
  const { user } = useUser();

  return (
    <header className="px-4 flex items-center justify-between bg-card border-b border-card-border z-10 shrink-0 transition-colors duration-300" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
          <img src={logoImage} alt="GO Raiders Logo" className="w-full h-full object-cover" />
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
