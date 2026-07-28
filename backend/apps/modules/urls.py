from django.urls import path

from apps.modules.views import ModuleListView, ModuleProfileView

urlpatterns = [
    path("", ModuleListView.as_view()),
    path("<str:module_id>/profile/", ModuleProfileView.as_view()),
]
