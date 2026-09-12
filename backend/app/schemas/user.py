from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Any
import datetime
from app.schemas.skill import UserSkillOut

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    address_display: Optional[str] = None
    exchange_radius_km: Optional[float] = 10.0
    location_visibility: Optional[str] = "APPROXIMATE"
    availability: Optional[str] = "Weekends & Evenings"
    primary_intent: Optional[str] = "EXCHANGE"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address_display: Optional[str] = None
    exchange_radius_km: Optional[float] = None
    location_visibility: Optional[str] = None
    availability: Optional[str] = None
    primary_intent: Optional[str] = None
    onboarding_completed: Optional[bool] = None

class UserOut(UserBase):
    id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    trust_score: float
    reliability_score: float
    response_rate: float
    skill_quality_score: float
    completed_exchanges_count: int
    reviews_count: int
    badges: List[str] = []
    is_active: bool
    is_admin: bool
    onboarding_completed: bool
    created_at: datetime.datetime
    skills: List[UserSkillOut] = []
    model_config = ConfigDict(from_attributes=True)

class UserPublicProfile(BaseModel):
    id: int
    full_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    address_display: Optional[str] = None
    distance_km: Optional[float] = None
    availability: Optional[str] = None
    trust_score: float
    reliability_score: float
    response_rate: float
    completed_exchanges_count: int
    reviews_count: int
    badges: List[str] = []
    skills_offered: List[str] = []
    skills_needed: List[str] = []
    skills_detail: List[UserSkillOut] = []
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class UserNearbyOut(BaseModel):
    id: int
    full_name: str
    avatar_url: Optional[str] = None
    headline: Optional[str] = None
    address_display: Optional[str] = None
    distance_km: float
    distance_display: str # e.g. "1.8 km away"
    trust_score: float
    reliability_score: float
    completed_exchanges_count: int
    badges: List[str] = []
    skills_offered: List[str] = []
    skills_needed: List[str] = []
    availability: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
