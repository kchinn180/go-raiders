import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { Onboarding } from "@/components/onboarding";
import { JoinFeed } from "@/components/join-feed";
import { HostView } from "@/components/host-view";
import { LobbyView } from "@/components/lobby-view";
import { ShopView } from "@/components/shop-view";
import { SettingsView } from "@/components/settings-view";
import { DailyChallenge } from "@/components/daily-challenge";
import { PremiumModal } from "@/components/premium-modal";
import { AutoJoinModal } from "@/components/auto-join-modal";
import { PrivacyPage } from "@/pages/privacy";
import { TermsPage } from "@/pages/terms";
import { AboutPage } from "@/pages/about";
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";
import { triggerImpact } from "@/lib/haptics";
import { playClickSound } from "@/lib/sounds";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BOSSES } from "@shared/schema";
import type { Lobby, Player, Boss, FilterType } from "@shared/schema";

type ViewType = "join" | "host" | "shop" | "profile" | "lobby" | "daily";
type LegalPage = "privacy" | "terms" | "about" | null;

export default function Home() {
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [view, setView] = useState<ViewType>("join");
  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showPremium, setShowPremium] = useState(false);
  const [showAutoJoin, setShowAutoJoin] = useState(false);
  const [legalPage, setLegalPage] = useState<LegalPage>(null);

  const { data: lobbies = [], isLoading: lobbiesLoading, refetch } = useQuery<Lobby[]>({
    queryKey: ["/api/lobbies"],
    refetchInterval: 5000,
  });

  // Keep active lobby refreshed when user navigates around
  const { data: refreshedLobby } = useQuery<Lobby>({
    queryKey: ["/api/lobbies", activeLobby?.id],
    refetchInterval: 3000,
    enabled: !!activeLobby && view !== "lobby",
  });

  // Update active lobby with refreshed data when navigating
  useEffect(() => {
    if (refreshedLobby && activeLobby && refreshedLobby.id === activeLobby.id && view !== "lobby") {
      setActiveLobby(refreshedLobby);
    }
  }, [refreshedLobby, view]);

  const joinLobbyMutation = useMutation({
    mutationFn: async ({ lobbyId, player }: { lobbyId: string; player: Player }) => {
      const res = await apiRequest("POST", `/api/lobbies/${lobbyId}/join`, player);
      return res.json();
    },
    onSuccess: (data) => {
      setActiveLobby(data);
      setView("lobby");
      queryClient.invalidateQueries({ queryKey: ["/api/lobbies"] });
      const boss = BOSSES.find(b => b.id === data.bossId);
      toast({ title: "Joined Lobby!", description: `You joined ${boss?.name || 'the'} raid` });
    },
    onError: () => {
      toast({ title: "Failed to join", description: "The lobby may be full", variant: "destructive" });
    },
  });

  const createLobbyMutation = useMutation({
    mutationFn: async (lobby: Omit<Lobby, "id" | "createdAt">) => {
      const res = await apiRequest("POST", "/api/lobbies", lobby);
      return res.json();
    },
    onSuccess: (data) => {
      setActiveLobby(data);
      setView("lobby");
      queryClient.invalidateQueries({ queryKey: ["/api/lobbies"] });
      toast({ title: "Raid Published!", description: "Your lobby is now visible to other trainers" });
    },
    onError: () => {
      toast({ title: "Failed to create lobby", variant: "destructive" });
    },
  });

  const updateReadyMutation = useMutation({
    mutationFn: async ({ lobbyId, playerId, isReady }: { lobbyId: string; playerId: string; isReady: boolean }) => {
      const res = await apiRequest("PATCH", `/api/lobbies/${lobbyId}/ready`, { playerId, isReady });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveLobby(data);
    },
  });

  const markSentRequestMutation = useMutation({
    mutationFn: async ({ lobbyId, playerId }: { lobbyId: string; playerId: string }) => {
      const res = await apiRequest("PATCH", `/api/lobbies/${lobbyId}/sent-request`, { playerId });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveLobby(data);
      toast({ title: "Marked as Sent", description: "Host has been notified" });
    },
  });

  const leaveLobbyMutation = useMutation({
    mutationFn: async ({ lobbyId, playerId }: { lobbyId: string; playerId: string }) => {
      const res = await apiRequest("POST", `/api/lobbies/${lobbyId}/leave`, { playerId });
      return res.json();
    },
    onSuccess: () => {
      setActiveLobby(null);
      setView("join");
      queryClient.invalidateQueries({ queryKey: ["/api/lobbies"] });
    },
  });

  const hapticEnabled = user?.notifications?.hapticFeedback !== false;
  const soundEnabled = user?.notifications?.soundEffects !== false;

  const handleJoinLobby = useCallback((lobby: Lobby) => {
    if (!user) return;
    
    // Prevent joining if already in a lobby
    if (activeLobby) {
      toast({ 
        title: "Already in a Lobby", 
        description: "Leave your current lobby before joining another",
        variant: "destructive"
      });
      return;
    }
    
    if (hapticEnabled) triggerImpact('medium');
    if (soundEnabled) playClickSound();
    
    const myPlayer: Player = {
      id: user.id,
      name: user.name,
      level: user.level,
      team: user.team,
      isReady: false,
      isPremium: user.isPremium,
      friendCode: user.code,
    };

    joinLobbyMutation.mutate({ lobbyId: lobby.id, player: myPlayer });
  }, [user, joinLobbyMutation, activeLobby, toast, hapticEnabled, soundEnabled]);

  const handleHostLobby = useCallback((lobby: Lobby) => {
    // Prevent hosting if already in a lobby
    if (activeLobby) {
      toast({ 
        title: "Already in a Lobby", 
        description: "Leave your current lobby before hosting a new raid",
        variant: "destructive"
      });
      return;
    }
    if (hapticEnabled) triggerImpact('heavy');
    if (soundEnabled) playClickSound();
    createLobbyMutation.mutate(lobby);
  }, [createLobbyMutation, activeLobby, toast, hapticEnabled, soundEnabled]);

  const handleQuickRaid = useCallback(async () => {
    if (!user || activeLobby) {
      if (activeLobby) {
        toast({ 
          title: "Already in a Lobby", 
          description: "Leave your current lobby first",
          variant: "destructive"
        });
      }
      return;
    }
    
    if (hapticEnabled) triggerImpact('medium');
    if (soundEnabled) playClickSound();
    
    try {
      const res = await fetch('/api/lobbies');
      const freshLobbies = await res.json();
      const availableLobby = freshLobbies.find((l: Lobby) => l.players.length < l.maxPlayers);
      
      if (availableLobby) {
        handleJoinLobby(availableLobby);
      } else {
        toast({ 
          title: "No raids available", 
          description: "Try hosting your own raid!",
          variant: "destructive"
        });
      }
    } catch {
      toast({ 
        title: "Connection error", 
        description: "Please try again",
        variant: "destructive"
      });
    }
  }, [user, activeLobby, handleJoinLobby, toast, hapticEnabled, soundEnabled]);

  const handleLeaveLobby = useCallback(() => {
    if (!user || !activeLobby) return;
    leaveLobbyMutation.mutate({ lobbyId: activeLobby.id, playerId: user.id });
  }, [user, activeLobby, leaveLobbyMutation]);

  const handleUpdateLobby = useCallback((updatedLobby: Lobby) => {
    if (!user || !activeLobby) return;
    
    const myPlayer = updatedLobby.players.find(p => p.id === user.id);
    const originalPlayer = activeLobby.players.find(p => p.id === user.id);
    
    if (myPlayer && originalPlayer && myPlayer.isReady !== originalPlayer.isReady) {
      updateReadyMutation.mutate({
        lobbyId: updatedLobby.id,
        playerId: user.id,
        isReady: myPlayer.isReady,
      });
    } else if (myPlayer?.hasSentRequest && !originalPlayer?.hasSentRequest) {
      markSentRequestMutation.mutate({
        lobbyId: updatedLobby.id,
        playerId: user.id,
      });
    } else {
      setActiveLobby(updatedLobby);
    }
  }, [user, activeLobby, updateReadyMutation, markSentRequestMutation]);

  const handleAutoJoin = useCallback(() => {
    if (user?.isPremium) {
      setShowAutoJoin(true);
    } else {
      setShowPremium(true);
    }
  }, [user]);

  const handleAutoJoinSelect = useCallback((boss: Boss) => {
    if (!user) return;
    
    setShowAutoJoin(false);
    toast({ title: `Searching for ${boss.name}...` });

    setTimeout(() => {
      const autoLobby: Lobby = {
        id: `autojoin-${Date.now()}`,
        bossId: boss.id,
        hostId: "priority-host",
        hostName: "EliteHost",
        hostRating: "5.0",
        players: [
          {
            id: "priority-host",
            name: "EliteHost",
            level: 50,
            team: "valor",
            isReady: true,
            isHost: true,
            isPremium: true,
            friendCode: "1234 5678 9012",
          },
          {
            id: user.id,
            name: user.name,
            level: user.level,
            team: user.team,
            isReady: false,
            isPremium: user.isPremium,
            friendCode: user.code,
          },
        ],
        maxPlayers: 6,
        team: "valor",
        minLevel: 1,
        weather: true,
        createdAt: Date.now(),
        timeLeft: 45,
      };

      setActiveLobby(autoLobby);
      setView("lobby");
      toast({ title: `Joined ${boss.name} Queue!`, description: "You've been placed in a priority lobby" });
    }, 1500);
  }, [user, toast]);

  const handleNavigateLegal = useCallback((page: 'privacy' | 'terms' | 'about') => {
    setLegalPage(page);
  }, []);

  if (userLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Onboarding />;
  }

  // Show legal pages
  if (legalPage === 'privacy') {
    return <PrivacyPage onBack={() => setLegalPage(null)} />;
  }
  if (legalPage === 'terms') {
    return <TermsPage onBack={() => setLegalPage(null)} />;
  }
  if (legalPage === 'about') {
    return <AboutPage onBack={() => setLegalPage(null)} />;
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Header onPremiumClick={() => setShowPremium(true)} />
      
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {view === "join" && (
          <JoinFeed
            lobbies={lobbies}
            loading={lobbiesLoading}
            filter={filter}
            setFilter={setFilter}
            isPremium={user.isPremium}
            onJoin={handleJoinLobby}
            onAutoJoin={handleAutoJoin}
            onQuickRaid={handleQuickRaid}
            onDailyReward={() => setView("daily")}
          />
        )}
        {view === "host" && <HostView onHost={handleHostLobby} />}
        {view === "shop" && <ShopView onUpgrade={() => setShowPremium(true)} />}
        {view === "profile" && (
          <SettingsView 
            onNavigate={handleNavigateLegal} 
            onPremiumClick={() => setShowPremium(true)} 
          />
        )}
        {view === "daily" && <DailyChallenge />}
        {view === "lobby" && activeLobby && (
          <LobbyView
            lobby={activeLobby}
            isHost={activeLobby.hostId === user.id}
            onLeave={handleLeaveLobby}
            onUpdateLobby={handleUpdateLobby}
          />
        )}
      </main>

      <BottomNav currentView={view} setView={setView} hasActiveLobby={!!activeLobby} />

      <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />
      <AutoJoinModal
        isOpen={showAutoJoin}
        onClose={() => setShowAutoJoin(false)}
        onSelect={handleAutoJoinSelect}
      />
    </div>
  );
}
