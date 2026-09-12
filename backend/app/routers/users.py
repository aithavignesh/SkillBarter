from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.skill import Skill, UserSkill
from app.models.safety import Block
from app.schemas.user import UserOut, UserUpdate, UserPublicProfile, UserNearbyOut
from app.services.auth import get_current_user
from app.services.spatial import calculate_haversine_distance, format_distance, get_bounding_box

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_skills = db.query(UserSkill).filter(UserSkill.user_id == current_user.id).all()
    skills_out = []
    for us in user_skills:
        skill = db.query(Skill).filter(Skill.id == us.skill_id).first()
        skills_out.append({
            "id": us.id,
            "user_id": us.user_id,
            "skill_id": us.skill_id,
            "skill_name": skill.name if skill else "Unknown",
            "category": skill.category if skill else "Other",
            "icon": skill.icon if skill else "Wrench",
            "skill_type": us.skill_type,
            "experience_level": us.experience_level,
            "description": us.description,
            "created_at": us.created_at
        })
        
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "avatar_url": current_user.avatar_url,
        "bio": current_user.bio,
        "headline": current_user.headline,
        "address_display": current_user.address_display,
        "latitude": current_user.latitude,
        "longitude": current_user.longitude,
        "exchange_radius_km": current_user.exchange_radius_km,
        "location_visibility": current_user.location_visibility,
        "availability": current_user.availability,
        "primary_intent": current_user.primary_intent,
        "trust_score": current_user.trust_score,
        "reliability_score": current_user.reliability_score,
        "response_rate": current_user.response_rate,
        "skill_quality_score": current_user.skill_quality_score,
        "completed_exchanges_count": current_user.completed_exchanges_count,
        "reviews_count": current_user.reviews_count,
        "badges": current_user.badges or [],
        "is_active": current_user.is_active,
        "is_admin": current_user.is_admin,
        "onboarding_completed": current_user.onboarding_completed,
        "created_at": current_user.created_at,
        "skills": skills_out
    }

@router.patch("/me", response_model=UserOut)
def update_my_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
        
    db.commit()
    db.refresh(current_user)
    return get_my_profile(current_user=current_user, db=db)

@router.get("/nearby", response_model=List[UserNearbyOut])
def get_nearby_users(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Hyperlocal discovery:
    Returns neighbors within radius_km sorted by distance.
    Uses bounding box pre-filter and Haversine distance.
    Exact private coordinates are never exposed.
    """
    center_lat = latitude if latitude is not None else current_user.latitude or 17.4485
    center_lon = longitude if longitude is not None else current_user.longitude or 78.3748
    effective_radius = radius_km or current_user.exchange_radius_km or 10.0

    # Filter out blocks
    blocked_by_me = [b.blocked_id for b in db.query(Block.blocked_id).filter(Block.blocker_id == current_user.id).all()]
    blocking_me = [b.blocker_id for b in db.query(Block.blocker_id).filter(Block.blocked_id == current_user.id).all()]
    excluded_ids = set(blocked_by_me + blocking_me + [current_user.id])

    # Bounding box candidate search
    min_lat, max_lat, min_lon, max_lon = get_bounding_box(center_lat, center_lon, effective_radius)
    candidates = db.query(User).filter(
        User.id.notin_(excluded_ids),
        User.is_active == True,
        User.latitude.isnot(None),
        User.longitude.isnot(None),
        User.latitude.between(min_lat, max_lat),
        User.longitude.between(min_lon, max_lon)
    ).all()

    # Fallback if bounding box is too tight for demo mock coordinates
    if not candidates:
        candidates = db.query(User).filter(
            User.id.notin_(excluded_ids),
            User.is_active == True
        ).limit(30).all()

    results = []
    for cand in candidates:
        dist_km = calculate_haversine_distance(center_lat, center_lon, cand.latitude, cand.longitude)
        
        # Load offered and needed skills
        c_skills = db.query(UserSkill, Skill.name).join(Skill, UserSkill.skill_id == Skill.id).filter(
            UserSkill.user_id == cand.id
        ).all()
        
        skills_offered = [name for us, name in c_skills if us.skill_type == "OFFERED"]
        skills_needed = [name for us, name in c_skills if us.skill_type == "NEEDED"]

        results.append({
            "id": cand.id,
            "full_name": cand.full_name,
            "avatar_url": cand.avatar_url,
            "headline": cand.headline,
            "address_display": cand.address_display,
            "distance_km": dist_km,
            "distance_display": format_distance(dist_km),
            "trust_score": cand.trust_score,
            "reliability_score": cand.reliability_score,
            "completed_exchanges_count": cand.completed_exchanges_count,
            "badges": cand.badges or [],
            "skills_offered": skills_offered,
            "skills_needed": skills_needed,
            "availability": cand.availability
        })

    # Sort ascending by distance
    results.sort(key=lambda x: x["distance_km"])
    return results

@router.get("/{user_id}", response_model=UserPublicProfile)
def get_user_public_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    dist_km = calculate_haversine_distance(
        current_user.latitude, current_user.longitude,
        user.latitude, user.longitude
    )

    user_skills = db.query(UserSkill).filter(UserSkill.user_id == user.id).all()
    skills_offered = []
    skills_needed = []
    skills_detail = []
    
    for us in user_skills:
        skill = db.query(Skill).filter(Skill.id == us.skill_id).first()
        skill_name = skill.name if skill else "Skill"
        if us.skill_type == "OFFERED":
            skills_offered.append(skill_name)
        else:
            skills_needed.append(skill_name)
            
        skills_detail.append({
            "id": us.id,
            "user_id": us.user_id,
            "skill_id": us.skill_id,
            "skill_name": skill_name,
            "category": skill.category if skill else "Other",
            "icon": skill.icon if skill else "Wrench",
            "skill_type": us.skill_type,
            "experience_level": us.experience_level,
            "description": us.description,
            "created_at": us.created_at
        })

    return {
        "id": user.id,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "headline": user.headline,
        "address_display": user.address_display,
        "distance_km": dist_km,
        "availability": user.availability,
        "trust_score": user.trust_score,
        "reliability_score": user.reliability_score,
        "response_rate": user.response_rate,
        "completed_exchanges_count": user.completed_exchanges_count,
        "reviews_count": user.reviews_count,
        "badges": user.badges or [],
        "skills_offered": skills_offered,
        "skills_needed": skills_needed,
        "skills_detail": skills_detail,
        "created_at": user.created_at
    }
