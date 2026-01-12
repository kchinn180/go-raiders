import { Copy, Check, LogOut, Moon, Sun, Crown, Star, Flame, Shield, Zap, Users, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/lib/user-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TEAMS } from "@shared/schema";

interface ProfileViewProps {
  onPremiumClick: () => void;
}

const teamIcons = {
  valor: Flame,
  mystic: Shield,
  instinct: Zap,
  neutral: Users,
};

export function ProfileView({ onPremiumClick }: ProfileViewProps) {
  const { user, setUser } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const team = TEAMS.find((t) => t.id === user.team) || TEAMS[3];
  const TeamIcon = teamIcons[user.team] || Users;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(user.code.replace(/\s/g, ""));
      setCopied(true);
      toast({ title: "Code Copied!", description: "Your friend code has been copied" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="p-4 space-y-6 pb-28">
      <div className={cn("p-6 rounded-3xl border-2 text-center", team.border, team.tint)}>
        <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4", team.bg)}>
          <TeamIcon className="w-10 h-10 text-white" fill="currentColor" />
        </div>
        <h2 className="text-2xl font-black">{user.name}</h2>
        <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
          <span className="text-sm">Level {user.level}</span>
          <span>•</span>
          <span className={cn("text-sm font-semibold", team.color)}>{team.name}</span>
        </div>
        {user.isPremium && (
          <div className="flex items-center justify-center gap-1 mt-3">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-500">Elite Member</span>
          </div>
        )}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold">Friend Code</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyCode}
            className="gap-1"
            data-testid="button-copy-code"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
        </div>
        <code className="block w-full bg-muted p-4 rounded-xl font-mono text-lg tracking-widest text-center">
          {user.code}
        </code>
      </Card>

      <Card className="divide-y divide-border">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Sun className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <span className="font-semibold block">Dark Mode</span>
              <span className="text-sm text-muted-foreground">
                {theme === "dark" ? "Currently enabled" : "Currently disabled"}
              </span>
            </div>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={toggleTheme}
            data-testid="switch-dark-mode"
          />
        </div>

        {!user.isPremium && (
          <button
            onClick={onPremiumClick}
            className="w-full p-4 flex items-center justify-between hover-elevate text-left"
            data-testid="button-upgrade-profile"
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-amber-500" />
              <div>
                <span className="font-semibold block">Upgrade to Elite</span>
                <span className="text-sm text-muted-foreground">
                  Unlock all premium features
                </span>
              </div>
            </div>
            <span className="text-sm font-bold text-indigo-500">$19.99/mo</span>
          </button>
        )}

        <button
          onClick={() => toast({ title: "Coming Soon", description: "Settings will be available in a future update" })}
          className="w-full p-4 flex items-center gap-3 hover-elevate text-left"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold">Settings</span>
        </button>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
              <span className="font-bold">Host Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black">5.0</span>
              <span className="text-muted-foreground text-sm">(0 raids hosted)</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black">0</span>
            <span className="text-muted-foreground text-sm block">Raids Joined</span>
          </div>
        </div>
      </Card>

      <Button
        variant="destructive"
        className="w-full"
        onClick={handleLogout}
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
