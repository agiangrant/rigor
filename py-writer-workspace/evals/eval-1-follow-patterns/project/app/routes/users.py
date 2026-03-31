from fastapi import APIRouter, Depends, HTTPException
from app.schemas.user import CreateUserRequest, UserResponse
from app.services.user_service import UserService
from app.exceptions import NotFoundError, ConflictError

router = APIRouter(prefix="/users", tags=["users"])


def get_user_service() -> UserService:
    # In production, this would resolve the real repository
    raise NotImplementedError


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, service: UserService = Depends(get_user_service)):
    try:
        user = await service.get_by_id(user_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(body: CreateUserRequest, service: UserService = Depends(get_user_service)):
    try:
        user = await service.create(email=body.email, name=body.name)
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return user
