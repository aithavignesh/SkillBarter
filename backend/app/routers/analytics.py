import json
from datetime import timezone

from fastapi import APIRouter, HTTPException, status
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
