from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.skill import Skill
from app.models.skill_graph import SkillRelationship
from app.models.user import User
from app.schemas.learning import (
    GoalAnalysisRequest,
    GoalAnalysisOut,
    LearningPathOut,
    SkillRelationshipCreate,
)
from app.services.auth import get_current_admin, get_current_user
from app.services.learning import analyze_goal, build_learning_path

router = APIRouter(prefix="/learning", tags=["Learning Intelligence"])


@router.post("/goals/analyze", response_model=GoalAnalysisOut)
def analyze_learning_goal(
    req: GoalAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matches = analyze_goal(req.goal, db)
    target = matches[0] if matches else None
    return {
        "goal": req.goal.strip(),
        "matched_skills": matches,
        "suggested_target_skill": target,
    }


@router.get("/path/{skill_id}", response_model=LearningPathOut)
def get_learning_path(
    skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(Skill).filter(Skill.id == skill_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target skill not found")
    return build_learning_path(current_user, target, db)


@router.post("/relationships", response_model=dict)
def create_skill_relationship(
    req: SkillRelationshipCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if req.source_skill_id == req.target_skill_id:
        raise HTTPException(status_code=400, detail="A skill cannot relate to itself")
    relationship_type = req.relationship_type.strip().upper()
    if relationship_type not in {"PREREQUISITE_OF", "RELATED_TO"}:
        raise HTTPException(status_code=400, detail="Unsupported relationship type")

    source = db.query(Skill).filter(Skill.id == req.source_skill_id).first()
    target = db.query(Skill).filter(Skill.id == req.target_skill_id).first()
    if not source or not target:
        raise HTTPException(status_code=404, detail="Source or target skill not found")

    existing = db.query(SkillRelationship).filter(
        SkillRelationship.source_skill_id == source.id,
        SkillRelationship.target_skill_id == target.id,
        SkillRelationship.relationship_type == relationship_type,
    ).first()
    if existing:
        return {"id": existing.id, "message": "Relationship already exists"}

    relationship = SkillRelationship(
        source_skill_id=source.id,
        target_skill_id=target.id,
        relationship_type=relationship_type,
        weight=req.weight,
    )
    db.add(relationship)
    db.commit()
    db.refresh(relationship)
    return {"id": relationship.id, "message": "Skill relationship created"}
