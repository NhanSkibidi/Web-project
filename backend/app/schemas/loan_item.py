from datetime import datetime
from pydantic import BaseModel, ConfigDict, model_validator


class LoanItemCreate(BaseModel):
    book_isbn: str | None = None
    book_id: str | int | None = None
    copy_id: int | None = None

    @model_validator(mode="after")
    def sync_book_identifier(self):
        if not self.book_isbn and self.book_id:
            self.book_isbn = str(self.book_id)
        if not self.book_isbn:
            raise ValueError("Cần cung cấp book_isbn hoặc book_id")
        return self


class LoanItemResponse(BaseModel):
    id: int
    loan_id: int
    book_isbn: str
    copy_id: int | None = None
    due_date: datetime | None = None
    renewal_count: int = 0
    return_date: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
