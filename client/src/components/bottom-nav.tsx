import { Search, Plus, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewType = "join" | "host" | "shop" | "profile" | "lobby";

interface BottomNavProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
}

const navItems = [
  { id: "join" as const, icon: Search, label: "Find" },
  { id: "host" as const, icon: Plus, label: "Host" },
  { id: "shop" as const, icon: ShoppingBag, label: "Shop" },
  { id: "profile" as const, icon: User, label: "Profile" },
];

export function BottomNav({ currentView, setView }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-card border-t border-card-border z-50 flex items-center justify-around px-4 pb-4 safe-area-bottom">
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
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
