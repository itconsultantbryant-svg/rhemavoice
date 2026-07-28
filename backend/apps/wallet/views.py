import uuid

from django.db import transaction as db_transaction
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Transaction, WalletAccount


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id",
            "tx_type",
            "amount_cents",
            "balance_after_cents",
            "description",
            "reference",
            "status",
            "created_at",
        ]


class WalletAccountSerializer(serializers.ModelSerializer):
    recent_transactions = serializers.SerializerMethodField()

    class Meta:
        model = WalletAccount
        fields = ["id", "balance_cents", "currency", "recent_transactions", "created_at"]

    def get_recent_transactions(self, obj):
        return TransactionSerializer(obj.transactions.all()[:10], many=True).data


def _record(wallet, tx_type, amount_cents, description):
    with db_transaction.atomic():
        wallet = WalletAccount.objects.select_for_update().get(pk=wallet.pk)
        wallet.balance_cents += amount_cents
        wallet.save(update_fields=["balance_cents"])
        return Transaction.objects.create(
            wallet=wallet,
            tx_type=tx_type,
            amount_cents=amount_cents,
            balance_after_cents=wallet.balance_cents,
            description=description,
            reference=f"TX-{uuid.uuid4().hex[:10].upper()}",
        )


class WalletAccountViewSet(viewsets.ViewSet):
    def _get_wallet(self, request):
        wallet, _ = WalletAccount.objects.get_or_create(user=request.user, defaults={"currency": "USD"})
        return wallet

    def list(self, request):
        wallet = self._get_wallet(request)
        return Response(WalletAccountSerializer(wallet).data)

    @action(detail=False, methods=["get"])
    def transactions(self, request):
        wallet = self._get_wallet(request)
        return Response(TransactionSerializer(wallet.transactions.all(), many=True).data)

    @action(detail=False, methods=["post"])
    def topup(self, request):
        amount = int(request.data.get("amount_cents", 0))
        if amount <= 0:
            return Response({"detail": "Amount must be positive."}, status=status.HTTP_400_BAD_REQUEST)
        wallet = self._get_wallet(request)
        tx = _record(wallet, "topup", amount, request.data.get("description", "Wallet top-up"))
        return Response(TransactionSerializer(tx).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def give(self, request):
        amount = int(request.data.get("amount_cents", 0))
        wallet = self._get_wallet(request)
        if amount <= 0:
            return Response({"detail": "Amount must be positive."}, status=status.HTTP_400_BAD_REQUEST)
        if wallet.balance_cents < amount:
            return Response({"detail": "Insufficient balance."}, status=status.HTTP_400_BAD_REQUEST)
        tx = _record(wallet, "giving", -amount, request.data.get("description", "Giving / offering"))
        return Response(TransactionSerializer(tx).data, status=status.HTTP_201_CREATED)
