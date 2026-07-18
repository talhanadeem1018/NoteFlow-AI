"""Authentication-related Pydantic schemas."""

from pydantic import Field

from app.schemas.base import BaseSchema


class AuthUser(BaseSchema):
    """Authenticated user data extracted from a verified Supabase JWT.

    Attributes:
        id: The user's UUID from Supabase Auth (``sub`` claim).
        email: The user's email address.
        role: The Supabase role (typically ``"authenticated"``).
        aud: The JWT audience claim.
    """

    id: str = Field(..., description="User UUID from Supabase Auth")
    email: str | None = Field(None, description="User email address")
    role: str = Field(default="authenticated", description="Supabase role")
    aud: str = Field(default="authenticated", description="JWT audience")
