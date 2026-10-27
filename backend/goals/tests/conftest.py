from datetime import date

import pytest
from rest_framework.test import APIClient

from accounts.models import User
from goals.models import Domain, Goal, Task

PASSWORD = "un-mot-de-passe-solide"


@pytest.fixture
def user(db) -> User:
    return User.objects.create_user("alice@example.com", PASSWORD)


@pytest.fixture
def other_user(db) -> User:
    return User.objects.create_user("bob@example.com", PASSWORD)


def client_for(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def api(user) -> APIClient:
    return client_for(user)


@pytest.fixture
def other_api(other_user) -> APIClient:
    return client_for(other_user)


def make_goal(user: User, horizon: str = "vision", start=date(2026, 1, 1), end=date(2030, 12, 31), **kwargs) -> Goal:
    return Goal.objects.create(
        user=user, title=kwargs.pop("title", f"{horizon} goal"), horizon=horizon, start_date=start, end_date=end, **kwargs
    )


def make_task(user: User, goal: Goal | None = None, **kwargs) -> Task:
    return Task.objects.create(user=user, goal=goal, title=kwargs.pop("title", "Tâche"), **kwargs)


def make_domain(user: User, name: str = "Santé") -> Domain:
    return Domain.objects.create(user=user, name=name, color="#1E7A3E")
