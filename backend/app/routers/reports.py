from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.safety import Report, Block
from app.schemas.safety import ReportCreate, ReportOut, BlockOut
from app.services.auth import get_current_user

router = APIRouter(prefix="", tags=["Safety & Moderation"])

@router.post("/reports", response_model=ReportOut)
def create_report(
    req: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.reported_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")

    report = Report(
        reporter_id=current_user.id,
        reported_user_id=req.reported_user_id,
        reported_exchange_id=req.reported_exchange_id,
        category=req.category,
        details=req.details.strip(),
        status="PENDING"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    reported_user = db.query(User).filter(User.id == req.reported_user_id).first() if req.reported_user_id else None

    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "reported_user_id": report.reported_user_id,
        "reported_exchange_id": report.reported_exchange_id,
        "category": report.category,
        "details": report.details,
        "status": report.status,
        "admin_note": report.admin_note,
        "created_at": report.created_at,
        "reporter": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "avatar_url": current_user.avatar_url,
            "headline": current_user.headline,
            "trust_score": current_user.trust_score,
            "address_display": current_user.address_display
        },
        "reported_user": {
            "id": reported_user.id,
            "full_name": reported_user.full_name,
            "avatar_url": reported_user.avatar_url,
            "headline": reported_user.headline,
            "trust_score": reported_user.trust_score,
            "address_display": reported_user.address_display
        } if reported_user else None
    }

@router.post("/blocks/{blocked_user_id}", response_model=BlockOut)
def block_user(
    blocked_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if blocked_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    existing = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == blocked_user_id
    ).first()
    
    if existing:
        return {
            "id": existing.id,
            "blocker_id": existing.blocker_id,
            "blocked_id": existing.blocked_id,
            "created_at": existing.created_at
        }

    b = Block(blocker_id=current_user.id, blocked_id=blocked_user_id)
    db.add(b)
    db.commit()
    db.refresh(b)
    return {
        "id": b.id,
        "blocker_id": b.blocker_id,
        "blocked_id": b.blocked_id,
        "created_at": b.created_at
    }

@router.delete("/blocks/{blocked_user_id}")
def unblock_user(
    blocked_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    b = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == blocked_user_id
    ).first()
    if not b:
        raise HTTPException(status_code=404, detail="Block record not found")
        
    db.delete(b)
    db.commit()
    return {"message": "User unblocked"}

@router.get("/blocks", response_model=List[BlockOut])
def list_blocks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    blocks = db.query(Block).filter(Block.blocker_id == current_user.id).all()
    results = []
    for b in blocks:
        u = db.query(User).filter(User.id == b.blocked_id).first()
        results.append({
            "id": b.id,
            "blocker_id": b.blocker_id,
            "blocked_id": b.blocked_id,
            "created_at": b.created_at,
            "blocked_user": {
                "id": u.id,
                "full_name": u.full_name,
                "avatar_url": u.avatar_url,
                "headline": u.headline,
                "trust_score": u.trust_score,
                "address_display": u.address_display
            } if u else None
        })
    return results
