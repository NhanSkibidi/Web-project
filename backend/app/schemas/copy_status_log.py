from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CopyStatusLogResponse(BaseModel):
    id: int
    book_copy_id: int
    old_status: str | None
    new_status: str
    changed_at: datetime
    reason: str | None

    model_config = ConfigDict(from_attributes=True)
