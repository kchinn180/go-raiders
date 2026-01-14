import { X, Search, Radar, Users, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SafeImage } from "@/components/safe-image";
import { cn } from "@/lib/utils";
import { BOSSES } from "@shared/schema";
import type { Boss, RaidBoss, QueueStatus } from "@shared/schema";
import { triggerImpact } from "@/lib/haptics";

interface AutoJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQueueJoined: (bossId: string) => void;
  userId: string;
  userName: string;
  userLevel: number;
  userTeam: 'valor' | 'mystic' | 'instinct' | 'neutral';
  friendCode: string;
  isPremium: boolean;
}

export function AutoJoinModal({ 
  isOpen, 
  onClose, 
  onQueueJoined,
  userId,
  userName,
  userLevel,
  userTeam,
  friendCode,
  isPremium,
}: AutoJoinModalProps) {
  const [search, setSearch] = useState("");
  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const queryClient = useQueryClient();

  const { data: activeBosses, isLoading: loadingBosses } = useQuery<RaidBoss[]>({
    queryKey: ['/api/bosses/active'],
    enabled: isOpen,
  });

  const joinQueueMutation = useMutation({
    mutationFn: async (bossId: string) => {
      const response = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bossId,
          userId,
          userName,
          userLevel,
          userTeam,
          friendCode,
          isPremium,
        }),
      });
      if (!response.ok) throw new Error('Failed to join queue');
      return response.json() as Promise<QueueStatus>;
    },
    onSuccess: (status) => {
      triggerImpact('medium');
      queryClient.invalidateQueries({ queryKey: ['/api/queue/user'] });
      setSelectedBoss(null);
      setSearch("");
      onQueueJoined(status.bossId);
      onClose();
    },
  });

  if (!isOpen) return null;

  const bossesToShow = activeBosses || BOSSES;
  const filteredBosses = bossesToShow.filter((boss) =>
    boss.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedBoss) {
      joinQueueMutation.mutate(selectedBoss.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-card border border-card-border rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          data-testid="button-close-auto-join"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black">Auto Match</h2>
          <p className="text-muted-foreground text-sm">
            Select a boss to join the queue for auto-matching
          </p>
          {isPremium && (
            <div className="inline-flex items-center gap-1 mt-2 bg-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              PRIORITY QUEUE
            </div>
          )}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search Pokémon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-boss"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {loadingBosses ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBosses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No Pokémon found</p>
            </div>
          ) : (
            filteredBosses.map((boss) => (
              <button
                key={boss.id}
                onClick={() => setSelectedBoss(boss as Boss)}
                className={cn(
                  "w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left",
                  selectedBoss?.id === boss.id
                    ? "bg-indigo-600/20 border-2 border-indigo-500"
                    : "bg-muted/50 border-2 border-transparent hover:border-muted"
                )}
                data-testid={`auto-join-boss-${boss.id}`}
              >
                <SafeImage
                  src={boss.image}
                  alt={boss.name}
                  className="w-12 h-12 rounded-lg bg-card"
                  fallbackChar={boss.name[0]}
                />
                <div className="flex-1">
                  <span className="font-bold block">{boss.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Tier {boss.tier} • CP {boss.cp.toLocaleString()}
                  </span>
                </div>
                {selectedBoss?.id === boss.id && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!selectedBoss || joinQueueMutation.isPending}
          className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
          data-testid="button-confirm-auto-join"
        >
          {joinQueueMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              JOINING QUEUE...
            </>
          ) : (
            <>
              <Radar className="w-5 h-5 mr-2" />
              {selectedBoss ? `JOIN QUEUE FOR ${selectedBoss.name.toUpperCase()}` : "SELECT A BOSS"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
