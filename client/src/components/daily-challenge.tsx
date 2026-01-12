import { useState, useRef } from "react";
import { Gift, Coins, Star, Zap, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUser } from "@/lib/user-context";
import { triggerNotification, triggerImpact } from "@/lib/haptics";
import { playRewardSound, playClickSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface Reward {
  id: string;
  label: string;
  coins: number;
  icon: typeof Coins;
  color: string;
  probability: number;
}

const REWARDS: Reward[] = [
  { id: "coins-10", label: "10", coins: 10, icon: Coins, color: "bg-yellow-500", probability: 30 },
  { id: "coins-25", label: "25", coins: 25, icon: Coins, color: "bg-yellow-600", probability: 25 },
  { id: "coins-50", label: "50", coins: 50, icon: Coins, color: "bg-orange-500", probability: 20 },
  { id: "coins-100", label: "100", coins: 100, icon: Star, color: "bg-orange-600", probability: 12 },
  { id: "coins-200", label: "200", coins: 200, icon: Zap, color: "bg-red-500", probability: 8 },
  { id: "coins-500", label: "500", coins: 500, icon: Sparkles, color: "bg-purple-500", probability: 4 },
  { id: "jackpot", label: "1000", coins: 1000, icon: Gift, color: "bg-gradient-to-r from-yellow-400 to-orange-500", probability: 1 },
];

function getWeightedRandomReward(): Reward {
  const totalWeight = REWARDS.reduce((sum, r) => sum + r.probability, 0);
  let random = Math.random() * totalWeight;
  
  for (const reward of REWARDS) {
    random -= reward.probability;
    if (random <= 0) return reward;
  }
  
  return REWARDS[0];
}

interface DailyChallengeProps {
  onClose?: () => void;
}

export function DailyChallenge({ onClose }: DailyChallengeProps) {
  const { t } = useTranslation();
  const { user, canSpinToday, addCoins, updateDailyChallenge } = useUser();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);
  const [showReward, setShowReward] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const canSpin = canSpinToday();
  const streak = user?.dailyChallenge?.streak || 0;
  const totalSpins = user?.dailyChallenge?.totalSpins || 0;
  const coins = user?.coins || 0;

  const hapticEnabled = user?.notifications?.hapticFeedback !== false;
  const soundEnabled = user?.notifications?.soundEffects !== false;

  const handleSpin = async () => {
    if (!canSpin || isSpinning) return;

    if (soundEnabled) playClickSound();
    if (hapticEnabled) triggerImpact('medium');

    setIsSpinning(true);
    setShowReward(false);
    setReward(null);

    const selectedReward = getWeightedRandomReward();
    const rewardIndex = REWARDS.findIndex(r => r.id === selectedReward.id);
    const segmentAngle = 360 / REWARDS.length;
    const targetAngle = 360 - (rewardIndex * segmentAngle) - (segmentAngle / 2);
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + (spins * 360) + targetAngle;

    setRotation(finalRotation);

    setTimeout(() => {
      setReward(selectedReward);
      setShowReward(true);
      setIsSpinning(false);
      
      addCoins(selectedReward.coins);
      
      const today = new Date().toISOString();
      const lastSpinDate = user?.dailyChallenge?.lastSpinDate;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = lastSpinDate && new Date(lastSpinDate).toDateString() === yesterday.toDateString();
      
      updateDailyChallenge({
        lastSpinDate: today,
        streak: isConsecutive ? streak + 1 : 1,
        totalSpins: totalSpins + 1
      });

      if (soundEnabled) playRewardSound();
      if (hapticEnabled) triggerNotification('success');
    }, 4000);
  };

  const segmentAngle = 360 / REWARDS.length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Gift className="w-6 h-6 text-orange-500" />
          {t("daily.title")}
        </h2>
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1.5 rounded-full">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-yellow-500">{coins.toLocaleString()}</span>
        </div>
      </div>

      <Card className="p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-purple-500/5" />
        
        <div className="relative flex flex-col items-center">
          <div className="relative w-64 h-64 mb-6">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-orange-500" />
            </div>
            
            <div
              ref={wheelRef}
              className="w-full h-full rounded-full border-4 border-orange-500 shadow-lg relative overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
              }}
            >
              {REWARDS.map((r, i) => {
                const Icon = r.icon;
                const angle = i * segmentAngle;
                return (
                  <div
                    key={r.id}
                    className={cn("absolute w-1/2 h-1/2 origin-bottom-right", r.color)}
                    style={{
                      transform: `rotate(${angle}deg) skewY(${90 - segmentAngle}deg)`,
                      left: '50%',
                      top: 0
                    }}
                  >
                    <div
                      className="absolute flex flex-col items-center justify-center text-white font-bold text-sm"
                      style={{
                        transform: `skewY(${-(90 - segmentAngle)}deg) rotate(${segmentAngle / 2}deg)`,
                        left: '30%',
                        top: '40%'
                      }}
                    >
                      <Icon className="w-5 h-5 mb-0.5" />
                      <span>{r.label}</span>
                    </div>
                  </div>
                );
              })}
              <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-background border-4 border-orange-500 flex items-center justify-center z-10">
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          {showReward && reward && (
            <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl text-center animate-in fade-in zoom-in duration-300">
              <p className="text-sm text-muted-foreground mb-1">{t("daily.youWon")}</p>
              <div className="flex items-center justify-center gap-2">
                <reward.icon className="w-6 h-6 text-yellow-500" />
                <span className="text-2xl font-black text-yellow-500">+{reward.coins}</span>
                <Coins className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          )}

          <Button
            onClick={handleSpin}
            disabled={!canSpin || isSpinning}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-lg py-6"
            data-testid="button-spin-wheel"
          >
            {isSpinning ? t("daily.spinning") : canSpin ? t("daily.spin") : t("daily.comeBack")}
          </Button>

          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-orange-500" />
              <span>{t("daily.streak")}: <strong className="text-foreground">{streak}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>{t("daily.totalSpins")}: <strong className="text-foreground">{totalSpins}</strong></span>
            </div>
          </div>
        </div>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        {t("daily.hint")}
      </p>
    </div>
  );
}
