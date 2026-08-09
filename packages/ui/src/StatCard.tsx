import type { CSSProperties } from "react";

type StatCardProps = {
  value: string | number;
  label: string;
  style?: CSSProperties;
};

/**
 * Number + label metric display used in stats dashboards.
 */
export function StatCard({ value, label, style }: StatCardProps) {
  return (
    <div
      style={{
        background: "var(--rv-surface-elevated)",
        border: "1px solid var(--rv-border)",
        borderRadius: 14,
        padding: "16px 18px",
        textAlign: "center",
        boxShadow: "var(--rv-shadow-sm)",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: "var(--rv-font-display)",
          fontSize: "1.6rem",
          fontWeight: 700,
          color: "var(--rv-gold-500)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--rv-ink-muted)", fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}
