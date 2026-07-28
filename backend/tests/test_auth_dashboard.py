import pytest
from rest_framework.test import APIClient

from apps.users.models import User
from apps.roles.models import Role, UserRole


@pytest.mark.django_db
def test_login_otp_dashboard_flow():
    user = User.objects.create_user(
        username="flow@test.com",
        email="flow@test.com",
        password="Test1234!",
        first_name="Flow",
        last_name="Test",
        display_name="Flow Test",
    )
    role, _ = Role.objects.get_or_create(code="member", defaults={"name": "Member"})
    UserRole.objects.get_or_create(user=user, role=role)

    client = APIClient()
    login = client.post("/api/v1/auth/login/", {"email": "flow@test.com", "password": "Test1234!"}, format="json")
    assert login.status_code == 200
    challenge_id = login.data["challenge_id"]

    verify = client.post(
        "/api/v1/auth/otp/verify/",
        {"challenge_id": challenge_id, "code": "123456"},
        format="json",
    )
    assert verify.status_code == 200
    token = verify.data["tokens"]["access"]

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    dash = client.get("/api/v1/dashboard/")
    assert dash.status_code == 200
    assert "daily_verse" in dash.data
    assert "greeting" in dash.data
