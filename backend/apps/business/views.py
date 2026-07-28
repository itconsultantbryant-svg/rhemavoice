from django.db.models import Avg, Count
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Business, BusinessCategory, BusinessFavorite, BusinessProduct, BusinessReview


class BusinessCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessCategory
        fields = ["id", "name", "slug"]


class BusinessProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessProduct
        fields = ["id", "title", "price_cents", "description", "is_service"]


class BusinessReviewSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = BusinessReview
        fields = ["id", "rating", "comment", "author", "created_at"]


class BusinessSerializer(serializers.ModelSerializer):
    products = BusinessProductSerializer(many=True, read_only=True)
    is_favorite = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = [
            "id",
            "name",
            "category",
            "category_name",
            "description",
            "city",
            "country",
            "phone",
            "website",
            "verified",
            "featured",
            "rating_avg",
            "review_count",
            "products",
            "is_favorite",
            "created_at",
        ]

    def get_is_favorite(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.favorites.filter(user=request.user).exists()

    def get_category_name(self, obj):
        if obj.category_ref_id:
            return obj.category_ref.name
        return obj.category


class BusinessViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Business.objects.select_related("category_ref").prefetch_related("products", "reviews", "favorites")
    serializer_class = BusinessSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def favorite(self, request, pk=None):
        business = self.get_object()
        fav, created = BusinessFavorite.objects.get_or_create(user=request.user, business=business)
        if not created:
            fav.delete()
            return Response({"favorited": False})
        return Response({"favorited": True}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        business = self.get_object()
        rating = int(request.data.get("rating", 5))
        comment = request.data.get("comment", "")
        review, _ = BusinessReview.objects.update_or_create(
            business=business,
            user=request.user,
            defaults={"rating": max(1, min(5, rating)), "comment": comment},
        )
        agg = business.reviews.aggregate(avg=Avg("rating"), count=Count("id"))
        business.rating_avg = round(agg["avg"] or 0, 2)
        business.review_count = agg["count"] or 0
        business.save(update_fields=["rating_avg", "review_count"])
        return Response(BusinessReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def categories(self, request):
        return Response(BusinessCategorySerializer(BusinessCategory.objects.all(), many=True).data)
