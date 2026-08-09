import type { CSSProperties, ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  style?: CSSProperties;
};

/**
 * Title + "See All" action pattern used across module sections.
 * Renders a left-aligned heading with an optional right-aligned action link.
 */
export function SectionHeader({ title, subtitle, actionLabel, onAction, actionHref, style }: SectionHeaderProps) {
  const showAction = Boolean(actionLabel && (onAction || actionHref));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
        ...style,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--rv-font-display)",
            fontSize: "1.35rem",
            fontWeight: 600,
            color: "var(--rv-ink)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--rv-ink-muted)" }}>{subtitle}</p>
        )}
      </div>
      {showAction &&
        (actionHref ? (
          <a
            href={actionHref}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--rv-gold-500)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {actionLabel} →
          </a>
        ) : (
          <button
            type="button"
            onClick={onAction}
            style={{
              border: "none",
              background: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--rv-gold-500)",
              whiteSpace: "nowrap",
            }}
          >
            {actionLabel} →
          </button>
        ))}
    </div>
  );
}
