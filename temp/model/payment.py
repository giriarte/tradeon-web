import typing as t
from decimal import Decimal
from enum import Enum
from datetime import datetime, timezone

THREE_YEARS_SECONDS = 3 * 365 * 24 * 3600


def ttl_three_years() -> int:
    """Returns a Unix timestamp 3 years from now, suitable for DynamoDB TTL."""
    return int(datetime.now(timezone.utc).timestamp()) + THREE_YEARS_SECONDS


class PaymentStatus(str, Enum):
    PENDING   = "PENDING"    # Initiated but not yet confirmed
    COMPLETED = "COMPLETED"  # Successfully processed
    FAILED    = "FAILED"     # Processing error / declined
    REFUNDED  = "REFUNDED"   # Fully refunded


class Payment:
    """
    Represents a single payment event linked to a subscription.
    Payment method details live in the PaymentMethods table and are
    referenced here by `paymentMethodId`.

    DynamoDB layout
    ---------------
    Table         : Payments
    Partition key : userId    (STRING)
    Sort key      : paymentId (STRING)

    GSIs
    ----
    SubscriptionIdIndex  — PK: subscriptionId, SK: createdAt
        → retrieve all payments for a given subscription ordered by date
    StatusIndex          — PK: status
        → find all pending / failed payments across the system
    """

    def __init__(
        self,
        user_id: str,
        payment_id: str,
        subscription_id: str,
        payment_method_id: str,
        amount: Decimal,
        currency: str,
        status: PaymentStatus,
        created_at: str,
        processed_at: t.Optional[str] = None,
        failure_reason: t.Optional[str] = None,
        invoice_id: t.Optional[str] = None,
        ttl: t.Optional[int] = None,
    ):
        self.user_id           = user_id
        self.payment_id        = payment_id
        self.subscription_id   = subscription_id
        self.payment_method_id = payment_method_id  # FK → PaymentMethods table
        self.amount            = amount              # Decimal for monetary precision
        self.currency          = currency            # ISO-4217 code, e.g. "USD"
        self.status            = status
        self.created_at        = created_at          # ISO-8601 timestamp
        self.processed_at      = processed_at        # ISO-8601 timestamp (optional)
        self.failure_reason    = failure_reason      # Human-readable reason (optional)
        self.invoice_id        = invoice_id          # External invoice reference (optional)
        self.ttl               = ttl if ttl is not None else ttl_three_years()

    # ------------------------------------------------------------------
    # Serialisation helpers
    # ------------------------------------------------------------------

    def to_item(self) -> t.Dict[str, t.Any]:
        """Return a dict ready to be written to DynamoDB via put_item."""
        item: t.Dict[str, t.Any] = {
            "userId":          self.user_id,
            "paymentId":       self.payment_id,
            "subscriptionId":  self.subscription_id,
            "paymentMethodId": self.payment_method_id,
            "amount":          self.amount,    # boto3 stores Decimal natively
            "currency":        self.currency,
            "status":          self.status.value,
            "createdAt":       self.created_at,
            "ttl":             self.ttl,
        }
        if self.processed_at is not None:
            item["processedAt"] = self.processed_at
        if self.failure_reason is not None:
            item["failureReason"] = self.failure_reason
        if self.invoice_id is not None:
            item["invoiceId"] = self.invoice_id
        return item

    @classmethod
    def from_item(cls, item: t.Dict[str, t.Any]) -> "Payment":
        """Hydrate a Payment from a raw DynamoDB item dict."""
        return cls(
            user_id           = item["userId"],
            payment_id        = item["paymentId"],
            subscription_id   = item["subscriptionId"],
            payment_method_id = item["paymentMethodId"],
            amount            = item["amount"],    # Already Decimal via boto3
            currency          = item["currency"],
            status            = PaymentStatus(item["status"]),
            created_at        = item["createdAt"],
            processed_at      = item.get("processedAt"),
            failure_reason    = item.get("failureReason"),
            invoice_id        = item.get("invoiceId"),
            ttl               = int(item["ttl"]) if "ttl" in item else None,
        )

    def __repr__(self) -> str:
        return (
            f"Payment(user_id={self.user_id!r}, "
            f"payment_id={self.payment_id!r}, "
            f"subscription_id={self.subscription_id!r}, "
            f"amount={self.amount}, currency={self.currency!r}, "
            f"status={self.status.value!r})"
        )
