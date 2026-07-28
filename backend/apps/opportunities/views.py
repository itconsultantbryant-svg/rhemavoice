from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Opportunity, OpportunityApplication, SavedOpportunity


class OpportunitySerializer(serializers.ModelSerializer):
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "type",
            "title",
            "organization",
            "description",
            "location",
            "country",
            "category",
            "amount_label",
            "deadline",
            "status",
            "is_saved",
            "created_at",
        ]

    def get_is_saved(self, obj):
        user = self.context.get("request").user
        if not user or not user.is_authenticated:
            return False
        return SavedOpportunity.objects.filter(user=user, opportunity=obj).exists()


class OpportunityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Opportunity.objects.filter(status="open")
    serializer_class = OpportunitySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        opp_type = self.request.query_params.get("type")
        if opp_type:
            qs = qs.filter(type=opp_type)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__icontains=category)
        country = self.request.query_params.get("country")
        if country:
            qs = qs.filter(country__icontains=country)
        return qs

    @action(detail=True, methods=["post"])
    def save_opportunity(self, request, pk=None):
        opp = self.get_object()
        obj, created = SavedOpportunity.objects.get_or_create(user=request.user, opportunity=opp)
        if not created:
            obj.delete()
            return Response({"saved": False})
        return Response({"saved": True})

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        opp = self.get_object()
        app, created = OpportunityApplication.objects.get_or_create(
            user=request.user,
            opportunity=opp,
            defaults={"cover_note": request.data.get("cover_note", "")},
        )
        if not created:
            return Response({"detail": "Already applied."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"id": str(app.id), "status": app.status}, status=status.HTTP_201_CREATED)


class MyOpportunitiesView(viewsets.ViewSet):
    def list(self, request):
        applications = OpportunityApplication.objects.filter(user=request.user).select_related("opportunity")
        saved = SavedOpportunity.objects.filter(user=request.user).select_related("opportunity")
        return Response(
            {
                "applications": [
                    {
                        "id": str(a.id),
                        "status": a.status,
                        "opportunity": OpportunitySerializer(a.opportunity, context={"request": request}).data,
                    }
                    for a in applications
                ],
                "saved": [
                    OpportunitySerializer(s.opportunity, context={"request": request}).data for s in saved
                ],
            }
        )
