import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Star, AlertCircle, ThumbsUp, ThumbsDown, Lock, ArrowLeft, Search, Ban, UserX, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Feedback, BannedUser } from "@shared/schema";

export function AdminPage({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [adminToken, setAdminToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [banCode, setBanCode] = useState("");
  const [banReason, setBanReason] = useState("");

  const { data: feedback = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback", adminToken],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/admin/feedback", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: bannedUsers = [], isLoading: bannedLoading } = useQuery<BannedUser[]>({
    queryKey: ["/api/admin/banned", adminToken],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/admin/banned", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ friendCode, reason }: { friendCode: string; reason?: string }) => {
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ friendCode, reason }),
      });
      if (!res.ok) throw new Error("Failed to ban user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User Banned", description: "The user has been banned and their account removed" });
      setBanCode("");
      setBanReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banned", adminToken] });
    },
    onError: () => {
      toast({ title: "Ban Failed", description: "Could not ban user", variant: "destructive" });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (friendCode: string) => {
      const res = await fetch(`/api/admin/ban/${encodeURIComponent(friendCode)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error("Failed to unban user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User Unbanned", description: "The user can now sign up again" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banned", adminToken] });
    },
    onError: () => {
      toast({ title: "Unban Failed", description: "Could not unban user", variant: "destructive" });
    },
  });

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

  const handleBan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!banCode.trim()) return;
    banMutation.mutate({ friendCode: banCode.trim(), reason: banReason.trim() || undefined });
  };

  const filteredFeedback = feedback.filter(
    (f) =>
      f.hostId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.issueDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const averageHostRating = feedback.length
    ? (feedback.reduce((sum, f) => sum + f.hostRating, 0) / feedback.length).toFixed(1)
    : "0";
  
  const averageAppRating = feedback.length
    ? (feedback.reduce((sum, f) => sum + (f.appRating || 0), 0) / feedback.filter(f => f.appRating).length).toFixed(1)
    : "0";

  const issueCount = feedback.filter((f) => f.hadIssues).length;
  const recommendCount = feedback.filter((f) => f.wouldRecommend).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground mb-8"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </button>

        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black">Admin Access</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your admin token to access the dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Admin Token"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  className="text-center"
                  data-testid="input-admin-token"
                />
              </div>

              {authError && (
                <p className="text-sm text-red-500 text-center">{authError}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-red-600"
                data-testid="button-admin-login"
              >
                <Lock className="w-4 h-4 mr-2" />
                Access Dashboard
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Admin Dashboard
          </h1>
          <div />
        </div>

        <Tabs defaultValue="feedback" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="feedback" data-testid="tab-feedback">
              Feedback
            </TabsTrigger>
            <TabsTrigger value="bans" data-testid="tab-bans">
              Banned Users ({bannedUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4 text-center">
                <div className="text-2xl font-black text-yellow-500">{averageHostRating}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" /> Host Rating
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-black text-blue-500">{averageAppRating}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" /> App Rating
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-black text-red-500">{issueCount}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Issues
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-black text-green-500">{recommendCount}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> Recommends
                </div>
              </Card>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-feedback"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading feedback...</div>
            ) : filteredFeedback.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No feedback found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeedback.map((f) => (
                  <Card key={f.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Host:</span>
                          <span className="text-sm font-semibold">{f.hostId.slice(0, 8)}...</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">User:</span>
                          <span className="text-sm">{f.userId.slice(0, 8)}...</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.hadIssues && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Issue
                          </Badge>
                        )}
                        {f.wouldRecommend ? (
                          <Badge className="text-[10px] bg-green-600">
                            <ThumbsUp className="w-3 h-3 mr-1" />
                            Recommends
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            <ThumbsDown className="w-3 h-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Host:</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "w-3 h-3",
                                star <= f.hostRating ? "text-yellow-400 fill-yellow-400" : "text-muted"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {f.appRating && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">App:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "w-3 h-3",
                                  star <= f.appRating! ? "text-blue-400 fill-blue-400" : "text-muted"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {f.issueDescription && (
                      <div className="bg-red-500/10 p-2 rounded-lg mb-2">
                        <p className="text-xs text-red-400">{f.issueDescription}</p>
                      </div>
                    )}

                    {f.comments && (
                      <p className="text-sm text-muted-foreground">{f.comments}</p>
                    )}

                    <div className="text-[10px] text-muted-foreground mt-2">
                      {new Date(f.createdAt || 0).toLocaleString()}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bans" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                <Ban className="w-4 h-4 text-red-500" />
                Ban User by Friend Code
              </h3>
              <form onSubmit={handleBan} className="space-y-3">
                <Input
                  placeholder="Friend Code (e.g. 1234 5678 9012)"
                  value={banCode}
                  onChange={(e) => setBanCode(e.target.value)}
                  data-testid="input-ban-code"
                />
                <Textarea
                  placeholder="Reason for ban (optional)"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={2}
                  className="resize-none"
                  data-testid="textarea-ban-reason"
                />
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  disabled={!banCode.trim() || banMutation.isPending}
                  data-testid="button-ban-user"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  {banMutation.isPending ? "Banning..." : "Ban User"}
                </Button>
              </form>
            </Card>

            <h3 className="font-bold">Banned Users ({bannedUsers.length})</h3>

            {bannedLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : bannedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No banned users
              </div>
            ) : (
              <div className="space-y-2">
                {bannedUsers.map((user) => (
                  <Card key={user.friendCode} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-bold">{user.friendCode}</div>
                      {user.reason && (
                        <p className="text-xs text-muted-foreground truncate">{user.reason}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(user.bannedAt || 0).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unbanMutation.mutate(user.friendCode)}
                      disabled={unbanMutation.isPending}
                      data-testid={`button-unban-${user.friendCode}`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Unban
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
