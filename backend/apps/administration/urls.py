from django.urls import path

from apps.administration.views import (
    AdminApplicationsView,
    AdminChatModerateView,
    AdminChatView,
    AdminJobActionView,
    AdminJobsView,
    AdminOrderActionView,
    AdminOrdersView,
    AdminRolesView,
    AdminUserDetailView,
    AdminUsersView,
    AuditLogListView,
    FeatureToggleListView,
    FeatureToggleUpdateView,
    SystemSettingsView,
)

urlpatterns = [
    path("users/", AdminUsersView.as_view()),
    path("users/<uuid:user_id>/", AdminUserDetailView.as_view()),
    path("roles/", AdminRolesView.as_view()),
    path("feature-toggles/", FeatureToggleListView.as_view()),
    path("feature-toggles/<str:key>/", FeatureToggleUpdateView.as_view()),
    path("audit-logs/", AuditLogListView.as_view()),
    path("settings/", SystemSettingsView.as_view()),
    path("jobs/", AdminJobsView.as_view()),
    path("jobs/<uuid:job_id>/", AdminJobActionView.as_view()),
    path("applications/", AdminApplicationsView.as_view()),
    path("orders/", AdminOrdersView.as_view()),
    path("orders/<uuid:order_id>/", AdminOrderActionView.as_view()),
    path("chat/", AdminChatView.as_view()),
    path("chat/messages/<uuid:message_id>/", AdminChatModerateView.as_view()),
]
