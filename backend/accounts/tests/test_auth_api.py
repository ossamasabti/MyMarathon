import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User

pytestmark = pytest.mark.django_db

PASSWORD = "un-mot-de-passe-solide"


@pytest.fixture
def client() -> APIClient:
    return APIClient()


@pytest.fixture
def user() -> User:
    return User.objects.create_user("alice@example.com", PASSWORD, display_name="Alice")


def obtain_tokens(client: APIClient, email: str = "alice@example.com") -> dict:
    response = client.post(reverse("token_obtain"), {"email": email, "password": PASSWORD})
    assert response.status_code == 200
    return response.json()


def test_health_is_public(client):
    response = client.get(reverse("health"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_register_creates_user_and_returns_tokens(client):
    response = client.post(
        reverse("register"),
        {"email": "New@Example.com", "display_name": "Nouveau", "password": PASSWORD},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "new@example.com"
    assert body["access"] and body["refresh"]
    assert "password" not in body["user"]
    assert User.objects.get(email="new@example.com").password.startswith("argon2")


def test_register_rejects_duplicate_email(client, user):
    response = client.post(reverse("register"), {"email": "ALICE@example.com", "password": PASSWORD})

    assert response.status_code == 400
    assert response.json()["email"] == ["Un compte existe déjà avec cette adresse e-mail."]


def test_register_rejects_weak_password(client):
    response = client.post(reverse("register"), {"email": "weak@example.com", "password": "123"})

    assert response.status_code == 400
    assert "password" in response.json()
    assert not User.objects.filter(email="weak@example.com").exists()


def test_login_with_wrong_password_fails(client, user):
    response = client.post(reverse("token_obtain"), {"email": user.email, "password": "mauvais"})

    assert response.status_code == 401


def test_login_is_case_insensitive_on_email(client, user):
    tokens = obtain_tokens(client, email="ALICE@EXAMPLE.COM")

    assert "access" in tokens


def test_me_requires_authentication(client):
    assert client.get(reverse("me")).status_code == 401


def test_me_returns_and_updates_own_profile(client, user):
    tokens = obtain_tokens(client)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    assert client.get(reverse("me")).json()["email"] == user.email

    response = client.patch(reverse("me"), {"display_name": "Alice B.", "email": "pirate@example.com"})
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.display_name == "Alice B."
    assert user.email == "alice@example.com"  # e-mail is read-only


def test_refresh_rotates_and_blacklists_old_token(client, user):
    tokens = obtain_tokens(client)

    first = client.post(reverse("token_refresh"), {"refresh": tokens["refresh"]})
    assert first.status_code == 200
    assert first.json()["refresh"] != tokens["refresh"]

    reused = client.post(reverse("token_refresh"), {"refresh": tokens["refresh"]})
    assert reused.status_code == 401


def test_logout_blacklists_refresh_token(client, user):
    tokens = obtain_tokens(client)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    assert client.post(reverse("logout"), {"refresh": tokens["refresh"]}).status_code == 205

    response = client.post(reverse("token_refresh"), {"refresh": tokens["refresh"]})
    assert response.status_code == 401


def test_refresh_for_deleted_user_is_401_not_500(client, user):
    tokens = obtain_tokens(client)
    user.delete()

    response = client.post(reverse("token_refresh"), {"refresh": tokens["refresh"]})

    assert response.status_code == 401
