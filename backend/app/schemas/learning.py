from typing import List, Optional
from pydantic import BaseModel, Field


class LearningPathStep(BaseModel):
    skill_id: int
    skill_name: str
    category: str
    status: str
    relationship: Optional[str] = None
    reason: str


class LearningPathOut(BaseModel):
    target_skill_id: int
    target_skill: str
    goal: Optional[str] = None
    known_skills: List[int]
    missing_skills: List[LearningPathStep]
    path: List[LearningPathStep]
    suggested_teachers: List[dict]


class GoalAnalysisRequest(BaseModel):
    goal: str = Field(min_length=3, max_length=300)


class GoalAnalysisOut(BaseModel):
    goal: str
    matched_skills: List[dict]
    suggested_target_skill: Optional[dict] = None


class SkillRelationshipCreate(BaseModel):
    source_skill_id: int
    target_skill_id: int
    relationship_type: str = Field(min_length=3, max_length=40)
    weight: int = Field(default=1, ge=1, le=100)
