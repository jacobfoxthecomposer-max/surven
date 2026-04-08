"use client";

import { useSpring, animated } from "@react-spring/web";
import { useAnimationEnabled } from "@/hooks/useAnimation";
import { getScoreColor, getScoreLabel } from "@/utils/constants";

interface VisibilityGaugeProps {
  score: number;
  size?: number;
}

export function VisibilityGauge({ score, size = 220 }: VisibilityGaugeProps) {
  const animationEnabled = useAnimationEnabled();
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  // Semi-circle: use 75% of full circle (270 degrees)
  const arcLength = circumference * 0.75;
  const center = size / 2;

  const spring = useSpring({
    value: score,
    from: { value: 0 },
    config: animationEnabled
      ? { tension: 80, friction: 26 }
      : { duration: 0 },
  });

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform rotate-[135deg]"
        role="img"
        aria-label={`Visibility score: ${score} out of 100. ${label}`}
      >
        {/* Background arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-surface-alt)"
          strokeWidth="10"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <animated.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={spring.value.to(
            (v: number) => `${(v / 100) * arcLength} ${circumference}`
          )}
          strokeLinecap="round"
          style={{
            filter: score >= 76 ? `drop-shadow(0 0 8px ${color})` : "none",
          }}
        />
      </svg>

      {/* Center text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <animated.span
          className="text-5xl font-bold tabular-nums"
          style={{ color }}
        >
          {spring.value.to((v: number) => Math.round(v))}
        </animated.span>
        <span className="text-sm text-[var(--color-fg-muted)] mt-1">{label}</span>
      </div>
    </div>
  );
}
