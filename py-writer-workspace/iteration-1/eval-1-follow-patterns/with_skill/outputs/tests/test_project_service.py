import pytest
from unittest.mock import AsyncMock
from app.services.project_service import ProjectService
from app.models.project import Project, ProjectStatus
from app.models.user import User
from app.exceptions import NotFoundError, ValidationError
from datetime import datetime


@pytest.fixture
def mock_repo():
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_user_repo():
    repo = AsyncMock()
    return repo


@pytest.fixture
def service(mock_repo, mock_user_repo):
    return ProjectService(repo=mock_repo, user_repo=mock_user_repo)


def _make_project(**overrides) -> Project:
    defaults = {
        "id": "p1",
        "name": "My Project",
        "description": "A test project",
        "owner_id": "u1",
        "status": ProjectStatus.ACTIVE,
        "created_at": datetime.now(),
    }
    defaults.update(overrides)
    return Project(**defaults)


def _make_user(**overrides) -> User:
    defaults = {
        "id": "u1",
        "email": "alice@example.com",
        "name": "Alice",
        "created_at": datetime.now(),
    }
    defaults.update(overrides)
    return User(**defaults)


class TestGetById:
    async def test_returns_project_when_found(self, service, mock_repo):
        mock_repo.find_by_id.return_value = _make_project()
        project = await service.get_by_id("p1")
        assert project.name == "My Project"

    async def test_raises_not_found_when_missing(self, service, mock_repo):
        mock_repo.find_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.get_by_id("999")


class TestListByOwner:
    async def test_returns_projects_for_owner(self, service, mock_repo):
        mock_repo.find_by_owner.return_value = [_make_project(), _make_project(id="p2", name="Second")]
        projects = await service.list_by_owner("u1")
        assert len(projects) == 2

    async def test_returns_empty_list_when_none(self, service, mock_repo):
        mock_repo.find_by_owner.return_value = []
        projects = await service.list_by_owner("u1")
        assert projects == []


class TestCreate:
    async def test_creates_project_with_valid_owner(self, service, mock_repo, mock_user_repo):
        mock_user_repo.find_by_id.return_value = _make_user()
        mock_repo.create.return_value = _make_project()
        project = await service.create("My Project", "A test project", "u1")
        assert project.name == "My Project"
        mock_repo.create.assert_called_once_with(
            name="My Project",
            description="A test project",
            owner_id="u1",
            status=ProjectStatus.ACTIVE,
        )

    async def test_raises_not_found_when_owner_missing(self, service, mock_user_repo):
        mock_user_repo.find_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.create("My Project", "A test project", "bad-owner")


class TestUpdate:
    async def test_updates_name(self, service, mock_repo):
        project = _make_project()
        mock_repo.find_by_id.return_value = project
        mock_repo.update.return_value = project
        result = await service.update("p1", name="New Name")
        assert result.name == "New Name"
        mock_repo.update.assert_called_once()

    async def test_updates_description(self, service, mock_repo):
        project = _make_project()
        mock_repo.find_by_id.return_value = project
        mock_repo.update.return_value = project
        result = await service.update("p1", description="Updated desc")
        assert result.description == "Updated desc"

    async def test_raises_not_found_when_missing(self, service, mock_repo):
        mock_repo.find_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.update("999", name="Nope")


class TestArchive:
    async def test_archives_active_project(self, service, mock_repo):
        project = _make_project(status=ProjectStatus.ACTIVE)
        mock_repo.find_by_id.return_value = project
        mock_repo.update.return_value = project
        result = await service.archive("p1")
        assert result.status == ProjectStatus.ARCHIVED
        mock_repo.update.assert_called_once()

    async def test_raises_not_found_when_missing(self, service, mock_repo):
        mock_repo.find_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.archive("999")

    async def test_raises_validation_when_already_archived(self, service, mock_repo):
        project = _make_project(status=ProjectStatus.ARCHIVED)
        mock_repo.find_by_id.return_value = project
        with pytest.raises(ValidationError):
            await service.archive("p1")
