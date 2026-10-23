import { Hono } from "hono";
import { authRoutes } from "./auth";
import { modulesRoutes } from "./modules";
import { dashboardRoutes } from "./dashboard";
import { adminRoutes } from "./admin";
import { academyRoutes } from "./academy";
import { streamingRoutes } from "./streaming";
import { roomsRoutes } from "./rooms";
import { radioRoutes } from "./radio";
import { musicRoutes } from "./music";
import { businessRoutes } from "./business";
import { jobsRoutes } from "./jobs";
import { marketplaceRoutes } from "./marketplace";
import { storeRoutes } from "./store";
import { chatRoutes } from "./chat";
import { walletRoutes } from "./wallet";
import { paymentsRoutes } from "./payments";
import { notificationsRoutes } from "./notifications";
import { analyticsRoutes } from "./analytics";
import { churchRoutes } from "./church";
import { settingsRoutes } from "./settings";
import { learnRoutes } from "./learn";
import { opportunitiesRoutes } from "./opportunities";
import { transportRoutes } from "./transport";
import { ticketingRoutes } from "./ticketing";
import { airRoutes } from "./air";

export const api = new Hono();

/**
 * Django's URLconf mounts every router under `path("", include(router.urls))`,
 * so the collection endpoint is `/api/v1/<module>/` — with a trailing slash.
 *
 * Hono's `mergePath` drops a sub-router root's trailing slash when the mount
 * path has none, so each router is mounted twice: once bare and once with the
 * slash. Mounting both makes `/api/v1/<module>` and `/api/v1/<module>/` resolve
 * to the same handler.
 */
function mount(path: string, router: Hono) {
  api.route(path, router);
  api.route(`${path}/`, router);
}

mount("/auth", authRoutes);
mount("/modules", modulesRoutes);
mount("/dashboard", dashboardRoutes);
mount("/admin", adminRoutes);
mount("/academy", academyRoutes);
mount("/streaming", streamingRoutes);
mount("/rooms", roomsRoutes);
mount("/radio", radioRoutes);
mount("/music", musicRoutes);
mount("/business", businessRoutes);
mount("/jobs", jobsRoutes);
mount("/marketplace", marketplaceRoutes);
mount("/store", storeRoutes);
mount("/chat", chatRoutes);
mount("/wallet", walletRoutes);
mount("/payments", paymentsRoutes);
mount("/notifications", notificationsRoutes);
mount("/analytics", analyticsRoutes);
mount("/church", churchRoutes);
mount("/settings", settingsRoutes);
mount("/learn", learnRoutes);
mount("/opportunities", opportunitiesRoutes);
mount("/transport", transportRoutes);
mount("/ticketing", ticketingRoutes);
mount("/air", airRoutes);
