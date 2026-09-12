from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.exchange import Exchange
from app.models.review import Review
from app.models.notification import Notification
from app.schemas.review import ReviewCreate, ReviewOut
from app.services.auth import get_current_user
from app.services.trust import recalculate_user_trust_score

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("", response_model=ReviewOut)
def create_review(
    req: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    e = db.query(Exchange).filter(Exchange.id == req.exchange_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Exchange not found")
        
    if e.status != "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="Reviews can only be submitted for COMPLETED skill exchanges"
        )

    if current_user.id not in (e.requester_id, e.receiver_id):
        raise HTTPException(status_code=403, detail="Only participants can review this exchange")

    # Prevent duplicate review
    existing = db.query(Review).filter(
        Review.exchange_id == e.id,
        Review.reviewer_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a review for this barter")

    target_user_id = e.receiver_id if current_user.id == e.requester_id else e.requester_id

    review = Review(
        exchange_id=e.id,
        reviewer_id=current_user.id,
        reviewee_id=target_user_id,
        rating=req.rating,
        reliability_score=req.reliability_score,
        skill_quality_score=req.skill_quality_score,
        would_exchange_again=req.would_exchange_again,
        comment=req.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # Trigger dynamic trust score recalculation for reviewee
    recalculate_user_trust_score(target_user_id, db)

    # Notify reviewee
    notif = Notification(
        user_id=target_user_id,
        type="NEW_REVIEW",
        title="New Community Review Received ⭐",
        message=f"{current_user.full_name} gave you {req.rating} stars: '{req.comment or 'Great exchange!'}'",
        link=f"/profile/{target_user_id}"
    )
    db.add(notif)
    db.commit()

    return {
        "id": review.id,
        "exchange_id": review.exchange_id,
        "reviewer_id": review.reviewer_id,
        "reviewee_id": review.reviewee_id,
        "rating": review.rating,
        "reliability_score": review.reliability_score,
        "skill_quality_score": review.skill_quality_score,
        "would_exchange_again": review.would_exchange_again,
        "comment": review.comment,
        "created_at": review.created_at,
        "reviewer": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "avatar_url": current_user.avatar_url,
            "headline": current_user.headline,
            "trust_score": current_user.trust_score,
            "address_display": current_user.address_display
        }
    }

@router.get("/user/{user_id}", response_model=List[ReviewOut])
def get_user_reviews(
    user_id: int,
    db: Session = Depends(get_db)
):
    reviews = db.query(Review).filter(Review.reviewee_id == user_id).order_by(Review.created_at.desc()).all()
    results = []
    for r in reviews:
        reviewer = db.query(User).filter(User.id == r.reviewer_id).first()
        results.append({
            "id": r.id,
            "exchange_id": r.exchange_id,
            "reviewer_id": r.reviewer_id,
            "reviewee_id": r.reviewee_id,
            "rating": r.rating,
            "reliability_score": r.reliability_score,
            "skill_quality_score": r.skill_quality_score,
            "would_exchange_again": r.would_exchange_again,
            "comment": r.comment,
            "created_at": r.created_at,
            "reviewer": {
                "id": reviewer.id,
                "full_name": reviewer.full_name,
                "avatar_url": reviewer.avatar_url,
                "headline": reviewer.headline,
                "trust_score": reviewer.trust_score,
                "address_display": reviewer.address_display
            } if reviewer else {"id": 0, "full_name": "Community Member", "trust_score": 80.0}
        })
    return results
