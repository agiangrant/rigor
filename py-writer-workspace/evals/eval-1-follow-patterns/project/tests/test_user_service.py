import pytest
from unittest.mock import AsyncMock
from app.services.user_service import UserService
from app.models.user import User
from app.exceptions import NotFoundError, ConflictError
from datetime import datetime


@pytest.fixture
def mock_repo():
    repo = AsyncMock()
    return repo


@pytest.fixture
def service(mock_repo):
    return UserService(repo=mock_repo)


class TestGetById:
    async def test_returns_user_when_found(self, service, mock_repo):
        mock_repo.find_by_id.return_value = User(id="1", email="a@b.com", name="Alice", created_at=datetime.now())
        user = await service.get_by_id("1")
        assert user.email == "a@b.com"

    async def test_raises_not_found_when_missing(self, service, mock_repo):
        mock_repo.find_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.get_by_id("999")


class TestCreate:
    async def test_creates_user_with_valid_input(self, service, mock_repo):
        mock_repo.find_by_email.return_value = None
        mock_repo.create.return_value = User(id="1", email="a@b.com", name="Alice", created_at=datetime.now())
        user = await service.create("a@b.com", "Alice")
        assert user.email == "a@b.com"
        mock_repo.create.assert_called_once_with(email="a@b.com", name="Alice")

    async def test_raises_conflict_on_duplicate_email(self, service, mock_repo):
        mock_repo.find_by_email.return_value = User(id="1", email="a@b.com", name="Alice", created_at=datetime.now())
        with pytest.raises(ConflictError):
            await service.create("a@b.com", "Alice")
