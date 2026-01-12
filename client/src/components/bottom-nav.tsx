import { Search, Plus, ShoppingBag, User, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type ViewType = "join" | "host" | "shop" | "profile" | "lobby";

interface BottomNavProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  hasActiveLobby?: boolean;
}

const navItems = [
  { id: "join" as const, icon: Search, labelKey: "nav.find" },
  { id: "host" as const, icon: Plus, labelKey: "nav.host" },
  { id: "shop" as const, icon: ShoppingBag, labelKey: "nav.shop" },
  { id: "profile" as const, icon: User, labelKey: "nav.profile" },
];

export function BottomNav({ currentView, setView, hasActiveLobby }: BottomNavProps) {
  const { t } = useTranslation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50 flex items-center justify-around px-4 pt-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {hasActiveLobby && (
        <button
          onClick={() => setView("lobby")}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[64px]",
            currentView === "lobby" ? "text-foreground" : "text-muted-foreground"
          )}
          data-testid="nav-lobby"
        >
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative",
              currentView === "lobby"
                ? "bg-orange-600 text-white scale-110"
                : "bg-orange-600/20 text-orange-500 hover:bg-orange-600/30"
            )}
          >
            <Swords className="w-5 h-5" />
            {currentView !== "lobby" && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
            )}
          </div>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide",
              currentView === "lobby" ? "text-orange-500" : "text-orange-500/80"
            )}
          >
            {t("nav.lobby")}
          </span>
        </button>
      )}
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[64px]",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
            data-testid={`nav-${item.id}`}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                isActive
                  ? "bg-foreground text-background scale-110"
                  : "hover:bg-muted"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                isActive ? "opacity-100" : "opacity-60"
              )}
            >
              {t(item.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
