from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class ProjectStatus(Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


@dataclass
class Project:
    id: str
    name: str
    description: str
    owner_id: str
    status: ProjectStatus
    created_at: datetime
