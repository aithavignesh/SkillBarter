from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
import datetime
from app.schemas.exchange import UserSummary

class ReportCreate(BaseModel):
    reported_user_id: Optional[int] = None
    reported_exchange_id: Optional[int] = None
    category: str = Field(min_length=1, max_length=50)
    details: str = Field(min_length=1, max_length=2000)

    @field_validator("category", "details")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be blank")
        return value

class ReportOut(BaseModel):
    id: int
    reporter_id: int
    reported_user_id: Optional[int] = None
    reported_exchange_id: Optional[int] = None
    category: str
    details: str
    status: str
    admin_note: Optional[str] = None
    created_at: datetime.datetime
    reporter: Optional[UserSummary] = None
    reported_user: Optional[UserSummary] = None
    model_config = ConfigDict(from_attributes=True)

class BlockCreate(BaseModel):
    blocked_id: int

class BlockOut(BaseModel):
    id: int
    blocker_id: int
    blocked_id: int
    created_at: datetime.datetime
    blocked_user: Optional[UserSummary] = None
    model_config = ConfigDict(from_attributes=True)
