/**
 * GroupModal — create or join a private raid group
 *
 * Create tab: generates a 6-char join code the host shares with friends.
 * Join tab:   enter a 6-char code to join an existing group.
 *
 * Private groups filter the join feed so only group lobbies are visible.
 */

import { useState } from "react";
import { Users, Plus, LogIn, Copy, Check, X, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/queryClient";
import type { RaidGroup } from "@shared/schema";

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onGroupJoined: (group: RaidGroup) => void;
}

type Tab = "join" | "create";

export function GroupModal({ isOpen, onClose, userId, userName, onGroupJoined }: GroupModalProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("join");

  // Create form
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<RaidGroup | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Join form
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name) {
      toast({ title: "Enter a group name", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(getApiUrl("/api/groups"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userName, name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const group: RaidGroup = await res.json();
      setCreatedGroup(group);
      onGroupJoined(group);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Couldn't create group", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast({ title: "Enter the 6-character code", variant: "destructive" });
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(getApiUrl("/api/groups/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, joinCode: code }),
      });
      if (!res.ok) throw new Error(await res.text());
      const group: RaidGroup = await res.json();
      toast({ title: `Joined "${group.name}"!`, description: "Group lobbies are now filtered in your feed." });
      onGroupJoined(group);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid code";
      toast({ title: "Couldn't join group", description: msg, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast({ title: "Copied!", description: code });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center pb-6 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm rounded-3xl bg-card border border-card-border p-5 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-black text-base">Private Group</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-muted p-1 mb-4">
          {(["join", "create"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {t === "join" ? <><LogIn className="w-3.5 h-3.5 inline mr-1" />Join</> : <><Plus className="w-3.5 h-3.5 inline mr-1" />Create</>}
            </button>
          ))}
        </div>

        {/* Join tab */}
        {tab === "join" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Ask a friend for their 6-character group code
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="XXXXXX"
              className="w-full bg-muted border border-card-border rounded-xl px-4 py-3 text-center text-2xl font-black tracking-[0.3em] uppercase"
              maxLength={6}
            />
            <Button
              onClick={handleJoin}
              disabled={joining || joinCode.length !== 6}
              className="w-full rounded-xl font-bold"
            >
              {joining ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining…</> : <><Users className="w-4 h-4 mr-2" />Join Group</>}
            </Button>
          </div>
        )}

        {/* Create tab */}
        {tab === "create" && (
          <div className="space-y-3">
            {createdGroup ? (
              /* Success — show join code */
              <div className="text-center space-y-3">
                <p className="text-sm font-bold text-green-400">Group created!</p>
                <p className="text-xs text-muted-foreground">Share this code with your raid team:</p>
                <button
                  onClick={() => copyCode(createdGroup.joinCode)}
                  className="w-full flex items-center justify-center gap-3 bg-primary/10 border-2 border-primary/40 rounded-2xl py-4 hover:bg-primary/20 transition-colors"
                >
                  <span className="text-3xl font-black tracking-[0.3em] text-primary">
                    {createdGroup.joinCode}
                  </span>
                  {copiedCode
                    ? <Check className="w-5 h-5 text-green-400" />
                    : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
                <p className="text-[10px] text-muted-foreground">
                  {copiedCode ? "Copied to clipboard!" : "Tap to copy"}
                </p>
                <Button onClick={onClose} className="w-full rounded-xl" variant="outline">
                  Done
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground text-center">
                  Create a private raid group and invite friends with a code
                </p>
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value.slice(0, 30))}
                  placeholder="Group name (e.g. Squad, PvP Team…)"
                  className="w-full bg-muted border border-card-border rounded-xl px-3 py-2.5 text-sm"
                  maxLength={30}
                />
                <Button
                  onClick={handleCreate}
                  disabled={creating || !groupName.trim()}
                  className="w-full rounded-xl font-bold"
                >
                  {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : <><Plus className="w-4 h-4 mr-2" />Create Group</>}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
