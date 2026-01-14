import { useState } from "react";
import { Star, Send, MessageSquare, AlertTriangle, ThumbsUp, ThumbsDown, Users, Trophy, Coins, Flag } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Lobby } from "@shared/schema";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  lobby: Lobby;
  userId: string;
  isHost?: boolean;
}

const REPORT_REASONS = [
  { value: "no_invite", label: "Never received invite" },
  { value: "wrong_boss", label: "Wrong raid boss" },
  { value: "left_early", label: "Host left early" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "cheating", label: "Cheating or exploits" },
  { value: "other", label: "Other issue" },
] as const;

const TIP_AMOUNTS = [0, 10, 25, 50, 100] as const;

function StarRating({ value, onChange, label, size = "md" }: { value: number; onChange: (v: number) => void; label: string; size?: "sm" | "md" }) {
  const starSize = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 transition-transform hover:scale-110 active:scale-95"
            data-testid={`star-${label.toLowerCase().replace(/\s/g, '-')}-${star}`}
          >
            <Star
              className={cn(
                starSize,
                "transition-colors",
                star <= value ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function YesNoQuestion({ label, value, onChange, icon: Icon }: { label: string; value: boolean | null; onChange: (v: boolean) => void; icon?: any }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          type="button"
          size="sm"
          variant={value === true ? "default" : "outline"}
          className={cn(
            "w-16",
            value === true && "bg-green-600 hover:bg-green-700"
          )}
          onClick={() => onChange(true)}
        >
          <ThumbsUp className="w-3.5 h-3.5 mr-1" />
          Yes
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value === false ? "default" : "outline"}
          className={cn(
            "w-16",
            value === false && "bg-red-600 hover:bg-red-700"
          )}
          onClick={() => onChange(false)}
        >
          <ThumbsDown className="w-3.5 h-3.5 mr-1" />
          No
        </Button>
      </div>
    </div>
  );
}

export function FeedbackModal({ isOpen, onClose, lobby, userId, isHost = false }: FeedbackModalProps) {
  const { toast } = useToast();
  
  const [didParticipate, setDidParticipate] = useState<boolean | null>(null);
  const [bossAsSpecified, setBossAsSpecified] = useState<boolean | null>(null);
  const [trainerCount, setTrainerCount] = useState<string>("");
  const [didWin, setDidWin] = useState<boolean | null>(null);
  const [hostRating, setHostRating] = useState(5);
  const [thankHostAmount, setThankHostAmount] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comments, setComments] = useState("");
  
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState("");

  const submitFeedback = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/feedback", {
        lobbyId: lobby.id,
        userId,
        hostId: lobby.hostId,
        didParticipate: didParticipate ?? undefined,
        bossAsSpecified: bossAsSpecified ?? undefined,
        trainerCount: trainerCount ? parseInt(trainerCount) : undefined,
        didWin: didWin ?? undefined,
        hostRating,
        thankHostAmount,
        wouldRecommend: wouldRecommend ?? undefined,
        comments: comments || undefined,
        hadIssues: showReport,
        issueDescription: showReport ? reportDetails : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Thank you!", description: "Your feedback helps improve raids" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to submit", description: "Please try again", variant: "destructive" });
    },
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports", {
        lobbyId: lobby.id,
        reporterId: userId,
        reportedUserId: lobby.hostId,
        reason: reportReason,
        details: reportDetails || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report submitted", description: "We'll review this shortly" });
      setShowReport(false);
      setReportReason("");
      setReportDetails("");
    },
    onError: () => {
      toast({ title: "Failed to submit report", description: "Please try again", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showReport && reportReason) {
      submitReport.mutate();
    }
    submitFeedback.mutate();
  };

  const isPending = submitFeedback.isPending || submitReport.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {isHost ? "Rate Your Raid" : "Rate Your Raid Experience"}
          </DialogTitle>
          <DialogDescription>
            {isHost ? "How did the raid go?" : "Help us improve by sharing your feedback"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <YesNoQuestion
            label="Did you participate in the raid?"
            value={didParticipate}
            onChange={setDidParticipate}
            icon={Users}
          />

          {didParticipate === true && (
            <>
              <YesNoQuestion
                label="Was it the correct raid boss?"
                value={bossAsSpecified}
                onChange={setBossAsSpecified}
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">How many trainers?</Label>
                </div>
                <Select value={trainerCount} onValueChange={setTrainerCount}>
                  <SelectTrigger className="w-24" data-testid="select-trainer-count">
                    <SelectValue placeholder="Count" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <YesNoQuestion
                label="Did you win the raid?"
                value={didWin}
                onChange={setDidWin}
                icon={Trophy}
              />
            </>
          )}

          <div className="border-t pt-4">
            <StarRating
              value={hostRating}
              onChange={setHostRating}
              label="Rate your host"
            />
          </div>

          {!isHost && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                Thank your host with coins
              </Label>
              <div className="flex gap-2 flex-wrap">
                {TIP_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    size="sm"
                    variant={thankHostAmount === amount ? "default" : "outline"}
                    className={cn(
                      "min-w-12",
                      thankHostAmount === amount && amount > 0 && "bg-yellow-600 hover:bg-yellow-700"
                    )}
                    onClick={() => setThankHostAmount(amount)}
                    data-testid={`button-tip-${amount}`}
                  >
                    {amount === 0 ? "None" : `${amount}`}
                  </Button>
                ))}
              </div>
              {thankHostAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {thankHostAmount} coins will be sent to {lobby.hostName}
                </p>
              )}
            </div>
          )}

          <YesNoQuestion
            label="Would you recommend GO Raiders?"
            value={wouldRecommend}
            onChange={setWouldRecommend}
          />

          <div className="space-y-2">
            <Label htmlFor="comments" className="text-sm font-medium">
              Additional comments (optional)
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share your thoughts..."
              className="resize-none"
              rows={2}
              data-testid="textarea-comments"
            />
          </div>

          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowReport(!showReport)}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                showReport ? "text-red-500" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="button-toggle-report"
            >
              <Flag className="w-4 h-4" />
              {showReport ? "Cancel report" : "Report an issue"}
            </button>

            {showReport && (
              <div className="mt-3 space-y-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Report Host</span>
                </div>

                <RadioGroup value={reportReason} onValueChange={setReportReason}>
                  {REPORT_REASONS.map((reason) => (
                    <div key={reason.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={reason.value} id={reason.value} />
                      <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                        {reason.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <Textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide additional details (optional)..."
                  className="resize-none"
                  rows={2}
                  data-testid="textarea-report-details"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-skip-feedback"
            >
              Skip
            </Button>
            <Button
              type="submit"
              disabled={isPending || (showReport && !reportReason)}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
              data-testid="button-submit-feedback"
            >
              {isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
