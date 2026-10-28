"""Review periods: calendar week (Monday → Sunday), month and quarter."""

import calendar
from datetime import date, timedelta

from .models import ReviewType


def period_bounds(review_type: str, day: date) -> tuple[date, date]:
    """The period of the given type containing `day`."""
    if review_type == ReviewType.WEEKLY:
        start = day - timedelta(days=day.weekday())
        return start, start + timedelta(days=6)
    if review_type == ReviewType.MONTHLY:
        last = calendar.monthrange(day.year, day.month)[1]
        return day.replace(day=1), day.replace(day=last)
    if review_type == ReviewType.QUARTERLY:
        first_month = (day.month - 1) // 3 * 3 + 1
        last_month = first_month + 2
        last = calendar.monthrange(day.year, last_month)[1]
        return date(day.year, first_month, 1), date(day.year, last_month, last)
    raise ValueError(f"Unknown review type: {review_type}")
