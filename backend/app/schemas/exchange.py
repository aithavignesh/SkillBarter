from pydantic import BaseModel, ConfigDict
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
    proposal_message: str
    preferred_date: Optional[str] = "Saturday afternoon"
    estimated_hours: Optional[float] = 2.0
    location_area: Optional[str] = "Local neighborhood / public meetup"

class ExchangeCounter(BaseModel):
    counter_message: str
    preferred_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    location_area: Optional[str] = None

class ExchangeCancel(BaseModel):
    cancellation_reason: str

class ExchangeOut(BaseModel):
    id: int
    requester_id: int
    receiver_id: int
    requester_skill_id: Optional[int] = None
    receiver_skill_id: Optional[int] = None
    requester_skill_name: Optional[str] = None
    receiver_skill_name: Optional[str] = None
    status: str # PENDING, COUNTERED, REJECTED, ACTIVE, COMPLETED, CANCELLED
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
