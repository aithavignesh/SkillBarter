from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
import datetime
from app.schemas.exchange import UserSummary

class ReviewCreate(BaseModel):
    exchange_id: int
    rating: int = Field(..., ge=1, le=5)
    reliability_score: int = Field(5, ge=1, le=5)
    skill_quality_score: int = Field(5, ge=1, le=5)
    would_exchange_again: bool = True
    comment: Optional[str] = Field(None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, value: Optional[str]):
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Comment cannot be blank")
        return value

class ReviewOut(BaseModel):
    id: int
    exchange_id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    reliability_score: int
    skill_quality_score: int
    would_exchange_again: bool
    comment: Optional[str] = None
    created_at: datetime.datetime
    reviewer: UserSummary
    model_config = ConfigDict(from_attributes=True)
