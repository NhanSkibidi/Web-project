from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuthorCreate(BaseModel):
    name: str
    biography: str | None = None
    nationality: str | None = None


class AuthorUpdate(BaseModel):
    name: str | None = None
    biography: str | None = None
    nationality: str | None = None


class AuthorResponse(BaseModel):
    id: int
    name: str
    biography: str | None
    nationality: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
