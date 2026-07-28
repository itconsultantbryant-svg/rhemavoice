from datetime import timedelta
import secrets

from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.roles.models import Role, UserRole
from apps.users.models import OTPChallenge, User
from apps.users.serializers import (
    LoginSerializer,
    OTPVerifySerializer,
    RegisterSerializer,
    UserSerializer,
)


def issue_otp(user, purpose="login"):
    code = settings.OTP_CODE if settings.OTP_DEBUG else f"{secrets.randbelow(10**6):06d}"
    challenge = OTPChallenge.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(seconds=settings.OTP_TTL_SECONDS),
    )
    payload = {
        "otp_required": True,
        "challenge_id": str(challenge.id),
        "message": "OTP sent. Use 123456 in development." if settings.OTP_DEBUG else "OTP sent.",
    }
    if settings.OTP_DEBUG:
        payload["debug_code"] = code
    return payload


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if User.objects.filter(email__iexact=data["email"]).exists():
            return Response({"detail": "Email already registered."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(
            username=data["email"].lower(),
            email=data["email"].lower(),
            password=data["password"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            phone=data.get("phone", ""),
            display_name=f"{data['first_name']} {data['last_name']}".strip(),
        )
        member, _ = Role.objects.get_or_create(code="member", defaults={"name": "Member"})
        UserRole.objects.get_or_create(user=user, role=member)
        return Response(issue_otp(user, "register"), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    # Skip JWT auth so a stale Bearer token cannot 401 this endpoint.
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        password = serializer.validated_data["password"]
        user = authenticate(request, username=email, password=password)
        if not user:
            try:
                candidate = User.objects.get(email__iexact=email)
                if not candidate.is_active:
                    return Response(
                        {"detail": "Account is suspended. Contact support."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
                user = authenticate(request, username=candidate.username, password=password)
            except User.DoesNotExist:
                user = None
        if not user:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(issue_otp(user, "login"))


class OTPVerifyView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            challenge = OTPChallenge.objects.select_related("user").get(
                id=serializer.validated_data["challenge_id"]
            )
        except (OTPChallenge.DoesNotExist, ValueError, TypeError):
            return Response(
                {"detail": "Invalid or expired challenge. Please sign in again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if challenge.is_used or challenge.expires_at < timezone.now():
            return Response(
                {"detail": "OTP expired. Please sign in again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if challenge.code != serializer.validated_data["code"].strip():
            return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
        if not challenge.user.is_active:
            return Response(
                {"detail": "Account is suspended. Contact support."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        challenge.is_used = True
        challenge.save(update_fields=["is_used"])
        user = challenge.user
        return Response({"user": UserSerializer(user).data, "tokens": tokens_for(user)})


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class LogoutView(APIView):
    def post(self, request):
        refresh = request.data.get("refresh")
        if refresh:
            try:
                token = RefreshToken(refresh)
                token.blacklist()
            except Exception:
                pass
        return Response({"detail": "Logged out."})
