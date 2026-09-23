import json
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth import get_current_admin
from app.database import SessionLocal
from app.models.analytics import AnalyticsEvent
from app.schemas.analytics import AnalyticsEventCreate

router = APIRouter(prefix="/analytics", tags=["Analytics"])

ALLOWED_EVENTS = {
    "signup_started",
    "signup_completed",
    "onboarding_completed",
    "matches_viewed",
    "exchange_request_sent",
    "referral_shared",
    "beta_feedback_submitted",
    "exchange_status_changed",
    "exchange_completed",
    "notification_opened",
    "activation_cta_clicked",
    "onboarding_step_viewed",
    "login_completed",
    "exchange_workspace_viewed",
    "exchange_message_sent",
    "exchange_schedule_saved",
}


@router.post("/events", status_code=status.HTTP_202_ACCEPTED)
def capture_event(payload: AnalyticsEventCreate):
    if payload.event not in ALLOWED_EVENTS:
        raise HTTPException(status_code=400, detail="Unsupported analytics event")

    db = SessionLocal()
    try:
        event = AnalyticsEvent(
            event=payload.event,
            session_id=payload.session_id,
            path=payload.path,
            timestamp=payload.timestamp.astimezone(timezone.utc).replace(tzinfo=None),
            properties=json.dumps(payload.properties, separators=(",", ":")),
        )
        db.add(event)
        db.commit()
        return {"accepted": True}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=503, detail="Analytics temporarily unavailable")
    finally:
        db.close()


FUNNEL_EVENTS = [
    "signup_completed",
    "onboarding_completed",
    "matches_viewed",
    "exchange_request_sent",
    "exchange_status_changed",
    "exchange_schedule_saved",
    "exchange_completed",
]


@router.get("/kpi")
def get_kpi(
    days: int = Query(7, ge=1, le=90),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    since = func.datetime("now", f"-{days} days")
    rows = (
        db.query(
            AnalyticsEvent.event,
            func.count(AnalyticsEvent.id).label("events"),
            func.count(func.distinct(AnalyticsEvent.session_id)).label("sessions"),
        )
        .filter(AnalyticsEvent.timestamp >= since)
        .group_by(AnalyticsEvent.event)
        .all()
    )

    by_event = {
        row.event: {
            "events": int(row.events),
            "sessions": int(row.sessions),
        }
        for row in rows
    }

    funnel = []
    previous_sessions = None
    for event_name in FUNNEL_EVENTS:
        current_sessions = by_event.get(event_name, {}).get("sessions", 0)
        conversion_from_previous = None
        if previous_sessions is not None and previous_sessions > 0:
            conversion_from_previous = round((current_sessions / previous_sessions) * 100, 2)
        funnel.append({
            "event": event_name,
            "sessions": current_sessions,
            "events": by_event.get(event_name, {}).get("events", 0),
            "conversion_from_previous_percent": conversion_from_previous,
        })
        previous_sessions = current_sessions

    return {
        "window_days": days,
        "funnel": funnel,
        "events": by_event,
    }
