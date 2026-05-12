/**
 * useSwipeBack Hook
 *
 * Enables iOS-style swipe-from-left-edge-to-go-back gesture.
 *
 * Behaviour:
 *  - Touch must START within `edgeWidth` pixels of the left edge
 *  - Horizontal drag must dominate over vertical drag (ratio > 1.5)
 *  - When drag reaches `threshold` pixels, the back action fires + haptic
 *  - Returns a 0–1 `progress` value for driving visual feedback
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { triggerImpact } from "@/lib/haptics";

interface UseSwipeBackOptions {
  onBack: () => void;
  /** px from left edge where a swipe can start (default 44 — iOS safe zone) */
  edgeWidth?: number;
  /** px of horizontal travel before the back action fires (default 100) */
  threshold?: number;
  /** Disable the gesture entirely */
  disabled?: boolean;
}

export function useSwipeBack({
  onBack,
  edgeWidth = 44,
  threshold = 100,
  disabled = false,
}: UseSwipeBackOptions) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);
  const fired = useRef(false);
  const [progress, setProgress] = useState(0);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;
      const t = e.touches[0];
      if (t.clientX <= edgeWidth) {
        startX.current = t.clientX;
        startY.current = t.clientY;
        tracking.current = true;
        fired.current = false;
      }
    },
    [disabled, edgeWidth]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!tracking.current || startX.current === null || startY.current === null)
        return;

      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = Math.abs(t.clientY - startY.current);

      // Cancel if the swipe is more vertical than horizontal
      if (dy > dx * 1.5 && dx < 20) {
        tracking.current = false;
        setProgress(0);
        return;
      }

      if (dx > 0) {
        const p = Math.min(1, dx / threshold);
        setProgress(p);

        // Light haptic nudge when crossing 50 %
        if (p >= 0.5 && !fired.current) {
          triggerImpact("light");
        }

        // Prevent vertical scroll while horizontal swipe is in progress
        if (dx > 10) {
          e.preventDefault();
        }
      }
    },
    [threshold]
  );

  const onTouchEnd = useCallback(() => {
    if (!tracking.current) return;

    if (progress >= 1 && !fired.current) {
      fired.current = true;
      triggerImpact("medium");
      onBack();
    }

    tracking.current = false;
    setProgress(0);
    startX.current = null;
    startY.current = null;
  }, [progress, onBack]);

  useEffect(() => {
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return { progress };
}
