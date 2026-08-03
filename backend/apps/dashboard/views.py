from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.streaming.models import Stream
from apps.radio.models import RadioStation
from apps.rooms.models import VoiceRoom
from apps.learn.models import Lesson as LearnLesson, LearningSession
from apps.academy.models import Enrollment
from apps.business.models import Business
from apps.opportunities.models import Opportunity
from apps.transport.models import TransportProvider
from apps.ticketing.models import Event
from apps.air.models import FlightListing
from apps.notifications.models import Notification


class DashboardView(APIView):
    def get(self, request):
        name = request.user.display_name or request.user.first_name or "Friend"
        hour = timezone.localtime().hour
        if hour < 12:
            greeting = f"Good morning, {name}"
        elif hour < 17:
            greeting = f"Good afternoon, {name}"
        else:
            greeting = f"Good evening, {name}"

        live_churches = list(
            Stream.objects.filter(status="live")[:5].values("id", "title", "church_name", "viewers")
        )

        live_radio = list(
            RadioStation.objects.filter(is_live=True)[:5].values("id", "name", "genre", "listeners")
        )
        for r in live_radio:
            r["station"] = r.pop("name")
            r["program"] = r.pop("genre", "")

        live_rooms = list(
            VoiceRoom.objects.filter(is_live=True)[:5].values("id", "title", "participant_count")
        )
        for room in live_rooms:
            room["host"] = "Host"
            room["participants"] = room.pop("participant_count")

        learn_highlights = list(
            LearnLesson.objects.all()[:3].values("id", "title", "teacher_name")
        )
        for lh in learn_highlights:
            lh["teacher"] = lh.pop("teacher_name")

        academy_courses = []
        enrollments = Enrollment.objects.filter(user=request.user).select_related("course", "course__institution")[:5]
        for e in enrollments:
            academy_courses.append({
                "id": str(e.course.id),
                "title": e.course.title,
                "academy": e.course.institution.name if e.course.institution else "",
                "progress": e.progress,
            })

        featured_businesses = list(
            Business.objects.filter(featured=True)[:4].values("id", "name", "category")
        )

        featured_opportunities = list(
            Opportunity.objects.filter(status="open")[:4].values("id", "title", "type", "organization")
        )

        transport_services = list(
            TransportProvider.objects.all()[:4].values("id", "name", "city")
        )
        for ts in transport_services:
            ts["company"] = ts.pop("name")
            ts["service"] = "Transportation"
            ts["location"] = ts.pop("city")

        now = timezone.now()
        upcoming_events = list(
            Event.objects.filter(starts_at__gte=now, is_published=True)[:4].values("id", "title", "starts_at", "venue", "category")
        )
        for evt in upcoming_events:
            evt["location"] = evt.pop("venue", "")
            evt["type"] = evt.pop("category", "ticketing")
            evt["starts_at"] = evt["starts_at"].isoformat() if evt.get("starts_at") else ""

        featured_flights = list(
            FlightListing.objects.all()[:4].values("id", "departure_city", "arrival_city", "price_cents", "currency")
        )
        for fl in featured_flights:
            fl["route"] = f"{fl.pop('departure_city')} → {fl.pop('arrival_city')}"
            price = fl.pop("price_cents", 0)
            currency = fl.pop("currency", "USD")
            fl["agency"] = "Travel Partner"
            fl["price_label"] = f"From ${price // 100}" if price else "Contact agency"

        notifications_unread = Notification.objects.filter(user=request.user, is_read=False).count()

        return Response(
            {
                "greeting": greeting,
                "tagline": "Our Voice Is Light",
                "daily_verse": {
                    "reference": "John 1:1",
                    "text": "In the beginning was the Word, and the Word was with God, and the Word was God.",
                    "translation": "ESV",
                },
                "live_churches": live_churches,
                "live_radio": live_radio,
                "live_rooms": live_rooms,
                "learn_highlights": learn_highlights,
                "academy_courses": academy_courses,
                "featured_businesses": featured_businesses,
                "featured_jobs": [],
                "featured_scholarships": [],
                "featured_grants": [],
                "featured_loans": [],
                "transport_services": transport_services,
                "upcoming_events": upcoming_events,
                "featured_flights": featured_flights,
                "partner_updates": [],
                "featured_opportunities": featured_opportunities,
                "notifications_unread": notifications_unread,
                "advertisement": None,
            }
        )
