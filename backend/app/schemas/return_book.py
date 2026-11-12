from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ReturnItemRequest(BaseModel):
    book_copy_id: int | None = None
    barcode: str | None = None


class ReturnBulkRequest(BaseModel):
    loan_id: int


class ReturnItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    loan_item_id: int
    book_copy_id: int
    returned_at: datetime
    status: str
