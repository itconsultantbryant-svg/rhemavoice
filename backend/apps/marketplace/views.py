import uuid

from django.db import transaction
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CartItem, Order, OrderItem, Product, Wishlist


class ProductSerializer(serializers.ModelSerializer):
    in_wishlist = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "description",
            "price_cents",
            "product_type",
            "category",
            "stock",
            "rating_avg",
            "in_wishlist",
            "created_at",
        ]

    def get_in_wishlist(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.wishlisted_by.filter(user=request.user).exists())


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    line_total_cents = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "quantity", "line_total_cents"]

    def get_line_total_cents(self, obj):
        return obj.product.price_cents * obj.quantity


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "title", "unit_price_cents", "quantity"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "reference", "total_cents", "status", "source", "items", "created_at"]


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def wishlist(self, request, pk=None):
        product = self.get_object()
        item, created = Wishlist.objects.get_or_create(user=request.user, product=product)
        if not created:
            item.delete()
            return Response({"wishlisted": False})
        return Response({"wishlisted": True}, status=status.HTTP_201_CREATED)


class CartView(APIView):
    def get(self, request):
        items = CartItem.objects.filter(user=request.user).select_related("product")
        total = sum(i.product.price_cents * i.quantity for i in items)
        return Response({"items": CartItemSerializer(items, many=True).data, "total_cents": total})

    def post(self, request):
        product_id = request.data.get("product_id")
        quantity = int(request.data.get("quantity", 1))
        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        item, created = CartItem.objects.get_or_create(user=request.user, product=product, defaults={"quantity": quantity})
        if not created:
            item.quantity += quantity
            item.save()
        return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        CartItem.objects.filter(user=request.user, id=request.data.get("item_id")).delete()
        return Response({"detail": "Removed."})


class CheckoutView(APIView):
    def post(self, request):
        items = CartItem.objects.filter(user=request.user).select_related("product")
        if not items:
            return Response({"detail": "Cart is empty."}, status=status.HTTP_400_BAD_REQUEST)
        total = sum(i.product.price_cents * i.quantity for i in items)
        with transaction.atomic():
            order = Order.objects.create(
                user=request.user,
                reference=f"RV-{uuid.uuid4().hex[:10].upper()}",
                total_cents=total,
                status="paid",
                source=request.data.get("source", "marketplace"),
            )
            for i in items:
                OrderItem.objects.create(
                    order=order,
                    product=i.product,
                    title=i.product.title,
                    unit_price_cents=i.product.price_cents,
                    quantity=i.quantity,
                )
            items.delete()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")
