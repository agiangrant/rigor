from app.models.user import User
from app.repositories.base import UserRepository
from app.exceptions import NotFoundError, ConflictError


class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo

    async def get_by_id(self, user_id: str) -> User:
        user = await self._repo.find_by_id(user_id)
        if user is None:
            raise NotFoundError("User", user_id)
        return user

    async def create(self, email: str, name: str) -> User:
        existing = await self._repo.find_by_email(email)
        if existing is not None:
            raise ConflictError(f"Email already in use: {email}")
        return await self._repo.create(email=email, name=name)

    async def list_all(self) -> list[User]:
        return await self._repo.find_all()
