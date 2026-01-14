import { useState, useCallback, useEffect, useRef } from "react";
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
import { PremiumModal } from "@/components/premium-modal";
import { QueueStatusModal } from "@/components/queue-status-modal";
import { FeedbackModal } from "@/components/feedback-modal";
import { PrivacyPage } from "@/pages/privacy";
import { TermsPage } from "@/pages/terms";
import { AboutPage } from "@/pages/about";
import { AdminPage } from "@/pages/admin";
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";
import { triggerImpact } from "@/lib/haptics";
import { playClickSound } from "@/lib/sounds";
import { registerForPushNotifications, unregisterPushNotifications, setupNotificationListeners, showLocalNotification } from "@/lib/notifications";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BOSSES } from "@shared/schema";
import type { Lobby, Player, FilterType } from "@shared/schema";

type ViewType = "join" | "host" | "shop" | "profile" | "lobby";
type LegalPage = "privacy" | "terms" | "about" | "admin" | null;

export default function Home() {
  const { user, isLoading: userLoading, addRaidToHistory } = useUser();
  const { toast } = useToast();
  const [view, setView] = useState<ViewType>("join");
  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showPremium, setShowPremium] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackLobby, setFeedbackLobby] = useState<Lobby | null>(null);
  const [legalPage, setLegalPage] = useState<LegalPage>(null);
  const [showQueueStatus, setShowQueueStatus] = useState(false);
  const [queueBossId, setQueueBossId] = useState<string | null>(null);
  
  /**
   * SCROLL RESET BEHAVIOR
   * 
   * Reference to the main content scrollable area.
   * Used to scroll to top when navigating between views.
   * This ensures users always start at the top of each page,
   * preventing confusion from opening pages mid-scroll.
   */
  const mainContentRef = useRef<HTMLElement>(null);
  
  /**
   * SCROLL TO TOP ON VIEW CHANGE
   * 
   * Whenever the view changes (join, host, shop, profile, lobby),
   * automatically scroll the main content area to the top.
   * This provides consistent navigation UX across all pages.
   * 
   * Uses 'auto' behavior for instant scroll without animation.
   * Valid ScrollBehavior values: 'auto' | 'smooth'
   */
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [view]);

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

  const pushEnabled = user?.notifications?.pushEnabled !== false;

  // Initialize push notifications
  useEffect(() => {
    if (!user) return;
    
    const initPushNotifications = async () => {
      if (pushEnabled) {
        await registerForPushNotifications(user.id);
      } else {
        await unregisterPushNotifications();
      }
    };
    
    initPushNotifications();
    
    const cleanup = setupNotificationListeners((notification) => {
      if (hapticEnabled) triggerImpact('medium');
      showLocalNotification(notification.title, notification.body, notification.data);
      
      if (notification.type === 'raid_starting' && notification.data?.lobbyId) {
        toast({
          title: notification.title,
          description: notification.body,
        });
      }
    });
    
    return cleanup;
  }, [user, pushEnabled]);

  const joinLobbyMutation = useMutation({
    mutationFn: async ({ lobbyId, player }: { lobbyId: string; player: Player }) => {
      const res = await apiRequest("POST", `/api/lobbies/${lobbyId}/join`, player);
      return res.json();
    },
    onSuccess: async (data) => {
      setActiveLobby(data);
      setView("lobby");
      queryClient.invalidateQueries({ queryKey: ["/api/lobbies"] });
      const boss = BOSSES.find(b => b.id === data.bossId);
      toast({ title: "Joined Lobby!", description: `You joined ${boss?.name || 'the'} raid` });
      
      if (user && data.hostId !== user.id) {
        try {
          await apiRequest("POST", `/api/push/notify/host/${data.hostId}`, {
            type: 'lobby_joined',
            playerName: user.name,
            lobbyId: data.id,
            senderId: user.id,
          });
        } catch (e) {
          console.log('Failed to notify host', e);
        }
      }
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

  const startRaidMutation = useMutation({
    mutationFn: async ({ lobbyId, hostId }: { lobbyId: string; hostId: string }) => {
      const res = await apiRequest("PATCH", `/api/lobbies/${lobbyId}/start-raid`, { hostId });
      return res.json();
    },
    onSuccess: async (data: Lobby) => {
      setActiveLobby(data);
      queryClient.invalidateQueries({ queryKey: ["/api/lobbies"] });
      toast({ title: "Raid Started!", description: "All players have been notified" });
      
      try {
        await apiRequest("POST", `/api/push/notify/lobby/${data.id}`, {
          type: 'raid_starting',
          senderId: user?.id,
        });
      } catch (e) {
        console.log('Failed to send push notifications', e);
      }
      
      const boss = BOSSES.find(b => b.id === data.bossId);
      if (boss && user && data.hostId === user.id) {
        addRaidToHistory({
          id: `raid-${Date.now()}`,
          bossId: data.bossId,
          bossName: boss.name,
          completedAt: Date.now(),
          wasHost: true,
          playerCount: data.players.length,
        });
      }
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

  const handleLeaveLobby = useCallback(() => {
    if (!user || !activeLobby) return;
    
    if (activeLobby.raidStarted && !activeLobby.players.find(p => p.id === user.id)?.isHost) {
      setFeedbackLobby(activeLobby);
      setShowFeedback(true);
    }
    
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

  const handleStartRaid = useCallback(() => {
    if (!user || !activeLobby) return;
    startRaidMutation.mutate({ lobbyId: activeLobby.id, hostId: user.id });
  }, [user, activeLobby, startRaidMutation]);

  const handleQueueJoined = useCallback((bossId: string) => {
    setQueueBossId(bossId);
    setShowQueueStatus(true);
    const boss = BOSSES.find(b => b.id === bossId);
    toast({ 
      title: `Joined Queue!`, 
      description: `Waiting for ${boss?.name || 'raid'} lobby...` 
    });
  }, [toast]);

  const handleQueueMatched = useCallback((lobbyId: string) => {
    setShowQueueStatus(false);
    setQueueBossId(null);
    
    const lobby = lobbies.find(l => l.id === lobbyId);
    if (lobby) {
      handleJoinLobby(lobby);
    } else {
      refetch().then(() => {
        const freshLobby = lobbies.find(l => l.id === lobbyId);
        if (freshLobby) {
          handleJoinLobby(freshLobby);
        }
      });
    }
  }, [lobbies, handleJoinLobby, refetch]);

  const handleNavigateLegal = useCallback((page: 'privacy' | 'terms' | 'about' | 'admin') => {
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
  if (legalPage === 'admin') {
    return <AdminPage onBack={() => setLegalPage(null)} />;
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Header onPremiumClick={() => setShowPremium(true)} />
      
      <main ref={mainContentRef} className="flex-1 overflow-y-auto overscroll-contain pb-24">
        {view === "join" && (
          <JoinFeed
            lobbies={lobbies}
            loading={lobbiesLoading}
            filter={filter}
            setFilter={setFilter}
            isPremium={user.isPremium}
            onJoin={handleJoinLobby}
            onRefresh={async () => { await refetch(); }}
            userId={user.id}
            userName={user.name}
            userLevel={user.level}
            userTeam={user.team}
            friendCode={user.code}
            onQueueJoined={handleQueueJoined}
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
        {view === "lobby" && activeLobby && (
          <LobbyView
            lobby={activeLobby}
            isHost={activeLobby.hostId === user.id}
            onLeave={handleLeaveLobby}
            onUpdateLobby={handleUpdateLobby}
            onStartRaid={handleStartRaid}
          />
        )}
      </main>

      <BottomNav currentView={view} setView={setView} hasActiveLobby={!!activeLobby} />

      <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />
      <QueueStatusModal
        isOpen={showQueueStatus}
        onClose={() => {
          setShowQueueStatus(false);
          setQueueBossId(null);
        }}
        userId={user.id}
        bossId={queueBossId || ''}
        onMatched={handleQueueMatched}
      />

      {feedbackLobby && user && (
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => {
            setShowFeedback(false);
            setFeedbackLobby(null);
          }}
          lobby={feedbackLobby}
          userId={user.id}
        />
      )}
    </div>
  );
}
