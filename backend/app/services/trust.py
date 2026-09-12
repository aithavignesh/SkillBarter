import math
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.review import Review
from app.models.exchange import Exchange
from app.models.safety import Report
from app.models.skill import UserSkill, Skill

def recalculate_user_trust_score(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Recalculates a user's multi-factor community trust score and updates their profile and badges.
    Never trusts client input for trust score.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}

    # 1. Reviews Data (Weight: 40%)
    reviews = db.query(Review).filter(Review.reviewee_id == user_id).all()
    reviews_count = len(reviews)
    
    if reviews_count > 0:
        avg_rating = sum(r.rating for r in reviews) / reviews_count
        avg_skill_quality = sum(r.skill_quality_score for r in reviews) / reviews_count
        avg_reliability = sum(r.reliability_score for r in reviews) / reviews_count
        would_again_count = sum(1 for r in reviews if r.would_exchange_again)
        would_again_ratio = would_again_count / reviews_count
        
        # Rating out of 5 -> 30 pts, would_again -> 10 pts
        review_quality_score = ((avg_rating / 5.0) * 30.0) + (would_again_ratio * 10.0)
    else:
        # Default starting baseline for new active member
        avg_rating = 4.5
        avg_skill_quality = 4.5
        avg_reliability = 4.5
        would_again_ratio = 1.0
        review_quality_score = 36.0 # 90% of 40 pts

    # 2. Completion Reliability (Weight: 25%)
    completed_count = db.query(Exchange).filter(
        ((Exchange.requester_id == user_id) | (Exchange.receiver_id == user_id)),
        Exchange.status == "COMPLETED"
    ).count()

    cancelled_by_user_count = db.query(Exchange).filter(
        Exchange.cancelled_by_id == user_id,
        Exchange.status == "CANCELLED"
    ).count()

    total_settled = completed_count + cancelled_by_user_count
    if total_settled > 0:
        completion_ratio = completed_count / total_settled
        reliability_score_pts = completion_ratio * 25.0
    else:
        completion_ratio = 1.0
        reliability_score_pts = 22.5 # baseline

    # 3. Response Rate (Weight: 15%)
    # Incoming proposals where user was receiver
    received_proposals = db.query(Exchange).filter(Exchange.receiver_id == user_id).all()
    if received_proposals:
        # Proposals that didn't stay stuck PENDING
        answered_proposals = [p for p in received_proposals if p.status != "PENDING"]
        response_ratio = len(answered_proposals) / len(received_proposals)
        response_rate_pts = response_ratio * 15.0
    else:
        response_ratio = 1.0
        response_rate_pts = 14.0

    # 4. Exchange Volume History (Weight: 10%)
    # Logarithmic scaling up to 10 exchanges: log(1 + count) / log(11) * 10
    volume_pts = min(10.0, (math.log(1 + completed_count) / math.log(11.0)) * 10.0) if completed_count > 0 else 7.0

    # 5. Safety & Reports Penalty (Weight: 10%)
    resolved_reports_against = db.query(Report).filter(
        Report.reported_user_id == user_id,
        Report.status == "RESOLVED"
    ).count()
    
    safety_penalty = min(10.0, resolved_reports_against * 5.0)
    safety_pts = max(0.0, 10.0 - safety_penalty)

    # Composite trust score (0 - 100)
    final_score = round(review_quality_score + reliability_score_pts + response_rate_pts + volume_pts + safety_pts)
    final_score = min(max(final_score, 10), 100)

    # Sub-scores (0 - 100 for display)
    calc_reliability = round((completion_ratio * 0.6 + (avg_reliability / 5.0) * 0.4) * 100)
    calc_skill_quality = round((avg_skill_quality / 5.0) * 100)
    calc_response_rate = round(response_ratio * 100)

    # Activity Badges Evaluation
    badges: List[str] = ["Verified Member"]
    
    if completed_count >= 5 and avg_rating >= 4.5:
        badges.append("Reliable Exchanger")
        
    # Check distinct categories bartered
    skills_count = db.query(Skill.category).join(UserSkill, UserSkill.skill_id == Skill.id).filter(
        UserSkill.user_id == user_id
    ).distinct().count()
    if skills_count >= 3:
        badges.append("Community Helper")
        
    if final_score >= 90 and completed_count >= 5:
        badges.append("Top Contributor")
        
    if completed_count >= 10:
        badges.append("10+ Successful Exchanges")

    # Update User in DB
    user.trust_score = float(final_score)
    user.reliability_score = float(calc_reliability)
    user.response_rate = float(calc_response_rate)
    user.skill_quality_score = float(calc_skill_quality)
    user.completed_exchanges_count = completed_count
    user.reviews_count = reviews_count
    user.badges = badges
    
    db.commit()
    db.refresh(user)

    return {
        "user_id": user.id,
        "trust_score": user.trust_score,
        "reliability_score": user.reliability_score,
        "response_rate": user.response_rate,
        "skill_quality_score": user.skill_quality_score,
        "completed_exchanges_count": user.completed_exchanges_count,
        "reviews_count": user.reviews_count,
        "badges": user.badges,
        "breakdown": {
            "review_quality": round(review_quality_score, 1),
            "completion_reliability": round(reliability_score_pts, 1),
            "response_rate": round(response_rate_pts, 1),
            "exchange_history": round(volume_pts, 1),
            "safety_standing": round(safety_pts, 1)
        }
    }
