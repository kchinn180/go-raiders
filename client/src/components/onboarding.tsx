import { useState } from "react";
import { ChevronRight, Flame, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { TrainerScanner } from "@/components/trainer-scanner";
import type { TeamId, User } from "@shared/schema";
import logoImage from "@assets/IMG_0027_1768190905765.png";

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
      coins: 0,
    };

    setUser(newUser);
  };

  if (step === "landing") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-black text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-orange-900/40 via-black to-black" />
        <div className="relative z-10 space-y-8 max-w-sm">
          <div className="w-32 h-32 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl overflow-hidden mb-8 ring-4 ring-orange-600/50">
            <img src={logoImage} alt="GO Raiders Logo" className="w-full h-full object-cover" />
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
              className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-orange-600 to-red-700 text-white hover:from-orange-500 hover:to-red-600"
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
              Decline
            </Button>
            <Button
              onClick={() => setStep("profile")}
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-red-700 text-white"
              data-testid="button-accept"
            >
              I Accept
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-6 bg-gradient-to-b from-zinc-900 via-black to-black">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 overflow-hidden ring-2 ring-orange-600/50">
            <img src={logoImage} alt="GO Raiders Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-black text-white">Create Profile</h2>
          <p className="text-zinc-500 text-sm mt-1">Set up your trainer profile</p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Trainer Profile Scanner */}
        <TrainerScanner
          onScanComplete={(scanned) => {
            setFormData(prev => ({
              ...prev,
              ...(scanned.name ? { name: scanned.name } : {}),
              ...(scanned.team ? { team: scanned.team } : {}),
              ...(scanned.level ? { level: scanned.level } : {}),
              ...(scanned.code ? { code: scanned.code } : {}),
            }));
          }}
        />

        <div className="relative flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-zinc-700" />
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">or fill in manually</span>
          <div className="flex-1 h-px bg-zinc-700" />
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wide block mb-2">
              Trainer Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your in-game name"
              className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 h-12 rounded-xl"
              data-testid="input-trainer-name"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wide block mb-2">
              Team
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
              Level: {formData.level}
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
              Friend Code
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
          Complete Setup
          <ChevronRight className="ml-1 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
