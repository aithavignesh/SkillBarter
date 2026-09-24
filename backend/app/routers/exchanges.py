from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.skill import Skill
from app.models.exchange import Exchange
from app.models.review import Review
from app.models.notification import Notification
from app.schemas.exchange import ExchangeCreate, ExchangeCounter, ExchangeCancel, ExchangeOut
from app.services.auth import get_current_user
from app.services.trust import recalculate_user_trust_score
import datetime

router = APIRouter(prefix="/exchanges", tags=["Exchanges"])

def serialize_exchange(e: Exchange, current_user_id: int, db: Session) -> dict:
    requester_user = db.query(User).filter(User.id == e.requester_id).first()
    receiver_user = db.query(User).filter(User.id == e.receiver_id).first()
    req_skill = db.query(Skill).filter(Skill.id == e.requester_skill_id).first() if e.requester_skill_id else None
    rec_skill = db.query(Skill).filter(Skill.id == e.receiver_skill_id).first() if e.receiver_skill_id else None
    
    # Check if current user has reviewed this exchange
    user_review = db.query(Review).filter(
        Review.exchange_id == e.id,
        Review.reviewer_id == current_user_id
    ).first()
    has_reviewed = user_review is not None
    user_can_review = (e.status == "COMPLETED") and not has_reviewed

    return {
        "id": e.id,
        "requester_id": e.requester_id,
        "receiver_id": e.receiver_id,
        "requester_skill_id": e.requester_skill_id,
        "receiver_skill_id": e.receiver_skill_id,
        "requester_skill_name": req_skill.name if req_skill else "Custom Skill",
        "receiver_skill_name": rec_skill.name if rec_skill else "Custom Skill",
        "status": e.status,
        "proposal_message": e.proposal_message,
        "counter_message": e.counter_message,
        "preferred_date": e.preferred_date,
        "estimated_hours": e.estimated_hours or 2.0,
        "location_area": e.location_area,
        "requester_completed": e.requester_completed,
        "receiver_completed": e.receiver_completed,
        "cancellation_reason": e.cancellation_reason,
        "cancelled_by_id": e.cancelled_by_id,
        "created_at": e.created_at,
        "updated_at": e.updated_at,
        "requester": {
            "id": requester_user.id,
            "full_name": requester_user.full_name,
            "avatar_url": requester_user.avatar_url,
            "headline": requester_user.headline,
            "trust_score": requester_user.trust_score,
            "address_display": requester_user.address_display
        } if requester_user else {"id": 0, "full_name": "User", "trust_score": 80.0},
        "receiver": {
            "id": receiver_user.id,
            "full_name": receiver_user.full_name,
            "avatar_url": receiver_user.avatar_url,
            "headline": receiver_user.headline,
            "trust_score": receiver_user.trust_score,
            "address_display": receiver_user.address_display
        } if receiver_user else {"id": 0, "full_name": "User", "trust_score": 80.0},
        "requester_skill": {
            "id": req_skill.id,
            "name": req_skill.name,
            "category": req_skill.category,
            "icon": req_skill.icon,
            "description": req_skill.description,
            "popularity": req_skill.popularity
        } if req_skill else None,
        "receiver_skill": {
            "id": rec_skill.id,
            "name": rec_skill.name,
            "category": rec_skill.category,
            "icon": rec_skill.icon,
            "description": rec_skill.description,
            "popularity": rec_skill.popularity
        } if rec_skill else None,
        "user_can_review": user_can_review,
        "has_reviewed": has_reviewed
    }

@router.post("", response_model=ExchangeOut)
def create_exchange_proposal(
    req: ExchangeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot propose a skill exchange with yourself")
        
    receiver = db.query(User).filter(User.id == req.receiver_id, User.is_active == True).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Partner user not found")

    # Resolve skill IDs by name if provided
    req_skill_id = req.requester_skill_id
    if not req_skill_id and req.requester_skill_name:
        s = db.query(Skill).filter(Skill.name.ilike(req.requester_skill_name.strip())).first()
        if not s:
            s = Skill(name=req.requester_skill_name.strip(), category="Other", icon="Sparkles")
            db.add(s)
            db.commit()
            db.refresh(s)
        req_skill_id = s.id

    rec_skill_id = req.receiver_skill_id
    if not rec_skill_id and req.receiver_skill_name:
        s = db.query(Skill).filter(Skill.name.ilike(req.receiver_skill_name.strip())).first()
        if not s:
            s = Skill(name=req.receiver_skill_name.strip(), category="Other", icon="Sparkles")
            db.add(s)
            db.commit()
            db.refresh(s)
        rec_skill_id = s.id

    exchange = Exchange(
        requester_id=current_user.id,
        receiver_id=receiver.id,
        requester_skill_id=req_skill_id,
        receiver_skill_id=rec_skill_id,
        status="PENDING",
        proposal_message=req.proposal_message,
        preferred_date=req.preferred_date or "This week",
        estimated_hours=req.estimated_hours or 2.0,
        location_area=req.location_area or "Local neighborhood",
        requester_completed=False,
        receiver_completed=False
    )
    db.add(exchange)
    db.commit()
    db.refresh(exchange)

    # Create notification for receiver
    notif = Notification(
        user_id=receiver.id,
        type="EXCHANGE_REQUEST",
        title="New Skill Barter Proposal",
        message=f"{current_user.full_name} proposed an exchange: {exchange.proposal_message[:60]}...",
        link=f"/exchanges/{exchange.id}"
    )
    db.add(notif)
    db.commit()

    return serialize_exchange(exchange, current_user.id, db)

@router.get("", response_model=List[ExchangeOut])
def list_my_exchanges(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Exchange).filter(
        (Exchange.requester_id == current_user.id) | (Exchange.receiver_id == current_user.id)
    )
    if status_filter and status_filter != "ALL":
        query = query.filter(Exchange.status == status_filter.upper())
        
    exchanges = query.order_by(Exchange.created_at.desc()).all()
    return [serialize_exchange(e, current_user.id, db) for e in exchanges]

@router.get("/{exchange_id}", response_model=ExchangeOut)
def get_exchange_details(
    exchange_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    e = db.query(Exchange).filter(Exchange.id == exchange_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Exchange not found")
        
    if current_user.id not in (e.requester_id, e.receiver_id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied to this exchange")
        
    return serialize_exchange(e, current_user.id, db)

@router.patch("/{exchange_id}/accept", response_model=ExchangeOut)
def accept_exchange(
    exchange_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    e = db.query(Exchange).filter(Exchange.id == exchange_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Exchange not found")
        
    if e.status not in ("PENDING", "COUNTERED"):
        raise HTTPException(status_code=400, detail=f"Cannot accept exchange in status {e.status}")

    # Receiver can accept PENDING, Requester can accept COUNTERED
    if e.status == "PENDING" and current_user.id != e.receiver_id:
        raise HTTPException(status_code=403, detail="Only the recipient can accept this proposal")
    if e.status == "COUNTERED" and current_user.id != e.requester_id:
        raise HTTPException(status_code=403, detail="Only the proposer can accept this counter-proposal")

    e.status = "ACTIVE"
    e.updated_at = datetime.datetime.utcnow()
    db.commit()

    # Notify partner
    partner_id = e.requester_id if current_user.id == e.receiver_id else e.receiver_id
    notif = Notification(
        user_id=partner_id,
        type="EXCHANGE_ACCEPTED",
        title="Exchange Proposal Accepted! 🎉",
        message=f"{current_user.full_name} accepted the skill barter. Your exchange is now ACTIVE.",
        link=f"/exchanges/{e.id}"
    )
    db.add(notif)
    db.commit()

    return serialize_exchange(e, current_user.id, db)

@router.patch("/{exchange_id}/counter", response_model=ExchangeOut)
def counter_exchange(
    exchange_id: int,
    req: ExchangeCounter,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    e = db.query(Exchange).filter(Exchange.id == exchange_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Exchange not found")
        
    if e.status not in ("PENDING", "COUNTERED"):
        raise HTTPException(status_code=400, detail="Cannot counter exchange in current status")

    if current_user.id not in (e.requester_id, e.receiver_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    e.status = "COUNTERED"
    e.counter_message = req.counter_message
    if req.preferred_date:
        e.preferred_date = req.preferred_date
    if req.estimated_hours:
        e.estimated_hours = req.estimated_hours
    if req.location_area:
        e.location_area = req.location_area
    e.updated_at = datetime.datetime.utcnow()
    db.commit()

    partner_id = e.requester_id if current_user.id == e.receiver_id else e.receiver_id
    notif = Notification(
        user_id=partner_id,
        type="EXCHANGE_COUNTERED",
        title="Exchange Proposal Counter-Offered",
        message=f"{current_user.full_name} suggested changes: '{req.counter_message}'",
        link=f"/exchanges/{e.id}"
    )
    db.add(notif)
    db.commit()

    return serialize_exchange(e, current_user.id, db)

@router.patch("/{exchange_id}/reject", response_model=ExchangeOut)
def reject_exchange(
    exchange_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    e = db.query(Exchange).filter(Exchange.id == exchange_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Exchange not found")
        
    if e.status not in ("PENDING", "COUNTERED"):
        raise HTTPException(status_code=400, detail="Cannot reject exchange in current status")

    if current_user.id not in (e.requester_id, e.receiver_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    e.status = "REJECTED"
    e.updated_at = datetime.datetime.utcnow()
    db.commit()

    partner_id = e.requester_id if current_user.id == e.receiver_id else e.receiver_id
    notif = Notification(
        user_id=partner_id,
        type="EXCHANGE_REJECTED",
        title="Exchange Declined",
        message=f"{current_user.full_name} declined the barter proposal.",
        link=f"/exchanges/{e.id}"
    )
    db.add(notif)
    db.commit()

    return serialize_exchange(e, current_user.id, db)

@router.patch("/{exchange_id}/start", response_model=ExchangeOut)
def start_exchange(
    exchange_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    e = db.query(Exchange).filter(Exchange.id == exchange_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Exchange not found")
        
    if current_user.id not in (e.requester_id, e.receiver_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Acceptance already transitions the exchange to ACTIVE. Keep this endpoint
    # backward-compatible for clients that still call /start after acceptance.
    if e.status == "ACTIVE":
        return serialize_exchange(e, current_user.id, db)

    if e.status != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail=f"Only accepted exchanges can be moved to active (current status: {e.status})"
        )

    e.status = "ACTIVE"
    e.updated_at = datetime.datetime.utcnow()
    db.commit()
    return serialize_exchange(e, current_user.id, db)

@router.patch("/{exchange_id}/complete", response_model=ExchangeOut)
def mark_exchange_completed(
    exchange_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mutual Completion Protocol:
    Both parties must click 'Mark Complete'.
    When both have confirmed, the status automatically transitions to COMPLETED.
    """
    e = db.query(Exchange).filter(Exchange.id == exchange_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Exchange not found")
        
    if e.status != "ACTIVE":
        raise HTTPException(status_code=400, detail=f"Cannot complete an exchange in status '{e.status}'")

    if current_user.id == e.requester_id:
        e.requester_completed = True
    elif current_user.id == e.receiver_id:
        e.receiver_completed = True
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    partner_id = e.receiver_id if current_user.id == e.requester_id else e.requester_id

    # If both have marked completed -> officially COMPLETED!
    if e.requester_completed and e.receiver_completed:
        e.status = "COMPLETED"
        e.updated_at = datetime.datetime.utcnow()
        
        # Notify both parties
        for uid in [e.requester_id, e.receiver_id]:
            notif = Notification(
                user_id=uid,
                type="EXCHANGE_COMPLETED",
                title="Skill Barter Completed! 🏆",
                message="Both parties have confirmed completion. Please leave a review to build community trust.",
                link=f"/exchanges/{e.id}"
            )
            db.add(notif)
            
        db.commit()
        
        # Trigger trust score updates for both users
        recalculate_user_trust_score(e.requester_id, db)
        recalculate_user_trust_score(e.receiver_id, db)
    else:
        db.commit()
        # Notify partner that other user confirmed completion
        notif = Notification(
            user_id=partner_id,
            type="EXCHANGE_PENDING_CONFIRMATION",
            title="Completion Confirmed by Partner",
            message=f"{current_user.full_name} confirmed completion. Please mark complete on your end as well.",
            link=f"/exchanges/{e.id}"
        )
        db.add(notif)
        db.commit()

    return serialize_exchange(e, current_user.id, db)

@router.patch("/{exchange_id}/cancel", response_model=ExchangeOut)
def cancel_exchange(
    exchange_id: int,
    req: ExchangeCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    e = db.query(Exchange).filter(Exchange.id == exchange_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Exchange not found")
        
    if e.status in ("COMPLETED", "CANCELLED", "REJECTED"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel exchange in status '{e.status}'")

    if current_user.id not in (e.requester_id, e.receiver_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    e.status = "CANCELLED"
    e.cancellation_reason = req.cancellation_reason
    e.cancelled_by_id = current_user.id
    e.updated_at = datetime.datetime.utcnow()
    db.commit()

    # Recalculate trust score penalty for cancelling user
    recalculate_user_trust_score(current_user.id, db)

    partner_id = e.receiver_id if current_user.id == e.requester_id else e.requester_id
    notif = Notification(
        user_id=partner_id,
        type="EXCHANGE_CANCELLED",
        title="Exchange Cancelled",
        message=f"{current_user.full_name} cancelled the barter: '{req.cancellation_reason}'",
        link=f"/exchanges/{e.id}"
    )
    db.add(notif)
    db.commit()

    return serialize_exchange(e, current_user.id, db)
