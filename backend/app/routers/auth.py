from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.skill import Skill, UserSkill
from app.schemas.auth import Token, LoginRequest, RegisterRequest, PasswordResetRequest
from app.schemas.user import UserOut
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user
import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )
        
    user = User(
        email=req.email.lower(),
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        address_display=req.address_display or "Hyderabad",
        latitude=req.latitude or 17.4485,
        longitude=req.longitude or 78.3748,
        primary_intent=req.primary_intent or "EXCHANGE",
        trust_score=85.0,
        reliability_score=90.0,
        response_rate=95.0,
        skill_quality_score=90.0,
        badges=["Verified Member"]
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Optional initial primary skill
    if req.primary_skill:
        skill = db.query(Skill).filter(Skill.name.ilike(req.primary_skill.strip())).first()
        if not skill:
            skill = Skill(
                name=req.primary_skill.strip(),
                category=req.primary_category or "Other",
                icon="Sparkles"
            )
            db.add(skill)
            db.commit()
            db.refresh(skill)
            
        user_skill = UserSkill(
            user_id=user.id,
            skill_id=skill.id,
            skill_type="OFFERED",
            experience_level="Intermediate",
            description=f"Can offer {skill.name} to community neighbors"
        )
        db.add(user_skill)
        db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin
    )

@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact support."
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin
    )

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Load user skills
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
        
    user_dict = {
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
    return user_dict

@router.post("/demo-switch/{user_id}", response_model=Token)
def demo_switch_user(user_id: int, db: Session = Depends(get_db)):
    """
    Convenience endpoint for CEO demonstration and live evaluation:
    Allows instant fast-switching between pre-seeded test personas (Arjun, Ravi, etc.)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin
    )

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
