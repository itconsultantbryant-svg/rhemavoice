from rest_framework import serializers, viewsets

from .models import StoreProduct


class StoreProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreProduct
        fields = ["id", "title", "description", "price_cents", "sku", "category", "stock", "is_featured", "created_at"]


class StoreProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StoreProduct.objects.all()
    serializer_class = StoreProductSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return qs
