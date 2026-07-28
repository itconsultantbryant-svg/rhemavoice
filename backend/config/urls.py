from django.http import JsonResponse
from django.urls import include, path
from django.contrib import admin


def health(_request):
    return JsonResponse({"status": "ok", "service": "rhemavoice-api"})


urlpatterns = [
    path("health/", health),
    path("admin/", admin.site.urls),
    path("api/v1/", include("config.api_urls")),
]
