from app.models.project import Project, ProjectStatus
from app.repositories.base import ProjectRepository, UserRepository
from app.exceptions import NotFoundError, ValidationError


class ProjectService:
    def __init__(self, repo: ProjectRepository, user_repo: UserRepository) -> None:
        self._repo = repo
        self._user_repo = user_repo

    async def get_by_id(self, project_id: str) -> Project:
        project = await self._repo.find_by_id(project_id)
        if project is None:
            raise NotFoundError("Project", project_id)
        return project

    async def list_by_owner(self, owner_id: str) -> list[Project]:
        return await self._repo.find_by_owner(owner_id)

    async def create(self, name: str, description: str, owner_id: str) -> Project:
        owner = await self._user_repo.find_by_id(owner_id)
        if owner is None:
            raise NotFoundError("User", owner_id)
        return await self._repo.create(
            name=name,
            description=description,
            owner_id=owner_id,
            status=ProjectStatus.ACTIVE,
        )

    async def update(self, project_id: str, name: str | None = None, description: str | None = None) -> Project:
        project = await self._repo.find_by_id(project_id)
        if project is None:
            raise NotFoundError("Project", project_id)
        if name is not None:
            project.name = name
        if description is not None:
            project.description = description
        return await self._repo.update(project)

    async def archive(self, project_id: str) -> Project:
        project = await self._repo.find_by_id(project_id)
        if project is None:
            raise NotFoundError("Project", project_id)
        if project.status == ProjectStatus.ARCHIVED:
            raise ValidationError(f"Project already archived: {project_id}")
        project.status = ProjectStatus.ARCHIVED
        return await self._repo.update(project)
