from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.skill import Skill, UserSkill
from app.models.user import User
from app.schemas.skill import SkillOut, SkillCreate, UserSkillCreate, UserSkillOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/skills", tags=["Skills"])

@router.get("", response_model=List[SkillOut])
def list_skills(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Skill)
    if category and category != "All":
        query = query.filter(Skill.category == category)
    return query.order_by(Skill.popularity.desc(), Skill.name.asc()).all()

@router.get("/search", response_model=List[SkillOut])
def search_skills(
    q: str = Query("", min_length=0),
    db: Session = Depends(get_db)
):
    query = db.query(Skill)
    if q:
        query = query.filter(Skill.name.ilike(f"%{q}%"))
    return query.limit(20).all()

@router.post("", response_model=SkillOut)
def create_skill(
    req: SkillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Skill).filter(Skill.name.ilike(req.name.strip())).first()
    if existing:
        return existing
        
    skill = Skill(
        name=req.name.strip(),
        category=req.category,
        icon=req.icon or "Sparkles",
        description=req.description
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill

@router.post("/user/me", response_model=UserSkillOut)
def add_user_skill(
    req: UserSkillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find or create skill
    skill_name = req.skill_name.strip()
    skill = db.query(Skill).filter(Skill.name.ilike(skill_name)).first()
    if not skill:
        skill = Skill(
            name=skill_name,
            category=req.category or "Other",
            icon="Sparkles"
        )
        db.add(skill)
        db.commit()
        db.refresh(skill)

    # Check if already added
    existing_us = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        UserSkill.skill_id == skill.id,
        UserSkill.skill_type == req.skill_type.upper()
    ).first()
    
    if existing_us:
        existing_us.experience_level = req.experience_level or existing_us.experience_level
        existing_us.description = req.description or existing_us.description
        db.commit()
        db.refresh(existing_us)
        return {
            "id": existing_us.id,
            "user_id": existing_us.user_id,
            "skill_id": skill.id,
            "skill_name": skill.name,
            "category": skill.category,
            "icon": skill.icon,
            "skill_type": existing_us.skill_type,
            "experience_level": existing_us.experience_level,
            "description": existing_us.description,
            "created_at": existing_us.created_at
        }

    # Increment popularity
    skill.popularity = (skill.popularity or 0) + 1
    
    user_skill = UserSkill(
        user_id=current_user.id,
        skill_id=skill.id,
        skill_type=req.skill_type.upper(),
        experience_level=req.experience_level or "Intermediate",
        description=req.description
    )
    db.add(user_skill)
    db.commit()
    db.refresh(user_skill)

    return {
        "id": user_skill.id,
        "user_id": user_skill.user_id,
        "skill_id": skill.id,
        "skill_name": skill.name,
        "category": skill.category,
        "icon": skill.icon,
        "skill_type": user_skill.skill_type,
        "experience_level": user_skill.experience_level,
        "description": user_skill.description,
        "created_at": user_skill.created_at
    }

@router.delete("/user/me/{user_skill_id}")
def delete_user_skill(
    user_skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    us = db.query(UserSkill).filter(
        UserSkill.id == user_skill_id,
        UserSkill.user_id == current_user.id
    ).first()
    if not us:
        raise HTTPException(status_code=404, detail="Skill mapping not found")
        
    db.delete(us)
    db.commit()
    return {"message": "Skill removed successfully"}
