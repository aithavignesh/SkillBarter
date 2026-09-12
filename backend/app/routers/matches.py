from typing import List, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services.matching import find_matches_for_user

router = APIRouter(prefix="/matches", tags=["Matching"])

@router.get("")
def get_skill_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes reciprocal and one-way hyperlocal skill matches for the logged-in user.
    Uses multi-factor scoring (Skill Compatibility 50%, Proximity 20%, Trust 20%, Availability 10%).
    """
    matches = find_matches_for_user(current_user, db, limit=20)
    
    # Format response with candidate summary
    results = []
    for m in matches:
        cand = m["candidate"]
        results.append({
            "candidate": {
                "id": cand.id,
                "full_name": cand.full_name,
                "avatar_url": cand.avatar_url,
                "headline": cand.headline,
                "address_display": cand.address_display,
                "trust_score": cand.trust_score,
                "reliability_score": cand.reliability_score,
                "completed_exchanges_count": cand.completed_exchanges_count,
                "badges": cand.badges or []
            },
            "match_score": m["match_score"],
            "distance_km": m["distance_km"],
            "distance_display": m["distance_display"],
            "is_reciprocal": m["is_reciprocal"],
            "they_offer": m["they_offer"],
            "they_need": m["they_need"],
            "matched_you_offer": m["matched_you_offer"],
            "matched_they_offer": m["matched_they_offer"],
            "reasons": m["reasons"],
            "score_breakdown": m["score_breakdown"]
        })
        
    return results
