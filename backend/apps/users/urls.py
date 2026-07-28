from django.urls import path

from apps.users.views import LoginView, LogoutView, MeView, OTPVerifyView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("otp/verify/", OTPVerifyView.as_view()),
    path("me/", MeView.as_view()),
    path("logout/", LogoutView.as_view()),
]
