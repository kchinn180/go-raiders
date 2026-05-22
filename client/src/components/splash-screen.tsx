import { useEffect, useState } from "react";

/**
 * SplashScreen
 *
 * Shown while user data is loading. On-brand with the volcanic/orange
 * theme: radar-pulse rings, floating particles, animated logo reveal.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  // Small delay so the animation kicks in after first paint
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes radarPulse {
          0%   { transform: scale(0.4); opacity: 0.7; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes logoReveal {
          0%   { transform: scale(0.6) translateY(12px); opacity: 0; }
          60%  { transform: scale(1.06) translateY(-3px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes titleSlide {
          0%   { transform: translateY(18px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        @keyframes subtitleFade {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0px)   translateX(0px);  }
          33%       { transform: translateY(-14px) translateX(6px);  }
          66%       { transform: translateY(8px)  translateX(-8px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px)  translateX(0px);  }
          33%       { transform: translateY(10px) translateX(-5px); }
          66%       { transform: translateY(-8px) translateX(9px);  }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px)   translateX(0px);  }
          50%       { transform: translateY(-10px) translateX(-6px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .splash-logo     { animation: logoReveal  0.65s cubic-bezier(.34,1.56,.64,1) forwards; }
        .splash-title    { animation: titleSlide  0.5s ease forwards; }
        .splash-subtitle { animation: subtitleFade 0.5s ease forwards; }
      `}</style>

      <div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, #1a0a00 0%, #0a0500 60%, #000 100%)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        {/* ── Floating ambient particles ──────────────────────────────── */}
        {[
          { top: "12%", left: "18%", size: 5,  delay: 0,    dur: 4.2, anim: "floatA", opacity: 0.25 },
          { top: "20%", left: "78%", size: 7,  delay: 1.1,  dur: 5.1, anim: "floatB", opacity: 0.20 },
          { top: "70%", left: "12%", size: 4,  delay: 0.5,  dur: 3.8, anim: "floatC", opacity: 0.18 },
          { top: "75%", left: "82%", size: 6,  delay: 2.0,  dur: 4.6, anim: "floatA", opacity: 0.22 },
          { top: "88%", left: "45%", size: 5,  delay: 0.8,  dur: 5.5, anim: "floatB", opacity: 0.15 },
          { top: "35%", left: "90%", size: 4,  delay: 1.5,  dur: 4.0, anim: "floatC", opacity: 0.20 },
          { top: "55%", left: "5%",  size: 6,  delay: 0.3,  dur: 4.8, anim: "floatA", opacity: 0.18 },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: "radial-gradient(circle, #fb923c, #ea580c)",
              opacity: p.opacity,
              animation: `${p.anim} ${p.dur}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}

        {/* ── Radar pulse rings ────────────────────────────────────────── */}
        <div className="absolute" style={{ width: 220, height: 220 }}>
          {[0, 0.8, 1.6].map((delay, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1.5px solid rgba(251,146,60,0.55)",
                animation: `radarPulse 2.4s ${delay}s ease-out infinite`,
              }}
            />
          ))}
        </div>

        {/* ── Logo icon ────────────────────────────────────────────────── */}
        <div
          className="splash-logo relative z-10 mb-6"
          style={{ animationDelay: "0.1s", opacity: 0 }}
        >
          {/* Glow halo behind the icon */}
          <div
            style={{
              position: "absolute",
              inset: -18,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(251,146,60,0.28) 0%, transparent 70%)",
            }}
          />
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              background: "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ea580c 100%)",
              boxShadow: "0 0 40px rgba(251,146,60,0.55), 0 8px 32px rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Sword / raid icon — inline SVG so no import needed */}
            <svg
              width="52"
              height="52"
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Bolt / raid lightning */}
              <path
                d="M30 4L16 26h12l-6 22L42 22H30L36 4z"
                fill="white"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>

        {/* ── App name ─────────────────────────────────────────────────── */}
        <div
          className="splash-title relative z-10 text-center"
          style={{ animationDelay: "0.35s", opacity: 0 }}
        >
          <span
            style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: "-0.5px",
              background: "linear-gradient(90deg, #fde68a 0%, #fb923c 40%, #fde68a 80%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmer 2.8s linear 0.6s infinite",
              display: "inline-block",
            }}
          >
            GO Raiders
          </span>
        </div>

        {/* ── Tagline ──────────────────────────────────────────────────── */}
        <p
          className="splash-subtitle relative z-10 mt-2"
          style={{
            animationDelay: "0.6s",
            opacity: 0,
            color: "rgba(253,186,116,0.65)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          #1 Raid Coordination Tool
        </p>

        {/* ── Loading dots ─────────────────────────────────────────────── */}
        <div
          className="absolute bottom-16 flex gap-2"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease 0.8s" }}
        >
          {[0, 0.18, 0.36].map((delay, i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fb923c, #ea580c)",
                animation: `dotPulse 1.2s ${delay}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
