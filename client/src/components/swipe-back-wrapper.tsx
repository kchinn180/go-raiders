/**
 * SwipeBackWrapper
 *
 * Wrap any full-screen page that needs iOS-style swipe-from-left-edge
 * navigation. The page content slides gently rightward while the user
 * drags and snaps back if they don't complete the gesture.
 *
 * Usage:
 *   <SwipeBackWrapper onBack={onBack}>
 *     <YourPage />
 *   </SwipeBackWrapper>
 */

import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useSwipeBack } from "@/hooks/use-swipe-back";

interface SwipeBackWrapperProps {
  children: ReactNode;
  onBack: () => void;
  disabled?: boolean;
}

export function SwipeBackWrapper({
  children,
  onBack,
  disabled = false,
}: SwipeBackWrapperProps) {
  const { progress } = useSwipeBack({ onBack, disabled });

  // Translate page rightward as the swipe progresses (max 60 px)
  const slideX = progress * 60;
  // Dim the background behind the page for depth cue
  const bgOpacity = progress * 0.25;

  return (
    <div className="relative w-full h-dvh overflow-hidden">
      {/* Dark scrim behind page during swipe */}
      {progress > 0 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none z-10"
          style={{ opacity: bgOpacity }}
        />
      )}

      {/* Orange edge glow strip on the left */}
      {progress > 0 && (
        <div
          className="fixed left-0 top-0 bottom-0 pointer-events-none z-50"
          style={{
            width: `${4 + progress * 16}px`,
            background: `linear-gradient(to right, rgba(249,115,22,${Math.min(
              1,
              progress * 1.6
            )}), transparent)`,
          }}
        />
      )}

      {/* Circular back-arrow indicator */}
      {progress > 0 && (
        <div
          className="fixed left-5 top-1/2 pointer-events-none z-50"
          style={{
            opacity: Math.min(1, progress * 2),
            transform: `translateY(-50%) translateX(${
              (1 - progress) * -70
            }px) scale(${0.4 + progress * 0.6})`,
            // No transition while the finger is moving; animate back on release
            transition: "none",
          }}
        >
          <div className="w-14 h-14 rounded-full bg-orange-500 shadow-xl shadow-orange-500/60 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          {/* "Release to go back" hint at 90 % */}
          {progress >= 0.9 && (
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-orange-400 text-[10px] font-bold whitespace-nowrap">
              Release to go back
            </div>
          )}
        </div>
      )}

      {/* Page content — slides right during swipe */}
      <div
        className="w-full h-full"
        style={{
          transform: `translateX(${slideX}px)`,
          transition:
            progress === 0 ? "transform 0.25s cubic-bezier(0.4,0,0.2,1)" : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
