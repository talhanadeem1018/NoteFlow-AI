"""Supabase client – reusable instance for backend services."""

from supabase import create_client, Client

from app.core.config import settings


def get_supabase_client() -> Client:
    """Return a Supabase client configured with service-role credentials.

    Uses the service_role key so backend operations can bypass RLS.
    This is intended for server-side use only – never expose this key
    to the frontend.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY,
    )


# Module-level singleton – importable anywhere in the backend.
supabase_client: Client = get_supabase_client()
