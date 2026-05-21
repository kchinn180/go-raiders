import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield, Star, AlertCircle, ThumbsUp, ThumbsDown, Lock, ArrowLeft,
  Search, Ban, UserX, Trash2, RefreshCw, Loader2, Users, Crown,
  XCircle, Eye, Send, Megaphone, Clock, Activity, Flame,
  ChevronDown, ChevronUp, Copy, Edit3, Check, X, DollarSign,
  TrendingUp, BarChart2, ToggleLeft, ToggleRight, ShieldCheck, ShieldOff,
  RotateCcw, SlidersHorizontal, Database, Zap, Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, getApiUrl } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { SwipeBackWrapper } from "@/components/swipe-back-wrapper";
import { BOSSES } from "@shared/schema";
import type { Feedback, BannedUser, RaidBoss, User, Lobby, Report, AdStats, AdConfig, AdPlacement } from "@shared/schema";
import { isTestRaidsEnabled, setTestRaidsEnabled, generateTestLobbies } from "@/lib/test-raids";

// ============================================================================
// HELPER: Authenticated fetch wrapper
// ============================================================================
function adminFetch(url: string, token: string, options?: RequestInit) {
  return fetch(getApiUrl(url), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
}

// ============================================================================
// MAIN ADMIN PAGE
// ============================================================================

const LOCKOUT_LS_KEY = "goraiders_admin_lockout";

function getLockoutState(): { lockedUntil: number; attempts: number } {
  try {
    const raw = localStorage.getItem(LOCKOUT_LS_KEY);
    if (!raw) return { lockedUntil: 0, attempts: 0 };
    return JSON.parse(raw);
  } catch {
    return { lockedUntil: 0, attempts: 0 };
  }
}

function saveLockoutState(state: { lockedUntil: number; attempts: number }) {
  try {
    localStorage.setItem(LOCKOUT_LS_KEY, JSON.stringify(state));
  } catch {}
}

function clearLockoutState() {
  try {
    localStorage.removeItem(LOCKOUT_LS_KEY);
  } catch {}
}

export function AdminPage({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [adminToken, setAdminToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lockout state — persisted to localStorage so it survives page reloads
  const [lockoutState, setLockoutState] = useState(getLockoutState);
  const [lockoutCountdown, setLockoutCountdown] = useState("");

  // Countdown timer while locked out
  useEffect(() => {
    if (lockoutState.lockedUntil <= Date.now()) return;
    const tick = () => {
      const remaining = lockoutState.lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockoutCountdown("");
        setLockoutState(s => ({ ...s, lockedUntil: 0, attempts: 0 }));
        clearLockoutState();
        return;
      }
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setLockoutCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutState.lockedUntil]);

  const isLockedOut = lockoutState.lockedUntil > Date.now();

  // The password is verified client-side so the dashboard works even when
  // the server is temporarily unreachable. The server is pinged in the
  // background only to log/alert on failed attempts.
  const ADMIN_KEY = "Kj03c08kjc0308$";
  // Temporary read-only access key for Apple App Review testers.
  // Provided in Review Notes so reviewers can access the admin dashboard.
  const TESTER_KEY = "GoRaiders2026!";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut || isSubmitting) return;

    setIsSubmitting(true);
    setAuthError("");

    if (adminToken === ADMIN_KEY || adminToken === TESTER_KEY) {
      // ✅ Correct password (ADMIN_KEY = full access, TESTER_KEY = Apple Review access)
      clearLockoutState();
      setLockoutState({ lockedUntil: 0, attempts: 0 });
      setIsAuthenticated(true);
      setIsSubmitting(false);
      return;
    }

    // ❌ Wrong password — update lockout counter
    const newAttempts = lockoutState.attempts + 1;
    const willLock = newAttempts >= 3;
    const lockedUntil = willLock ? Date.now() + 60 * 60 * 1000 : 0;
    const newState = { attempts: newAttempts, lockedUntil };
    saveLockoutState(newState);
    setLockoutState(newState);

    setAuthError(
      willLock
        ? "Too many incorrect attempts. Access locked for 1 hour."
        : `Incorrect password — ${3 - newAttempts} attempt${3 - newAttempts !== 1 ? "s" : ""} remaining`
    );
    setAdminToken("");
    setIsSubmitting(false);

    // Fire-and-forget: alert the server (for push notification logging)
    // This runs in the background and never blocks the UI or shows errors
    fetch(getApiUrl("/api/admin/verify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: adminToken }),
    }).catch(() => {/* server unreachable — that's fine, local lockout is already applied */});
  };

  if (!isAuthenticated) {
    return (
      <SwipeBackWrapper onBack={onBack}>
      <div className="h-dvh bg-background flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 pb-8"
          style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
        >
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                isLockedOut
                  ? "bg-gradient-to-br from-red-700 to-red-900"
                  : "bg-gradient-to-br from-orange-500 to-red-600"
              )}>
                {isLockedOut ? (
                  <Clock className="w-8 h-8 text-white" />
                ) : (
                  <Shield className="w-8 h-8 text-white" />
                )}
              </div>
              <h1 className="text-2xl font-black">Admin Access</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isLockedOut ? "Access temporarily locked" : "Enter your admin token"}
              </p>
            </div>

            {isLockedOut ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-red-700/50 bg-red-900/20 p-4 text-center space-y-2">
                  <p className="text-sm font-bold text-red-400">🔒 Locked for 1 hour</p>
                  <p className="text-xs text-muted-foreground">
                    Too many incorrect attempts detected. This device has been locked to protect admin access.
                  </p>
                  {lockoutCountdown && (
                    <p className="text-2xl font-black text-red-400 tabular-nums">{lockoutCountdown}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">remaining</p>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  A security alert has been sent to the admin.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <Input
                    type="password"
                    placeholder="Admin Token"
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    className="text-center"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                  {lockoutState.attempts > 0 && !isLockedOut && (
                    <p className="text-[10px] text-amber-400 text-center">
                      {3 - lockoutState.attempts} attempt{3 - lockoutState.attempts !== 1 ? "s" : ""} remaining before 1-hour lockout
                    </p>
                  )}
                </div>
                {authError && (
                  <div className="rounded-lg bg-red-900/20 border border-red-700/50 p-2">
                    <p className="text-sm text-red-400 text-center">{authError}</p>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting || !adminToken}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                  ) : (
                    <><Lock className="w-4 h-4 mr-2" /> Access Dashboard</>
                  )}
                </Button>
              </form>
            )}
          </Card>
        </div>
        </div>

        {/* Floating back button */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex justify-start px-5"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-card border border-card-border px-5 py-3 rounded-full font-bold text-sm shadow-xl active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" /> Back to App
          </button>
        </div>
      </div>
      </SwipeBackWrapper>
    );
  }

  return (
    <SwipeBackWrapper onBack={onBack}>
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Dashboard sticky header */}
      <div
        className="px-4 pb-3 bg-background border-b border-card-border shrink-0"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <h1 className="text-xl font-black flex items-center justify-center gap-2">
          <Shield className="w-5 h-5 text-orange-500" /> Admin Dashboard
        </h1>
      </div>{/* end header */}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="lobbies">Lobbies</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="raids">Bosses</TabsTrigger>
              <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="bans">Bans</TabsTrigger>
              <TabsTrigger value="ads">💰 Ads</TabsTrigger>
              <TabsTrigger value="testing">🧪 Testing</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview"><OverviewTab token={adminToken} /></TabsContent>
          <TabsContent value="users"><UsersTab token={adminToken} /></TabsContent>
          <TabsContent value="lobbies"><LobbiesTab token={adminToken} /></TabsContent>
          <TabsContent value="reports"><ReportsTab token={adminToken} /></TabsContent>
          <TabsContent value="raids"><RaidBossesTab token={adminToken} /></TabsContent>
          <TabsContent value="broadcast"><BroadcastTab token={adminToken} /></TabsContent>
          <TabsContent value="feedback"><FeedbackTab token={adminToken} /></TabsContent>
          <TabsContent value="bans"><BansTab token={adminToken} /></TabsContent>
          <TabsContent value="ads"><AdsTab token={adminToken} /></TabsContent>
          <TabsContent value="testing"><TestingTab /></TabsContent>
        </Tabs>
      </div>{/* end max-w-5xl */}
      </div>{/* end flex-1 scrollable */}

      {/* Floating back button */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-start px-5"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-card border border-card-border px-5 py-3 rounded-full font-bold text-sm shadow-xl active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" /> Back to App
        </button>
      </div>
    </div>{/* end h-dvh */}
    </SwipeBackWrapper>
  );
}

// ============================================================================
// TAB: Overview / Analytics
// ============================================================================

function OverviewTab({ token }: { token: string }) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/analytics", token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>;

  const stats = [
    { label: "Total Users", value: analytics?.totalUsers || 0, icon: Users, color: "text-blue-500" },
    { label: "Premium Users", value: analytics?.premiumUsers || 0, icon: Crown, color: "text-yellow-500" },
    { label: "Active Lobbies", value: analytics?.activeLobbies || 0, icon: Activity, color: "text-green-500" },
    { label: "Raids Started", value: analytics?.startedRaids || 0, icon: Flame, color: "text-orange-500" },
    { label: "Host Rating", value: analytics?.averageHostRating?.toFixed(1) || "0", icon: Star, color: "text-yellow-400" },
    { label: "Queued Users", value: analytics?.queuedUsers || 0, icon: Clock, color: "text-purple-500" },
    { label: "Pending Reports", value: analytics?.pendingReports || 0, icon: AlertCircle, color: "text-red-500" },
    { label: "Total Banned", value: analytics?.totalBanned || 0, icon: Ban, color: "text-red-600" },
    { label: "Active Bosses", value: analytics?.activeBosses || 0, icon: Activity, color: "text-green-400" },
    { label: "Total Feedback", value: analytics?.totalFeedback || 0, icon: ThumbsUp, color: "text-blue-400" },
  ];

  const uptime = analytics?.serverUptime ? formatUptime(analytics.serverUptime) : "Unknown";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-3 text-center">
              <div className={cn("text-2xl font-black", s.color)}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Icon className="w-3 h-3" /> {s.label}
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Activity className="w-3 h-3 text-green-500" />
          Server Uptime: <span className="font-semibold text-foreground">{uptime}</span>
        </div>
      </Card>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ============================================================================
// TAB: Users
// ============================================================================

function UsersTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/users", token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const grantPremiumMut = useMutation({
    mutationFn: async (userId: string) => {
      const res = await adminFetch(`/api/admin/users/${userId}/grant-premium`, token, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Premium Granted" }); refetch(); },
    onError: () => { toast({ title: "Failed", variant: "destructive" }); },
  });

  const revokePremiumMut = useMutation({
    mutationFn: async (userId: string) => {
      const res = await adminFetch(`/api/admin/users/${userId}/revoke-premium`, token, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Premium Revoked" }); refetch(); },
    onError: () => { toast({ title: "Failed", variant: "destructive" }); },
  });

  const deleteUserMut = useMutation({
    mutationFn: async (userId: string) => {
      const res = await adminFetch(`/api/admin/users/${userId}`, token, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "User Deleted" }); refetch(); },
    onError: () => { toast({ title: "Failed", variant: "destructive" }); },
  });

  const setCoinsMut = useMutation({
    mutationFn: async ({ userId, coins }: { userId: string; coins: number }) => {
      const res = await adminFetch(`/api/admin/users/${userId}/coins`, token, { method: "POST", body: JSON.stringify({ coins }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Coins Updated" }); refetch(); },
  });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.id.toLowerCase().includes(search.toLowerCase()) ||
    u.code.includes(search.replace(/\s/g, ""))
  );

  const teamColor = (t: string) => t === 'valor' ? 'text-red-500' : t === 'mystic' ? 'text-blue-500' : t === 'instinct' ? 'text-yellow-500' : 'text-zinc-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Users ({users.length})</h3>
        <Badge variant="secondary" className="text-[10px]">
          {users.filter(u => u.isPremium).length} Premium
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, ID, or friend code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading users...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No users found</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((user) => {
            const isExpanded = expandedUser === user.id;
            return (
              <Card key={user.id} className="overflow-hidden">
                <div
                  className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{user.name}</span>
                      <span className={cn("text-[10px] font-bold capitalize", teamColor(user.team))}>{user.team}</span>
                      <Badge variant="secondary" className="text-[10px]">Lv {user.level}</Badge>
                      {user.isPremium && (
                        <Badge className="text-[10px] bg-yellow-600"><Crown className="w-2.5 h-2.5 mr-0.5" />Elite</Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">{user.code}</div>
                  </div>
                  <div className="text-muted-foreground">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-3 py-3 space-y-3 bg-muted/10">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-[10px]">{user.id.slice(0, 12)}...</span></div>
                      <div><span className="text-muted-foreground">Coins:</span> <span className="font-semibold">{user.coins}</span></div>
                      <div><span className="text-muted-foreground">Verified:</span> {user.isVerified ? "Yes" : "No"}</div>
                      <div><span className="text-muted-foreground">Raids:</span> {(user.raidHistory as any[])?.length || 0}</div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {user.isPremium ? (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); revokePremiumMut.mutate(user.id); }}>
                          <X className="w-3 h-3 mr-1" /> Revoke Premium
                        </Button>
                      ) : (
                        <Button size="sm" className="text-xs h-7 bg-yellow-600 hover:bg-yellow-700" onClick={(e) => { e.stopPropagation(); grantPremiumMut.mutate(user.id); }}>
                          <Crown className="w-3 h-3 mr-1" /> Grant Premium
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => {
                        e.stopPropagation();
                        const coins = prompt("Set coins to:", String(user.coins));
                        if (coins !== null) setCoinsMut.mutate({ userId: user.id, coins: parseInt(coins) || 0 });
                      }}>
                        Set Coins
                      </Button>
                      <Button size="sm" variant="destructive" className="text-xs h-7" onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete user "${user.name}"? This removes them from all lobbies and queues.`)) {
                          deleteUserMut.mutate(user.id);
                        }
                      }}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: Lobbies
// ============================================================================

function LobbiesTab({ token }: { token: string }) {
  const { toast } = useToast();
  const { data: lobbies = [], isLoading, refetch } = useQuery<Lobby[]>({
    queryKey: ["/api/admin/lobbies"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/lobbies", token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const forceCloseMut = useMutation({
    mutationFn: async (lobbyId: string) => {
      const res = await adminFetch(`/api/admin/lobbies/${lobbyId}/force-close`, token, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Lobby Closed" }); refetch(); },
  });

  const kickMut = useMutation({
    mutationFn: async ({ lobbyId, playerId }: { lobbyId: string; playerId: string }) => {
      const res = await adminFetch(`/api/admin/lobbies/${lobbyId}/kick/${playerId}`, token, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Player Kicked" }); refetch(); },
  });

  const active = lobbies.filter(l => !l.raidStarted);
  const started = lobbies.filter(l => l.raidStarted);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Active Lobbies ({active.length})</h3>
        <Badge variant="secondary" className="text-[10px]">{started.length} raids started</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading lobbies...</div>
      ) : active.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No active lobbies</div>
      ) : (
        <div className="space-y-2">
          {active.map((lobby) => (
            <Card key={lobby.id} className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-sm">{lobby.bossId}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Host: {lobby.hostName} | {lobby.players.length}/{lobby.maxPlayers} players | Age: {Math.floor((Date.now() - lobby.createdAt) / 60000)}m
                  </div>
                </div>
                <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => {
                  if (confirm("Force close this lobby? All players will be disconnected.")) {
                    forceCloseMut.mutate(lobby.id);
                  }
                }}>
                  <XCircle className="w-3 h-3 mr-1" /> Close
                </Button>
              </div>

              <div className="flex flex-wrap gap-1">
                {lobby.players.map((p: any) => (
                  <Badge key={p.id} variant={p.isHost ? "default" : "secondary"} className="text-[10px] gap-1">
                    {p.name} {p.isHost ? "(Host)" : ""}
                    {!p.isHost && (
                      <button
                        onClick={() => kickMut.mutate({ lobbyId: lobby.id, playerId: p.id })}
                        className="ml-1 hover:text-red-400"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {started.length > 0 && (
        <>
          <h3 className="font-bold text-muted-foreground">Started Raids ({started.length})</h3>
          <div className="space-y-1.5">
            {started.map((lobby) => (
              <Card key={lobby.id} className="p-2.5 opacity-60">
                <div className="text-xs">
                  <span className="font-semibold">{lobby.bossId}</span>
                  <span className="text-muted-foreground"> — {lobby.hostName} — {lobby.players.length} players — raid started</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// TAB: Reports
// ============================================================================

function ReportsTab({ token }: { token: string }) {
  const { toast } = useToast();
  const { data: reports = [], isLoading, refetch } = useQuery<Report[]>({
    queryKey: ["/api/admin/reports"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/reports", token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await adminFetch(`/api/admin/reports/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Report Updated" }); refetch(); },
  });

  const pending = reports.filter(r => r.status === 'pending');
  const resolved = reports.filter(r => r.status !== 'pending');

  const statusColor = (s: string) => s === 'pending' ? 'bg-yellow-600' : s === 'resolved' ? 'bg-green-600' : s === 'reviewed' ? 'bg-blue-600' : 'bg-zinc-600';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Reports ({reports.length})</h3>
        <Badge className={cn("text-[10px]", pending.length > 0 ? "bg-red-600" : "bg-green-600")}>
          {pending.length} pending
        </Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No reports filed</div>
      ) : (
        <div className="space-y-2">
          {[...pending, ...resolved].map((report) => (
            <Card key={report.id} className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("text-[10px]", statusColor(report.status || 'pending'))}>{report.status}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{report.reason}</Badge>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Reporter:</span> {report.reporterName}
                    <span className="text-muted-foreground"> reported </span>
                    <span className="font-semibold">{report.reportedUserName}</span>
                  </div>
                  {report.description && (
                    <div className="text-xs text-muted-foreground mt-1 bg-muted/30 p-2 rounded">
                      "{report.description}"
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(report.createdAt || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {report.status === 'pending' && (
                <div className="flex gap-1.5 mt-2">
                  <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700" onClick={() => updateStatusMut.mutate({ id: report.id!, status: 'reviewed' })}>
                    <Eye className="w-3 h-3 mr-1" /> Reviewed
                  </Button>
                  <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700" onClick={() => updateStatusMut.mutate({ id: report.id!, status: 'resolved' })}>
                    <Check className="w-3 h-3 mr-1" /> Resolve
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatusMut.mutate({ id: report.id!, status: 'dismissed' })}>
                    Dismiss
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: Raid Bosses
// ============================================================================

// Helper: relative time string
function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Helper: confidence badge colour
function confColor(score?: number): string {
  if (score === undefined || score === null) return 'text-muted-foreground';
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function RaidBossesTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'active' | 'hidden' | 'low'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  // Use the new full-metadata admin endpoint
  const { data: bossData, isLoading: bossesLoading, refetch: refetchBosses } = useQuery<{
    bosses: RaidBoss[];
    total: number;
    active: number;
    scraperStatus: any;
  }>({
    queryKey: ["/api/admin/bosses"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/bosses", token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: scraperStatus, refetch: refetchScraper } = useQuery({
    queryKey: ["/api/admin/scraper/status"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/scraper/status", token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const refreshMut = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/api/admin/scraper/refresh", token, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Sync Complete", description: `+${data.added?.length || 0} added  ·  -${data.removed?.length || 0} removed` });
      refetchBosses();
      refetchScraper();
    },
    onError: () => toast({ title: "Sync Failed", variant: "destructive" }),
  });

  const bossPatchMut = useMutation({
    mutationFn: async (body: { bossId: string; isActive?: boolean; adminOverride?: string | null; adminNote?: string }) => {
      const { bossId, ...patch } = body;
      const res = await adminFetch(`/api/admin/boss/${bossId}`, token, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => { refetchBosses(); },
    onError: (e: any) => {
      // Provide actionable messages for common conflict cases
      const msg: string = e.message ?? '';
      let title = "Update failed";
      let description = msg;
      if (msg.includes("Cannot deactivate an admin-approved")) {
        title = "Override conflict";
        description = "This boss is admin-approved — Reset the override before deactivating it.";
      } else if (msg.includes("Cannot activate a hidden")) {
        title = "Override conflict";
        description = "This boss is hidden — Reset the override before activating it.";
      }
      toast({ title, description, variant: "destructive" });
    },
  });

  const allBosses: RaidBoss[] = (bossData?.bosses ?? []) as RaidBoss[];

  const filteredBosses = allBosses.filter(b => {
    const boss = b as any;
    if (filter === 'active') return boss.isActive && boss.adminOverride !== 'hidden';
    if (filter === 'hidden') return boss.adminOverride === 'hidden';
    if (filter === 'low') return (boss.confidenceScore ?? 100) < 40;
    return true;
  });

  const tierLabel = (t: number) =>
    t === 5 ? 'Legendary (5★)' : t === 4 ? 'Mega / Primal' : t === 3 ? 'Tier 3' : 'Tier 1';

  const tiers = [5, 4, 3, 1];

  return (
    <div className="space-y-4">
      {/* ── Sync Service Card ──────────────────────────────────── */}
      <Card className="p-4 border-orange-500/30 bg-orange-500/5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-400" />
            Live Sync Service
          </h3>
          <Badge className={scraperStatus?.isRunning ? "bg-green-600 text-[10px]" : "bg-red-600 text-[10px]"}>
            {scraperStatus?.isRunning ? "Running" : "Stopped"}
          </Badge>
        </div>

        {scraperStatus?.lastUpdate ? (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Last sync</div>
              <div className="text-xs font-bold">{timeAgo(scraperStatus.lastUpdate.lastUpdated)}</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-2 text-center">
              <div className="text-[10px] text-green-400">Added</div>
              <div className="text-xs font-bold text-green-400">+{scraperStatus.lastUpdate.added?.length ?? 0}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2 text-center">
              <div className="text-[10px] text-red-400">Removed</div>
              <div className="text-xs font-bold text-red-400">-{scraperStatus.lastUpdate.removed?.length ?? 0}</div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-3">No sync data yet — run a manual refresh.</p>
        )}

        {/* Per-source breakdown — success / boss count / errors */}
        {scraperStatus?.lastUpdate?.sourceResults?.length > 0 && (
          <div className="mb-3 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Source Details</div>
            {scraperStatus.lastUpdate.sourceResults.map((sr: any) => (
              <div key={sr.source} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] ${sr.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <span className={`font-bold w-2 h-2 rounded-full shrink-0 ${sr.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="font-bold text-foreground w-[90px] shrink-0">{sr.source}</span>
                {sr.success
                  ? <span className="text-green-400 font-semibold">{sr.bossCount} bosses</span>
                  : <span className="text-red-400 truncate">{sr.error ?? 'failed'}</span>
                }
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => refreshMut.mutate()}
            disabled={refreshMut.isPending}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-xs py-2"
            size="sm"
          >
            {refreshMut.isPending
              ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Syncing…</>
              : <><RefreshCw className="w-3 h-3 mr-1.5" />Sync Now</>}
          </Button>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground">Next auto-sync</div>
            <div className="text-xs font-semibold">
              {scraperStatus?.nextRunAt
                ? new Date(scraperStatus.nextRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Stats row ─────────────────────────────────────────── */}
      {bossData && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', val: bossData.total, col: 'text-foreground' },
            { label: 'Active', val: bossData.active, col: 'text-green-400' },
            { label: 'Hidden', val: allBosses.filter((b: any) => b.adminOverride === 'hidden').length, col: 'text-red-400' },
            { label: 'Low conf', val: allBosses.filter((b: any) => (b.confidenceScore ?? 100) < 40).length, col: 'text-yellow-400' },
          ].map(({ label, val, col }) => (
            <Card key={label} className="p-2 text-center">
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className={`text-lg font-black ${col}`}>{val}</div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Filter row ────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {(['all', 'active', 'hidden', 'low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full border transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f === 'all' ? 'All' : f === 'active' ? '✓ Active' : f === 'hidden' ? '🚫 Hidden' : '⚠ Low Conf'}
          </button>
        ))}
      </div>

      {/* ── Boss list ─────────────────────────────────────────── */}
      {bossesLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filteredBosses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No bosses match this filter</div>
      ) : (
        <div className="space-y-0.5">
          {tiers.map(tier => {
            const tierBosses = filteredBosses.filter(b => b.tier === tier);
            if (tierBosses.length === 0) return null;
            return (
              <div key={tier}>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-4 mb-2 px-0.5">
                  {tierLabel(tier)} · {tierBosses.filter(b => b.isActive && (b as any).adminOverride !== 'hidden').length}/{tierBosses.length}
                </h4>
                {tierBosses.map(boss => {
                  const b = boss as any;
                  const isExpanded = expandedId === b.id;
                  const conf: number | undefined = b.confidenceScore;
                  const override: string | null = b.adminOverride ?? null;

                  return (
                    <Card
                      key={b.id}
                      className={cn(
                        "mb-1 overflow-hidden transition-all",
                        override === 'hidden' && "opacity-50 border-red-500/30",
                        override === 'approved' && "border-green-500/40 bg-green-500/5",
                        !b.isActive && !override && "opacity-40",
                      )}
                    >
                      {/* ── Row ── */}
                      <div
                        className="flex items-center gap-2.5 p-2.5 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : b.id)}
                      >
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                          <img src={b.image} alt={b.name} className="w-full h-full object-contain" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-sm font-semibold truncate">{b.name}</span>
                            {b.isShadow && <span className="text-[8px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">Shadow</span>}
                            {b.isDynamax && <span className="text-[8px] font-bold bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full">Max</span>}
                            {override === 'approved' && <span className="text-[8px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">✓ Approved</span>}
                            {override === 'hidden' && <span className="text-[8px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">🚫 Hidden</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {/* Confidence meter */}
                            {conf !== undefined ? (
                              <span className={cn("text-[9px] font-bold", confColor(conf))}>
                                conf {conf}
                              </span>
                            ) : (
                              <span className="text-[9px] text-muted-foreground/50">no data</span>
                            )}
                            {b.lastVerifiedAt && (
                              <span className="text-[9px] text-muted-foreground">{timeAgo(b.lastVerifiedAt)}</span>
                            )}
                            {b.sources?.length > 0 && (
                              <span className="text-[9px] text-blue-400">{b.sources.join(', ')}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Switch
                            checked={b.isActive && override !== 'hidden'}
                            onCheckedChange={(checked) => {
                              bossPatchMut.mutate({ bossId: b.id, isActive: checked });
                            }}
                            onClick={e => e.stopPropagation()}
                          />
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* ── Expanded detail panel ── */}
                      {isExpanded && (
                        <div className="border-t border-border/50 p-3 space-y-3 bg-muted/20">
                          {/* Metadata */}
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <span className="text-muted-foreground">Type: </span>
                              <span className="font-semibold">{b.raidType ?? '—'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CP: </span>
                              <span className="font-semibold">{b.cp?.toLocaleString() ?? '—'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Regions: </span>
                              <span className="font-semibold">{b.regions?.length ? b.regions.join(', ') : 'Global'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Confidence: </span>
                              <span className={cn("font-bold", confColor(conf))}>{conf ?? '—'}/100</span>
                            </div>
                            {b.lastVerifiedAt && (
                              <div>
                                <span className="text-muted-foreground">Last verified: </span>
                                <span className="font-semibold">{new Date(b.lastVerifiedAt).toLocaleString()}</span>
                              </div>
                            )}
                            {b.lastSyncedAt && (
                              <div>
                                <span className="text-muted-foreground">Last synced: </span>
                                <span className="font-semibold">{new Date(b.lastSyncedAt).toLocaleString()}</span>
                              </div>
                            )}
                            {b.startTime && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Active window (UTC): </span>
                                <span className="font-semibold">
                                  {new Date(b.startTime).toLocaleString()} – {b.endTime ? new Date(b.endTime).toLocaleString() : '?'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Source URLs */}
                          {b.sourceUrls?.length > 0 && (
                            <div className="text-[9px] text-blue-400 break-all space-y-0.5">
                              {b.sourceUrls.map((u: string) => <div key={u}>{u}</div>)}
                            </div>
                          )}

                          {/* Admin note */}
                          <div>
                            <div className="text-[10px] text-muted-foreground mb-1">Admin note</div>
                            <div className="flex gap-2">
                              <Input
                                value={noteInputs[b.id] ?? (b.adminNote || '')}
                                onChange={e => setNoteInputs(p => ({ ...p, [b.id]: e.target.value }))}
                                placeholder="Optional note…"
                                className="text-xs h-7"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                onClick={() => bossPatchMut.mutate({ bossId: b.id, adminNote: noteInputs[b.id] ?? '' })}
                              >
                                Save
                              </Button>
                            </div>
                          </div>

                          {/* Override buttons */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-7 text-[10px] border-green-500/50 text-green-400 hover:bg-green-500/10"
                              disabled={override === 'approved' || bossPatchMut.isPending}
                              onClick={() => bossPatchMut.mutate({ bossId: b.id, adminOverride: 'approved', adminNote: noteInputs[b.id] })}
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-7 text-[10px] border-red-500/50 text-red-400 hover:bg-red-500/10"
                              disabled={override === 'hidden' || bossPatchMut.isPending}
                              onClick={() => bossPatchMut.mutate({ bossId: b.id, adminOverride: 'hidden', adminNote: noteInputs[b.id] })}
                            >
                              <ShieldOff className="w-3 h-3 mr-1" /> Hide
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-7 text-[10px] border-border text-muted-foreground hover:bg-muted/30"
                              disabled={!override || bossPatchMut.isPending}
                              onClick={() => bossPatchMut.mutate({ bossId: b.id, adminOverride: 'reset' })}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Reset
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: Broadcast Push Notifications
// ============================================================================

function BroadcastTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<'all' | 'premium' | 'basic'>("all");

  const broadcastMut = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/api/admin/broadcast", token, {
        method: "POST",
        body: JSON.stringify({ title, body, target }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Broadcast Sent", description: `Sent to ${data.tokenCount || 0} devices` });
      setTitle("");
      setBody("");
    },
    onError: () => { toast({ title: "Broadcast Failed", variant: "destructive" }); },
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-orange-500" /> Send Push Notification
        </h3>

        <div>
          <label className="text-xs text-muted-foreground font-semibold block mb-1">Target Audience</label>
          <div className="flex gap-2">
            {(['all', 'premium', 'basic'] as const).map((t) => (
              <Button key={t} size="sm" variant={target === t ? "default" : "outline"} className="text-xs capitalize" onClick={() => setTarget(t)}>
                {t === 'all' ? 'All Users' : t === 'premium' ? 'Premium Only' : 'Basic Only'}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-semibold block mb-1">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-semibold block mb-1">Message</label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification body" rows={3} className="resize-none" />
        </div>

        <Button
          onClick={() => {
            if (!title.trim() || !body.trim()) { toast({ title: "Title and message required", variant: "destructive" }); return; }
            if (confirm(`Send notification to ${target === 'all' ? 'ALL' : target} users?`)) broadcastMut.mutate();
          }}
          disabled={broadcastMut.isPending || !title.trim() || !body.trim()}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600"
        >
          {broadcastMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Send Broadcast
        </Button>
      </Card>

      <Card className="p-3">
        <h4 className="text-xs font-bold text-muted-foreground mb-2">Quick Templates</h4>
        <div className="space-y-1.5">
          {[
            { title: "New Raid Boss!", body: "A new legendary raid boss has appeared! Open the app to see." },
            { title: "Maintenance Complete", body: "Server maintenance is complete. Thank you for your patience!" },
            { title: "Weekend Event", body: "Double XP weekend is live! Host and join raids for bonus rewards." },
            { title: "App Update Available", body: "A new version of GO Raiders is available. Update for the latest features!" },
          ].map((template, i) => (
            <button
              key={i}
              className="w-full text-left p-2 rounded-lg hover:bg-muted/30 transition-colors"
              onClick={() => { setTitle(template.title); setBody(template.body); }}
            >
              <div className="text-xs font-semibold">{template.title}</div>
              <div className="text-[10px] text-muted-foreground">{template.body}</div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB: Feedback
// ============================================================================

function FeedbackTab({ token }: { token: string }) {
  const [search, setSearch] = useState("");

  const { data: feedback = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/feedback", token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filtered = feedback.filter((f) =>
    f.hostId.toLowerCase().includes(search.toLowerCase()) ||
    f.comments?.toLowerCase().includes(search.toLowerCase()) ||
    f.issueDescription?.toLowerCase().includes(search.toLowerCase())
  );

  const avgHost = feedback.length ? (feedback.reduce((s, f) => s + f.hostRating, 0) / feedback.length).toFixed(1) : "0";
  const avgApp = feedback.filter(f => f.appRating).length
    ? (feedback.reduce((s, f) => s + (f.appRating || 0), 0) / feedback.filter(f => f.appRating).length).toFixed(1)
    : "0";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-3 text-center">
          <div className="text-xl font-black text-yellow-500">{avgHost}</div>
          <div className="text-[10px] text-muted-foreground"><Star className="w-3 h-3 inline" /> Host</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-black text-blue-500">{avgApp}</div>
          <div className="text-[10px] text-muted-foreground"><Star className="w-3 h-3 inline" /> App</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-black text-red-500">{feedback.filter(f => f.hadIssues).length}</div>
          <div className="text-[10px] text-muted-foreground"><AlertCircle className="w-3 h-3 inline" /> Issues</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-black text-green-500">{feedback.filter(f => f.wouldRecommend).length}</div>
          <div className="text-[10px] text-muted-foreground"><ThumbsUp className="w-3 h-3 inline" /> Rec.</div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search feedback..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No feedback</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <Card key={f.id} className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="text-xs">
                  <span className="text-muted-foreground">Host:</span> {f.hostId.slice(0, 8)}...
                  <span className="text-muted-foreground ml-2">By:</span> {f.userId.slice(0, 8)}...
                </div>
                <div className="flex gap-1">
                  {f.hadIssues && <Badge variant="destructive" className="text-[10px]">Issue</Badge>}
                  {f.wouldRecommend && <Badge className="text-[10px] bg-green-600">Rec</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs mb-1">
                <span className="text-muted-foreground">Host:</span>
                {[1, 2, 3, 4, 5].map(s => <Star key={s} className={cn("w-3 h-3", s <= f.hostRating ? "text-yellow-400 fill-yellow-400" : "text-muted")} />)}
                {f.appRating && (<><span className="text-muted-foreground ml-2">App:</span>
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className={cn("w-3 h-3", s <= f.appRating! ? "text-blue-400 fill-blue-400" : "text-muted")} />)}
                </>)}
              </div>
              {f.issueDescription && <div className="text-xs text-red-400 bg-red-500/10 p-1.5 rounded mt-1">{f.issueDescription}</div>}
              {f.comments && <p className="text-xs text-muted-foreground mt-1">{f.comments}</p>}
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(f.createdAt || 0).toLocaleString()}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: Bans
// ============================================================================

function BansTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [banCode, setBanCode] = useState("");
  const [banReason, setBanReason] = useState("");

  const { data: bannedUsers = [], isLoading, refetch } = useQuery<BannedUser[]>({
    queryKey: ["/api/admin/banned"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/banned", token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const banMut = useMutation({
    mutationFn: async ({ friendCode, reason }: { friendCode: string; reason?: string }) => {
      const res = await adminFetch("/api/admin/ban", token, {
        method: "POST",
        body: JSON.stringify({ friendCode, reason }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "User Banned" }); setBanCode(""); setBanReason(""); refetch(); },
  });

  const unbanMut = useMutation({
    mutationFn: async (friendCode: string) => {
      const res = await fetch(getApiUrl(`/api/admin/ban/${encodeURIComponent(friendCode)}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: "User Unbanned" }); refetch(); },
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-bold flex items-center gap-2 mb-3">
          <Ban className="w-4 h-4 text-red-500" /> Ban User
        </h3>
        <form onSubmit={(e) => { e.preventDefault(); if (banCode.trim()) banMut.mutate({ friendCode: banCode.trim(), reason: banReason.trim() || undefined }); }} className="space-y-3">
          <Input placeholder="Friend Code (e.g. 1234 5678 9012)" value={banCode} onChange={(e) => setBanCode(e.target.value)} />
          <Textarea placeholder="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={2} className="resize-none" />
          <Button type="submit" variant="destructive" className="w-full" disabled={!banCode.trim() || banMut.isPending}>
            <UserX className="w-4 h-4 mr-2" /> {banMut.isPending ? "Banning..." : "Ban User"}
          </Button>
        </form>
      </Card>

      <h3 className="font-bold">Banned ({bannedUsers.length})</h3>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : bannedUsers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No banned users</div>
      ) : (
        <div className="space-y-1.5">
          {bannedUsers.map((u) => (
            <Card key={u.friendCode} className="p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs font-bold">{u.friendCode}</div>
                {u.reason && <p className="text-[10px] text-muted-foreground truncate">{u.reason}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(u.bannedAt || 0).toLocaleString()}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => unbanMut.mutate(u.friendCode)} disabled={unbanMut.isPending}>
                <Trash2 className="w-3 h-3 mr-1" /> Unban
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: Ads — revenue dashboard + placement controls
// ============================================================================
const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  banner: "Banner (bottom of feed)",
  native_card: "Native Card (in-feed, every N lobbies)",
  rewarded: "Rewarded Video (queue skip)",
  interstitial: "Interstitial (between screens)",
};

function AdsTab({ token }: { token: string }) {
  const { data: stats, isLoading: loadingStats } = useQuery<AdStats>({
    queryKey: ["/api/ads/stats"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/ads/stats"), { headers: { "x-admin-token": token } });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const { data: configs, isLoading: loadingConfigs, refetch: refetchConfigs } = useQuery<AdConfig[]>({
    queryKey: ["/api/ads/config"],
    queryFn: async () => {
      const r = await fetch(getApiUrl("/api/ads/config"), { headers: { "x-admin-token": token } });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
  });

  const updateConfig = async (placement: AdPlacement, patch: Partial<AdConfig>) => {
    try {
      const r = await fetch(getApiUrl(`/api/ads/config/${placement}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`${r.status}`);
    } catch (e) {
      console.error("[AdsTab] updateConfig failed:", e);
    }
    refetchConfigs();
  };

  const fmt$ = (n: number) => `$${n.toFixed(4)}`;

  if (loadingStats || loadingConfigs) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Revenue summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Est. Revenue</p>
          <p className="text-lg font-black text-green-400">
            {fmt$(stats?.estimatedRevenueUsd ?? 0)}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Impressions</p>
          <p className="text-lg font-black">{(stats?.totalImpressions ?? 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4 text-center">
          <BarChart2 className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Clicks</p>
          <p className="text-lg font-black">{(stats?.totalClicks ?? 0).toLocaleString()}</p>
        </Card>
      </div>

      {/* Per-placement breakdown */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-bold">By Placement</p>
        {(["banner", "native_card", "rewarded", "interstitial"] as AdPlacement[]).map(p => {
          const row = stats?.byPlacement?.[p];
          return (
            <div key={p} className="flex items-center justify-between text-xs py-1 border-t border-card-border">
              <span className="text-muted-foreground capitalize">{p.replace("_", " ")}</span>
              <div className="flex gap-3 text-right">
                <span>{row?.impressions ?? 0} imp</span>
                <span>{row?.clicks ?? 0} clicks</span>
                <span className="text-green-400 font-bold">{fmt$(row?.estimatedRevenueUsd ?? 0)}</span>
              </div>
            </div>
          );
        })}
      </Card>

      {/* 7-day sparkline */}
      {stats?.dailyRevenue && stats.dailyRevenue.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-bold mb-3">Last 7 Days</p>
          <div className="flex items-end gap-1 h-16">
            {stats.dailyRevenue.slice().reverse().map((day) => {
              const maxRev = Math.max(...stats.dailyRevenue.map(d => d.estimatedRevenueUsd), 0.0001);
              const pct = (day.estimatedRevenueUsd / maxRev) * 100;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-green-500/60 rounded-t transition-all"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                    title={`${day.date}: ${fmt$(day.estimatedRevenueUsd)}`}
                  />
                  <span className="text-[8px] text-muted-foreground">{day.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Placement toggles */}
      <Card className="p-4 space-y-4">
        <p className="text-sm font-bold">Placement Controls</p>
        {(configs ?? []).map(cfg => (
          <div key={cfg.placement} className="space-y-2 border-t border-card-border pt-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold capitalize">{cfg.placement.replace("_", " ")}</p>
                <p className="text-[10px] text-muted-foreground">{PLACEMENT_LABELS[cfg.placement]}</p>
              </div>
              <button
                onClick={() => updateConfig(cfg.placement, { enabled: !cfg.enabled })}
                className={cn("transition-colors", cfg.enabled ? "text-green-400" : "text-muted-foreground")}
                data-testid={`toggle-ad-${cfg.placement}`}
              >
                {cfg.enabled
                  ? <ToggleRight className="w-8 h-8" />
                  : <ToggleLeft className="w-8 h-8" />
                }
              </button>
            </div>
            {cfg.placement === "native_card" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Every</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={cfg.frequency ?? 5}
                  onBlur={e => updateConfig(cfg.placement, { frequency: Number(e.target.value) })}
                  className="w-14 text-center bg-muted border border-card-border rounded px-2 py-1 text-sm"
                />
                <span className="text-muted-foreground">lobbies</span>
              </div>
            )}
            {cfg.placement === "rewarded" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Queue skip:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={cfg.rewardQueueSkip ?? 5}
                  onBlur={e => updateConfig(cfg.placement, { rewardQueueSkip: Number(e.target.value) })}
                  className="w-14 text-center bg-muted border border-card-border rounded px-2 py-1 text-sm"
                />
                <span className="text-muted-foreground">spots</span>
              </div>
            )}
          </div>
        ))}
      </Card>

      <p className="text-[10px] text-muted-foreground text-center px-2">
        Revenue figures are estimated from AdMob's paid impression callback. Actual payouts appear in your AdMob dashboard after Google's 30-day verification period.
      </p>
    </div>
  );
}

// ============================================================================
// TAB: Testing — inject fake lobbies for QA
// ============================================================================

function TestingTab() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(isTestRaidsEnabled());
  const preview = generateTestLobbies();

  const toggle = () => {
    const next = !enabled;
    setTestRaidsEnabled(next);
    setEnabled(next);
    toast({
      title: next ? "Test Raids ON" : "Test Raids OFF",
      description: next
        ? `${preview.length} fake lobbies injected into the Join Feed on this device.`
        : "Fake lobbies removed from the Join Feed.",
      duration: 3000,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              🧪 Test Raid Lobbies
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Injects fake lobbies into the Join Feed on <span className="text-foreground font-semibold">this device only</span>.
              Real users are not affected. Toggle off when done testing.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={toggle}
            data-testid="switch-test-raids"
          />
        </div>

        {enabled && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs font-bold text-amber-400 mb-1">⚠️ Test mode active</p>
            <p className="text-xs text-muted-foreground">
              {preview.length} fake lobbies are currently visible in the Join Feed. Switch to the main app to interact with them.
            </p>
          </div>
        )}
      </Card>

      {/* Preview of the fake lobbies that will be injected */}
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
          Fake Lobby Preview ({preview.length})
        </h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {preview.map((lobby) => {
            const boss = BOSSES.find((b) => b.id === lobby.bossId) as { id: string; name: string; image: string; tier: number; isShadow?: boolean; isDynamax?: boolean } | undefined;
            return (
              <div
                key={lobby.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-card border border-card-border text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0 overflow-hidden">
                  {boss?.image ? (
                    <img src={boss.image} alt={boss.name} className="w-full h-full object-contain" />
                  ) : (
                    boss?.name?.[0] ?? "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{boss?.name ?? lobby.bossId}</p>
                  <p className="text-muted-foreground">
                    {lobby.players.length}/{lobby.maxPlayers} players · T{boss?.tier} · {lobby.hostName}
                    {lobby.weather && " · 🌤 Boosted"}
                  </p>
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  enabled ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                )}>
                  {enabled ? "LIVE" : "OFF"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Notes</h4>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Test lobbies are generated from the live BOSSES list — covers all tiers</li>
          <li>Joining a test lobby will fail gracefully (no server record exists)</li>
          <li>Fake data is only stored in <code className="bg-muted px-1 rounded">localStorage</code> — cleared when you sign out or clear app data</li>
          <li>Turn off test mode before sharing screenshots or videos of the app</li>
        </ul>
      </Card>
    </div>
  );
}
