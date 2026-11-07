from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict


class CopyStatusLogCreate(BaseModel):
    book_copy_id: int
    old_status: str | None = None
    new_status: Literal[
        "AVAILABLE",
        "BORROWED",
        "RESERVED",
        "LOST",
        "DAMAGED",
        "DISPOSED"
    ]


class CopyStatusLogResponse(BaseModel):
    id: int
    book_copy_id: int
    old_status: str | None
    new_status: str
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)
