from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.post import Post
from app.models.skill import Skill
from app.models.safety import Block
from app.schemas.post import PostCreate, PostOut
from app.services.auth import get_current_user
from app.services.spatial import calculate_haversine_distance, format_distance

router = APIRouter(prefix="/feed", tags=["Social Feed"])

@router.get("", response_model=List[PostOut])
def get_feed(
    post_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Filter out posts from blocked users
    blocked = [b.blocked_id for b in db.query(Block.blocked_id).filter(Block.blocker_id == current_user.id).all()]
    
    query = db.query(Post).filter(Post.author_id.notin_(blocked))
    if post_type and post_type != "ALL":
        query = query.filter(Post.post_type == post_type.upper())

    posts = query.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for p in posts:
        author = db.query(User).filter(User.id == p.author_id).first()
        if not author:
            continue

        skill = db.query(Skill).filter(Skill.id == p.skill_id).first() if p.skill_id else None
        partner = db.query(User).filter(User.id == p.partner_id).first() if p.partner_id else None
        
        dist_km = calculate_haversine_distance(
            current_user.latitude, current_user.longitude,
            author.latitude, author.longitude
        )

        results.append({
            "id": p.id,
            "author_id": p.author_id,
            "post_type": p.post_type,
            "title": p.title,
            "content": p.content,
            "skill_id": p.skill_id,
            "exchange_id": p.exchange_id,
            "partner_id": p.partner_id,
            "likes_count": p.likes_count,
            "created_at": p.created_at,
            "author": {
                "id": author.id,
                "full_name": author.full_name,
                "avatar_url": author.avatar_url,
                "headline": author.headline,
                "trust_score": author.trust_score,
                "address_display": author.address_display
            },
            "skill": {
                "id": skill.id,
                "name": skill.name,
                "category": skill.category,
                "icon": skill.icon,
                "description": skill.description,
                "popularity": skill.popularity
            } if skill else None,
            "partner": {
                "id": partner.id,
                "full_name": partner.full_name,
                "avatar_url": partner.avatar_url,
                "headline": partner.headline,
                "trust_score": partner.trust_score,
                "address_display": partner.address_display
            } if partner else None,
            "distance_display": format_distance(dist_km)
        })

    return results

@router.post("", response_model=PostOut)
def create_feed_post(
    req: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    skill_id = None
    if req.skill_name:
        s = db.query(Skill).filter(Skill.name.ilike(req.skill_name.strip())).first()
        if not s:
            s = Skill(name=req.skill_name.strip(), category=req.skill_category or "Other", icon="Sparkles")
            db.add(s)
            db.commit()
            db.refresh(s)
        skill_id = s.id

    post = Post(
        author_id=current_user.id,
        post_type=req.post_type.upper(),
        title=req.title.strip(),
        content=req.content.strip(),
        skill_id=skill_id,
        likes_count=0
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    skill = db.query(Skill).filter(Skill.id == skill_id).first() if skill_id else None

    return {
        "id": post.id,
        "author_id": post.author_id,
        "post_type": post.post_type,
        "title": post.title,
        "content": post.content,
        "skill_id": post.skill_id,
        "exchange_id": post.exchange_id,
        "partner_id": post.partner_id,
        "likes_count": post.likes_count,
        "created_at": post.created_at,
        "author": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "avatar_url": current_user.avatar_url,
            "headline": current_user.headline,
            "trust_score": current_user.trust_score,
            "address_display": current_user.address_display
        },
        "skill": {
            "id": skill.id,
            "name": skill.name,
            "category": skill.category,
            "icon": skill.icon,
            "description": skill.description,
            "popularity": skill.popularity
        } if skill else None,
        "partner": None,
        "distance_display": "You"
    }

@router.post("/{post_id}/like")
def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    post.likes_count = (post.likes_count or 0) + 1
    db.commit()
    return {"likes_count": post.likes_count}
