"""Security utilities – JWT verification, password hashing, auth helpers."""

from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

# ── Password hashing ─────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain, hashed)


# ── App-level JWT (internal tokens) ──────────────────────────────
def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create an internal JWT access token for app-level use."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate an internal JWT token."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


# ── Supabase JWT verification (JWKS) ────────────────────────────
SUPABASE_JWT_ALGORITHMS = ["RS256", "ES256"]
SUPABASE_JWT_AUDIENCE = "authenticated"

# Lazy-initialized JWKS client (fetched once, cached by PyJWKClient)
_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    """Return a cached PyJWKClient for the Supabase project's JWKS endpoint.

    The client fetches the JSON Web Key Set from Supabase once and caches
    keys internally (default 300 s TTL). Subsequent calls reuse the cached
    instance.

    Returns:
        A :class:`jwt.PyJWKClient` pointed at the project's JWKS URL.

    Raises:
        ValueError: ``SUPABASE_URL`` is not configured.
    """
    global _jwks_client  # noqa: PLW0603

    if _jwks_client is None:
        if not settings.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is not configured – cannot fetch Supabase JWKS.")
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = jwt.PyJWKClient(
            jwks_url,
            cache_jwk_set=True,
            lifespan=300,  # cache keys for 5 minutes
        )
    return _jwks_client


def verify_supabase_token(token: str) -> dict:
    """Verify a Supabase JWT access token and return the decoded payload.

    Uses the project's published JWKS endpoint (``/.well-known/jwks.json``)
    for asymmetric signature verification. This avoids handling the signing
    key directly and follows Supabase's current best practices.

    Args:
        token: The raw JWT access token string (without ``"Bearer "`` prefix).

    Returns:
        The decoded JWT payload containing user claims:
        - sub: User UUID
        - email: User email
        - role: Supabase role (typically ``"authenticated"``)
        - aud: Audience (``"authenticated"``)
        - exp: Expiration timestamp
        - iat: Issued-at timestamp

    Raises:
        ValueError: ``SUPABASE_URL`` is not configured.
        jwt.ExpiredSignatureError: Token has expired.
        jwt.InvalidAudienceError: Token audience is not ``"authenticated"``.
        jwt.InvalidSignatureError: Token signature is invalid.
        jwt.DecodeError: Token is malformed.
    """
    client = _get_jwks_client()

    # Resolve the signing key from JWKS using the token's ``kid`` header
    signing_key = client.get_signing_key_from_jwt(token)

    return jwt.decode(
        token,
        signing_key.key,
        algorithms=SUPABASE_JWT_ALGORITHMS,
        audience=SUPABASE_JWT_AUDIENCE,
    )
