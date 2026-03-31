from pydantic import BaseModel


class CreateProjectRequest(BaseModel):
    name: str
    description: str
    owner_id: str


class UpdateProjectRequest(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    owner_id: str
    status: str

    model_config = {"from_attributes": True}
