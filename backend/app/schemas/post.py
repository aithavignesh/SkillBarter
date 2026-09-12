from pydantic import BaseModel, ConfigDict
from typing import Optional
import datetime
from app.schemas.exchange import UserSummary
from app.schemas.skill import SkillOut

class PostCreate(BaseModel):
    post_type: str # OFFER, REQUEST, COMPLETED_EXCHANGE, COMMUNITY, RECOMMENDATION
    title: str
    content: str
    skill_name: Optional[str] = None
    skill_category: Optional[str] = "Other"

class PostOut(BaseModel):
    id: int
    author_id: int
    post_type: str
    title: str
    content: str
    skill_id: Optional[int] = None
    exchange_id: Optional[int] = None
    partner_id: Optional[int] = None
    likes_count: int
    created_at: datetime.datetime
    
    author: UserSummary
    skill: Optional[SkillOut] = None
    partner: Optional[UserSummary] = None
    distance_display: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
