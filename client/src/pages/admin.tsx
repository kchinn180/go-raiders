import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield, Star, AlertCircle, ThumbsUp, ThumbsDown, Lock, ArrowLeft,
  Search, Ban, UserX, Trash2, RefreshCw, Loader2, Users, Crown,
  XCircle, Eye, Send, Megaphone, Clock, Activity, Flame,
  ChevronDown, ChevronUp, Copy, Edit3, Check, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Feedback, BannedUser, RaidBoss, User, Lobby, Report } from "@shared/schema";

// ============================================================================
// HELPER: Authenticated fetch wrapper
// ============================================================================
function adminFetch(url: string, token: string, options?: RequestInit) {
  return fetch(url, {
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

export function AdminPage({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [adminToken, setAdminToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: adminToken }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        setAuthError("");
      } else {
        setAuthError("Invalid admin token");
      }
    } catch {
      setAuthError("Verification failed");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to App
        </button>
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black">Admin Access</h1>
              <p className="text-sm text-muted-foreground mt-1">Enter your admin token</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="password" placeholder="Admin Token" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} className="text-center" />
              {authError && <p className="text-sm text-red-500 text-center">{authError}</p>}
              <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-600">
                <Lock className="w-4 h-4 mr-2" /> Access Dashboard
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" /> Admin Dashboard
          </h1>
          <div />
        </div>

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
        </Tabs>
      </div>
    </div>
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

function RaidBossesTab({ token }: { token: string }) {
  const { toast } = useToast();

  const { data: allBosses = [], isLoading: bossesLoading, refetch: refetchBosses } = useQuery<RaidBoss[]>({
    queryKey: ["/api/bosses/all"],
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
      toast({ title: "Raid Bosses Refreshed", description: `+${data.added?.length || 0} added, -${data.removed?.length || 0} removed` });
      refetchBosses();
      refetchScraper();
    },
  });

  const toggleBossMut = useMutation({
    mutationFn: async ({ bossId, isActive }: { bossId: string; isActive: boolean }) => {
      const res = await adminFetch(`/api/admin/boss/${bossId}`, token, { method: "PATCH", body: JSON.stringify({ isActive }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { refetchBosses(); toast({ title: "Boss Updated" }); },
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-orange-500" /> Auto-Update Service
          </h3>
          {scraperStatus?.config?.enabled ? (
            <Badge className="bg-green-600 text-[10px]">Active</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Disabled</Badge>
          )}
        </div>
        {scraperStatus?.lastUpdate && (
          <div className="text-xs text-muted-foreground mb-3 space-y-1">
            <p>Last: {new Date(scraperStatus.lastUpdate.lastUpdated).toLocaleString()}</p>
            <p>Sources: {scraperStatus.lastUpdate.sources?.join(', ') || 'None'}</p>
            <p>+{scraperStatus.lastUpdate.added?.length || 0} / -{scraperStatus.lastUpdate.removed?.length || 0} / ={scraperStatus.lastUpdate.unchanged?.length || 0}</p>
          </div>
        )}
        <Button onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending} className="w-full bg-gradient-to-r from-orange-500 to-red-600">
          {refreshMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh Now
        </Button>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="font-bold">All ({allBosses.length}) — {allBosses.filter(b => b.isActive).length} active</h3>
      </div>

      {bossesLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-1.5">
          {[5, 4, 3, 1].map(tier => {
            const tierBosses = allBosses.filter(b => b.tier === tier);
            if (tierBosses.length === 0) return null;
            const label = tier === 5 ? 'Legendary (5-Star)' : tier === 4 ? 'Mega Raids' : tier === 3 ? 'Tier 3' : 'Tier 1';
            return (
              <div key={tier}>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-3 mb-1.5">{label}</h4>
                {tierBosses.map((boss) => (
                  <Card key={boss.id} className={cn("p-2.5 flex items-center justify-between gap-2 mb-1", !boss.isActive && "opacity-50")}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                        <img src={boss.image} alt={boss.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate flex items-center gap-1">
                          {boss.name}
                          {boss.isShadow && <Badge variant="secondary" className="text-[8px] px-1 py-0">Shadow</Badge>}
                          {boss.isDynamax && <Badge variant="secondary" className="text-[8px] px-1 py-0">Max</Badge>}
                        </div>
                        <div className="text-[10px] text-muted-foreground">CP: {boss.cp.toLocaleString()}</div>
                      </div>
                    </div>
                    <Switch checked={boss.isActive} onCheckedChange={(checked) => toggleBossMut.mutate({ bossId: boss.id, isActive: checked })} />
                  </Card>
                ))}
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
      const res = await fetch(`/api/admin/ban/${encodeURIComponent(friendCode)}`, {
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
