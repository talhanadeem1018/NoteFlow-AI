"""Authentication dependency – verifies Supabase JWT access tokens.

Usage::

    from fastapi import Depends
    from app.api.dependencies.auth import get_current_user
    from app.schemas.auth import AuthUser

    @router.get("/me")
    async def me(user: AuthUser = Depends(get_current_user)):
        return {"email": user.email}
"""

import logging
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import verify_supabase_token
from app.schemas.auth import AuthUser

logger = logging.getLogger(__name__)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(HTTPBearer())] = None,
) -> AuthUser:
    """FastAPI dependency that extracts and verifies the current authenticated user.

    Uses ``Security(HTTPBearer())`` so that Swagger UI displays the
    global **Authorize** button and automatically sends the
    ``Authorization: Bearer <token>`` header.

    Args:
        credentials: The Bearer credentials injected by FastAPI.

    Returns:
        An :class:`AuthUser` instance with the verified user's claims.

    Raises:
        HTTPException 401: Missing token, malformed header, expired token,
            invalid signature, or decode error.
        HTTPException 403: Token is valid but audience is wrong (should be
            ``"authenticated"``).
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = verify_supabase_token(token)
    except ValueError as exc:
        # SUPABASE_KEY not configured
        logger.error("Supabase JWT verification unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service not configured",
        ) from exc
    except Exception as exc:
        _raise_auth_error(exc)

    # Build the AuthUser from the verified payload
    user = AuthUser(
        id=payload.get("sub", ""),
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
        aud=payload.get("aud", "authenticated"),
    )

    return user


def _raise_auth_error(exc: Exception) -> None:
    """Translate a PyJWT exception into the appropriate HTTP error.

    Args:
        exc: The exception raised by ``verify_supabase_token``.

    Raises:
        HTTPException 401: Expired, malformed, or unsigned token.
        HTTPException 403: Valid token with wrong audience.
    """
    headers = {"WWW-Authenticate": "Bearer"}

    if isinstance(exc, jwt.ExpiredSignatureError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers=headers,
        ) from exc

    if isinstance(exc, jwt.InvalidAudienceError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token audience is not authorized",
            headers=headers,
        ) from exc

    if isinstance(exc, (jwt.InvalidSignatureError, jwt.DecodeError)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or malformed token",
            headers=headers,
        ) from exc

    if isinstance(exc, jwt.InvalidTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers=headers,
        ) from exc

    # Catch-all for any other errors
    logger.warning("Unexpected auth error: %s", exc)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers=headers,
    ) from exc
