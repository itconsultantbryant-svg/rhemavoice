import { Hono } from "hono";
import type { Context } from "hono";
import { count, query } from "../db";
import { requireUser } from "../auth";
import { respond } from "../http";
import { iso, num } from "../serializers";

export const dashboardRoutes = new Hono();

async function buildDashboard(c: Context) {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const name = user.display_name || user.first_name || "Friend";
  // Django runs with TIME_ZONE = "UTC", so timezone.localtime() is UTC.
  const hour = new Date().getUTCHours();
  const greeting =
    hour < 12 ? `Good morning, ${name}` : hour < 17 ? `Good afternoon, ${name}` : `Good evening, ${name}`;

  const [
    liveChurches,
    liveRadio,
    liveRooms,
    learnHighlights,
    enrollments,
    featuredBusinesses,
    featuredOpportunities,
    transportServices,
    upcomingEvents,
    featuredFlights,
    notificationsUnread,
  ] = await Promise.all([
    query<{ id: string; title: string; church_name: string; viewers: number }>(
      `select s.id, s.title, s.church_name, s.viewers
         from streaming_stream s
        where s.status = 'live'
        order by s.is_featured desc, s.created_at desc
        limit 5`,
    ),
    query<{ id: string; name: string; genre: string; listeners: number }>(
      `select r.id, r.name, r.genre, r.listeners
         from radio_radiostation r
        where r.is_live = true
        order by r.name
        limit 5`,
    ),
    query<{ id: string; title: string; participant_count: number }>(
      `select v.id, v.title, v.participant_count
         from rooms_voiceroom v
        where v.is_live = true
        order by v.is_live desc, v.participant_count desc, v.title
        limit 5`,
    ),
    query<{ id: string; title: string; teacher_name: string }>(
      `select l.id, l.title, l.teacher_name
         from learn_lesson l
        order by l.title
        limit 3`,
    ),
    query<{ id: string; title: string; academy: string; progress: number }>(
      `select c.id, c.title, coalesce(i.name, '') as academy, e.progress
         from academy_enrollment e
         join academy_course c on c.id = e.course_id
         left join academy_institution i on i.id = c.institution_id
        where e.user_id = $1
        limit 5`,
      [user.id],
    ),
    query<{ id: string; name: string; category: string }>(
      `select b.id, b.name, b.category
         from business_business b
        where b.featured = true
        order by b.featured desc, b.verified desc, b.name
        limit 4`,
    ),
    query<{ id: string; title: string; type: string; organization: string }>(
      `select o.id, o.title, o.type, o.organization
         from opportunities_opportunity o
        where o.status = 'open'
        order by o.created_at desc
        limit 4`,
    ),
    query<{ id: string; name: string; city: string }>(
      `select t.id, t.name, t.city
         from transport_transportprovider t
        order by t.name
        limit 4`,
    ),
    query<{ id: string; title: string; starts_at: Date | null; venue: string; category: string }>(
      `select e.id, e.title, e.starts_at, e.venue, e.category
         from ticketing_event e
        where e.starts_at >= now() and e.is_published = true
        order by e.starts_at, e.title
        limit 4`,
    ),
    query<{
      id: string;
      departure_city: string;
      arrival_city: string;
      price_cents: number;
      currency: string;
    }>(
      `select f.id, f.departure_city, f.arrival_city, f.price_cents, f.currency
         from air_flightlisting f
        order by f.departure_at
        limit 4`,
    ),
    count(`select count(*) as n from notifications_notification where user_id = $1 and is_read = false`, [
      user.id,
    ]),
  ]);

  return c.json({
    greeting,
    tagline: "Our Voice Is Light",
    daily_verse: {
      reference: "John 1:1",
      text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
      translation: "ESV",
    },
    live_churches: liveChurches.map((row) => ({
      id: row.id,
      title: row.title,
      church_name: row.church_name,
      viewers: num(row.viewers),
    })),
    live_radio: liveRadio.map((row) => ({
      id: row.id,
      station: row.name,
      program: row.genre,
      listeners: num(row.listeners),
    })),
    live_rooms: liveRooms.map((row) => ({
      id: row.id,
      title: row.title,
      host: "Host",
      participants: num(row.participant_count),
    })),
    learn_highlights: learnHighlights.map((row) => ({
      id: row.id,
      title: row.title,
      teacher: row.teacher_name,
    })),
    academy_courses: enrollments.map((row) => ({
      id: row.id,
      title: row.title,
      academy: row.academy,
      progress: num(row.progress),
    })),
    featured_businesses: featuredBusinesses.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
    })),
    featured_jobs: [],
    featured_scholarships: [],
    featured_grants: [],
    featured_loans: [],
    transport_services: transportServices.map((row) => ({
      id: row.id,
      company: row.name,
      service: "Transportation",
      location: row.city,
    })),
    upcoming_events: upcomingEvents.map((row) => ({
      id: row.id,
      title: row.title,
      starts_at: row.starts_at ? (iso(row.starts_at) ?? "") : "",
      location: row.venue,
      type: row.category || "ticketing",
    })),
    featured_flights: featuredFlights.map((row) => {
      const price = num(row.price_cents);
      return {
        id: row.id,
        route: `${row.departure_city} → ${row.arrival_city}`,
        agency: "Travel Partner",
        price_label: price ? `From $${Math.floor(price / 100)}` : "Contact agency",
      };
    }),
    partner_updates: [],
    featured_opportunities: featuredOpportunities.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      organization: row.organization,
    })),
    notifications_unread: notificationsUnread,
    advertisement: null,
  });
}

dashboardRoutes.get("/", buildDashboard);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
dashboardRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return buildDashboard(c);
});
