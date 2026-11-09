from pydantic import BaseModel, ConfigDict


class BookAuthorCreate(BaseModel):
    book_isbn: str
    author_id: int


class BookAuthorResponse(BaseModel):
    book_isbn: str
    author_id: int

    model_config = ConfigDict(from_attributes=True)
