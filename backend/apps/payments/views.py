import uuid

from django.db import transaction as db_transaction
from django.views.decorators.csrf import csrf_exempt
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.wallet.models import Transaction, WalletAccount

from .gateway import initiate_payment, verify_webhook_signature
from .models import Payment, PaymentProvider


class PaymentProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentProvider
        fields = ["id", "key", "name", "is_active", "supports_currency"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "amount_cents",
            "currency",
            "provider",
            "purpose",
            "reference",
            "status",
            "checkout_url",
            "provider_reference",
            "sandbox",
            "created_at",
        ]


def _credit_wallet(user, amount_cents, description, reference):
    wallet, _ = WalletAccount.objects.get_or_create(user=user, defaults={"currency": "USD"})
    with db_transaction.atomic():
        wallet = WalletAccount.objects.select_for_update().get(pk=wallet.pk)
        wallet.balance_cents += amount_cents
        wallet.save(update_fields=["balance_cents"])
        Transaction.objects.create(
            wallet=wallet,
            tx_type="topup",
            amount_cents=amount_cents,
            balance_after_cents=wallet.balance_cents,
            description=description,
            reference=reference,
        )


def _complete_payment(payment: Payment) -> Payment:
    if payment.status == "succeeded":
        return payment
    payment.status = "succeeded"
    payment.save(update_fields=["status"])
    purpose = (payment.purpose or "").lower()
    if "wallet" in purpose or "topup" in purpose or "top-up" in purpose:
        _credit_wallet(
            payment.user,
            payment.amount_cents,
            f"Payment top-up via {payment.provider}",
            payment.reference,
        )
    if payment.user_id:
        Notification.objects.create(
            user=payment.user,
            title="Payment successful",
            body=f"{payment.reference} · ${(payment.amount_cents / 100):.2f} via {payment.provider}",
            category="wallet",
            action_url="/wallet",
        )
        # Fan-out over channels when available
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            layer = get_channel_layer()
            if layer:
                async_to_sync(layer.group_send)(
                    f"user_{payment.user_id}",
                    {
                        "type": "notify",
                        "payload": {
                            "title": "Payment successful",
                            "body": f"{payment.reference} completed",
                            "category": "wallet",
                        },
                    },
                )
        except Exception:
            pass
    return payment


class PaymentProviderView(APIView):
    def get(self, request):
        providers = PaymentProvider.objects.filter(is_active=True)
        return Response(PaymentProviderSerializer(providers, many=True).data)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"])
    def initiate(self, request):
        amount = int(request.data.get("amount_cents", 0))
        if amount <= 0:
            return Response({"detail": "Amount must be positive."}, status=status.HTTP_400_BAD_REQUEST)
        provider = request.data.get("provider", "stripe")
        reference = f"PAY-{uuid.uuid4().hex[:10].upper()}"
        callback_base = request.build_absolute_uri("/api/v1").rstrip("/")
        result = initiate_payment(
            provider=provider,
            amount_cents=amount,
            currency=request.data.get("currency", "USD"),
            reference=reference,
            email=request.user.email,
            purpose=request.data.get("purpose", ""),
            callback_base=callback_base,
        )
        payment = Payment.objects.create(
            user=request.user,
            amount_cents=amount,
            currency=request.data.get("currency", "USD"),
            provider=provider,
            purpose=request.data.get("purpose", ""),
            reference=reference,
            status="initiated",
            checkout_url=result.checkout_url,
            provider_reference=result.provider_reference,
            sandbox=result.sandbox,
            client_secret=result.client_secret,
        )
        data = PaymentSerializer(payment).data
        data["client_secret"] = result.client_secret
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def confirm(self, request):
        """Confirm a sandbox (or client-side) payment by reference."""
        reference = request.data.get("reference")
        try:
            payment = Payment.objects.get(reference=reference, user=request.user)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)
        payment = _complete_payment(payment)
        return Response(PaymentSerializer(payment).data)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def sandbox_confirm(request):
    reference = request.GET.get("reference") or request.data.get("reference")
    try:
        payment = Payment.objects.get(reference=reference)
    except Payment.DoesNotExist:
        return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)
    payment = _complete_payment(payment)
    return Response(
        {
            "detail": "Sandbox payment confirmed.",
            "payment": PaymentSerializer(payment).data,
        }
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def webhook(request, provider: str):
    signature = (
        request.headers.get("X-Signature")
        or request.headers.get("X-Paystack-Signature")
        or request.headers.get("Stripe-Signature")
        or ""
    )
    if not verify_webhook_signature(provider, request.body, signature):
        return Response({"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    payload = request.data if isinstance(request.data, dict) else {}
    reference = (
        payload.get("reference")
        or payload.get("data", {}).get("reference")
        or payload.get("data", {}).get("metadata", {}).get("reference")
    )
    if not reference:
        return Response({"detail": "reference missing"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        payment = Payment.objects.get(reference=reference)
    except Payment.DoesNotExist:
        return Response({"detail": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)
    event = str(payload.get("event") or payload.get("type") or "success").lower()
    if "fail" in event:
        payment.status = "failed"
        payment.save(update_fields=["status"])
        return Response({"detail": "Marked failed"})
    payment = _complete_payment(payment)
    return Response({"detail": "ok", "status": payment.status})
