import typing as t
from enum import Enum
from datetime import datetime, timezone

THREE_YEARS_SECONDS = 3 * 365 * 24 * 3600


def ttl_three_years() -> int:
    """Returns a Unix timestamp 3 years from now, suitable for DynamoDB TTL."""
    return int(datetime.now(timezone.utc).timestamp()) + THREE_YEARS_SECONDS


class SubscriptionType(str, Enum):
    FREE     = "FREE"
    STANDARD = "STANDARD"
    PRO      = "PRO"


class SubscriptionStatus(str, Enum):
    ACTIVE    = "ACTIVE"
    CANCELLED = "CANCELLED"
    EXPIRED   = "EXPIRED"
    PAST_DUE  = "PAST_DUE"   # Payment failed but grace period still active
    TRIALING  = "TRIALING"


class Subscription:
    """
    Represents a user subscription.

    DynamoDB layout
    ---------------
    Table         : Subscriptions
    Partition key : userId        (STRING)
    Sort key      : subscriptionId (STRING)

    GSIs
    ----
    SubscriptionIdIndex  — PK: subscriptionId          (direct lookup by id)
    StatusIndex          — PK: status                  (list all subs by status)
    """

    def __init__(
        self,
        user_id: str,
        subscription_id: str,
        subscription_type: SubscriptionType,
        status: SubscriptionStatus,
        created_at: str,
        updated_at: str,
        current_period_start: str,
        current_period_end: str,
        trial_ends_at: t.Optional[str] = None,
        cancelled_at: t.Optional[str] = None,
        cancel_reason: t.Optional[str] = None,
        ttl: t.Optional[int] = None,
    ):
        self.user_id              = user_id
        self.subscription_id      = subscription_id
        self.subscription_type    = subscription_type
        self.status               = status
        self.created_at           = created_at           # ISO-8601 timestamp
        self.updated_at           = updated_at           # ISO-8601 timestamp
        self.current_period_start = current_period_start # ISO-8601 timestamp
        self.current_period_end   = current_period_end   # ISO-8601 timestamp
        self.trial_ends_at        = trial_ends_at        # ISO-8601 timestamp (optional)
        self.cancelled_at         = cancelled_at         # ISO-8601 timestamp (optional)
        self.cancel_reason        = cancel_reason        # Free-text reason (optional)
        self.ttl                  = ttl if ttl is not None else ttl_three_years()

    # ------------------------------------------------------------------
    # Serialisation helpers
    # ------------------------------------------------------------------

    def to_item(self) -> t.Dict[str, t.Any]:
        """Return a dict ready to be written to DynamoDB via put_item."""
        item: t.Dict[str, t.Any] = {
            "userId":             self.user_id,
            "subscriptionId":     self.subscription_id,
            "type":               self.subscription_type.value,
            "status":             self.status.value,
            "createdAt":          self.created_at,
            "updatedAt":          self.updated_at,
            "currentPeriodStart": self.current_period_start,
            "currentPeriodEnd":   self.current_period_end,
            "ttl":                self.ttl,
        }
        if self.trial_ends_at is not None:
            item["trialEndsAt"] = self.trial_ends_at
        if self.cancelled_at is not None:
            item["cancelledAt"] = self.cancelled_at
        if self.cancel_reason is not None:
            item["cancelReason"] = self.cancel_reason
        return item

    @classmethod
    def from_item(cls, item: t.Dict[str, t.Any]) -> "Subscription":
        """Hydrate a Subscription from a raw DynamoDB item dict."""
        return cls(
            user_id              = item["userId"],
            subscription_id      = item["subscriptionId"],
            subscription_type    = SubscriptionType(item["type"]),
            status               = SubscriptionStatus(item["status"]),
            created_at           = item["createdAt"],
            updated_at           = item["updatedAt"],
            current_period_start = item["currentPeriodStart"],
            current_period_end   = item["currentPeriodEnd"],
            trial_ends_at        = item.get("trialEndsAt"),
            cancelled_at         = item.get("cancelledAt"),
            cancel_reason        = item.get("cancelReason"),
            ttl                  = int(item["ttl"]) if "ttl" in item else None,
        )

    def __repr__(self) -> str:
        return (
            f"Subscription(user_id={self.user_id!r}, "
            f"subscription_id={self.subscription_id!r}, "
            f"type={self.subscription_type.value!r}, "
            f"status={self.status.value!r})"
        )
