from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.skill import Skill, UserSkill
from app.models.safety import Block
from app.services.spatial import calculate_haversine_distance, format_distance

def calculate_match(
    current_user: User,
    candidate_user: User,
    my_offered: List[str],
    my_needed: List[str],
    their_offered: List[str],
    their_needed: List[str]
) -> Optional[Dict[str, Any]]:
    """
    Computes explainable composite match score between current user and a candidate neighbor.
    Formula:
    - Direct reciprocal skill compatibility: 50%
    - Location proximity within radius: 20%
    - Trust score: 20%
    - Availability compatibility: 10%
    """
    # 1. Skill Compatibility (50%)
    # Current user offers what candidate needs:
    i_offer_they_need = set(my_offered).intersection(set(their_needed))
    # Candidate offers what current user needs:
    they_offer_i_need = set(their_offered).intersection(set(my_needed))
    
    is_reciprocal = bool(i_offer_they_need and they_offer_i_need)
    is_one_way = bool(i_offer_they_need or they_offer_i_need)
    
    if not is_one_way:
        # No skill intersection at all
        return None
        
    if is_reciprocal:
        skill_score = 50.0
    else:
        skill_score = 25.0

    # 2. Location Proximity (20%)
    distance_km = calculate_haversine_distance(
        current_user.latitude, current_user.longitude,
        candidate_user.latitude, candidate_user.longitude
    )
    
    max_radius = max(current_user.exchange_radius_km or 10.0, candidate_user.exchange_radius_km or 10.0, 1.0)
    if distance_km > max_radius:
        # Outside acceptable radius
        proximity_factor = max(0.0, 1.0 - (distance_km / (max_radius * 1.5)))
    else:
        proximity_factor = max(0.0, 1.0 - (distance_km / max_radius))
        
    proximity_score = proximity_factor * 20.0

    # 3. Trust Score (20%)
    c_trust = candidate_user.trust_score if candidate_user.trust_score is not None else 80.0
    trust_score_weight = (min(max(c_trust, 0.0), 100.0) / 100.0) * 20.0

    # 4. Availability Alignment (10%)
    my_avail = (current_user.availability or "flexible").lower()
    their_avail = (candidate_user.availability or "flexible").lower()
    
    if "flexible" in my_avail or "flexible" in their_avail or my_avail == their_avail:
        avail_score = 10.0
    elif any(word in their_avail for word in my_avail.split()):
        avail_score = 7.0
    else:
        avail_score = 4.0

    total_score = round(skill_score + proximity_score + trust_score_weight + avail_score)
    total_score = min(max(total_score, 10), 99) # Cap between 10% and 99%

    # Generate explainable reasons
    reasons = []
    if is_reciprocal:
        reasons.append(f"Direct 2-way barter match: You can trade '{list(i_offer_they_need)[0]}' for '{list(they_offer_i_need)[0]}'")
    elif they_offer_i_need:
        reasons.append(f"They offer '{list(they_offer_i_need)[0]}' which you need")
    elif i_offer_they_need:
        reasons.append(f"You offer '{list(i_offer_they_need)[0]}' which they need")
        
    if distance_km <= 3.0:
        reasons.append(f"Hyperlocal neighbor ({format_distance(distance_km)})")
    elif distance_km <= max_radius:
        reasons.append(f"Within your {max_radius:.0f} km exchange zone ({format_distance(distance_km)})")
    else:
        reasons.append(f"{format_distance(distance_km)}")

    if c_trust >= 90:
        reasons.append(f"High community trust score ({int(c_trust)}/100)")
    elif c_trust >= 80:
        reasons.append(f"Good community standing ({int(c_trust)}/100)")

    if avail_score >= 7.0:
        reasons.append(f"Compatible availability ({candidate_user.availability})")

    return {
        "candidate": candidate_user,
        "match_score": total_score,
        "distance_km": distance_km,
        "distance_display": format_distance(distance_km),
        "is_reciprocal": is_reciprocal,
        "they_offer": list(their_offered),
        "they_need": list(their_needed),
        "matched_you_offer": list(i_offer_they_need),
        "matched_they_offer": list(they_offer_i_need),
        "reasons": reasons,
        "score_breakdown": {
            "skill_compatibility": round(skill_score),
            "location_proximity": round(proximity_score),
            "trust": round(trust_score_weight),
            "availability": round(avail_score)
        }
    }

def find_matches_for_user(user: User, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Queries candidate neighbors and scores matches against the current user.
    Filters out blocked users.
    """
    # Get user's offered and needed skills
    my_skills = db.query(UserSkill, Skill.name).join(Skill, UserSkill.skill_id == Skill.id).filter(
        UserSkill.user_id == user.id
    ).all()
    
    my_offered = [name for us, name in my_skills if us.skill_type == "OFFERED"]
    my_needed = [name for us, name in my_skills if us.skill_type == "NEEDED"]
    
    if not my_offered and not my_needed:
        return []

    # Get blocked user IDs (both directions)
    blocked_by_me = [b.blocked_id for b in db.query(Block.blocked_id).filter(Block.blocker_id == user.id).all()]
    blocking_me = [b.blocker_id for b in db.query(Block.blocker_id).filter(Block.blocked_id == user.id).all()]
    excluded_user_ids = set(blocked_by_me + blocking_me + [user.id])

    # Fetch candidate active users
    candidates = db.query(User).filter(
        User.id.notin_(excluded_user_ids),
        User.is_active == True
    ).all()

    matches = []
    for cand in candidates:
        c_skills = db.query(UserSkill, Skill.name).join(Skill, UserSkill.skill_id == Skill.id).filter(
            UserSkill.user_id == cand.id
        ).all()
        
        c_offered = [name for us, name in c_skills if us.skill_type == "OFFERED"]
        c_needed = [name for us, name in c_skills if us.skill_type == "NEEDED"]
        
        match_result = calculate_match(
            current_user=user,
            candidate_user=cand,
            my_offered=my_offered,
            my_needed=my_needed,
            their_offered=c_offered,
            their_needed=c_needed
        )
        
        if match_result:
            matches.append(match_result)

    # Sort descending by match score, then ascending by distance
    matches.sort(key=lambda m: (-m["match_score"], m["distance_km"]))
    return matches[:limit]
