from pydantic import BaseModel, ConfigDict
from typing import Optional
import datetime

class SkillBase(BaseModel):
    name: str
    category: str
    icon: Optional[str] = "Wrench"
    description: Optional[str] = None

class SkillCreate(SkillBase):
    pass

class SkillOut(SkillBase):
    id: int
    popularity: int = 0
    model_config = ConfigDict(from_attributes=True)

class UserSkillCreate(BaseModel):
    skill_name: str
    category: Optional[str] = "Other"
    skill_type: str # "OFFERED" or "NEEDED"
    experience_level: Optional[str] = "Intermediate"
    description: Optional[str] = None

class UserSkillOut(BaseModel):
    id: int
    user_id: int
    skill_id: int
    skill_name: str
    category: str
    icon: str
    skill_type: str
    experience_level: str
    description: Optional[str] = None
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
