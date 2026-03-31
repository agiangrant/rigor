from fastapi import APIRouter, Depends, HTTPException
from app.schemas.project import CreateProjectRequest, UpdateProjectRequest, ProjectResponse
from app.services.project_service import ProjectService
from app.exceptions import NotFoundError, ValidationError

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project_service() -> ProjectService:
    # In production, this would resolve the real repositories
    raise NotImplementedError


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(body: CreateProjectRequest, service: ProjectService = Depends(get_project_service)):
    try:
        project = await service.create(name=body.name, description=body.description, owner_id=body.owner_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Owner not found")
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, service: ProjectService = Depends(get_project_service)):
    try:
        project = await service.get_by_id(project_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(owner_id: str, service: ProjectService = Depends(get_project_service)):
    return await service.list_by_owner(owner_id)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, body: UpdateProjectRequest, service: ProjectService = Depends(get_project_service)):
    try:
        project = await service.update(project_id, name=body.name, description=body.description)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(project_id: str, service: ProjectService = Depends(get_project_service)):
    try:
        project = await service.archive(project_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return project
