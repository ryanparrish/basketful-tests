"""Tracker 2026-11-18 (Thursday English, PamelaDan) — elimination tests.

Hypothesis: a username of the form "PamelaDan-family" is rejected by the
sign-in format checks (the #112 family), so the participant could never
sign in even with the right password.

Written to run inside the repo's own auth test harness conventions
(same fixture style as test_auth_session_hotfix.py).
"""
import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from apps.account.api.jwt_serializers import FlexibleTokenObtainPairSerializer

USERNAME = "PamelaDan-family"
PASSWORD = "<redacted>"


@pytest.fixture(autouse=True)
def _fresh_cache(settings):
    settings.RECAPTCHA_PRIVATE_KEY = "test-private-key"
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_pameladan_family_username_signs_in_with_correct_password():
    User.objects.create_user(username=USERNAME, password="<redacted>")
    data = FlexibleTokenObtainPairSerializer().validate(
        {"username": USERNAME, "password": PASSWORD}
    )
    assert "access" in data and "refresh" in data


@pytest.mark.django_db
def test_pameladan_family_wrong_password_is_invalid_password():
    User.objects.create_user(username=USERNAME, password="<redacted>")
    with pytest.raises(AuthenticationFailed) as exc:
        FlexibleTokenObtainPairSerializer().validate(
            {"username": USERNAME, "password": "not-the-password"}
        )
    assert exc.value.detail["code"] == "invalid_password"
