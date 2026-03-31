import { Search, Plus, ShoppingBag, User, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type ViewType = "join" | "host" | "shop" | "profile" | "lobby";

interface BottomNavProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  hasActiveLobby?: boolean;
}

const LEFT_ITEMS = [
  { id: "join" as const, icon: Search, labelKey: "nav.find" },
  { id: "host" as const, icon: Plus, labelKey: "nav.host" },
];

const RIGHT_ITEMS = [
  { id: "shop" as const, icon: ShoppingBag, labelKey: "nav.shop" },
  { id: "profile" as const, icon: User, labelKey: "nav.profile" },
];

const ALL_ITEMS = [...LEFT_ITEMS, ...RIGHT_ITEMS];

export function BottomNav({ currentView, setView, hasActiveLobby }: BottomNavProps) {
  const { t } = useTranslation();

  if (hasActiveLobby) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50 flex items-center justify-around px-4 pt-2"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {/* Left side: Find + Host */}
        {LEFT_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
              data-testid={`nav-${item.id}`}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                  isActive ? "bg-foreground text-background scale-110" : "hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn("text-[10px] font-semibold uppercase tracking-wide", isActive ? "opacity-100" : "opacity-60")}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}

        {/* Center: Active Lobby (elevated FAB style) */}
        <button
          onClick={() => setView("lobby")}
          className="flex flex-col items-center gap-1 -mt-5 relative"
          data-testid="nav-lobby"
        >
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xl relative",
              currentView === "lobby"
                ? "bg-orange-600 text-white scale-105 shadow-orange-600/50"
                : "bg-orange-600 text-white hover:bg-orange-500 shadow-orange-600/40"
            )}
          >
            <Swords className="w-7 h-7" />
            {currentView !== "lobby" && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-card" />
            )}
          </div>
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide",
              currentView === "lobby" ? "text-orange-500" : "text-orange-500/90"
            )}
          >
            {t("nav.lobby")}
          </span>
        </button>

        {/* Right side: Shop + Profile */}
        {RIGHT_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
              data-testid={`nav-${item.id}`}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                  isActive ? "bg-foreground text-background scale-110" : "hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn("text-[10px] font-semibold uppercase tracking-wide", isActive ? "opacity-100" : "opacity-60")}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  // No active lobby — standard 4-item nav
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50 flex items-center justify-around px-4 pt-2"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {ALL_ITEMS.map((item) => {
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
                isActive ? "bg-foreground text-background scale-110" : "hover:bg-muted"
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
