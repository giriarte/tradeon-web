import typing as t
from enum import Enum
from datetime import datetime, timezone

THREE_YEARS_SECONDS = 3 * 365 * 24 * 3600


def ttl_three_years() -> int:
    """Returns a Unix timestamp 3 years from now, suitable for DynamoDB TTL."""
    return int(datetime.now(timezone.utc).timestamp()) + THREE_YEARS_SECONDS


class PaymentMethodType(str, Enum):
    CREDIT_CARD = "CREDIT_CARD"
    PAYPAL      = "PAYPAL"
    CRYPTO      = "CRYPTO"


class PaymentMethod:
    """
    Represents a saved payment method owned by a user.
    A user can have multiple payment methods; one can be marked as default.

    DynamoDB layout
    ---------------
    Table         : PaymentMethods
    Partition key : userId          (STRING)
    Sort key      : paymentMethodId (STRING)

    GSIs
    ----
    PaymentMethodIdIndex — PK: paymentMethodId   (direct lookup by id, e.g. from a payment event)
    TypeIndex            — PK: type              (list all methods of a given type)
    """

    def __init__(
        self,
        user_id: str,
        payment_method_id: str,
        method_type: PaymentMethodType,
        is_default: bool,
        created_at: str,
        updated_at: str,
        details: t.Dict[str, t.Any],
        ttl: t.Optional[int] = None,
    ):
        self.user_id           = user_id
        self.payment_method_id = payment_method_id
        self.method_type       = method_type
        self.is_default        = is_default
        self.created_at        = created_at   # ISO-8601 timestamp
        self.updated_at        = updated_at   # ISO-8601 timestamp

        # `details` is a method-specific map. Expected shapes:
        #
        # CREDIT_CARD:
        #   { "last4": "4242", "brand": "visa", "expiryMonth": 12, "expiryYear": 2028,
        #     "cardholderName": "John Doe", "token": "<gateway-token>" }
        #
        # PAYPAL:
        #   { "email": "user@example.com", "payerId": "<paypal-payer-id>" }
        #
        # CRYPTO:
        #   { "network": "ethereum", "walletAddress": "0xABC...", "coin": "USDT" }
        self.details = details
        self.ttl     = ttl if ttl is not None else ttl_three_years()

    # ------------------------------------------------------------------
    # Serialisation helpers
    # ------------------------------------------------------------------

    def to_item(self) -> t.Dict[str, t.Any]:
        """Return a dict ready to be written to DynamoDB via put_item."""
        return {
            "userId":          self.user_id,
            "paymentMethodId": self.payment_method_id,
            "type":            self.method_type.value,
            "isDefault":       self.is_default,
            "createdAt":       self.created_at,
            "updatedAt":       self.updated_at,
            "details":         self.details,
            "ttl":             self.ttl,
        }

    @classmethod
    def from_item(cls, item: t.Dict[str, t.Any]) -> "PaymentMethod":
        """Hydrate a PaymentMethod from a raw DynamoDB item dict."""
        return cls(
            user_id           = item["userId"],
            payment_method_id = item["paymentMethodId"],
            method_type       = PaymentMethodType(item["type"]),
            is_default        = item["isDefault"],
            created_at        = item["createdAt"],
            updated_at        = item["updatedAt"],
            details           = item["details"],
            ttl               = int(item["ttl"]) if "ttl" in item else None,
        )

    def __repr__(self) -> str:
        return (
            f"PaymentMethod(user_id={self.user_id!r}, "
            f"payment_method_id={self.payment_method_id!r}, "
            f"type={self.method_type.value!r}, "
            f"is_default={self.is_default})"
        )
