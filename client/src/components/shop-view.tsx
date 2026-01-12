import { Crown, Zap, Radar, Users, Star, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";

interface ShopViewProps {
  onUpgrade: () => void;
}

const features = [
  {
    icon: Radar,
    title: "Auto Join",
    description: "Automatically find & join raids for your target boss",
  },
  {
    icon: Clock,
    title: "No Wait Time",
    description: "Skip the 10-second delay on new lobbies",
  },
  {
    icon: Users,
    title: "Priority Queue",
    description: "Get placed first in popular raid lobbies",
  },
  {
    icon: Star,
    title: "Host Ratings",
    description: "See detailed host ratings before joining",
  },
  {
    icon: ShieldCheck,
    title: "Verified Badge",
    description: "Show others you're a trusted raider",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description: "Get alerted the moment your target boss appears",
  },
];

export function ShopView({ onUpgrade }: ShopViewProps) {
  const { user } = useUser();

  return (
    <div className="p-4 space-y-6 pb-28">
      <div className="text-center relative">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black">GO Raiders Elite</h2>
        <p className="text-muted-foreground">Unlock the ultimate raid experience</p>
      </div>

      {user?.isPremium ? (
        <Card className="p-6 text-center border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-amber-500" />
            <span className="font-black text-xl">You're Elite!</span>
          </div>
          <p className="text-muted-foreground text-sm">
            You have access to all premium features
          </p>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-indigo-500/30">
          <div className="text-center mb-4">
            <div className="text-4xl font-black mb-1">$19.99</div>
            <div className="text-muted-foreground text-sm">per month</div>
          </div>
          <Button
            onClick={onUpgrade}
            className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
            data-testid="button-upgrade-elite"
          >
            <Crown className="w-5 h-5 mr-2" />
            UPGRADE TO ELITE
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
          Elite Features
        </h3>
        <div className="grid gap-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card
                key={i}
                className={cn(
                  "p-4 flex items-start gap-4",
                  user?.isPremium && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    user?.isPremium
                      ? "bg-amber-500/20 text-amber-500"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
