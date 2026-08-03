from django.core.management.base import BaseCommand

from apps.administration.models import AuditLog, FeatureToggle, SystemSetting
from apps.modules.models import ModuleDefinition
from apps.roles.models import Permission, Role, UserRole
from apps.users.models import User
from apps.academy.models import (
    AcademyEvent,
    AcademyMembership,
    Assignment,
    Course,
    CourseCategory,
    Enrollment,
    Institution,
    LearningResource,
    Lesson,
    LiveClass,
    MentorAssignment,
)
from apps.streaming.models import Stream, StreamChatMessage
from apps.rooms.models import RoomPoll, VoiceRoom
from apps.radio.models import Podcast, RadioStation
from apps.music.models import Album, Artist, Track
from apps.business.models import Business, BusinessCategory, BusinessProduct
from apps.jobs.models import Company, JobPosting
from apps.marketplace.models import Product
from apps.store.models import StoreProduct
from apps.chat.models import Conversation, Message, Participant
from apps.notifications.models import Notification
from apps.wallet.models import Transaction, WalletAccount
from apps.payments.models import PaymentProvider
from apps.analytics.models import MetricSnapshot
from apps.church.models import Church, ChurchEvent, ChurchMembership
from apps.learn.models import LearningArea, LearningSession, Lesson as LearnLesson
from apps.opportunities.models import Opportunity
from apps.transport.models import TransportProvider
from apps.ticketing.models import Event, TicketTier
from apps.air.models import FlightListing, TravelAgency


MODULES = [
    ("streaming", "Church Streaming", "Watch live services, sermons, and ministry broadcasts", "video", False, "/streaming", 1),
    ("academy", "Rhema Academy", "Multi-partner LMS — courses, lessons, and certificates", "graduation-cap", True, "/academy", 2),
    ("learn", "Rhema Learn", "Voice-based learning, lessons, and knowledge communities", "book-open", True, "/learn", 3),
    ("radio", "Live Radio", "Live radio stations, programs, and podcasts", "radio", False, "/radio", 4),
    ("business", "Business Hub", "Discover and follow kingdom businesses and services", "briefcase", True, "/business", 5),
    ("rooms", "Rhema Rooms", "Voice rooms for prayer, study, teaching, and fellowship", "mic", True, "/rooms", 6),
    ("opportunities", "Opportunities", "Jobs, scholarships, grants, and loans", "target", True, "/opportunities", 7),
    ("transport", "Rhema-Transervices", "Transportation booking across Liberia", "car", False, "/transport", 8),
    ("ticketing", "Rhema-E-Ticketing", "Discover events and purchase tickets", "ticket", False, "/ticketing", 9),
    ("air", "RhemaAir", "Search and book flights through approved travel partners", "plane", False, "/air", 10),
]

ROLES = [
    ("guest", "Guest"),
    ("member", "Member"),
    ("general_user", "General User"),
    ("student", "Student"),
    ("teacher", "Teacher"),
    ("pastor", "Pastor"),
    ("church_admin", "Church Administrator"),
    ("academy_admin", "Academy Administrator"),
    ("radio_admin", "Radio Administrator"),
    ("business_admin", "Business Administrator"),
    ("employer", "Employer"),
    ("job_seeker", "Job Seeker"),
    ("event_organizer", "Event Organizer"),
    ("travel_partner", "Travel Partner"),
    ("transport_partner", "Transport Partner"),
    ("platform_admin", "Platform Administrator"),
    ("super_admin", "Super Administrator"),
    ("moderator", "Moderator"),
    ("support_agent", "Support Agent"),
    ("finance_officer", "Finance Officer"),
]

PERMISSIONS = [
    ("academy.create_courses", "Create Courses"),
    ("academy.delete_lessons", "Delete Lessons"),
    ("academy.approve_teachers", "Approve Teachers"),
    ("academy.manage_students", "Manage Students"),
    ("academy.issue_certificates", "Issue Certificates"),
    ("business.approve_businesses", "Approve Businesses"),
    ("business.suspend_businesses", "Suspend Businesses"),
    ("business.manage_ads", "Manage Advertisements"),
    ("jobs.approve_jobs", "Approve Jobs"),
    ("jobs.verify_companies", "Verify Companies"),
    ("jobs.approve_applications", "Approve Applications"),
    ("streaming.manage_events", "Manage Live Events"),
    ("streaming.moderate_chat", "Moderate Chat"),
    ("streaming.schedule_broadcasts", "Schedule Broadcasts"),
    ("rooms.manage_rooms", "Manage Rooms"),
    ("rooms.mute_users", "Mute Users"),
    ("rooms.ban_users", "Ban Users"),
    ("admin.everything", "Everything"),
    ("admin.manage_users", "Manage Users"),
    ("admin.manage_roles", "Manage Roles"),
    ("admin.feature_toggles", "Feature Toggles"),
    ("admin.audit_logs", "Audit Logs"),
]


class Command(BaseCommand):
    help = "Seed demo users, roles, modules, and sample content"

    def handle(self, *args, **options):
        for code, name in PERMISSIONS:
            Permission.objects.get_or_create(code=code, defaults={"name": name})

        role_map = {}
        for code, name in ROLES:
            role, _ = Role.objects.get_or_create(code=code, defaults={"name": name})
            role_map[code] = role

        super_role = role_map["super_admin"]
        super_role.permissions.set(Permission.objects.all())

        for code, name, desc, icon, requires, route, order in MODULES:
            ModuleDefinition.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": desc,
                    "icon": icon,
                    "requires_profile": requires,
                    "route": route,
                    "enabled": True,
                    "sort_order": order,
                },
            )

        core_codes = {m[0] for m in MODULES}
        ModuleDefinition.objects.exclude(code__in=core_codes).update(enabled=False)

        for key, label, enabled in [
            ("academy", "Rhema Academy", True),
            ("rooms", "Rhema Rooms", True),
            ("marketplace", "Marketplace", True),
            ("maintenance_mode", "Maintenance Mode", False),
        ]:
            FeatureToggle.objects.get_or_create(key=key, defaults={"label": label, "enabled": enabled})

        SystemSetting.objects.get_or_create(
            key="brand",
            defaults={
                "value": {
                    "name": "RhemaVoice",
                    "tagline": "Our Voice Is Light",
                    "developer": "RhemaVoice Technologies Inc.",
                    "theme": "sacred_navy",
                }
            },
        )

        admin_user, created = User.objects.get_or_create(
            email="admin@rhemavoice.app",
            defaults={
                "username": "admin@rhemavoice.app",
                "first_name": "Rhema",
                "last_name": "Admin",
                "display_name": "Rhema Admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("Admin123!")
            admin_user.save()
        UserRole.objects.get_or_create(user=admin_user, role=super_role)
        UserRole.objects.get_or_create(user=admin_user, role=role_map["member"])

        demo, created = User.objects.get_or_create(
            email="demo@rhemavoice.app",
            defaults={
                "username": "demo@rhemavoice.app",
                "first_name": "Grace",
                "last_name": "Believer",
                "display_name": "Grace Believer",
            },
        )
        if created:
            demo.set_password("Demo123!")
            demo.save()
        UserRole.objects.get_or_create(user=demo, role=role_map["member"])

        chayil, _ = Institution.objects.update_or_create(
            code="chayil",
            defaults={
                "name": "Chayil Company Intensive",
                "tagline": "Leadership • Discipleship • Transformation",
                "description": "CCI operates its academy on RhemaVoice infrastructure. RhemaVoice hosts the platform; CCI manages curriculum, students, mentors, and certificates.",
                "logo_key": "chayil_logo",
                "primary_color": "#100030",
                "accent_color": "#DFA622",
                "program_weeks": 31,
                "student_count": 325,
                "is_featured": True,
                "is_active": True,
            },
        )
        Institution.objects.get_or_create(
            code="school-of-ministry",
            defaults={
                "name": "School of Ministry",
                "tagline": "Equip. Send. Serve.",
                "description": "Ministry training academy hosted on RhemaVoice.",
                "program_weeks": 24,
                "student_count": 120,
                "is_active": True,
            },
        )
        Institution.objects.get_or_create(
            code="bible-school",
            defaults={
                "name": "Bible School",
                "tagline": "Grounded in the Word",
                "description": "Scripture-centered academy partner.",
                "program_weeks": 40,
                "student_count": 210,
                "is_active": True,
            },
        )
        Institution.objects.get_or_create(
            code="leadership-institute",
            defaults={
                "name": "Leadership Institute",
                "tagline": "Kingdom leaders for every sphere",
                "program_weeks": 16,
                "student_count": 95,
                "is_active": True,
            },
        )
        Institution.objects.get_or_create(
            code="business-academy",
            defaults={
                "name": "Business Academy",
                "tagline": "Marketplace discipleship",
                "program_weeks": 12,
                "student_count": 80,
                "is_active": True,
            },
        )

        cat_disc, _ = CourseCategory.objects.get_or_create(slug="discipleship", defaults={"name": "Discipleship"})
        cat_lead, _ = CourseCategory.objects.get_or_create(slug="leadership", defaults={"name": "Leadership"})
        cat_bible, _ = CourseCategory.objects.get_or_create(slug="bible", defaults={"name": "Bible Studies"})

        if not Course.objects.filter(institution=chayil).exists():
            course = Course.objects.create(
                title="Foundations of Faith",
                summary="Core doctrines, prayer, and walking with the Word — CCI curriculum on RhemaVoice.",
                institution=chayil,
                category=cat_disc,
                level="beginner",
                week_number=1,
                duration_hours=6,
                xp_reward=150,
                is_published=True,
                is_live_eligible=True,
            )
            Lesson.objects.create(
                course=course, title="Tuesday Teaching", order=1, week_number=7, content="Identity in Christ", duration_min=90
            )
            Lesson.objects.create(
                course=course, title="Friday War Room", order=2, week_number=7, content="Prayer & warfare", duration_min=60
            )
            Lesson.objects.create(
                course=course, title="The Word of God", order=1, week_number=1, content="In the beginning was the Word…", duration_min=20
            )
            Course.objects.create(
                title="Leadership in Ministry",
                summary="Servant leadership for pastors, teachers, and marketplace ministers.",
                institution=chayil,
                category=cat_lead,
                level="intermediate",
                week_number=8,
                duration_hours=8,
                xp_reward=220,
                is_published=True,
            )
            Course.objects.create(
                title="Hermeneutics Essentials",
                summary="How to study and teach Scripture with clarity and reverence.",
                institution=chayil,
                category=cat_bible,
                level="intermediate",
                week_number=10,
                duration_hours=10,
                xp_reward=300,
                is_published=True,
                is_live_eligible=True,
            )

        from django.utils import timezone

        AcademyMembership.objects.update_or_create(
            institution=chayil,
            user=demo,
            defaults={"role": "student", "current_week": 7, "overall_progress": 22, "attendance_pct": 96, "is_active": True},
        )
        AcademyMembership.objects.update_or_create(
            institution=chayil,
            user=admin_user,
            defaults={"role": "academy_admin", "is_active": True},
        )
        MentorAssignment.objects.update_or_create(
            institution=chayil,
            student=demo,
            defaults={"mentor": admin_user, "rating": 4.9, "notes": "Spiritual formation & accountability"},
        )
        for course in Course.objects.filter(institution=chayil):
            Enrollment.objects.get_or_create(user=demo, course=course, defaults={"progress": 22 if course.week_number <= 7 else 0})

        if not LiveClass.objects.filter(institution=chayil).exists():
            LiveClass.objects.create(
                institution=chayil,
                title="Tuesday Teaching (Live)",
                instructor_name="Mrs. Angelica Collins",
                starts_at=timezone.now(),
                status="live",
                viewer_count=184,
                week_number=7,
            )
            LiveClass.objects.create(
                institution=chayil,
                title="Friday War Room",
                instructor_name="Pastor Ada",
                starts_at=timezone.now(),
                status="scheduled",
                week_number=7,
            )

        if not Assignment.objects.filter(institution=chayil).exists():
            Assignment.objects.create(
                institution=chayil,
                title="Identity Restoration",
                instructions="Write a reflection on your identity in Christ. Upload Word, PDF, image, or video.",
                due_at=timezone.now(),
                max_marks=100,
            )
            Assignment.objects.create(
                institution=chayil,
                title="Prayer Journal Week 7",
                instructions="Submit your weekly prayer journal entries.",
                due_at=timezone.now(),
                max_marks=50,
            )

        if not LearningResource.objects.filter(institution=chayil).exists():
            LearningResource.objects.create(
                institution=chayil, title="Identity in Christ Notes", resource_type="pdf", description="Week 7 handout"
            )
            LearningResource.objects.create(
                institution=chayil, title="Worship & Prayer Session", resource_type="audio", description="Archive recording"
            )
            LearningResource.objects.create(
                institution=chayil, title="Tuesday Teaching Replay", resource_type="video", description="Last week's class"
            )

        if not AcademyEvent.objects.filter(institution=chayil).exists():
            AcademyEvent.objects.create(
                institution=chayil,
                title="Tuesday Teaching",
                event_type="class",
                starts_at=timezone.now(),
                location="Live Classroom",
            )
            AcademyEvent.objects.create(
                institution=chayil,
                title="Assignment Deadline — Identity Restoration",
                event_type="deadline",
                starts_at=timezone.now(),
                location="",
            )
            AcademyEvent.objects.create(
                institution=chayil,
                title="Prayer Meeting",
                event_type="prayer",
                starts_at=timezone.now(),
                location="Rhema Rooms",
            )

        if not Stream.objects.exists():
            from django.utils import timezone

            live = Stream.objects.create(
                title="Sunday Live Service",
                status="live",
                description="Join the live gathering — worship, Word, and prayer.",
                church_name="RhemaVoice Global",
                viewers=184,
                is_featured=True,
                scheduled_at=timezone.now(),
            )
            Stream.objects.create(
                title="Evening Prayer Gathering",
                status="scheduled",
                description="Corporate prayer for families and nations.",
                church_name="City Gate Church",
                scheduled_at=timezone.now(),
            )
            Stream.objects.create(
                title="Hope Rising — Replay",
                status="recorded",
                description="Recorded sermon series on hope in Christ.",
                church_name="RhemaVoice Global",
                duration_min=52,
                series="Hope Rising",
            )
            StreamChatMessage.objects.create(stream=live, display_name="Grace", message="Amen — praying with you all!")
            StreamChatMessage.objects.create(stream=live, display_name="Pastor Ada", message="Welcome to the live service.")
        elif Stream.objects.count() < 2:
            pass
        else:
            # Skip duplicate stream seed when academy re-seed path runs
            pass

        # Ensure flagship room content even if older stubs exist
        VoiceRoom.objects.get_or_create(
            title="Youth Hangout",
            defaults={
                "description": "Open mic worship and testimony night.",
                "visibility": "public",
                "topic": "Youth",
                "is_live": True,
                "participant_count": 41,
                "host_name": "Grace Believer",
                "max_speakers": 12,
            },
        )
        night = VoiceRoom.objects.filter(title="Night Watch Prayer").first()
        if night and not night.polls.exists():
            RoomPoll.objects.create(
                room=night,
                question="What are we interceding for tonight?",
                options=["Families", "Churches", "Nation", "Missions"],
                is_active=True,
            )

        RadioStation.objects.get_or_create(
            name="Kingdom Pulse",
            defaults={
                "genre": "Talk",
                "description": "Interviews with kingdom entrepreneurs and missionaries.",
                "stream_url": "https://example.com/pulse",
                "presenters": "Host Team",
                "is_live": True,
                "listeners": 98,
            },
        )

        if not VoiceRoom.objects.filter(title="Night Watch Prayer").exists():
            night = VoiceRoom.objects.create(
                title="Night Watch Prayer",
                description="Overnight intercession for Liberia and the nations.",
                visibility="public",
                topic="Prayer",
                is_live=True,
                participant_count=24,
                host_name="Pastor Ada",
                recording_enabled=True,
            )
            VoiceRoom.objects.create(
                title="Leaders Circle",
                description="Invite-only room for pastors and ministry leaders.",
                visibility="invite",
                topic="Leadership",
                is_live=False,
                participant_count=0,
                host_name="Rhema Admin",
            )
            RoomPoll.objects.create(
                room=night,
                question="What are we interceding for tonight?",
                options=["Families", "Churches", "Nation", "Missions"],
                is_active=True,
            )

        if not RadioStation.objects.filter(name="Rhema FM").exists():
            fm = RadioStation.objects.create(
                name="Rhema FM",
                genre="Worship",
                description="Live worship, teaching, and Morning Manna.",
                stream_url="https://example.com/rhema",
                presenters="Pastor Ada & Team",
                is_live=True,
                listeners=312,
            )
            Podcast.objects.create(
                station=fm,
                title="Morning Manna — Faith for Today",
                host="Pastor Ada",
                duration_min=28,
                description="Daily encouragement from the Word.",
            )
            Podcast.objects.create(
                station=fm,
                title="Night Watch Replay",
                host="Intercessors Team",
                duration_min=45,
                description="Highlights from overnight prayer.",
            )
        else:
            fm = RadioStation.objects.get(name="Rhema FM")
            if not fm.podcasts.exists():
                Podcast.objects.create(
                    station=fm,
                    title="Morning Manna — Faith for Today",
                    host="Pastor Ada",
                    duration_min=28,
                    description="Daily encouragement from the Word.",
                )

        if not Track.objects.exists():
            sinach, _ = Artist.objects.get_or_create(name="Sinach", defaults={"bio": "Worship leader"})
            bethel, _ = Artist.objects.get_or_create(name="Bethel Music", defaults={"bio": "Worship collective"})
            album = Album.objects.create(title="Way Maker Collection", artist=sinach, year=2015)
            Track.objects.create(
                title="Way Maker",
                artist="Sinach",
                artist_ref=sinach,
                album=album,
                duration_sec=280,
                genre="Worship",
                lyrics="You are here, moving in our midst…",
                play_count=1200,
            )
            Track.objects.create(
                title="Goodness of God",
                artist="Bethel Music",
                artist_ref=bethel,
                duration_sec=310,
                genre="Worship",
                lyrics="I love You, Lord, for Your mercy never fails me…",
                play_count=980,
            )
            Track.objects.create(
                title="Overflow",
                artist="Sinach",
                artist_ref=sinach,
                duration_sec=265,
                genre="Praise",
                play_count=420,
            )
        else:
            Artist.objects.get_or_create(name="Sinach", defaults={"bio": "Worship leader"})
            Track.objects.get_or_create(
                title="Overflow",
                defaults={"artist": "Sinach", "duration_sec": 265, "genre": "Praise", "play_count": 420},
            )

        if not Business.objects.exists():
            retail, _ = BusinessCategory.objects.get_or_create(slug="retail", defaults={"name": "Retail"})
            services, _ = BusinessCategory.objects.get_or_create(slug="services", defaults={"name": "Services"})
            crafts = Business.objects.create(
                name="Kingdom Crafts Co.",
                category="Retail",
                category_ref=retail,
                description="Handmade journals, apparel, and faith gifts.",
                city="Monrovia",
                country="Liberia",
                phone="+2310000001",
                verified=True,
                featured=True,
                rating_avg=4.8,
                review_count=12,
            )
            BusinessProduct.objects.create(
                business=crafts, title="Leather Journal", price_cents=2500, description="Hand-stitched prayer journal"
            )
            BusinessProduct.objects.create(business=crafts, title="Faith Tee", price_cents=1800, is_service=False)
            tech = Business.objects.create(
                name="Grace Tech Solutions",
                category="Services",
                category_ref=services,
                description="Web and media services for churches and ministries.",
                city="Monrovia",
                country="Liberia",
                verified=False,
                rating_avg=4.2,
                review_count=5,
            )
            BusinessProduct.objects.create(
                business=tech, title="Church Website Setup", price_cents=15000, is_service=True
            )

        if not JobPosting.objects.exists():
            city_gate, _ = Company.objects.get_or_create(
                name="City Gate Church", defaults={"industry": "Ministry", "verified": True}
            )
            studios, _ = Company.objects.get_or_create(
                name="Rhema Studios", defaults={"industry": "Media", "verified": True}
            )
            JobPosting.objects.create(
                title="Youth Pastor",
                company=city_gate,
                company_name="City Gate Church",
                location="Remote",
                employment_type="full_time",
                is_remote=True,
                description="Lead and disciple young believers, plan gatherings, and mentor volunteers.",
                salary_range="$28k – $36k",
            )
            JobPosting.objects.create(
                title="Media Producer",
                company=studios,
                company_name="Rhema Studios",
                location="Lagos, Nigeria",
                employment_type="contract",
                description="Produce sermon videos, livestream graphics, and podcast edits.",
                salary_range="$15/hr",
            )
            JobPosting.objects.create(
                title="Worship Coordinator",
                company=city_gate,
                company_name="City Gate Church",
                location="Monrovia, Liberia",
                employment_type="part_time",
                description="Coordinate worship teams, rehearsals, and Sunday set lists.",
                salary_range="Stipend",
            )

        if not Product.objects.exists():
            Product.objects.create(
                title="Study Bible Digital",
                price_cents=1999,
                product_type="digital",
                category="Books",
                description="Downloadable study Bible with commentary and reading plans.",
                rating_avg=4.9,
            )
            Product.objects.create(
                title="Worship Hoodie",
                price_cents=4500,
                product_type="physical",
                category="Apparel",
                description="Soft cotton-blend hoodie with subtle kingdom branding.",
                rating_avg=4.6,
            )
            Product.objects.create(
                title="Prayer Journal Bundle",
                price_cents=2600,
                product_type="physical",
                category="Accessories",
                description="Set of three guided prayer journals.",
                rating_avg=4.7,
            )

        if not StoreProduct.objects.exists():
            StoreProduct.objects.create(
                title="RhemaVoice Tee", price_cents=3500, sku="RV-TEE-01", category="apparel", is_featured=True
            )
            StoreProduct.objects.create(
                title="Journal of Hope", price_cents=2200, sku="RV-JNL-01", category="books"
            )
            StoreProduct.objects.create(
                title="Kingdom Gift Card", price_cents=5000, sku="RV-GC-50", category="gift_card"
            )
            StoreProduct.objects.create(
                title="Worship Mug", price_cents=1500, sku="RV-MUG-01", category="accessories", is_featured=True
            )

        if not PaymentProvider.objects.exists():
            PaymentProvider.objects.create(key="stripe", name="Stripe", supports_currency="USD,EUR,GBP")
            PaymentProvider.objects.create(key="paystack", name="Paystack", supports_currency="NGN,USD,GHS")
            PaymentProvider.objects.create(key="flutterwave", name="Flutterwave", supports_currency="NGN,USD,KES")
            PaymentProvider.objects.create(key="mobile_money", name="Mobile Money", supports_currency="LRD,GHS,KES")

        wallet, _ = WalletAccount.objects.get_or_create(user=demo, defaults={"currency": "USD"})
        if not wallet.transactions.exists():
            wallet.balance_cents = 12500
            wallet.save(update_fields=["balance_cents"])
            Transaction.objects.create(
                wallet=wallet, tx_type="topup", amount_cents=15000, balance_after_cents=15000,
                description="Wallet top-up", reference="TX-SEED0001",
            )
            Transaction.objects.create(
                wallet=wallet, tx_type="giving", amount_cents=-2500, balance_after_cents=12500,
                description="Sunday offering", reference="TX-SEED0002",
            )

        if not Notification.objects.filter(user=demo).exists():
            Notification.objects.create(
                user=demo, title="Welcome to RhemaVoice", body="Your journey starts here. Explore the modules!",
                category="system",
            )
            Notification.objects.create(
                user=demo, title="Sunday Live Service is starting", body="Join the live gathering now.",
                category="streaming", action_url="/streaming",
            )
            Notification.objects.create(
                user=demo, title="New course available", body="Leadership in Ministry from Chayil.",
                category="academy", action_url="/academy",
            )

        if not Conversation.objects.exists():
            convo = Conversation.objects.create(title="Rhema Admin", is_group=False)
            Participant.objects.create(conversation=convo, user=demo)
            Participant.objects.create(conversation=convo, user=admin_user)
            Message.objects.create(conversation=convo, sender=admin_user, body="Welcome to RhemaVoice, Grace! Let us know if you need anything.")
            Message.objects.create(conversation=convo, sender=demo, body="Thank you! Excited to be here.")

        if not MetricSnapshot.objects.filter(module="engagement").exists():
            from datetime import date, timedelta

            base = date.today() - timedelta(days=6)
            values = [120, 145, 138, 190, 175, 210, 245]
            for i, val in enumerate(values):
                MetricSnapshot.objects.create(
                    key="daily_active_users",
                    label=(base + timedelta(days=i)).strftime("%a"),
                    value=val,
                    unit="users",
                    module="engagement",
                    captured_for=base + timedelta(days=i),
                )

        if not Church.objects.exists():
            from django.utils import timezone

            gate = Church.objects.create(
                name="City Gate Church",
                city="Monrovia",
                country="Liberia",
                description="A vibrant community of believers gathering for worship, discipleship, and outreach.",
                pastor_name="Pastor Ada",
                is_verified=True,
                member_count=1,
            )
            Church.objects.create(
                name="RhemaVoice Global",
                city="Online",
                country="Global",
                description="Digital-first fellowship for the RhemaVoice family worldwide.",
                pastor_name="Rhema Admin",
                is_verified=True,
                member_count=0,
            )
            ChurchMembership.objects.create(church=gate, user=demo, role="member")
            ChurchEvent.objects.create(
                church=gate,
                title="Sunday Celebration Service",
                description="Worship, Word, and communion.",
                starts_at=timezone.now(),
                location="Main Auditorium",
            )
            ChurchEvent.objects.create(
                church=gate,
                title="Midweek Prayer",
                description="Corporate intercession for families and the city.",
                starts_at=timezone.now(),
                location="Prayer Hall",
            )

        if not LearningArea.objects.exists():
            kpelle, _ = LearningArea.objects.get_or_create(
                slug="kpelle",
                defaults={"name": "Liberian Languages", "description": "Learn indigenous Liberian languages through voice lessons."},
            )
            bible, _ = LearningArea.objects.get_or_create(
                slug="bible-education",
                defaults={"name": "Bible Education", "description": "Foundational and advanced Bible teaching."},
            )
            LearnLesson.objects.create(area=kpelle, title="Introduction to Kpelle", teacher_name="Teacher Marie", is_voice=True)
            LearnLesson.objects.create(area=bible, title="Bible Foundations", teacher_name="Pastor Daniel", is_voice=True)
            LearningSession.objects.create(title="Liberian Language Study", host_name="Teacher James", status="live", participant_count=67)

        if not Opportunity.objects.exists():
            Opportunity.objects.create(
                type="job", title="Youth Pastor", organization="City Gate Church",
                description="Lead youth ministry and discipleship programs.", location="Monrovia", country="Liberia", category="Ministry",
            )
            Opportunity.objects.create(
                type="scholarship", title="Ministry Leadership Scholarship", organization="Bible Training Academy",
                description="Full scholarship for leadership training.", country="Liberia", category="Education",
            )
            Opportunity.objects.create(
                type="grant", title="Youth Empowerment Grant", organization="Kingdom Partners NGO",
                description="Funding for youth-led community projects.", country="Liberia", category="Community",
            )
            Opportunity.objects.create(
                type="loan", title="Student Education Loan", organization="Faith Finance Partners",
                description="Affordable education financing.", country="Liberia", category="Education", amount_label="Up to $5,000",
            )

        if not TransportProvider.objects.exists():
            TransportProvider.objects.create(
                name="Monrovia Express", description="Reliable airport transfers and city rides.",
                city="Monrovia", services="Airport Transfer, Taxi, Executive", is_verified=True, rating_avg=4.6,
            )
            TransportProvider.objects.create(
                name="Liberia Shuttle Co.", description="Intercity shuttle services across Liberia.",
                city="Buchanan", services="Shuttle, Intercity", is_verified=True, rating_avg=4.3,
            )

        if not Event.objects.exists():
            from django.utils import timezone

            summit = Event.objects.create(
                title="Kingdom Leadership Summit",
                organizer="RhemaVoice Technologies Inc.",
                description="A gathering of leaders, pastors, and marketplace believers.",
                venue="Monrovia Convention Center",
                city="Monrovia",
                country="Liberia",
                starts_at=timezone.now(),
                category="Conference",
            )
            TicketTier.objects.create(event=summit, name="Standard", price_cents=2500, quantity_available=500)
            TicketTier.objects.create(event=summit, name="VIP", price_cents=7500, quantity_available=100)

        if not TravelAgency.objects.exists():
            from django.utils import timezone

            grace = TravelAgency.objects.create(
                name="Grace Travel Agency",
                description="Licensed travel agency for domestic and international flights.",
                city="Monrovia",
                country="Liberia",
                is_verified=True,
                rating_avg=4.7,
            )
            kingdom = TravelAgency.objects.create(
                name="Kingdom Air Services",
                description="Approved RhemaAir travel partner.",
                city="Monrovia",
                country="Liberia",
                is_verified=True,
                rating_avg=4.5,
            )
            FlightListing.objects.create(
                agency=grace,
                airline="Royal Air Maroc",
                departure_city="Monrovia",
                arrival_city="Accra",
                departure_at=timezone.now(),
                price_cents=42000,
            )
            FlightListing.objects.create(
                agency=kingdom,
                airline="ASKY Airlines",
                departure_city="Monrovia",
                arrival_city="Lagos",
                departure_at=timezone.now(),
                price_cents=38000,
            )

        AuditLog.objects.get_or_create(actor=admin_user, action="system.seed_demo")

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
        self.stdout.write("Admin: admin@rhemavoice.app / Admin123!")
        self.stdout.write("Demo:  demo@rhemavoice.app / Demo123!")
        self.stdout.write("OTP (dev): 123456")
