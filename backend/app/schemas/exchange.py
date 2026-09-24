from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
import datetime
from app.schemas.skill import SkillOut

class UserSummary(BaseModel):
    id: int
    full_name: str
    avatar_url: Optional[str] = None
    headline: Optional[str] = None
    trust_score: float
    address_display: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ExchangeCreate(BaseModel):
    receiver_id: int
    requester_skill_id: Optional[int] = None
    receiver_skill_id: Optional[int] = None
    requester_skill_name: Optional[str] = None
    receiver_skill_name: Optional[str] = None
    proposal_message: str = Field(min_length=1, max_length=2000)
    preferred_date: Optional[str] = "Saturday afternoon"
    estimated_hours: Optional[float] = Field(default=2.0, gt=0, le=24)
    location_area: Optional[str] = Field(default="Local neighborhood / public meetup", max_length=200)

    @field_validator("proposal_message", "preferred_date", "location_area")
    @classmethod
    def normalize_text(cls, value):
        if value is None: return value
        value = value.strip()
        if not value: raise ValueError("Value cannot be blank")
        return value

class ExchangeCounter(BaseModel):
    counter_message: str = Field(min_length=1, max_length=2000)
    preferred_date: Optional[str] = Field(default=None, max_length=200)
    estimated_hours: Optional[float] = Field(default=None, gt=0, le=24)
    location_area: Optional[str] = Field(default=None, max_length=200)

    @field_validator("counter_message", "preferred_date", "location_area")
    @classmethod
    def normalize_text(cls, value):
        if value is None: return value
        value = value.strip()
        if not value: raise ValueError("Value cannot be blank")
        return value


class ExchangeCancel(BaseModel):
    cancellation_reason: str = Field(min_length=1, max_length=1000)

    @field_validator("cancellation_reason")
    @classmethod
    def normalize_reason(cls, value: str) -> str:
        value = value.strip()
        if not value: raise ValueError("Cancellation reason cannot be blank")
        return value


class ExchangeOut(BaseModel):
    id: int
    requester_id: int
    receiver_id: int
    requester_skill_id: Optional[int] = None
    receiver_skill_id: Optional[int] = None
    requester_skill_name: Optional[str] = None
    receiver_skill_name: Optional[str] = None
    status: str # PENDING, ACCEPTED, COUNTERED, REJECTED, ACTIVE, COMPLETED, CANCELLED
    proposal_message: str
    counter_message: Optional[str] = None
    preferred_date: Optional[str] = None
    estimated_hours: float
    location_area: Optional[str] = None
    requester_completed: bool
    receiver_completed: bool
    cancellation_reason: Optional[str] = None
    cancelled_by_id: Optional[int] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    
    requester: UserSummary
    receiver: UserSummary
    requester_skill: Optional[SkillOut] = None
    receiver_skill: Optional[SkillOut] = None
    
    user_can_review: Optional[bool] = False
    has_reviewed: Optional[bool] = False
    
    model_config = ConfigDict(from_attributes=True)
