import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SplashScreen } from "@/components/splash-screen";
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
import { CatchLogModal } from "@/components/catch-log-modal";
import { PrivacyPage } from "@/pages/privacy";
import { TermsPage } from "@/pages/terms";
import { AboutPage } from "@/pages/about";
import { AdminPage } from "@/pages/admin";
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";
import { triggerImpact } from "@/lib/haptics";
import { playClickSound } from "@/lib/sounds";
import { registerForPushNotifications, registerWebPush, unregisterPushNotifications, setupNotificationListeners, showLocalNotification } from "@/lib/notifications";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BOSSES } from "@shared/schema";
import type { Lobby, Player, FilterType } from "@shared/schema";
import { isTestRaidsEnabled, generateTestLobbies } from "@/lib/test-raids";
import { initAdMob, showBannerAd, hideBannerAd } from "@/lib/ad-service";
import { purchaseSubscription, REMOVE_ADS_PRODUCT } from "@/lib/subscription";
import { PurchaseThankYouModal } from "@/components/purchase-thank-you-modal";

type ViewType = "join" | "host" | "shop" | "profile" | "lobby";
type LegalPage = "privacy" | "terms" | "about" | "admin" | null;

const SPLASH_MIN_MS = 2200; // minimum time the splash shows so animations play

export default function Home() {
  const { user, isLoading: userLoading, addRaidToHistory } = useUser();
  const { toast } = useToast();

  // Show splash for at least SPLASH_MIN_MS even if userLoading resolves instantly
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  const [view, setView] = useState<ViewType>("join");
  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showPremium, setShowPremium] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackLobby, setFeedbackLobby] = useState<Lobby | null>(null);
  const [legalPage, setLegalPage] = useState<LegalPage>(null);
  const [showQueueStatus, setShowQueueStatus] = useState(false);
  const [queueBossId, setQueueBossId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showCatchLog, setShowCatchLog] = useState(false);
  const [catchLogLobbyId, setCatchLogLobbyId] = useState<string>("");
  const [catchLogBossId, setCatchLogBossId] = useState<string>("");
  const [showRemoveAdsThankYou, setShowRemoveAdsThankYou] = useState(false);

  // Test raids: re-generate whenever the admin toggles the flag
  // We subscribe to localStorage changes via a version counter
  const [testRaidsVersion, setTestRaidsVersion] = useState(0);
  
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

  const { data: lobbies = [], isLoading: lobbiesLoading, isFetching: lobbiesFetching, refetch } = useQuery<Lobby[]>({
    queryKey: ["/api/lobbies"],
    refetchInterval: autoRefresh ? 15000 : false,
  });

  // Test raids: only shown when explicitly enabled from the admin panel toggle.
  // Demo/auto-fill mode is disabled — the feed shows real lobbies only.
  const isDemoMode = false;
  const testLobbies: Lobby[] = useMemo(
    () => isTestRaidsEnabled() ? generateTestLobbies() : [],
    [testRaidsVersion]
  );

  // Keep active lobby refreshed when user navigates around
  const { data: refreshedLobby, error: refreshedLobbyError } = useQuery<Lobby>({
    queryKey: ["/api/lobbies", activeLobby?.id],
    refetchInterval: 3000,
    enabled: !!activeLobby && view !== "lobby",
    retry: 1,
  });

  // Update active lobby with refreshed data when navigating away from the lobby view.
  // Guard: only update if the player count or raid status changed, to avoid
  // triggering re-renders (and cascading WebSocket reconnects) on every 3s poll.
  useEffect(() => {
    if (
      refreshedLobby &&
      activeLobby &&
      refreshedLobby.id === activeLobby.id &&
      view !== "lobby" &&
      (refreshedLobby.players.length !== activeLobby.players.length ||
        refreshedLobby.raidStarted !== activeLobby.raidStarted ||
        refreshedLobby.invitesSent !== activeLobby.invitesSent)
    ) {
      setActiveLobby(refreshedLobby);
    }
  }, [refreshedLobby, view]);

  // Auto-eject: if the lobby query errors (404 = server deleted it), clear state
  useEffect(() => {
    if (refreshedLobbyError && activeLobby && view !== "lobby") {
      setActiveLobby(null);
      toast({ title: "Lobby Expired", description: "The raid lobby has ended" });
    }
  }, [refreshedLobbyError]);

  // Time-based expiry: auto-eject if 15 minutes have passed since lobby creation
  const LOBBY_LIFESPAN_MS = 15 * 60 * 1000;
  useEffect(() => {
    if (!activeLobby) return;
    // Skip test lobbies
    if (activeLobby.id.startsWith('test-')) return;

    const checkExpiry = () => {
      const age = Date.now() - activeLobby.createdAt;
      if (age >= LOBBY_LIFESPAN_MS) {
        setActiveLobby(null);
        setView("join");
        toast({ title: "Lobby Expired", description: "The 15-minute window has closed" });
      }
    };

    checkExpiry(); // check immediately on mount
    const interval = setInterval(checkExpiry, 5000);
    return () => clearInterval(interval);
  }, [activeLobby?.id, activeLobby?.createdAt]);

  const pushEnabled = user?.notifications?.pushEnabled !== false;

  // Initialize push notifications.
  // Only re-run when the user's ID changes (login/logout) or push preference toggles.
  // Using user.id instead of the full user object prevents re-registration on every
  // state update (coins, lobby changes, etc.).
  useEffect(() => {
    if (!user?.id) return;

    const initPushNotifications = async () => {
      if (pushEnabled) {
        await registerForPushNotifications(user.id);
        // Also register web push (browser service worker) so notifications
        // appear even when the tab is closed / app is in the background.
        await registerWebPush(user.id);
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
  }, [user?.id, pushEnabled]); // ← stable primitives, not the whole user object

  // Boot AdMob and manage banner based on premium/remove-ads status
  useEffect(() => {
    if (!user) return;
    const hasRemovedAds = (user?.subscription as any)?.hasRemovedAds === true;
    initAdMob().then(() => {
      if (!user.isPremium && !hasRemovedAds) {
        showBannerAd(user.id);
      } else {
        hideBannerAd(); // remove if user upgrades or purchases remove-ads mid-session
      }
    });
    return () => { hideBannerAd(); };
  }, [user?.id, user?.isPremium, (user?.subscription as any)?.hasRemovedAds]);

  const handleRemoveAds = useCallback(async () => {
    if (!user) return;
    triggerImpact('medium');
    try {
      const result = await purchaseSubscription(user.id, REMOVE_ADS_PRODUCT);
      if (result.success) {
        // Refresh user data so the shop and ad state update immediately
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        // Show the verified thank-you popup (only fires on confirmed server verification)
        setShowRemoveAdsThankYou(true);
      } else if (result.error && result.error !== 'Purchase cancelled by user') {
        toast({ title: "Purchase Failed", description: result.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Purchase Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  }, [user, toast]);

  const joinLobbyMutation = useMutation({
    mutationFn: async ({ lobbyId, player }: { lobbyId: string; player: Player }) => {
      const { getApiUrl } = await import("@/lib/queryClient");
      const { Capacitor } = await import("@capacitor/core");
      const url = getApiUrl(`/api/lobbies/${lobbyId}/join`);
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(player),
          credentials: Capacitor.isNativePlatform() ? "omit" : "include",
        });
      } catch {
        throw new Error("Could not reach server — check your internet connection");
      }
      if (!res.ok) {
        let msg = "Couldn't join — lobby may be full";
        try {
          const data = await res.json();
          // 410 Gone = lobby has expired (10-minute server limit)
          if (res.status === 410) msg = data.message || "This lobby has expired.";
          else msg = data.message || data.error || msg;
        } catch {}
        throw new Error(msg);
      }
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
    onError: (error: Error) => {
      toast({ title: "Couldn't Join", description: error.message, variant: "destructive" });
    },
  });

  const createLobbyMutation = useMutation({
    mutationFn: async (lobby: Omit<Lobby, "id" | "createdAt">) => {
      // Use raw fetch so we can handle both network errors and server errors
      // with descriptive messages rather than the opaque "Load failed" from apiRequest.
      const { getApiUrl } = await import("@/lib/queryClient");
      const { Capacitor } = await import("@capacitor/core");
      const url = getApiUrl("/api/lobbies");
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lobby),
          credentials: Capacitor.isNativePlatform() ? "omit" : "include",
        });
      } catch (networkErr: any) {
        // Network-level failure (no connection, DNS, SSL, etc.)
        throw new Error("Could not reach server — check your internet connection");
      }
      if (!res.ok) {
        let msg = "Failed to create lobby";
        try {
          const data = await res.json();
          msg = data.message || data.error || msg;
        } catch {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setActiveLobby(data);
      setView("lobby");
      queryClient.invalidateQueries({ queryKey: ["/api/lobbies"] });
      toast({ title: "Raid Published!", description: "Your lobby is now visible to other trainers" });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot host raid", description: error.message, variant: "destructive" });
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
    onSuccess: (data) => {
      setActiveLobby(null);
      setView("join");
      queryClient.invalidateQueries({ queryKey: ["/api/lobbies"] });
      if (data?.deleted) {
        toast({ title: "Lobby Closed", description: "The raid lobby has been closed" });
      }
    },
    onError: () => {
      toast({ title: "Failed to leave", description: "Please try again", variant: "destructive" });
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
      // Show catch log modal for premium users after a short delay
      if (user?.isPremium && data.bossId) {
        setTimeout(() => {
          setCatchLogBossId(data.bossId);
          setCatchLogLobbyId(data.id);
          setShowCatchLog(true);
        }, 3000);
      }
    },
  });

  const hapticEnabled = user?.notifications?.hapticFeedback !== false;
  const soundEnabled = user?.notifications?.soundEffects !== false;

  const handleJoinLobby = useCallback((lobby: Lobby) => {
    if (!user) return;

    // Prevent joining if already in a lobby
    if (activeLobby) {
      toast({ title: "Already in a Lobby", variant: "destructive" });
      return;
    }

    if (hapticEnabled) triggerImpact('medium');
    if (soundEnabled) playClickSound();

    // ── Test lobbies are local-only — bypass the server entirely ─────────────
    if (lobby.id.startsWith('test-')) {
      const myPlayer: Player = {
        id: user.id,
        name: user.name,
        level: user.level,
        team: user.team,
        isReady: false,
        isPremium: user.isPremium,
        friendCode: user.code,
        hasSentRequest: false,
      };
      // Add the real user into the fake player list so they appear in the view
      const alreadyIn = lobby.players.some(p => p.id === user.id);
      const testLobby: Lobby = {
        ...lobby,
        players: alreadyIn ? lobby.players : [...lobby.players, myPlayer],
      };
      setActiveLobby(testLobby);
      setView("lobby");
      const boss = BOSSES.find(b => b.id === lobby.bossId);
      toast({ title: `Joined ${boss?.name || 'raid'} (test)` });
      return;
    }

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

    // Test lobbies are local-only — no server record to call
    if (activeLobby.id.startsWith('test-')) {
      setActiveLobby(null);
      setView("join");
      return;
    }

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

    const tryJoin = (lobbyList: Lobby[]) => {
      const lobby = lobbyList.find(l => l.id === lobbyId);
      if (lobby) handleJoinLobby(lobby);
    };

    const cached = lobbies.find(l => l.id === lobbyId);
    if (cached) {
      handleJoinLobby(cached);
    } else {
      // Fetch fresh data and read it from the cache — avoids stale-closure on `lobbies`
      refetch().then(() => {
        const fresh = queryClient.getQueryData<Lobby[]>(["/api/lobbies"]) ?? [];
        tryJoin(fresh);
      });
    }
  }, [lobbies, handleJoinLobby, refetch]);

  const handleNavigateLegal = useCallback((page: 'privacy' | 'terms' | 'about' | 'admin') => {
    setLegalPage(page);
  }, []);

  if (userLoading || !splashDone) {
    return <SplashScreen />;
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
    <div className="h-dvh bg-background text-foreground flex flex-col overflow-hidden">
      <Header onPremiumClick={() => setShowPremium(true)} />

      <main ref={mainContentRef} className="flex-1 overflow-y-auto overscroll-contain pb-nav">
        {view === "join" && (
          <JoinFeed
            lobbies={[...lobbies, ...testLobbies]}
            loading={lobbiesLoading}
            isFetching={lobbiesFetching}
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
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={() => setAutoRefresh(p => !p)}
            onHostClick={() => setView("host")}
            isDemoMode={isDemoMode}
          />
        )}
        {view === "host" && <HostView onHost={handleHostLobby} isPending={createLobbyMutation.isPending} />}
        {view === "shop" && <ShopView onUpgrade={() => setShowPremium(true)} onRemoveAds={handleRemoveAds} />}
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

      <PremiumModal
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
        onOpenTerms={() => { setShowPremium(false); setLegalPage("terms"); }}
        onOpenPrivacy={() => { setShowPremium(false); setLegalPage("privacy"); }}
      />
      <PurchaseThankYouModal
        isOpen={showRemoveAdsThankYou}
        variant="remove_ads"
        onClose={() => {
          setShowRemoveAdsThankYou(false);
          // Re-validate entitlements after the user dismisses the thank-you screen
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        }}
      />
      {user && (
        <CatchLogModal
          isOpen={showCatchLog}
          onClose={() => setShowCatchLog(false)}
          userId={user.id}
          bossId={catchLogBossId}
          lobbyId={catchLogLobbyId}
        />
      )}
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
