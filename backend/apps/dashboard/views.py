from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView


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

        return Response(
            {
                "greeting": greeting,
                "tagline": "Our Voice Is Light",
                "daily_verse": {
                    "reference": "John 1:1",
                    "text": "In the beginning was the Word, and the Word was with God, and the Word was God.",
                    "translation": "ESV",
                },
                "live_churches": [
                    {
                        "id": "stream-1",
                        "title": "Sunday Live Service",
                        "church_name": "City Gate Church",
                        "viewers": 842,
                    },
                    {
                        "id": "stream-2",
                        "title": "Evening Worship",
                        "church_name": "Grace Chapel",
                        "viewers": 312,
                    },
                ],
                "live_radio": [
                    {
                        "id": "radio-1",
                        "station": "Rhema FM",
                        "program": "Morning Manna",
                        "listeners": 1204,
                    },
                    {
                        "id": "radio-2",
                        "station": "Kingdom Voice Radio",
                        "program": "Midday Praise",
                        "listeners": 486,
                    },
                ],
                "live_rooms": [
                    {
                        "id": "room-1",
                        "title": "Evening Prayer Gathering",
                        "host": "Pastor Ada",
                        "participants": 184,
                    },
                    {
                        "id": "room-2",
                        "title": "Liberian Language Study",
                        "host": "Teacher James",
                        "participants": 67,
                    },
                ],
                "learn_highlights": [
                    {"id": "learn-1", "title": "Introduction to Kpelle", "teacher": "Teacher Marie"},
                    {"id": "learn-2", "title": "Bible Foundations", "teacher": "Pastor Daniel"},
                ],
                "academy_courses": [
                    {"id": "c1", "title": "Foundations of Faith", "academy": "Chayil Company Intensive", "progress": 62},
                    {"id": "c2", "title": "Leadership in Ministry", "academy": "Leadership Academy", "progress": 28},
                ],
                "featured_businesses": [
                    {"id": "b1", "name": "Kingdom Crafts Co.", "category": "Retail"},
                    {"id": "b2", "name": "Grace Tech Solutions", "category": "Services"},
                ],
                "featured_jobs": [
                    {"id": "j1", "title": "Youth Pastor", "company": "City Gate Church"},
                    {"id": "j2", "title": "Media Producer", "company": "Rhema Studios"},
                ],
                "featured_scholarships": [
                    {"id": "s1", "title": "Ministry Leadership Scholarship", "organization": "Bible Training Academy"},
                    {"id": "s2", "title": "Women in Tech Scholarship", "organization": "Grace Foundation"},
                ],
                "featured_grants": [
                    {"id": "g1", "title": "Youth Empowerment Grant", "organization": "Kingdom Partners NGO"},
                    {"id": "g2", "title": "Small Business Startup Grant", "organization": "Liberia Development Fund"},
                ],
                "featured_loans": [
                    {"id": "l1", "title": "Student Education Loan", "institution": "Faith Finance Partners"},
                    {"id": "l2", "title": "Small Enterprise Loan", "institution": "Kingdom Credit Union"},
                ],
                "transport_services": [
                    {"id": "t1", "company": "Monrovia Express", "service": "Airport Transfer", "location": "Monrovia"},
                    {"id": "t2", "company": "Liberia Shuttle Co.", "service": "Intercity Shuttle", "location": "Buchanan"},
                ],
                "upcoming_events": [
                    {
                        "id": "evt-1",
                        "title": "Kingdom Leadership Summit",
                        "starts_at": timezone.now().isoformat(),
                        "location": "Monrovia Convention Center",
                        "type": "ticketing",
                    },
                    {
                        "id": "evt-2",
                        "title": "Worship Night Live",
                        "starts_at": timezone.now().isoformat(),
                        "location": "Online / Live Stream",
                        "type": "streaming",
                    },
                ],
                "featured_flights": [
                    {"id": "f1", "route": "Monrovia → Accra", "agency": "Grace Travel Agency", "price_label": "From $420"},
                    {"id": "f2", "route": "Monrovia → Lagos", "agency": "Kingdom Air Services", "price_label": "From $380"},
                ],
                "partner_updates": [
                    {"id": "pu1", "title": "New courses from Chayil Academy", "partner": "Chayil Company Intensive", "type": "academy"},
                    {"id": "pu2", "title": "Rhema FM launches evening program", "partner": "Rhema FM", "type": "radio"},
                ],
                "featured_opportunities": [
                    {"id": "fo1", "title": "Community Development Grant", "type": "grant", "organization": "Kingdom Partners NGO"},
                    {"id": "fo2", "title": "Worship Leader — Full Time", "type": "job", "organization": "Grace Chapel"},
                ],
                "notifications_unread": 3,
                "advertisement": {
                    "id": "ad1",
                    "title": "Rhema Leadership Summit — Get your tickets",
                    "cta": "View events",
                    "image_url": "",
                },
            }
        )
