import { CciRouteGuard } from "@/components/CciRouteGuard";

export default function CciLayout({ children }: { children: React.ReactNode }) {
  return <CciRouteGuard>{children}</CciRouteGuard>;
}
