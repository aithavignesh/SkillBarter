from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.user import User
from app.models.skill import Skill, UserSkill
from app.models.post import Post
from app.models.safety import Block
from app.services.auth import get_current_user
from app.services.spatial import calculate_haversine_distance, format_distance

router = APIRouter(prefix="/search", tags=["Global Search"])

@router.get("")
def global_search(
    q: str = Query("", min_length=0),
    category: Optional[str] = Query(None),
    min_trust: Optional[float] = Query(None),
    max_distance_km: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query_str = q.strip().lower()
    
    # Exclude blocks
    blocked = [b.blocked_id for b in db.query(Block.blocked_id).filter(Block.blocker_id == current_user.id).all()]
    
    # 1. Search People
    people_query = db.query(User).filter(
        User.id.notin_(blocked + [current_user.id]),
        User.is_active == True
    )
    if query_str:
        people_query = people_query.filter(
            or_(
                User.full_name.ilike(f"%{query_str}%"),
                User.headline.ilike(f"%{query_str}%"),
                User.bio.ilike(f"%{query_str}%")
            )
        )
    if min_trust is not None:
        people_query = people_query.filter(User.trust_score >= min_trust)

    people = people_query.limit(20).all()
    people_results = []
    for p in people:
        dist_km = calculate_haversine_distance(
            current_user.latitude, current_user.longitude,
            p.latitude, p.longitude
        )
        if max_distance_km and dist_km > max_distance_km:
            continue
            
        p_skills = db.query(UserSkill, Skill.name).join(Skill, UserSkill.skill_id == Skill.id).filter(
            UserSkill.user_id == p.id
        ).all()
        
        people_results.append({
            "id": p.id,
            "full_name": p.full_name,
            "avatar_url": p.avatar_url,
            "headline": p.headline,
            "address_display": p.address_display,
            "distance_km": dist_km,
            "distance_display": format_distance(dist_km),
            "trust_score": p.trust_score,
            "skills_offered": [name for us, name in p_skills if us.skill_type == "OFFERED"],
            "skills_needed": [name for us, name in p_skills if us.skill_type == "NEEDED"]
        })

    # 2. Search Skills
    skills_query = db.query(Skill)
    if query_str:
        skills_query = skills_query.filter(Skill.name.ilike(f"%{query_str}%"))
    if category and category != "All":
        skills_query = skills_query.filter(Skill.category == category)
        
    skills = skills_query.limit(20).all()
    skills_results = [
        {"id": s.id, "name": s.name, "category": s.category, "icon": s.icon, "popularity": s.popularity}
        for s in skills
    ]

    # 3. Search Requests/Offers (Posts)
    posts_query = db.query(Post).filter(Post.author_id.notin_(blocked))
    if query_str:
        posts_query = posts_query.filter(
            or_(
                Post.title.ilike(f"%{query_str}%"),
                Post.content.ilike(f"%{query_str}%")
            )
        )
    posts = posts_query.order_by(Post.created_at.desc()).limit(15).all()
    requests_results = []
    for post in posts:
        author = db.query(User).filter(User.id == post.author_id).first()
        if author:
            requests_results.append({
                "id": post.id,
                "title": post.title,
                "content": post.content,
                "post_type": post.post_type,
                "author_name": author.full_name,
                "author_id": author.id,
                "author_trust": author.trust_score
            })

    return {
        "people": people_results,
        "skills": skills_results,
        "posts": requests_results
    }
