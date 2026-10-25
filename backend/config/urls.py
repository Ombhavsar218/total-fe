from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.utils import timezone


def health(_request):
    return JsonResponse({"status": "ok", "timestamp": timezone.now().isoformat()})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),
    path("api/", include("accounts.urls")),
    path("api/", include("inventory.urls")),
]
