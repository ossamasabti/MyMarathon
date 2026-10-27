import pytest

from accounts.models import User

pytestmark = pytest.mark.django_db


def test_create_user_normalizes_email_and_hashes_with_argon2():
    user = User.objects.create_user("Alice@Example.COM", "un-mot-de-passe-solide")

    assert user.email == "alice@example.com"
    assert user.password.startswith("argon2")
    assert user.check_password("un-mot-de-passe-solide")
    assert not user.is_staff


def test_create_user_requires_email():
    with pytest.raises(ValueError):
        User.objects.create_user("", "un-mot-de-passe-solide")


def test_create_superuser_sets_flags():
    admin = User.objects.create_superuser("admin@example.com", "un-mot-de-passe-solide")

    assert admin.is_staff
    assert admin.is_superuser


def test_natural_key_lookup_is_case_insensitive():
    user = User.objects.create_user("bob@example.com", "un-mot-de-passe-solide")

    assert User.objects.get_by_natural_key("BOB@example.com") == user
