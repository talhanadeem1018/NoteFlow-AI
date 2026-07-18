"""Auth endpoints – authenticated user information."""

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.schemas.auth import AuthUser

router = APIRouter()


@router.get(
    "/me",
    response_model=AuthUser,
    summary="Get current authenticated user",
    description=(
        "Returns the authenticated user's profile extracted from the verified "
        "Supabase JWT access token. Requires a valid `Bearer` token in the "
        "`Authorization` header."
    ),
    responses={
        401: {"description": "Missing, expired, or invalid token"},
        403: {"description": "Token audience is not authorized"},
        500: {"description": "Authentication service not configured"},
    },
)
async def me(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Return the currently authenticated user's information."""
    return user
