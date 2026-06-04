import { useState } from "react";
import { ChevronRight, Flame, Shield, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/queryClient";
import type { TeamId, User } from "@shared/schema";
import logoImage from "@assets/IMG_0027_1768190905765.png";

const teams = [
  { id: "valor" as const, name: "Valor", icon: Flame, color: "text-red-600", bg: "bg-red-600", border: "border-red-600" },
  { id: "mystic" as const, name: "Mystic", icon: Shield, color: "text-blue-600", bg: "bg-blue-600", border: "border-blue-600" },
  { id: "instinct" as const, name: "Instinct", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500", border: "border-yellow-500" },
];

export function Onboarding() {
  const { setUser } = useUser();
  const { t } = useTranslation();
  const [step, setStep] = useState<"landing" | "terms" | "profile">("landing");
  const [formData, setFormData] = useState({
    name: "",
    level: 45,
    team: "valor" as TeamId,
    code: "",
  });
  const [error, setError] = useState("");

  const selectedTeam = teams.find((t) => t.id === formData.team) || teams[0];

  const handleComplete = async () => {
    setError("");
    if (!formData.name.trim()) {
      setError(t("onboarding.nameError"));
      return;
    }
    if (formData.code.replace(/\D/g, "").length < 12) {
      setError(t("onboarding.codeError"));
      return;
    }

    const formatted = formData.code
      .replace(/\D/g, "")
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();

    const newUser: User = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      level: formData.level,
      team: formData.team,
      code: formatted,
      isPremium: false,
      isVerified: true,
      coins: 0,
    };

    // Register the user on the server so subsequent calls (especially
    // /api/subscription/verify after an IAP purchase) can find this user by
    // id. Without this, App Review hits "User not found" on the verify call
    // even though the StoreKit purchase succeeded. Failures here are
    // non-fatal: the local user is still created and a later sync (in
    // user-context) will retry. The endpoint is idempotent on the id field.
    try {
      const response = await fetch(getApiUrl("/api/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!response.ok) {
        const body = await response.text();
        console.warn("[ONBOARDING] Server registration failed:", response.status, body);
        // Special case: friend code banned — block the local user as well
        if (response.status === 403) {
          setError("This friend code has been banned.");
          return;
        }
      }
    } catch (err) {
      console.warn("[ONBOARDING] Server registration failed (offline?). Local user created anyway:", err);
    }

    setUser(newUser);
  };

  if (step === "landing") {
    return (
      <div
        className="h-dvh flex flex-col items-center justify-center p-8 bg-black text-center relative overflow-hidden"
        style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        {/* Animated ember/particle background */}
        <style>{`
          @keyframes ember-rise {
            0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
            10% { opacity: 1; }
            80% { opacity: 0.6; }
            100% { transform: translateY(-110vh) translateX(var(--drift)) scale(0.3); opacity: 0; }
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(1.08); }
          }
          @keyframes rotate-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .ember {
            position: absolute;
            border-radius: 50%;
            animation: ember-rise linear infinite;
            pointer-events: none;
          }
        `}</style>

        {/* Deep radial gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,_#7c1d0a_0%,_#3b0000_35%,_#000_75%)]" />

        {/* Pulsing mid glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: '120vw', height: '60vw',
            bottom: '-10vw', left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse, rgba(234,88,12,0.25) 0%, transparent 70%)',
            animation: 'pulse-glow 4s ease-in-out infinite',
          }}
        />

        {/* Secondary glow ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: '80vw', height: '80vw',
            bottom: '-25vw', left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse, rgba(185,28,28,0.2) 0%, transparent 65%)',
            animation: 'pulse-glow 6s ease-in-out infinite 1s',
          }}
        />

        {/* Ember particles */}
        {[
          { left: '8%',  size: 4,  dur: '5.2s', delay: '0s',    drift: '20px',  color: '#f97316' },
          { left: '18%', size: 3,  dur: '7.1s', delay: '1.2s',  drift: '-15px', color: '#fb923c' },
          { left: '28%', size: 5,  dur: '6.4s', delay: '0.4s',  drift: '30px',  color: '#ef4444' },
          { left: '38%', size: 2,  dur: '8.3s', delay: '2.0s',  drift: '-25px', color: '#fbbf24' },
          { left: '48%', size: 4,  dur: '5.8s', delay: '0.8s',  drift: '10px',  color: '#f97316' },
          { left: '58%', size: 3,  dur: '7.6s', delay: '1.7s',  drift: '-20px', color: '#fb923c' },
          { left: '68%', size: 5,  dur: '6.0s', delay: '0.2s',  drift: '18px',  color: '#ef4444' },
          { left: '78%', size: 2,  dur: '9.1s', delay: '2.5s',  drift: '-12px', color: '#fbbf24' },
          { left: '88%', size: 4,  dur: '5.5s', delay: '1.0s',  drift: '22px',  color: '#f97316' },
          { left: '13%', size: 3,  dur: '8.8s', delay: '3.1s',  drift: '-30px', color: '#fb923c' },
          { left: '33%', size: 2,  dur: '6.7s', delay: '1.5s',  drift: '15px',  color: '#ef4444' },
          { left: '53%', size: 4,  dur: '7.3s', delay: '0.6s',  drift: '-18px', color: '#fbbf24' },
          { left: '73%', size: 3,  dur: '5.9s', delay: '2.2s',  drift: '25px',  color: '#f97316' },
          { left: '93%', size: 5,  dur: '8.0s', delay: '1.8s',  drift: '-22px', color: '#fb923c' },
          { left: '23%', size: 2,  dur: '6.2s', delay: '3.5s',  drift: '12px',  color: '#ef4444' },
          { left: '43%', size: 3,  dur: '7.9s', delay: '0.9s',  drift: '-28px', color: '#fbbf24' },
          { left: '63%', size: 4,  dur: '5.4s', delay: '2.8s',  drift: '20px',  color: '#f97316' },
          { left: '83%', size: 2,  dur: '8.5s', delay: '1.3s',  drift: '-16px', color: '#fb923c' },
        ].map((e, i) => (
          <div
            key={i}
            className="ember"
            style={{
              left: e.left,
              bottom: '-10px',
              width: e.size,
              height: e.size,
              background: `radial-gradient(circle, ${e.color} 0%, transparent 70%)`,
              boxShadow: `0 0 ${e.size * 3}px ${e.color}`,
              animationDuration: e.dur,
              animationDelay: e.delay,
              '--drift': e.drift,
            } as React.CSSProperties}
          />
        ))}

        <div className="relative z-10 space-y-8 max-w-sm">
          <div className="w-32 h-32 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl overflow-hidden mb-8 ring-4 ring-orange-600/50">
            <img src={logoImage} alt="GO Raiders Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-white">
              GO Raiders
            </h1>
            <p className="text-zinc-400 text-lg">
              {t("onboarding.tagline")}
            </p>
          </div>
          <div className="space-y-4 pt-8">
            <Button
              onClick={() => setStep("terms")}
              className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-orange-600 to-red-700 text-white hover:from-orange-500 hover:to-red-600"
              data-testid="button-get-started"
            >
              {t("onboarding.getStarted")}
              <ChevronRight className="ml-1 w-5 h-5" />
            </Button>
            <p className="text-[11px] text-zinc-500">
              {t("onboarding.agreeText")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "terms") {
    return (
      <div
        className="h-dvh flex items-center justify-center p-6 bg-black"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6 border border-zinc-800 max-h-[80vh] flex flex-col">
          <h2 className="text-xl font-black text-white mb-4">{t("onboarding.termsTitle")}</h2>
          <div className="flex-1 overflow-y-auto text-left space-y-4 text-xs text-zinc-400 mb-6 pr-2">
            <p>
              <strong className="text-white">1. Independent App:</strong> GO Raiders is
              an independent third-party coordination tool. It is not affiliated with,
              endorsed by, or connected to any game publisher or developer.
            </p>
            <p>
              <strong className="text-white">2. User Responsibility:</strong> You are
              responsible for your interactions. Do not share personal info beyond
              what is necessary for coordination.
            </p>
            <p>
              <strong className="text-white">3. Account Safety:</strong> Using third-party
              tools may have implications. Use at your own discretion.
            </p>
            <p>
              <strong className="text-white">4. No Guarantee:</strong> We do not
              guarantee successful raids or connections.
            </p>
            <p>
              <strong className="text-white">5. Respectful Conduct:</strong> Harassment
              or abuse will result in a ban.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep("landing")}
              className="flex-1 rounded-xl border-zinc-700 text-white"
              data-testid="button-decline"
            >
              {t("onboarding.decline")}
            </Button>
            <Button
              onClick={() => setStep("profile")}
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-red-700 text-white"
              data-testid="button-accept"
            >
              {t("onboarding.accept")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-y-auto bg-gradient-to-b from-zinc-900 via-black to-black">
      <div
        className="min-h-full flex items-center justify-center px-6 py-8"
        style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 overflow-hidden ring-2 ring-orange-600/50">
            <img src={logoImage} alt="GO Raiders Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-black text-white">{t("onboarding.createProfile")}</h2>
          <p className="text-zinc-500 text-sm mt-1">{t("onboarding.setupProfile")}</p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wide block mb-2">
              {t("onboarding.trainerNameLabel")}
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("onboarding.trainerNamePlaceholder")}
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 h-12 rounded-xl"
              data-testid="input-trainer-name"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wide block mb-2">
              {t("onboarding.teamLabel")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {teams.map((team) => {
                const Icon = team.icon;
                const isSelected = formData.team === team.id;
                return (
                  <button
                    key={team.id}
                    onClick={() => setFormData({ ...formData, team: team.id })}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
                      isSelected
                        ? `${team.bg} ${team.border} text-white`
                        : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50"
                    )}
                    data-testid={`team-${team.id}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-bold">{team.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wide block mb-2">
              {`${t("onboarding.levelLabel")}: ${formData.level}`}
            </label>
            <input
              type="range"
              min="1"
              max="80"
              value={formData.level}
              onChange={(e) =>
                setFormData({ ...formData, level: parseInt(e.target.value) })
              }
              className={cn(
                "w-full h-2 rounded-full appearance-none cursor-pointer",
                selectedTeam.bg
              )}
              style={{
                background: `linear-gradient(to right, ${
                  selectedTeam.id === "valor"
                    ? "#dc2626"
                    : selectedTeam.id === "mystic"
                    ? "#2563eb"
                    : "#eab308"
                } ${(formData.level / 80) * 100}%, #3f3f46 0)`,
              }}
              data-testid="slider-level"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wide block mb-2">
              {t("onboarding.friendCodeLabel")}
            </label>
            <Input
              value={formData.code}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
                const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                setFormData({ ...formData, code: formatted });
              }}
              placeholder="1234 5678 9012"
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 h-12 rounded-xl font-mono text-lg tracking-wider"
              data-testid="input-friend-code"
            />
          </div>
        </div>

        <Button
          onClick={handleComplete}
          className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-orange-600 to-red-700 text-white mt-6"
          data-testid="button-complete"
        >
          {t("onboarding.completeSetup")}
          <ChevronRight className="ml-1 w-5 h-5" />
        </Button>
      </div>
      </div>
    </div>
  );
}
