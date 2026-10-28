import { type ReactNode } from "react";

// Keeps every CCI sub-route in the academy workspace visual system while the
// individual screens retain their existing authorization and data loading.
export default function CCISectionLayout({ children }: { children: ReactNode }) {
  return <div className="chayil-workspace">{children}</div>;
}
