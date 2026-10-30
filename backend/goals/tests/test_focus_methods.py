from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.utils import timezone

from goals.focus_stats import build_focus_overview, spread_by_hour
from goals.models import FocusSession

from .conftest import make_domain, make_goal, make_task

pytestmark = pytest.mark.django_db

PARIS = ZoneInfo("Europe/Paris")
UTC = ZoneInfo("UTC")
# A fixed "now" keeps day boundaries predictable: Wednesday 2026-03-18, 15:00 in Paris.
NOW = datetime(2026, 3, 18, 15, 0, tzinfo=PARIS)


def add_session(user, start: datetime, minutes: float, **fields) -> FocusSession:
    seconds = round(minutes * 60)
    return FocusSession.objects.create(
        user=user,
        mode=fields.pop("mode", "stopwatch"),
        started_at=start,
        ended_at=start + timedelta(seconds=seconds),
        duration_seconds=seconds,
        **fields,
    )


def day_at(days_ago: int, hour: int = 10) -> datetime:
    return (NOW - timedelta(days=days_ago)).replace(hour=hour, minute=0)


# --- New session fields -------------------------------------------------------


def session_payload(**overrides) -> dict:
    ended = timezone.now() - timedelta(minutes=1)
    payload = {
        "mode": "stopwatch",
        "started_at": (ended - timedelta(minutes=30)).isoformat(),
        "ended_at": ended.isoformat(),
        "duration_seconds": 1500,
    }
    payload.update(overrides)
    return payload


def test_session_saves_intention_review_and_distractions(api):
    payload = session_payload(intention="Finir le plan", quality=4, distractions=2, captured_notes=["Appeler Sam", "  "])
    response = api.post("/api/focus-sessions/", payload, format="json")
    assert response.status_code == 201
    body = response.json()
    assert body["intention"] == "Finir le plan"
    assert body["quality"] == 4
    assert body["distractions"] == 2
    assert body["captured_notes"] == ["Appeler Sam"]


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"quality": 0}, "quality"),
        ({"quality": 6}, "quality"),
        ({"captured_notes": "pas une liste"}, "captured_notes"),
        ({"captured_notes": ["x"] * 21}, "captured_notes"),
        ({"captured_notes": ["x" * 201]}, "captured_notes"),
        ({"intention": "x" * 201}, "intention"),
    ],
)
def test_invalid_review_fields_are_rejected(api, overrides, field):
    response = api.post("/api/focus-sessions/", session_payload(**overrides), format="json")
    assert response.status_code == 400
    assert field in response.json()


def test_quality_can_be_patched_after_the_session(api):
    session_id = api.post("/api/focus-sessions/", session_payload(), format="json").json()["id"]
    response = api.patch(f"/api/focus-sessions/{session_id}/", {"quality": 5}, format="json")
    assert response.status_code == 200
    assert response.json()["quality"] == 5


def test_daily_goal_is_part_of_the_profile(api):
    assert api.get("/api/auth/me/").json()["focus_goal_minutes"] == 120
    assert api.patch("/api/auth/me/", {"focus_goal_minutes": 90}, format="json").json()["focus_goal_minutes"] == 90
    assert api.patch("/api/auth/me/", {"focus_goal_minutes": 5}, format="json").status_code == 400
    assert api.patch("/api/auth/me/", {"focus_goal_minutes": 800}, format="json").status_code == 400


# --- Overview -------------------------------------------------------------------


def test_spread_by_hour_shares_a_session_between_clock_hours():
    start = datetime(2026, 3, 18, 9, 40, tzinfo=PARIS)
    parts = spread_by_hour(start, start + timedelta(minutes=40), 2400, PARIS)
    assert [(hour.hour, round(seconds)) for hour, seconds in parts] == [(9, 1200), (10, 1200)]


def test_today_total_and_goal(user):
    user.focus_goal_minutes = 60
    add_session(user, day_at(0, 9), 25)
    add_session(user, day_at(0, 11), 25)
    add_session(user, day_at(1), 90)
    overview = build_focus_overview(user, PARIS, NOW)
    assert overview["today"] == "2026-03-18"
    assert overview["today_seconds"] == 3000
    assert overview["goal_minutes"] == 60


def test_streak_ignores_today_until_reached_and_breaks_on_a_missed_day(user):
    user.focus_goal_minutes = 60
    for days_ago in (1, 2, 3, 5, 6):
        add_session(user, day_at(days_ago), 60)
    add_session(user, day_at(4), 30)  # Below the goal: breaks the run.
    overview = build_focus_overview(user, PARIS, NOW)
    assert overview["streak"] == 3
    assert overview["best_streak"] == 3

    add_session(user, day_at(0), 60)
    assert build_focus_overview(user, PARIS, NOW)["streak"] == 4


def test_best_streak_remembers_an_older_run(user):
    user.focus_goal_minutes = 30
    for days_ago in (10, 11, 12, 13, 14):
        add_session(user, day_at(days_ago), 30)
    add_session(user, day_at(1), 30)
    overview = build_focus_overview(user, PARIS, NOW)
    assert overview["streak"] == 1
    assert overview["best_streak"] == 5


def test_heatmap_covers_twelve_weeks_with_empty_days(user):
    add_session(user, day_at(2), 45)
    heatmap = build_focus_overview(user, PARIS, NOW)["heatmap"]
    assert heatmap[0]["date"] == "2025-12-29"  # Monday, 11 weeks before this week's Monday.
    assert heatmap[-1]["date"] == "2026-03-18"
    assert len(heatmap) == 11 * 7 + 3
    by_date = {cell["date"]: cell["seconds"] for cell in heatmap}
    assert by_date["2026-03-16"] == 2700
    assert by_date["2026-03-17"] == 0


def test_days_follow_the_user_time_zone(user):
    # 23:30 UTC on the 17th is 00:30 on the 18th in Paris.
    add_session(user, datetime(2026, 3, 17, 23, 30, tzinfo=UTC), 20)
    assert build_focus_overview(user, PARIS, NOW)["today_seconds"] == 1200
    assert build_focus_overview(user, UTC, NOW)["today_seconds"] == 0


def test_hours_domains_records_and_quality(user):
    domain = make_domain(user, "Travail")
    task = make_task(user, make_goal(user, domain=domain))
    add_session(user, day_at(1, 9), 60, task=task, quality=4)
    add_session(user, day_at(2, 14), 30, quality=2)
    add_session(user, day_at(40, 9), 120)  # Outside the 30-day charts, still in the records.
    overview = build_focus_overview(user, PARIS, NOW)
    assert overview["by_hour"][9] == 3600
    assert overview["by_hour"][14] == 1800
    assert overview["by_domain"] == [
        {"domain": {"id": domain.id, "name": "Travail", "color": domain.color, "icon": domain.icon}, "seconds": 3600},
        {"domain": None, "seconds": 1800},
    ]
    assert overview["quality_avg_30d"] == 3
    records = overview["records"]
    assert records["best_day"]["seconds"] == 7200
    assert records["longest_session_seconds"] == 7200
    assert records["total_seconds"] == 12600
    assert records["sessions"] == 3


def test_badges(user):
    badges = {b["key"]: b for b in build_focus_overview(user, PARIS, NOW)["badges"]}
    assert not badges["first_session"]["unlocked"]

    add_session(user, day_at(1, 6), 95, mode="timer", planned_minutes=90, quality=5)
    add_session(user, day_at(2), 20, mode="timer", planned_minutes=25)  # Stopped early: not completed.
    badges = {b["key"]: b for b in build_focus_overview(user, PARIS, NOW)["badges"]}
    assert badges["first_session"]["unlocked"]
    assert badges["hours_1"]["unlocked"]
    assert badges["hours_10"] == {"key": "hours_10", "unlocked": False, "progress": 1, "target": 10}
    assert badges["deep_work"]["unlocked"]
    assert badges["early_bird"]["unlocked"]
    assert badges["timers_10"]["progress"] == 1
    assert badges["top_quality_10"]["progress"] == 1


def test_overview_endpoint_uses_the_time_zone_and_stays_private(api, other_api, user):
    add_session(user, timezone.now() - timedelta(minutes=30), 20)
    body = api.get("/api/focus-sessions/overview/?tz=Africa/Casablanca").json()
    assert body["records"]["sessions"] == 1
    assert api.get("/api/focus-sessions/overview/?tz=Pas/Une-Zone").status_code == 200
    assert other_api.get("/api/focus-sessions/overview/").json()["records"]["sessions"] == 0


def test_device_offset_wins_when_time_zone_data_disagrees(api, user):
    # Started 30 minutes ago; with a +14 h offset (no real zone matches Paris), "today" follows the device.
    add_session(user, timezone.now() - timedelta(minutes=30), 20)
    device_today = (timezone.now() + timedelta(hours=14)).date().isoformat()
    body = api.get("/api/focus-sessions/overview/?tz=Europe/Paris&offset=840").json()
    assert body["today"] == device_today
    paris_today = timezone.now().astimezone(PARIS).date().isoformat()
    assert api.get("/api/focus-sessions/overview/?tz=Europe/Paris&offset=abc").json()["today"] == paris_today
    assert api.get("/api/focus-sessions/overview/?tz=Europe/Paris&offset=9999").json()["today"] == paris_today
