from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
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
    premium: bool = False
    premium_until: Optional[datetime.datetime] = None
    verified: bool = False
    verification_requested_at: Optional[datetime.datetime] = None
    featured_until: Optional[datetime.datetime] = None
    priority_matching: bool = False
    credits: int = 100
    workshops_enabled: bool = False
    corporate_interest: bool = False
    sponsored_enabled: bool = False
    lead_generation_enabled: bool = False
    priority_matches_used: int = 0
    priority_matches_date: Optional[str] = None
    boosts_used: int = 0
    last_boost_at: Optional[datetime.datetime] = None
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
    verified: bool = False
    featured_until: Optional[datetime.datetime] = None
    premium: bool = False
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
    distance_display: str
    trust_score: float
    reliability_score: float
    completed_exchanges_count: int
    badges: List[str] = []
    verified: bool = False
    featured_until: Optional[datetime.datetime] = None
    premium: bool = False
    skills_offered: List[str] = []
    skills_needed: List[str] = []
    availability: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
