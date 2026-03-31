import pytest
from rest_framework.test import APIClient
from myapp.models.user import User


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
class TestUserListView:
    def test_list_users(self, client):
        User.objects.create(email="a@b.com", name="Alice")
        response = client.get("/api/users/")
        assert response.status_code == 200
        assert len(response.data) == 1

    def test_create_user(self, client):
        response = client.post("/api/users/", {"email": "a@b.com", "name": "Alice"})
        assert response.status_code == 201
        assert response.data["email"] == "a@b.com"

    def test_create_user_invalid_email(self, client):
        response = client.post("/api/users/", {"email": "invalid", "name": "Alice"})
        assert response.status_code == 400
