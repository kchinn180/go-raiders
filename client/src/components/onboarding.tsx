import { useState } from "react";
import { ChevronRight, Flame, Shield, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import type { TeamId, User } from "@shared/schema";

const teams = [
  { id: "valor" as const, name: "Valor", icon: Flame, color: "text-red-600", bg: "bg-red-600", border: "border-red-600" },
  { id: "mystic" as const, name: "Mystic", icon: Shield, color: "text-blue-600", bg: "bg-blue-600", border: "border-blue-600" },
  { id: "instinct" as const, name: "Instinct", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500", border: "border-yellow-500" },
];

export function Onboarding() {
  const { setUser } = useUser();
  const [step, setStep] = useState<"landing" | "terms" | "profile">("landing");
  const [formData, setFormData] = useState({
    name: "",
    level: 45,
    team: "valor" as TeamId,
    code: "",
  });
  const [error, setError] = useState("");

  const selectedTeam = teams.find((t) => t.id === formData.team) || teams[0];

  const handleComplete = () => {
    setError("");
    if (!formData.name.trim()) {
      setError("Please enter your Trainer Name");
      return;
    }
    if (formData.code.replace(/\D/g, "").length < 12) {
      setError("Please enter a valid 12-digit Friend Code");
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
    };

    setUser(newUser);
  };

  if (step === "landing") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-black text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black" />
        <div className="relative z-10 space-y-8 max-w-sm">
          <div className="w-28 h-28 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-6 mb-8">
            <Sparkles className="w-14 h-14 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-white">
              GO Raiders
            </h1>
            <p className="text-zinc-400 text-lg">
              The #1 Raid Coordination Tool
            </p>
          </div>
          <div className="space-y-4 pt-8">
            <Button
              onClick={() => setStep("terms")}
              className="w-full py-6 text-lg font-black rounded-2xl bg-white text-black hover:bg-zinc-100"
              data-testid="button-get-started"
            >
              GET STARTED
              <ChevronRight className="ml-1 w-5 h-5" />
            </Button>
            <p className="text-[11px] text-zinc-500">
              By continuing, you agree to our Terms & Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "terms") {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-black">
        <div className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6 border border-zinc-800 max-h-[80vh] flex flex-col">
          <h2 className="text-xl font-black text-white mb-4">Terms of Service</h2>
          <div className="flex-1 overflow-y-auto text-left space-y-4 text-xs text-zinc-400 mb-6 pr-2">
            <p>
              <strong className="text-white">1. No Affiliation:</strong> GO Raiders is
              a third-party app and is NOT affiliated with, endorsed, sponsored, or
              specifically approved by Niantic, Nintendo, The Pokémon Company, or
              their partners.
            </p>
            <p>
              <strong className="text-white">2. User Responsibility:</strong> You are
              responsible for your interactions. Do not share personal info beyond
              your Friend Code.
            </p>
            <p>
              <strong className="text-white">3. Liability Waiver:</strong> We are not
              liable for any account actions taken by game publishers against your
              account.
            </p>
            <p>
              <strong className="text-white">4. Subscriptions:</strong> Elite Members
              subscription is $19.99/mo, auto-renewing. Manage in your account
              settings.
            </p>
            <p>
              <strong className="text-white">5. Privacy:</strong> We collect minimal
              data necessary for the service. Your Friend Code is shared only with
              raid lobby members.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep("landing")}
              className="flex-1 py-3 rounded-xl"
            >
              Decline
            </Button>
            <Button
              onClick={() => setStep("profile")}
              className="flex-1 py-3 rounded-xl bg-white text-black hover:bg-zinc-100"
              data-testid="button-agree-terms"
            >
              I AGREE
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 bg-black flex flex-col justify-center">
      <h2 className="text-2xl font-black mb-6 text-center text-white">
        Setup Profile
      </h2>
      <div
        className={cn(
          "space-y-6 bg-zinc-900/50 p-6 rounded-3xl border transition-colors duration-500 shadow-2xl",
          selectedTeam.border
        )}
      >
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">
            Trainer Name
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={cn(
              "bg-black border-2 p-4 h-auto rounded-xl font-bold text-white",
              selectedTeam.border
            )}
            placeholder="AshKetchum"
            data-testid="input-trainer-name"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">
            Team
          </label>
          <div className="grid grid-cols-3 gap-3">
            {teams.map((team) => {
              const Icon = team.icon;
              const isSelected = formData.team === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => setFormData({ ...formData, team: team.id })}
                  className={cn(
                    "py-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300",
                    isSelected
                      ? `bg-black ${team.border} shadow-lg scale-105`
                      : "bg-zinc-900 border-zinc-700 opacity-60 hover:opacity-100 hover:border-zinc-600"
                  )}
                  data-testid={`button-team-${team.id}`}
                >
                  <Icon
                    className={cn("w-8 h-8 mb-2", team.color)}
                    fill="currentColor"
                  />
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isSelected ? "text-white" : "text-zinc-500"
                    )}
                  >
                    {team.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-1/3">
            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">
              Level
            </label>
            <Input
              type="number"
              value={formData.level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  level: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)),
                })
              }
              className={cn(
                "bg-black border-2 p-3 h-auto rounded-xl font-bold text-white text-center",
                selectedTeam.border
              )}
              min={1}
              max={50}
              data-testid="input-level"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">
              Friend Code
            </label>
            <Input
              placeholder="0000 0000 0000"
              value={formData.code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                const formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
                setFormData({ ...formData, code: formatted });
              }}
              className={cn(
                "bg-black border-2 p-3 h-auto rounded-xl font-mono tracking-widest text-white",
                selectedTeam.border
              )}
              maxLength={14}
              data-testid="input-friend-code"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center font-medium">{error}</p>
        )}
      </div>

      <Button
        onClick={handleComplete}
        className={cn(
          "w-full mt-8 py-6 text-lg font-black rounded-2xl shadow-lg text-white",
          selectedTeam.bg
        )}
        data-testid="button-complete-setup"
      >
        COMPLETE SETUP
      </Button>
    </div>
  );
}
