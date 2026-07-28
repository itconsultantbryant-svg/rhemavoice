from django.urls import path

from .views import MyPreferencesView

urlpatterns = [
    path("preferences/", MyPreferencesView.as_view()),
]
