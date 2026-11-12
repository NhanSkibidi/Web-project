from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ReturnItemRequest(BaseModel):
    book_copy_id: int | None = None
    copy_code: str | None = None
    barcode: str | None = None


class ReturnBulkRequest(BaseModel):
    loan_id: int


class ReturnItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    loan_item_id: int
    copy_id: int | None = None
    book_copy_id: int | None = None
    copy_code: str | None = None
    return_date: datetime | None = None
    returned_at: datetime | None = None
    status: str = "RETURNED"
    message: str = "Trả sách thành công"
