from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.skill import Skill, UserSkill
from app.models.exchange import Exchange
from app.models.review import Review
from app.services.auth import get_current_user

router = APIRouter(prefix="/community", tags=["Community Dashboard"])

@router.get("/stats")
def get_community_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    members_count = db.query(User).filter(User.is_active == True).count()
    skills_offered_count = db.query(UserSkill).filter(UserSkill.skill_type == "OFFERED").count()
    completed_exchanges = db.query(Exchange).filter(Exchange.status == "COMPLETED").count()
    
    avg_trust = db.query(func.avg(User.trust_score)).filter(User.is_active == True).scalar() or 92.0
    
    popular_skills = db.query(Skill).order_by(Skill.popularity.desc()).limit(8).all()
    popular_skills_data = [{"id": s.id, "name": s.name, "category": s.category, "icon": s.icon, "popularity": s.popularity} for s in popular_skills]

    # Recent completed barters
    recent = db.query(Exchange).filter(Exchange.status == "COMPLETED").order_by(Exchange.updated_at.desc()).limit(5).all()
    recent_data = []
    for r in recent:
        u1 = db.query(User).filter(User.id == r.requester_id).first()
        u2 = db.query(User).filter(User.id == r.receiver_id).first()
        s1 = db.query(Skill).filter(Skill.id == r.requester_skill_id).first() if r.requester_skill_id else None
        s2 = db.query(Skill).filter(Skill.id == r.receiver_skill_id).first() if r.receiver_skill_id else None
        
        recent_data.append({
            "id": r.id,
            "requester_name": u1.full_name if u1 else "Neighbor",
            "receiver_name": u2.full_name if u2 else "Neighbor",
            "requester_skill": s1.name if s1 else "Web Development",
            "receiver_skill": s2.name if s2 else "Plumbing",
            "completed_at": r.updated_at
        })

    return {
        "members_nearby": members_count,
        "skills_available": skills_offered_count,
        "exchanges_completed": completed_exchanges,
        "average_trust_score": round(float(avg_trust), 1),
        "popular_skills": popular_skills_data,
        "recent_exchanges": recent_data
    }
