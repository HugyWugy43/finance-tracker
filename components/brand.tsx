import { useId } from "react";

export function OrbitStar({
  className = "",
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  const maskId = useId();
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <defs>
        <mask
          id={maskId}
          x="0"
          y="0"
          width="512"
          height="512"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "alpha" }}
        >
          <image href="/images/orbit-star.png" width="512" height="512" />
        </mask>
      </defs>
      <rect
        width="512"
        height="512"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
export function OrbitLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`orbit-logo ${compact ? "compact-logo" : ""}`}>
      <OrbitStar size={42} />
      {!compact && <span>orbit</span>}
    </span>
  );
}
export function FluidSculpture() {
  return (
    <svg
      className="fluid-sculpture"
      viewBox="0 0 600 650"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="orbit-metal"
          x1="300"
          y1="90"
          x2="300"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0d152d" />
          <stop offset=".16" stopColor="#818ffc" />
          <stop offset=".25" stopColor="#d6dafa" />
          <stop offset=".34" stopColor="#354772" />
          <stop offset=".46" stopColor="#11192e" />
          <stop offset=".6" stopColor="#7a82c2" />
          <stop offset=".67" stopColor="#e5e7ff" />
          <stop offset=".8" stopColor="#4d5ea6" />
          <stop offset="1" stopColor="#141830" />
        </linearGradient>
        <linearGradient
          id="orbit-edge"
          x1="300"
          y1="90"
          x2="300"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#dce4ff" />
          <stop offset=".32" stopColor="#a6abff" stopOpacity=".05" />
          <stop offset=".67" stopColor="#faf8ff" stopOpacity=".8" />
          <stop offset="1" stopColor="#586aff" stopOpacity=".05" />
        </linearGradient>
        <filter id="orbit-depth" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="20"
            stdDeviation="16"
            floodColor="#00000e"
            floodOpacity=".7"
          />
        </filter>
      </defs>
      <g filter="url(#orbit-depth)" strokeLinecap="round">
        {[-35, 35].map((angle) => (
          <ellipse
            key={angle}
            cx="300"
            cy="325"
            rx="125"
            ry="215"
            transform={`rotate(${angle} 300 325)`}
            stroke="url(#orbit-metal)"
            strokeWidth="55"
          />
        ))}
      </g>
      {[-35, 35].map((angle) => (
        <ellipse
          key={angle}
          cx="300"
          cy="325"
          rx="143"
          ry="233"
          transform={`rotate(${angle} 300 325)`}
          stroke="url(#orbit-edge)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
