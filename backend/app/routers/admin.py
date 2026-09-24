from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.skill import Skill
from app.models.exchange import Exchange
from app.models.safety import Report
from app.services.auth import get_current_admin
from app.services.trust import recalculate_user_trust_score

router = APIRouter(prefix="/admin", tags=["Admin Moderation"])

@router.get("/stats")
def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_skills = db.query(Skill).count()
    total_exchanges = db.query(Exchange).count()
    completed_exchanges = db.query(Exchange).filter(Exchange.status == "COMPLETED").count()
    pending_reports = db.query(Report).filter(Report.status == "PENDING").count()
    avg_trust = db.query(func.avg(User.trust_score)).scalar() or 90.0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_skills": total_skills,
        "total_exchanges": total_exchanges,
        "completed_exchanges": completed_exchanges,
        "pending_reports": pending_reports,
        "average_trust_score": round(float(avg_trust), 1)
    }

@router.get("/users")
def get_admin_users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.id.asc()).offset(offset).limit(limit).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "headline": u.headline,
            "trust_score": u.trust_score,
            "completed_exchanges_count": u.completed_exchanges_count,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at
        }
        for u in users
    ]

@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own admin account")

    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active, "message": f"User status changed to {'Active' if user.is_active else 'Deactivated'}"}

@router.get("/reports")
def get_admin_reports(
    status_filter: Optional[str] = Query(None, pattern="^(PENDING|RESOLVED|DISMISSED)$"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == status_filter.upper())
        
    reports = query.order_by(Report.created_at.desc()).all()
    results = []
    for r in reports:
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        reported_user = db.query(User).filter(User.id == r.reported_user_id).first() if r.reported_user_id else None
        results.append({
            "id": r.id,
            "category": r.category,
            "details": r.details,
            "status": r.status,
            "admin_note": r.admin_note,
            "created_at": r.created_at,
            "reporter_name": reporter.full_name if reporter else "Unknown",
            "reported_name": reported_user.full_name if reported_user else "N/A",
            "reported_user_id": r.reported_user_id
        })
    return results

@router.patch("/reports/{report_id}/resolve")
def resolve_report(
    report_id: int,
    resolution_status: str = Query(..., pattern="^(RESOLVED|DISMISSED)$"),
    admin_note: Optional[str] = Query(None, max_length=2000),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if admin_note is not None:
        admin_note = admin_note.strip()
        if not admin_note:
            raise HTTPException(status_code=400, detail="Admin note cannot be blank")

    report.status = resolution_status
    report.admin_note = admin_note
    db.commit()

    if report.reported_user_id and resolution_status == "RESOLVED":
        recalculate_user_trust_score(report.reported_user_id, db)

    return {
        "id": report.id,
        "status": report.status,
        "admin_note": report.admin_note,
        "message": f"Report #{report_id} {resolution_status.lower()}"
    }

@router.get("/exchanges")
def get_admin_exchanges(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    exchanges = db.query(Exchange).order_by(Exchange.created_at.desc()).limit(30).all()
    results = []
    for e in exchanges:
        u1 = db.query(User).filter(User.id == e.requester_id).first()
        u2 = db.query(User).filter(User.id == e.receiver_id).first()
        results.append({
            "id": e.id,
            "requester_name": u1.full_name if u1 else "User",
            "receiver_name": u2.full_name if u2 else "User",
            "status": e.status,
            "proposal_message": e.proposal_message,
            "created_at": e.created_at
        })
    return results
