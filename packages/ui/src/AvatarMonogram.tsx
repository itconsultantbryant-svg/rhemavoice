import type { CSSProperties } from "react";

type AvatarMonogramProps = {
  name: string;
  size?: number;
  style?: CSSProperties;
};

const AVATAR_COLORS = ["#651882", "#2d1258", "#9b23c2", "#b8860b", "#651882", "#dfa622"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * 2-letter initials in a colored circle. Deterministic color per name.
 */
export function AvatarMonogram({ name, size = 40, style }: AvatarMonogramProps) {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bg = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--rv-font-body)",
        fontWeight: 700,
        fontSize: size * 0.36,
        flexShrink: 0,
        userSelect: "none",
        ...style,
      }}
    >
      {initials(name)}
    </span>
  );
}
