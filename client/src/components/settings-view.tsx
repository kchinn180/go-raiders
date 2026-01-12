import { useState } from "react";
import {
  User,
  Sparkles,
  Bell,
  Moon,
  Sun,
  Shield,
  FileText,
  Info,
  LogOut,
  ChevronRight,
  Check,
  X,
  Flame,
  Zap,
  CreditCard,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/lib/user-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TEAMS } from "@shared/schema";
import type { TeamId } from "@shared/schema";

interface SettingsViewProps {
  onNavigate: (page: 'privacy' | 'terms' | 'about') => void;
  onPremiumClick: () => void;
}

const teamIcons = {
  valor: Flame,
  mystic: Shield,
  instinct: Zap,
  neutral: User,
};

export function SettingsView({ onNavigate, onPremiumClick }: SettingsViewProps) {
  const { user, setUser, updateUser, updateNotifications, cancelSubscription } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    level: user?.level || 1,
    code: user?.code || "",
  });

  if (!user) return null;

  const team = TEAMS.find((t) => t.id === user.team) || TEAMS[3];
  const TeamIcon = teamIcons[user.team] || User;
  
  const notifications = user.notifications || {
    lobbyAlerts: true,
    friendRequests: true,
    raidReminders: true,
    marketing: false,
  };

  const subscription = user.subscription;
  const isSubscriptionActive = subscription?.status === 'active' || subscription?.status === 'canceled';
  
  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = () => {
    if (!subscription?.renewalDate) return 0;
    const now = Date.now();
    const diff = subscription.renewalDate - now;
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  };

  const handleSaveProfile = () => {
    if (!editForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    
    const formattedCode = editForm.code
      .replace(/\D/g, "")
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();
    
    if (formattedCode.replace(/\s/g, "").length < 12) {
      toast({ title: "Invalid friend code", variant: "destructive" });
      return;
    }

    updateUser({
      name: editForm.name.trim(),
      level: Math.min(80, Math.max(1, editForm.level)),
      code: formattedCode,
    });
    
    setIsEditing(false);
    toast({ title: "Profile updated!" });
  };

  const handleCancelSubscription = () => {
    cancelSubscription();
    setShowCancelDialog(false);
    toast({ 
      title: "Subscription canceled", 
      description: `You'll have access until ${formatDate(subscription?.renewalDate)}`
    });
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    updateNotifications({ ...notifications, [key]: value });
  };

  return (
    <div className="p-4 space-y-6 pb-28">
      <h2 className="text-2xl font-black">Settings</h2>

      {/* Profile Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <User className="w-4 h-4" />
            Account
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isEditing) {
                handleSaveProfile();
              } else {
                setEditForm({
                  name: user.name,
                  level: user.level,
                  code: user.code,
                });
                setIsEditing(true);
              }
            }}
            data-testid="button-edit-profile"
          >
            {isEditing ? <Check className="w-4 h-4" /> : "Edit"}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={cn("w-14 h-14 rounded-full flex items-center justify-center", team.bg)}>
              <TeamIcon className="w-7 h-7 text-white" fill="currentColor" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="font-bold text-lg"
                  placeholder="Trainer Name"
                  data-testid="input-edit-name"
                />
              ) : (
                <p className="font-bold text-lg">{user.name}</p>
              )}
              <p className={cn("text-sm", team.color)}>{team.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase">Level</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editForm.level}
                  onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={80}
                  className="mt-1"
                  data-testid="input-edit-level"
                />
              ) : (
                <p className="font-bold text-lg">{user.level}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase">Friend Code</label>
              {isEditing ? (
                <Input
                  value={editForm.code}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setEditForm({ ...editForm, code: formatted });
                  }}
                  className="mt-1 font-mono"
                  placeholder="1234 5678 9012"
                  data-testid="input-edit-code"
                />
              ) : (
                <p className="font-mono text-sm">{user.code}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsEditing(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {/* Subscription Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Subscription
          </h3>
          {user.isPremium && (
            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
              ELITE
            </span>
          )}
        </div>

        {user.isPremium && subscription ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Elite Monthly</span>
                <span className="font-bold text-lg">${subscription.price}/mo</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Started
                  </span>
                  <span>{formatDate(subscription.startDate)}</span>
                </div>
                
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    {subscription.status === 'canceled' ? 'Expires' : 'Renews'}
                  </span>
                  <span>{formatDate(subscription.renewalDate)}</span>
                </div>

                {subscription.status === 'canceled' && (
                  <div className="flex items-center gap-2 text-yellow-500 mt-2 p-2 bg-yellow-500/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs">Canceled - {getDaysRemaining()} days remaining</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Benefits</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> Auto Join feature</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> Priority queue access</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> Set minimum level requirements</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> No wait time between raids</li>
              </ul>
            </div>

            {subscription.status === 'active' && (
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={() => setShowCancelDialog(true)}
                data-testid="button-cancel-subscription"
              >
                Cancel Subscription
              </Button>
            )}

            {subscription.status === 'canceled' && (
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
                onClick={onPremiumClick}
                data-testid="button-resubscribe"
              >
                Resubscribe
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Upgrade to Elite for premium features and priority access.
            </p>
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
              onClick={onPremiumClick}
              data-testid="button-upgrade"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade to Elite - $19.99/mo
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              In-app purchase via App Store or Play Store
            </p>
          </div>
        )}
      </Card>

      {/* Notifications Section */}
      <Card className="p-4">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4" />
          Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Lobby Alerts</p>
              <p className="text-xs text-muted-foreground">Get notified when lobbies need players</p>
            </div>
            <Switch
              checked={notifications.lobbyAlerts}
              onCheckedChange={(v) => handleNotificationChange('lobbyAlerts', v)}
              data-testid="switch-lobby-alerts"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Friend Requests</p>
              <p className="text-xs text-muted-foreground">Notifications for friend requests</p>
            </div>
            <Switch
              checked={notifications.friendRequests}
              onCheckedChange={(v) => handleNotificationChange('friendRequests', v)}
              data-testid="switch-friend-requests"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Raid Reminders</p>
              <p className="text-xs text-muted-foreground">Reminders for upcoming raids</p>
            </div>
            <Switch
              checked={notifications.raidReminders}
              onCheckedChange={(v) => handleNotificationChange('raidReminders', v)}
              data-testid="switch-raid-reminders"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Marketing</p>
              <p className="text-xs text-muted-foreground">News and special offers</p>
            </div>
            <Switch
              checked={notifications.marketing}
              onCheckedChange={(v) => handleNotificationChange('marketing', v)}
              data-testid="switch-marketing"
            />
          </div>
        </div>
      </Card>

      {/* Appearance Section */}
      <Card className="p-4">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-xs text-muted-foreground">
              {theme === 'dark' ? 'Currently enabled' : 'Currently disabled'}
            </p>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
            data-testid="switch-dark-mode"
          />
        </div>
      </Card>

      {/* Legal Section */}
      <Card className="divide-y divide-border">
        <button
          onClick={() => onNavigate('privacy')}
          className="w-full p-4 flex items-center justify-between hover-elevate text-left"
          data-testid="button-privacy-policy"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Privacy Policy</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => onNavigate('terms')}
          className="w-full p-4 flex items-center justify-between hover-elevate text-left"
          data-testid="button-terms"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Terms of Service</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => onNavigate('about')}
          className="w-full p-4 flex items-center justify-between hover-elevate text-left"
          data-testid="button-about"
        >
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">About GO Raiders</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </Card>

      {/* Sign Out */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleLogout}
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>

      {/* App Version */}
      <p className="text-center text-xs text-muted-foreground">
        GO Raiders v1.0.0
      </p>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Your Elite benefits will remain active until {formatDate(subscription?.renewalDate)}.
              After that, you'll lose access to premium features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription}>
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
