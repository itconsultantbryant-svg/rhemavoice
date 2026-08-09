import type { CSSProperties } from "react";

type LiveBadgeProps = {
  label?: string;
  viewers?: number;
  style?: CSSProperties;
};

/**
 * Green dot + "Live" pill with optional viewer count.
 * Matches the live indicator pattern from the reference design.
 */
export function LiveBadge({ label = "Live", viewers, style }: LiveBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(34, 197, 94, 0.12)",
        border: "1px solid rgba(34, 197, 94, 0.35)",
        color: "var(--rv-live)",
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        ...style,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "var(--rv-live)",
          boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.2)",
        }}
      />
      {label}
      {typeof viewers === "number" && (
        <span style={{ opacity: 0.85, fontWeight: 600 }}>
          · {viewers.toLocaleString()} watching
        </span>
      )}
    </span>
  );
}
