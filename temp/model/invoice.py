import typing as t
from decimal import Decimal
from enum import Enum
from datetime import datetime, timezone

THREE_YEARS_SECONDS = 3 * 365 * 24 * 3600


def ttl_three_years() -> int:
    """Returns a Unix timestamp 3 years from now, suitable for DynamoDB TTL."""
    return int(datetime.now(timezone.utc).timestamp()) + THREE_YEARS_SECONDS


class InvoiceStatus(str, Enum):
    DRAFT           = "DRAFT"           # Being assembled, not yet sent
    OPEN            = "OPEN"            # Sent to the customer, awaiting payment
    PAID            = "PAID"            # Successfully collected
    VOID            = "VOID"            # Cancelled before collection
    UNCOLLECTIBLE   = "UNCOLLECTIBLE"   # Payment attempts exhausted


class Invoice:
    """
    Represents a billing invoice for one subscription period.
    A Payment references an invoiceId once the invoice is settled.

    DynamoDB layout
    ---------------
    Table         : Invoices
    Partition key : userId    (STRING)
    Sort key      : invoiceId (STRING)

    GSIs
    ----
    SubscriptionIdIndex — PK: subscriptionId, SK: createdAt
        → list all invoices for a subscription in chronological order
    StatusIndex         — PK: status
        → find all open / uncollectible invoices across the system
    """

    def __init__(
        self,
        user_id: str,
        invoice_id: str,
        subscription_id: str,
        amount: Decimal,
        currency: str,
        status: InvoiceStatus,
        period_start: str,
        period_end: str,
        created_at: str,
        due_date: str,
        paid_at: t.Optional[str] = None,
        payment_id: t.Optional[str] = None,   # FK → Payments table (set when paid)
        voided_at: t.Optional[str] = None,
        void_reason: t.Optional[str] = None,
        ttl: t.Optional[int] = None,
    ):
        self.user_id         = user_id
        self.invoice_id      = invoice_id
        self.subscription_id = subscription_id
        self.amount          = amount          # Decimal for monetary precision
        self.currency        = currency        # ISO-4217 code, e.g. "USD"
        self.status          = status
        self.period_start    = period_start    # ISO-8601 — start of the billed period
        self.period_end      = period_end      # ISO-8601 — end of the billed period
        self.created_at      = created_at      # ISO-8601
        self.due_date        = due_date        # ISO-8601 — when payment is due
        self.paid_at         = paid_at         # ISO-8601 (optional)
        self.payment_id      = payment_id      # Set once a Payment is linked (optional)
        self.voided_at       = voided_at       # ISO-8601 (optional)
        self.void_reason     = void_reason     # Free-text reason (optional)
        self.ttl             = ttl if ttl is not None else ttl_three_years()

    # ------------------------------------------------------------------
    # Serialisation helpers
    # ------------------------------------------------------------------

    def to_item(self) -> t.Dict[str, t.Any]:
        """Return a dict ready to be written to DynamoDB via put_item."""
        item: t.Dict[str, t.Any] = {
            "userId":         self.user_id,
            "invoiceId":      self.invoice_id,
            "subscriptionId": self.subscription_id,
            "amount":         self.amount,     # boto3 stores Decimal natively
            "currency":       self.currency,
            "status":         self.status.value,
            "periodStart":    self.period_start,
            "periodEnd":      self.period_end,
            "createdAt":      self.created_at,
            "dueDate":        self.due_date,
            "ttl":            self.ttl,
        }
        if self.paid_at is not None:
            item["paidAt"] = self.paid_at
        if self.payment_id is not None:
            item["paymentId"] = self.payment_id
        if self.voided_at is not None:
            item["voidedAt"] = self.voided_at
        if self.void_reason is not None:
            item["voidReason"] = self.void_reason
        return item

    @classmethod
    def from_item(cls, item: t.Dict[str, t.Any]) -> "Invoice":
        """Hydrate an Invoice from a raw DynamoDB item dict."""
        return cls(
            user_id         = item["userId"],
            invoice_id      = item["invoiceId"],
            subscription_id = item["subscriptionId"],
            amount          = item["amount"],   # Already Decimal via boto3
            currency        = item["currency"],
            status          = InvoiceStatus(item["status"]),
            period_start    = item["periodStart"],
            period_end      = item["periodEnd"],
            created_at      = item["createdAt"],
            due_date        = item["dueDate"],
            paid_at         = item.get("paidAt"),
            payment_id      = item.get("paymentId"),
            voided_at       = item.get("voidedAt"),
            void_reason     = item.get("voidReason"),
            ttl             = int(item["ttl"]) if "ttl" in item else None,
        )

    def __repr__(self) -> str:
        return (
            f"Invoice(user_id={self.user_id!r}, "
            f"invoice_id={self.invoice_id!r}, "
            f"subscription_id={self.subscription_id!r}, "
            f"amount={self.amount}, currency={self.currency!r}, "
            f"status={self.status.value!r})"
        )
