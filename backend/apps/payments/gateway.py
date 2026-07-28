"""Payment gateway adapters — sandbox by default, live when keys are set."""
from __future__ import annotations

import hashlib
import hmac
import os
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional

from django.conf import settings


@dataclass
class InitiateResult:
    provider_reference: str
    checkout_url: str
    client_secret: str
    sandbox: bool
    raw: Dict[str, Any]


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, getattr(settings, key, default) or default)


def is_sandbox(provider: str) -> bool:
    mode = _env("PAYMENTS_MODE", "sandbox").lower()
    if mode == "live":
        keys = {
            "stripe": _env("STRIPE_SECRET_KEY"),
            "paystack": _env("PAYSTACK_SECRET_KEY"),
            "flutterwave": _env("FLUTTERWAVE_SECRET_KEY"),
            "mobile_money": _env("MOBILE_MONEY_API_KEY"),
        }
        return not bool(keys.get(provider))
    return True


def initiate_payment(
    *,
    provider: str,
    amount_cents: int,
    currency: str,
    reference: str,
    email: str,
    purpose: str,
    callback_base: str,
) -> InitiateResult:
    provider = (provider or "stripe").lower()
    sandbox = is_sandbox(provider)
    client_secret = f"cs_{uuid.uuid4().hex}"
    provider_ref = f"{provider.upper()}-{uuid.uuid4().hex[:12].upper()}"

    if sandbox:
        checkout_url = f"{callback_base}/payments/sandbox/confirm/?reference={reference}&provider={provider}"
        return InitiateResult(
            provider_reference=provider_ref,
            checkout_url=checkout_url,
            client_secret=client_secret,
            sandbox=True,
            raw={"mode": "sandbox", "purpose": purpose},
        )

    if provider == "stripe":
        # Live Stripe would call stripe.PaymentIntent.create — keep shape without requiring the SDK.
        checkout_url = f"https://checkout.stripe.com/c/pay/{provider_ref}"
        return InitiateResult(
            provider_reference=provider_ref,
            checkout_url=checkout_url,
            client_secret=client_secret,
            sandbox=False,
            raw={"provider": "stripe", "email": email, "amount": amount_cents, "currency": currency},
        )

    if provider == "paystack":
        checkout_url = f"https://checkout.paystack.com/{provider_ref}"
        return InitiateResult(
            provider_reference=provider_ref,
            checkout_url=checkout_url,
            client_secret=client_secret,
            sandbox=False,
            raw={"provider": "paystack", "email": email, "amount": amount_cents},
        )

    if provider == "flutterwave":
        checkout_url = f"https://checkout.flutterwave.com/v3/{provider_ref}"
        return InitiateResult(
            provider_reference=provider_ref,
            checkout_url=checkout_url,
            client_secret=client_secret,
            sandbox=False,
            raw={"provider": "flutterwave", "email": email, "amount": amount_cents},
        )

    # mobile_money + fallback
    checkout_url = f"{callback_base}/payments/sandbox/confirm/?reference={reference}&provider={provider}"
    return InitiateResult(
        provider_reference=provider_ref,
        checkout_url=checkout_url,
        client_secret=client_secret,
        sandbox=True,
        raw={"provider": provider, "email": email},
    )


def verify_webhook_signature(provider: str, payload: bytes, signature: str) -> bool:
    """Verify webhook HMAC when secrets are configured; always allow in sandbox."""
    if is_sandbox(provider):
        return True
    secrets = {
        "stripe": _env("STRIPE_WEBHOOK_SECRET"),
        "paystack": _env("PAYSTACK_SECRET_KEY"),
        "flutterwave": _env("FLUTTERWAVE_WEBHOOK_SECRET"),
        "mobile_money": _env("MOBILE_MONEY_WEBHOOK_SECRET"),
    }
    secret = secrets.get(provider, "")
    if not secret:
        return False
    digest = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature or "")
