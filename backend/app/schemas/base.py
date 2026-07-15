"""Base Pydantic schemas and common response models."""

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common config."""
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseSchema):
    """Standard message response."""
    message: str
    success: bool = True


class ErrorResponse(BaseSchema):
    """Standard error response."""
    detail: str
    status_code: int
