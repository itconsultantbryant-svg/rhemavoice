export enum Role {
  Guest = "guest",
  Member = "member",
  GeneralUser = "general_user",
  Student = "student",
  Teacher = "teacher",
  Pastor = "pastor",
  ChurchAdmin = "church_admin",
  AcademyAdmin = "academy_admin",
  RadioAdmin = "radio_admin",
  BusinessAdmin = "business_admin",
  Employer = "employer",
  JobSeeker = "job_seeker",
  EventOrganizer = "event_organizer",
  TravelPartner = "travel_partner",
  TransportPartner = "transport_partner",
  PlatformAdmin = "platform_admin",
  SuperAdmin = "super_admin",
  Moderator = "moderator",
  SupportAgent = "support_agent",
  FinanceOfficer = "finance_officer",
}

export enum ModuleId {
  Streaming = "streaming",
  Academy = "academy",
  Learn = "learn",
  Radio = "radio",
  Business = "business",
  Rooms = "rooms",
  Opportunities = "opportunities",
  Transport = "transport",
  Ticketing = "ticketing",
  Air = "air",
}

export type ThemePreference = "light" | "dark" | "system";

export const BRAND = {
  name: "RhemaVoice",
  tagline: "Our Voice Is Light",
  developer: "RhemaVoice Technologies Inc.",
  description:
    "A kingdom-focused community platform to connect, worship, learn, communicate, and grow — with digital church streaming, live radio, voice rooms, partner academies, business promotion, and opportunities.",
} as const;

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  roles: Role[];
  theme_preference: ThemePreference;
  is_active: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ModuleMeta {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
  requires_profile: boolean;
  profile_complete: boolean;
  route: string;
  enabled: boolean;
}

export interface DailyVerse {
  reference: string;
  text: string;
  translation: string;
}

export interface DashboardEvent {
  id: string;
  title: string;
  starts_at: string;
  location?: string;
  type: string;
}

export interface DashboardPayload {
  greeting: string;
  tagline: string;
  daily_verse: DailyVerse;
  live_churches: Array<{ id: string; title: string; church_name: string; viewers: number }>;
  live_radio: Array<{ id: string; station: string; program: string; listeners: number }>;
  live_rooms: Array<{ id: string; title: string; host: string; participants: number }>;
  learn_highlights: Array<{ id: string; title: string; teacher: string }>;
  academy_courses: Array<{ id: string; title: string; academy: string; progress?: number }>;
  featured_businesses: Array<{ id: string; name: string; category: string }>;
  featured_jobs: Array<{ id: string; title: string; company: string }>;
  featured_scholarships: Array<{ id: string; title: string; organization: string }>;
  featured_grants: Array<{ id: string; title: string; organization: string }>;
  featured_loans: Array<{ id: string; title: string; institution: string }>;
  transport_services: Array<{ id: string; company: string; service: string; location: string }>;
  upcoming_events: DashboardEvent[];
  featured_flights: Array<{ id: string; route: string; agency: string; price_label: string }>;
  partner_updates: Array<{ id: string; title: string; partner: string; type: string }>;
  featured_opportunities: Array<{ id: string; title: string; type: string; organization: string }>;
  notifications_unread: number;
  advertisement?: { id: string; title: string; cta: string; image_url?: string };
}

export const MODULE_CATALOG: Omit<ModuleMeta, "profile_complete">[] = [
  {
    id: ModuleId.Streaming,
    name: "Church Streaming",
    description: "Watch live services, sermons, and ministry broadcasts",
    icon: "church",
    requires_profile: false,
    route: "/streaming",
    enabled: true,
  },
  {
    id: ModuleId.Academy,
    name: "Rhema Academy",
    description: "Multi-partner LMS — courses, lessons, and certificates",
    icon: "graduation-cap",
    requires_profile: true,
    route: "/academy",
    enabled: true,
  },
  {
    id: ModuleId.Learn,
    name: "Rhema Learn",
    description: "Voice-based learning, lessons, and knowledge communities",
    icon: "book-open",
    requires_profile: true,
    route: "/learn",
    enabled: true,
  },
  {
    id: ModuleId.Radio,
    name: "Live Radio",
    description: "Live radio stations, programs, and podcasts",
    icon: "radio",
    requires_profile: false,
    route: "/radio",
    enabled: true,
  },
  {
    id: ModuleId.Business,
    name: "Business Hub",
    description: "Discover and follow kingdom businesses and services",
    icon: "briefcase",
    requires_profile: true,
    route: "/business",
    enabled: true,
  },
  {
    id: ModuleId.Rooms,
    name: "Rhema Rooms",
    description: "Voice rooms for prayer, study, teaching, and fellowship",
    icon: "mic",
    requires_profile: true,
    route: "/rooms",
    enabled: true,
  },
  {
    id: ModuleId.Opportunities,
    name: "Opportunities",
    description: "Jobs, scholarships, grants, and loans",
    icon: "target",
    requires_profile: true,
    route: "/opportunities",
    enabled: true,
  },
  {
    id: ModuleId.Transport,
    name: "Rhema-Transervices",
    description: "Transportation booking across Liberia",
    icon: "car",
    requires_profile: false,
    route: "/transport",
    enabled: true,
  },
  {
    id: ModuleId.Ticketing,
    name: "Rhema-E-Ticketing",
    description: "Discover events and purchase tickets",
    icon: "ticket",
    requires_profile: false,
    route: "/ticketing",
    enabled: true,
  },
  {
    id: ModuleId.Air,
    name: "RhemaAir",
    description: "Search and book flights through approved travel partners",
    icon: "plane",
    requires_profile: false,
    route: "/air",
    enabled: true,
  },
];

export const PERMISSIONS = {
  academy: {
    create_courses: "academy.create_courses",
    delete_lessons: "academy.delete_lessons",
    approve_teachers: "academy.approve_teachers",
    manage_students: "academy.manage_students",
    issue_certificates: "academy.issue_certificates",
  },
  learn: {
    create_lessons: "learn.create_lessons",
    host_sessions: "learn.host_sessions",
    approve_teachers: "learn.approve_teachers",
  },
  business: {
    approve_businesses: "business.approve_businesses",
    suspend_businesses: "business.suspend_businesses",
    manage_ads: "business.manage_ads",
  },
  opportunities: {
    approve_listings: "opportunities.approve_listings",
    verify_organizations: "opportunities.verify_organizations",
    manage_applications: "opportunities.manage_applications",
  },
  streaming: {
    manage_events: "streaming.manage_events",
    moderate_chat: "streaming.moderate_chat",
    schedule_broadcasts: "streaming.schedule_broadcasts",
  },
  rooms: {
    manage_rooms: "rooms.manage_rooms",
    mute_users: "rooms.mute_users",
    ban_users: "rooms.ban_users",
  },
  transport: {
    manage_bookings: "transport.manage_bookings",
    approve_providers: "transport.approve_providers",
  },
  ticketing: {
    manage_events: "ticketing.manage_events",
    scan_tickets: "ticketing.scan_tickets",
  },
  air: {
    manage_bookings: "air.manage_bookings",
    approve_agencies: "air.approve_agencies",
  },
  admin: {
    everything: "admin.everything",
    manage_users: "admin.manage_users",
    manage_roles: "admin.manage_roles",
    approve_partners: "admin.approve_partners",
    feature_toggles: "admin.feature_toggles",
    audit_logs: "admin.audit_logs",
  },
} as const;

export const MOTION = {
  durationMs: 280,
  ease: "easeOut" as const,
  spring: { stiffness: 320, damping: 28 },
};

export function hasRole(user: User | null | undefined, role: Role): boolean {
  return !!user?.roles?.includes(role);
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return hasRole(user, Role.SuperAdmin);
}

export function displayName(user: Pick<User, "first_name" | "last_name" | "display_name" | "email">): string {
  if (user.display_name) return user.display_name;
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.email;
}
