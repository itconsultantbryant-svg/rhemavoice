import type { CSSProperties } from "react";

type ModuleChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
};

/**
 * Category filter pill with rounded shape and gold active state.
 * Used for horizontal scrollable filter rows.
 */
export function ModuleChip({ label, active = false, onClick, style }: ModuleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? "var(--rv-gold-500)" : "var(--rv-border)"}`,
        background: active ? "rgba(223, 166, 34, 0.14)" : "var(--rv-surface-elevated)",
        color: active ? "var(--rv-gold-500)" : "var(--rv-ink-muted)",
        borderRadius: 999,
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
        transition: "background 280ms ease, border-color 280ms ease, color 280ms ease",
        ...style,
      }}
    >
      {label}
    </button>
  );
}
