from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PublisherCreate(BaseModel):
    name: str
    address: str | None = None
    description: str | None = None


class PublisherUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    description: str | None = None


class PublisherResponse(BaseModel):
    id: int
    name: str
    address: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
