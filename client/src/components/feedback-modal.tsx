import { useState } from "react";
import { Star, Send, X, MessageSquare } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Lobby } from "@shared/schema";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  lobby: Lobby;
  userId: string;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110"
            data-testid={`star-${label.toLowerCase().replace(/\s/g, '-')}-${star}`}
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                star <= value ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackModal({ isOpen, onClose, lobby, userId }: FeedbackModalProps) {
  const { toast } = useToast();
  const [hostRating, setHostRating] = useState(5);
  const [appRating, setAppRating] = useState(5);
  const [hadIssues, setHadIssues] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [comments, setComments] = useState("");

  const submitFeedback = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/feedback", {
        lobbyId: lobby.id,
        userId,
        hostId: lobby.hostId,
        hostRating,
        hadIssues,
        issueDescription: hadIssues ? issueDescription : undefined,
        appRating,
        wouldRecommend,
        comments: comments || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Thank you!", description: "Your feedback helps us improve" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to submit", description: "Please try again", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitFeedback.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Rate Your Raid Experience
          </DialogTitle>
          <DialogDescription>
            Help us improve by sharing your feedback
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <StarRating
            value={hostRating}
            onChange={setHostRating}
            label="How was your host?"
          />

          <StarRating
            value={appRating}
            onChange={setAppRating}
            label="Rate the app experience"
          />

          <div className="flex items-center justify-between">
            <Label htmlFor="had-issues" className="text-sm font-medium">
              Did you experience any issues?
            </Label>
            <Switch
              id="had-issues"
              checked={hadIssues}
              onCheckedChange={setHadIssues}
              data-testid="switch-had-issues"
            />
          </div>

          {hadIssues && (
            <div className="space-y-2">
              <Label htmlFor="issue-desc" className="text-sm font-medium">
                What went wrong?
              </Label>
              <Textarea
                id="issue-desc"
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe the issue..."
                className="resize-none"
                rows={3}
                data-testid="textarea-issue-description"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="recommend" className="text-sm font-medium">
              Would you recommend GO Raiders?
            </Label>
            <Switch
              id="recommend"
              checked={wouldRecommend}
              onCheckedChange={setWouldRecommend}
              data-testid="switch-recommend"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments" className="text-sm font-medium">
              Any other comments? (optional)
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share your thoughts..."
              className="resize-none"
              rows={3}
              data-testid="textarea-comments"
            />
          </div>

          <div className="flex gap-3">
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
              disabled={submitFeedback.isPending}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
              data-testid="button-submit-feedback"
            >
              {submitFeedback.isPending ? (
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
